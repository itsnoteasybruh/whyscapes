// WHYSCAPE COVER — BOKEH (kit v1.3). Thumbnail-first opening/closing that lives inside the scene:
// the episode's first scene blurred over the whole frame (bokeh), a soft light pool + gentle vignette for contrast,
// the round logo (with its own ring) lifted by a soft shadow, WHYSCAPE, three white dots and the episode title.
// No graphic panels. Text sits above y 1330 so subtitles (y ≥ 1392) can keep their exact timing during the cover.
// Opening: readable hold → elements leave (all gone by T.gone) → only then the scene sharpens (T.sharp).
// Closing: scene blurs → crossfades to the first scene → cover rebuilds → last frame = first frame.
const path = require('path');
const { prog, eio, eout, lerp } = require('../engine/core');
const LOGO = require('url').pathToFileURL(path.join(__dirname, 'logo_whyscape_ring_v2_640.png')).href;
const DARK = '#1D3835', CREAM = '#F6F3EB';
const T0 = { hold: 1.25, gone: 1.85, sharp: [1.8, 2.35],
  close: { blurIn: [-1.95, -1.15], crossfade: [-1.8, -1.25], coverIn: [-1.15, -.45] }, blurPx: 18, saturate: .9 };

function coverK(t, END, T = T0) { return t < 5 ? 1 - prog(t, T.hold, T.gone) : prog(t, END + T.close.coverIn[0], END + T.close.coverIn[1]); }
function blurAmount(t, END, T = T0) { return t < 5 ? 1 - eio(prog(t, T.sharp[0], T.sharp[1])) : eio(prog(t, END + T.close.blurIn[0], END + T.close.blurIn[1])); }
function loopMix(t, END, T = T0) { return eio(prog(t, END + T.close.crossfade[0], END + T.close.crossfade[1])); }

// L = layout (kit v1.4): two-line titles ('LINE 1|LINE 2') move the block up so it stays above the subtitle zone
const L1 = { logoTop: 352, logo: 580, word: 982, dots: 1094, title: 1172, size: 116 };
const L2 = { logoTop: 286, logo: 540, word: 870, dots: 976, title: 1046, size: 104 };
function overlay(t, END, title, T = T0) {
  const two = title.includes('|'), L = { ...(two ? L2 : L1), ...(T.layout || {}) };   // kit v1.6: optional layout override (e.g. 3-line titles: { size: 90 })
  const opening = t < 5;
  const atm = opening ? 1 - eio(prog(t, T.sharp[0], T.sharp[1])) : eio(prog(t, END + T.close.blurIn[0], END + T.close.blurIn[1]));   // light pool follows the blur
  const e = d => { const x = opening ? 1 - prog(t, T.hold + d, T.gone - .3 + d) : prog(t, END + T.close.coverIn[0] + d, END + T.close.coverIn[1] - .25 + d); return eio(Math.max(0, Math.min(1, x))); };
  const kl = e(0), kw = e(.08), kd = e(.12), kt = e(.16);
  let html = '';
  if (atm > .001) html += `<div style="position:absolute;inset:0;opacity:${atm.toFixed(3)};background:radial-gradient(ellipse 70% 42% at 50% 54%, rgba(255,250,238,.42), rgba(255,250,238,0) 70%), radial-gradient(ellipse 95% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(40,30,20,.22) 100%)"></div>`;
  if (Math.max(kl, kw, kd, kt) <= .001) return html;
  const css = `position:absolute;left:0;right:0;text-align:center;font-family:Nunito;font-weight:900`;
  const glow = w => `0 0 ${w}px ${CREAM},${w}px 0 0 ${CREAM},-${w}px 0 0 ${CREAM},0 ${w}px 0 ${CREAM},0 -${w}px 0 ${CREAM},${w * .7}px ${w * .7}px 0 ${CREAM},-${w * .7}px ${w * .7}px 0 ${CREAM},${w * .7}px -${w * .7}px 0 ${CREAM},-${w * .7}px -${w * .7}px 0 ${CREAM},0 6px 22px rgba(40,30,20,.25)`;
  const dot = i => `<span style="display:inline-block;width:30px;height:30px;margin:0 13px;border-radius:50%;background:#fff;box-shadow:0 3px 10px rgba(40,30,20,.3);opacity:${kd.toFixed(3)};transform:translateY(${((1 - kd) * (14 + i * 6)).toFixed(1)}px)"></span>`;
  html += `<div style="${css};top:${(L.logoTop - (1 - kl) * 70).toFixed(1)}px;opacity:${kl.toFixed(3)};transform:scale(${lerp(.86, 1, kl).toFixed(4)});transform-origin:50% ${L.logo / 2}px">
      <img src="${LOGO}" style="width:${L.logo}px;height:${L.logo}px;filter:drop-shadow(0 26px 34px rgba(40,30,20,.32)) drop-shadow(0 4px 8px rgba(40,30,20,.18))"></div>
    <div style="${css};top:${L.word}px;font-size:86px;letter-spacing:20px;padding-left:20px;color:${DARK};text-shadow:${glow(4)};opacity:${kw.toFixed(3)};transform:translateY(${((1 - kw) * -24).toFixed(1)}px)">WHYSCAPE</div>
    <div style="${css};top:${L.dots}px">${[0, 1, 2].map(dot).join('')}</div>
    <div style="${css};top:${L.title}px;font-size:${L.size}px;letter-spacing:0;line-height:${two ? 1.02 : 1};color:${DARK};text-shadow:${glow(7)};opacity:${(kt * kt).toFixed(3)};transform:translateY(${((1 - kt) * -18).toFixed(1)}px) scale(${lerp(1.05, 1, kt).toFixed(4)})">${title.split('|').join('<br>')}</div>`;
  // LOCKED (2026-11-21): the cover has exactly four elements — logo, WHYSCAPE, three white dots, title. No segment label / badge.
  // A kicker is drawn ONLY for published episodes that already had one (legacyKicker: true keeps their re-render identical).
  if (T.kicker && !T.legacyKicker && !overlay._warned) { overlay._warned = true; console.warn('[cover_bokeh] timing.kicker ignored: covers carry no segment label (STANDARDS §16)'); }
  if (T.kicker && T.legacyKicker) {   // kit v1.8 legacy: section label, cover only
    const top = T.kickerTop || Math.round(L.title + title.split('|').length * L.size * 1.02 + 24);
    html += `<div style="${css};top:${top}px;opacity:${(kt * kt).toFixed(3)}"><span style="display:inline-block;padding:8px 26px 10px;border-radius:40px;background:${DARK};color:#FBF6EC;font-size:34px;letter-spacing:5px;box-shadow:0 4px 14px rgba(40,30,20,.25)">${T.kicker}</span></div>`;
  }
  return html;
}
// subtitles keep their exact timing; only frame 0 (the thumbnail) stays clean
const subtitleGate = t => t < 5 ? prog(t, .12, .3) : 1;
// timing (kit v1.4): pass partial overrides, e.g. { hold: .85, gone: 1.35, sharp: [1.3, 1.8] } when the VO starts on frame 0
function brand({ title, timing = {} }) {
  const T = { ...T0, ...timing, close: { ...T0.close, ...(timing.close || {}) } };
  return { blurAmount: (t, E) => blurAmount(t, E, T), loopMix: (t, E) => loopMix(t, E, T), overlay: (t, END) => overlay(t, END, title, T), subtitleGate, T };
}
const T = T0;
module.exports = { brand, T, coverK, LOGO };
