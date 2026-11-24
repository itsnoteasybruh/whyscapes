// WHYSCAPE EP14 v2 — "Kenapa Makanan di Kulkas Tetap Bisa Basi?" (cover: MAKANAN BISA BASI DI KULKAS?, from the creator's POST.md title)
// Category (metadata only, never rendered): Yang sedang terjadi.
// VO: audio/vo.mp3 (new ElevenLabs v4 VO, 62,59 s), 1,00x, uncut, starting at lib.VO_OFFSET (1,0 s) behind the cover. Render (project root):
//   node series/engine/render.js episodes/ep14_kulkas_v2 video EP14_v2_final.mp4
const L = require('./lib'), A = require('./scenes_a');
const Cover = require('../../series/brand/cover_bokeh');
const { W, END, tl, transition, prog, eio } = L;
const opt = m => { try { return require(m); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(m.slice(2))) return {}; throw e; } };
const Bs = opt('./scenes_b'), Ds = opt('./scenes_d'), Es = opt('./scenes_e');
const SC = [
  [A.kitchen, -99],
  [A.insideOut, A.A.nemu - .08],
  [A.openBox, A.A.tutupnya - .12],
  [A.question, A.A.padahal - .15, 'xf', .3],
  ...(Bs.list || []), ...(Ds.list || []), ...(Es.list || []),
];
const layer = (html, style = '') => `<div class="layer" style="${style}">${html}</div>`;
function scene(t) {
  let i = SC.length - 1; while (i > 0 && t < SC[i][1]) i--;
  for (const j of [i, i + 1]) {
    const s = SC[j]; if (!s || j === 0) continue;
    const [fn, a, type = 'cut', D = .3, prm] = s; if (type === 'cut') continue;
    const k0 = prog(t, a - D / 2, a + D / 2); if (k0 <= 0 || k0 >= 1) continue;
    const k = eio(k0), out = SC[j - 1][0](t), inn = fn(t);
    if (type === 'xf') return layer(out) + layer(inn, `opacity:${k.toFixed(3)}`);
    if (type === 'zoom') return layer(out, `transform:scale(${(1 + 2.2 * k).toFixed(3)});transform-origin:${prm[0]}px ${prm[1]}px;opacity:${(1 - k * k).toFixed(3)}`) + layer(inn, `opacity:${k.toFixed(3)};transform:scale(${(1.25 - .25 * k).toFixed(3)});transform-origin:${prm[0]}px ${prm[1]}px`);
  }
  return layer(SC[i][0](t));
}
// cover (STANDARDS §16): four elements only. The VO starts at 1.0 s, so the cover leaves by ~0.95 s and the scene is sharp at ~1.05 s.
const brand = Cover.brand({ title: 'MAKANAN BISA BASI|DI KULKAS?', timing: { hold: .5, gone: .95, sharp: [.7, 1.05], layout: { size: 84 } } });
module.exports = { END, tl, scene, firstScene: A.firstScene, transition: { ...transition, rider: Bs.rider }, brand, audio: 'audio/mix_final.wav',
  beats: { t0: L.t0, SWITCH: L.SWITCH, END, VO_END: L.VO_END, VO_OFFSET: L.VO_OFFSET }, SC: SC.map(([f, a, ty, D]) => [f.name, +Math.max(0, a).toFixed(2), ty || 'start', D || 0]) };
