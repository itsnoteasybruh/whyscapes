// WHYSCAPE RENDERER (series) — composites an episode with the locked series layers and writes the MP4.
//   node series/engine/render.js <episodeDir> stills 0.5 12.3 …        → <episodeDir>/stills/still_<t>.png
//   node series/engine/render.js <episodeDir> video [out.mp4] [from] [to] → <episodeDir>/out/<out.mp4>
// Episode module (<episodeDir>/episode.js) exports:
//   END (s), audio (path to final mix or VO), tl (core.timeline(...)), scene(t), firstScene(tl), transition {t0,center,radius} | null
//   optional: brand { blurAmount, loopMix, overlay, subtitleGate } (kit v1.1, see series/brand/cover.js), breathing:false
// Output standard (locked): 1080×1920, 30 fps, H.264 CRF 18 yuv420p (limited/tv range), AAC 192 kb/s, +faststart.
// 2026-11-20: explicit scale=out_range=tv + -color_range tv — ffmpeg 9 keeps the MJPEG pipe's full (pc) range, ffmpeg 6 converted it to tv. Restores the original output.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const K = require('./core');
const OC = require('../brand/opening_closing');
const J = require('../transition/jejak');

const W = 1080, H = 1920, FPS = 30;
const epDir = path.resolve(process.argv[2]);
const ep = require(path.join(epDir, 'episode.js'));

function sceneAt(t) {
  K.setNow(t);
  const END = ep.END;
  // gentle continuous camera "breathing" so no shot ever sits frozen
  const br = ep.breathing === false ? '' : `transform:translate(${(4 * Math.sin(t * .37)).toFixed(2)}px,${(3 * Math.sin(t * .29)).toFixed(2)}px) scale(${(1.014 + .01 * Math.sin(t * .6)).toFixed(4)});transform-origin:50% 38%`;
  // optional episode brand hooks (kit v1.1, e.g. series/brand/cover.js); defaults = the v1 opening/closing
  const BR = ep.brand || {};
  const bl = (BR.blurAmount || OC.blurAmount)(t, END);
  const filt = bl > .001 ? `;filter:blur(${(OC.T.blurPx * bl).toFixed(2)}px) saturate(${(1 - (1 - OC.T.saturate) * bl).toFixed(3)})` : '';
  const m = (BR.loopMix || OC.loopMix)(t, END);
  let body = `<div class="layer">${ep.scene(t)}</div>`;
  if (m > 0) body += `<div class="layer" style="opacity:${m.toFixed(3)}">${ep.firstScene(t - END)}</div>`;
  return `<div class="layer" style="${br}${filt}">${body}</div>`
    + (ep.transition ? J.overlay(t, ep.transition) : '')
    + (BR.subtitleGate ? `<div style="opacity:${BR.subtitleGate(t, END).toFixed(3)}">${ep.tl.subtitle(t)}</div>` : ep.tl.subtitle(t))
    + (BR.overlay || OC.logo)(t, END);
}

(async () => {
  const [, , , mode, ...args] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const OUT = path.join(epDir, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const shell = path.join(OUT, '_shell.html');
  fs.writeFileSync(shell, `<!doctype html><html><head><meta charset="utf-8"><style>${K.FONT_CSS}
    *{margin:0;padding:0;box-sizing:border-box} html,body{width:${W}px;height:${H}px;overflow:hidden;background:${K.PALETTE.cream}}
    body{font-family:Nunito,sans-serif;position:relative} svg{display:block;position:absolute;left:0;top:0} .layer{position:absolute;inset:0}${K.SUB_CSS}</style></head>
    <body><div style="font-weight:700">a</div><div style="font-weight:800">a</div><div style="font-weight:900">a</div></body></html>`);
  await page.goto(require('url').pathToFileURL(shell).href);
  await page.evaluate(() => document.fonts.ready);
  const setT = t => page.evaluate(h => { document.body.innerHTML = h; }, sceneAt(t));

  if (mode === 'stills') {
    const dir = path.join(epDir, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const a of args) { await setT(parseFloat(a)); await page.screenshot({ path: path.join(dir, `still_${a}.png`) }); }
    console.log('stills ->', dir);
  } else if (mode === 'video') {
    const name = args[0] || 'episode.mp4', from = parseFloat(args[1] || 0), to = parseFloat(args[2] || ep.END), dur = to - from;
    const vtmp = path.join(OUT, '_video.tmp.mp4'), atmp = path.join(OUT, '_audio.m4a'), tmp = path.join(OUT, '_final.tmp.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'scale=out_range=tv', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(FPS), vtmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = Math.round(dur * FPS) + 15;   // spare frames: image2pipe can drop the last few
    for (let f = 0; f < N; f++) {
      await setT(Math.min(from + f / FPS, to));
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) process.stdout.write(`${(from + f / FPS).toFixed(0)}s `);
    }
    ff.stdin.end();
    if (await new Promise(r => ff.on('close', r)) !== 0) throw new Error('ffmpeg video failed');
    const AUD = process.env.AUDIO || path.resolve(epDir, ep.audio);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(from), '-t', String(dur), '-i', AUD, '-af', 'apad', '-t', String(dur), '-c:a', 'aac', '-b:a', '192k', atmp]);
    // pad the picture by cloning the last frame, then cut both streams to the exact audio length
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vtmp, '-i', atmp, '-map', '0:v', '-map', '1:a', '-vf', 'tpad=stop_mode=clone:stop_duration=0.5',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(FPS), '-c:a', 'copy', '-t', String(dur), '-movflags', '+faststart', tmp]);
    fs.renameSync(tmp, path.join(OUT, name)); fs.rmSync(vtmp); fs.rmSync(atmp);
    console.log('\nok', path.join(OUT, name));
  } else console.log('mode: stills | video');
  await browser.close();
})();
