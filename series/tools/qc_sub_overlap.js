// WHYSCAPE QC (kit v1.13, 2026-11-20) — "subtitle menimpa karakter" (kaizen K04).
//   node series/tools/qc_sub_overlap.js episodes/<ep> [step=0.5] [from] [to]
// Builds each frame exactly like series/engine/render.js (same sceneAt), then asks Chromium for
// the boxes of the visible subtitle (.sub) and of every character (Mpi + warga: top-level
// <g filter="url(#wob)">, rig filter shared by mpi.js / mpi_turn.js / people.js).
// A hit = a character box that reaches below SUB.top while a subtitle is on screen, horizontally
// overlapping the subtitle text box. Reports how far into the subtitle block the character goes.
// Writes <ep>/qc/sub_overlap.csv + sub_overlap.md. Read-only for the episode: renders nothing to out/.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const K = require('../engine/core');
const OC = require('../brand/opening_closing');
const J = require('../transition/jejak');

const W = 1080, H = 1920;
const epDir = path.resolve(process.argv[2]);
const ep = require(path.join(epDir, 'episode.js'));
const step = parseFloat(process.argv[3] || .5), from = parseFloat(process.argv[4] || 0), to = parseFloat(process.argv[5] || ep.END);

// identical to render.js sceneAt (kept in sync by hand; render.js stays untouched)
function sceneAt(t) {
  K.setNow(t);
  const END = ep.END;
  const br = ep.breathing === false ? '' : `transform:translate(${(4 * Math.sin(t * .37)).toFixed(2)}px,${(3 * Math.sin(t * .29)).toFixed(2)}px) scale(${(1.014 + .01 * Math.sin(t * .6)).toFixed(4)});transform-origin:50% 38%`;
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
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const QC = path.join(epDir, 'qc'); fs.mkdirSync(QC, { recursive: true });
  const shell = path.join(QC, '_qc_shell.html');
  fs.writeFileSync(shell, `<!doctype html><html><head><meta charset="utf-8"><style>${K.FONT_CSS}
    *{margin:0;padding:0;box-sizing:border-box} html,body{width:${W}px;height:${H}px;overflow:hidden}
    body{font-family:Nunito,sans-serif;position:relative} svg{display:block;position:absolute;left:0;top:0} .layer{position:absolute;inset:0}${K.SUB_CSS}</style></head><body></body></html>`);
  await page.goto(require('url').pathToFileURL(shell).href);
  await page.evaluate(() => document.fonts.ready);
  const rows = [];
  for (let t = from; t <= to + 1e-6; t += step) {
    const r = await page.evaluate(([h, subTop]) => {
      document.body.innerHTML = h;
      const sub = document.querySelector('.sub');
      if (!sub || !sub.textContent.trim()) return null;
      // text box of the visible words only (spans with opacity > .5)
      let sb = null;
      for (const s of sub.querySelectorAll('span')) {
        if (parseFloat(getComputedStyle(s).opacity) < .5) continue;
        const b = s.getBoundingClientRect();
        sb = sb ? { l: Math.min(sb.l, b.left), r: Math.max(sb.r, b.right), t: Math.min(sb.t, b.top), b: Math.max(sb.b, b.bottom) } : { l: b.left, r: b.right, t: b.top, b: b.bottom };
      }
      if (!sb) return null;
      const chars = [...document.querySelectorAll('g[filter="url(#wob)"]')].filter(g => !g.parentElement.closest('g[filter="url(#wob)"]'));
      let worst = 0, n = 0, foot = 0;
      for (const g of chars) {
        const b = g.getBoundingClientRect();
        if (b.width < 8 || b.height < 30 || b.bottom < 0 || b.top > 1920) continue;
        const xo = Math.min(b.right, sb.r) - Math.max(b.left, sb.l);
        if (xo <= 0 || b.bottom <= sb.t) continue;
        // how deep the character reaches into the subtitle text block, as a share of the character height
        const depth = Math.min(b.bottom, sb.b) - Math.max(b.top, sb.t);
        const share = depth / b.height;
        if (share > worst) { worst = share; foot = b.bottom; }
        n++;
      }
      return { subTop: sb.t, worst, n, foot, text: sub.textContent.trim().slice(0, 40) };
    }, [sceneAt(t), K.SUB.top]);
    if (r) rows.push({ t: +t.toFixed(2), ...r });
  }
  await browser.close();
  fs.rmSync(shell);
  // group consecutive hits (share ≥ 5 %) into ranges
  const hits = rows.filter(x => x.worst >= .05);
  const ranges = [];
  for (const h of hits) {
    const last = ranges[ranges.length - 1];
    if (last && h.t - last.b <= step * 1.5) { last.b = h.t; last.max = Math.max(last.max, h.worst); last.text = last.text || h.text; }
    else ranges.push({ a: h.t, b: h.t, max: h.worst, text: h.text });
  }
  const csv = ['t,sub_top,chars_hit,worst_share,char_bottom,text', ...rows.map(x => `${x.t},${x.subTop.toFixed(0)},${x.n},${x.worst.toFixed(3)},${x.foot.toFixed(0)},"${x.text.replace(/"/g, "'")}"`)].join('\n');
  fs.writeFileSync(path.join(QC, 'sub_overlap.csv'), csv);
  const grade = (s) => (s >= .25 ? 'TINGGI' : s >= .12 ? 'sedang' : 'rendah');
  const md = [`# QC subtitle vs karakter — ${path.basename(epDir)}`, '',
    `Sampel tiap ${step} s (${from}–${to.toFixed(1)} s). Hit = karakter (Mpi/warga) masuk ke kotak teks subtitle yang sedang tampil; persentase = bagian tinggi karakter yang tertimpa.`, '',
    ranges.length ? '| Rentang | Maks | Dampak | Subtitle |\n|---|---|---|---|\n' + ranges.map(r => `| ${r.a.toFixed(1)}–${r.b.toFixed(1)} s | ${(100 * r.max).toFixed(0)} % | ${grade(r.max)} | ${r.text} |`).join('\n') : 'Tidak ada karakter yang tertimpa subtitle.'].join('\n');
  fs.writeFileSync(path.join(QC, 'sub_overlap.md'), md + '\n');
  console.log(md);
})();
