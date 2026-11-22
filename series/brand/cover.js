// WHYSCAPE COVER OPENING (kit v1.1) — thumbnail-first opening, built from the EP01 cover reference:
// blurred first scene + circular logo (dark teal ring) + WHYSCAPE wordmark + three white dots + soft blue field + big episode title.
// v1.2: blue field (as in the EP01 thumbnail), larger title for the profile grid (3:4 centre crop y 240–1680), clean exit (no ghost).
// Frame 0 is the Reels thumbnail; the cover then moves out quickly while the VO (which starts at 0.00) continues.
// The closing rebuilds the same composition so the last frame equals the first (seamless loop).
// Use from an episode:  brand: Cover.brand({ title: 'MATA KEDUTAN' })  → render.js picks up blurAmount / loopMix / overlay.
const path = require('path');
const { prog, eio, eout, ein, lerp } = require('../engine/core');
const LOGO = require('url').pathToFileURL(path.join(__dirname, 'logo_whyscape_640.png')).href;
const DARK = '#1D3835', GLOW = '#F6F3EB';
const T = { hold: .5, out: 1.25, gone: 1.0, close: { blurIn: -1.70, crossfade: [-1.60, -1.08], coverIn: [-1.50, -.80] }, blurPx: 16, saturate: .85 };

// k = 1 → cover fully composed (thumbnail); 0 → gone
function coverK(t, END) {
  if (t < T.out) return 1 - prog(t, T.hold, T.gone);
  return prog(t, END + T.close.coverIn[0], END + T.close.coverIn[1]);
}
function blurAmount(t, END) {
  if (t < T.out) return 1 - eio(prog(t, T.hold + .1, T.out));
  return eio(prog(t, END + T.close.blurIn, END + T.close.coverIn[1]));
}
function loopMix(t, END) { return eio(prog(t, END + T.close.crossfade[0], END + T.close.crossfade[1])); }

// each element has its own exit (staggered); every layer reaches opacity 0 by T.gone (no ghost over the first scene)
function overlay(t, END, title) {
  const k = coverK(t, END); if (k <= 0) return '';
  const opening = t < T.out;
  const e = d => { const x = opening ? 1 - prog(t, T.hold + d, T.gone - .22 + d) : prog(t, END + T.close.coverIn[0] + d, END + T.close.coverIn[1] - .2 + d); return eio(Math.max(0, Math.min(1, x))); };
  const kl = e(0), kw = e(.06), kd = e(.1), kt = e(.14), kb = e(.12);
  if (opening && t >= T.gone) return '';
  const css = `position:absolute;left:0;right:0;text-align:center;font-family:Nunito;font-weight:900`;
  const glow = w => `0 0 ${w}px ${GLOW},${w}px 0 0 ${GLOW},-${w}px 0 0 ${GLOW},0 ${w}px 0 ${GLOW},0 -${w}px 0 ${GLOW},${w * .7}px ${w * .7}px 0 ${GLOW},-${w * .7}px ${w * .7}px 0 ${GLOW},${w * .7}px -${w * .7}px 0 ${GLOW},-${w * .7}px -${w * .7}px 0 ${GLOW},0 0 26px rgba(246,243,235,.9)`;
  const dot = i => `<span style="display:inline-block;width:34px;height:34px;margin:0 14px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(29,56,53,.3);opacity:${kd.toFixed(3)};transform:translateY(${((1 - kd) * (18 + i * 8)).toFixed(1)}px)"></span>`;
  const field = `<svg width="1080" height="1920" style="position:absolute;left:0;top:0;opacity:${(kb * .96).toFixed(3)}"><defs><linearGradient id="cvb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9DCEA"/><stop offset=".35" stop-color="#8CCBE0"/><stop offset="1" stop-color="#78B9D3"/></linearGradient></defs>
    <path d="M0,1010 C120,996 220,1018 340,1008 C470,996 600,1020 740,1006 C860,996 980,1014 1080,1004 L1080,1920 L0,1920 Z" fill="url(#cvb)"/><path d="M0,1010 C120,996 220,1018 340,1008 C470,996 600,1020 740,1006 C860,996 980,1014 1080,1004" fill="none" stroke="#C9ECF4" stroke-width="10" opacity=".8"/></svg>`;
  return field + `<div style="${css};top:${(452 - (1 - kl) * 160).toFixed(1)}px;opacity:${kl.toFixed(3)};transform:scale(${lerp(.7, 1, kl).toFixed(4)});transform-origin:50% 290px">
      <img src="${LOGO}" style="width:556px;height:556px;border-radius:50%;border:15px solid ${DARK};box-shadow:0 18px 40px rgba(29,56,53,.3)"></div>
    <div style="${css};top:1090px;font-size:92px;letter-spacing:20px;padding-left:20px;color:${DARK};text-shadow:${glow(4)};opacity:${kw.toFixed(3)};transform:translateY(${((1 - kw) * -40).toFixed(1)}px)">WHYSCAPE</div>
    <div style="${css};top:1206px">${[0, 1, 2].map(dot).join('')}</div>
    <div style="${css};top:1360px;font-size:114px;letter-spacing:0px;line-height:1;color:${DARK};text-shadow:${glow(7)};opacity:${(kt * kt).toFixed(3)};transform:scale(${lerp(1.08, 1, kt).toFixed(4)})">${title}</div>`;
}
// subtitles stay hidden under the cover (frame 0 must read as a clean thumbnail)
const subtitleGate = (t, END) => 1 - coverK(t, END);
function brand({ title }) {
  return { blurAmount, loopMix, overlay: (t, END) => overlay(t, END, title), subtitleGate, T };
}
module.exports = { brand, T, coverK, LOGO };
