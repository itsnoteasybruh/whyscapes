// WHYSCAPE OPENING / CLOSING (locked component).
// The component owns: logo, wordmark, timings, blur amount, the loop crossfade.
// The EPISODE owns: its first scene (ep.firstScene(tl)) — that is what appears blurred behind the logo,
// so the background changes every episode while the brand moment stays identical.
const path = require('path');
const { lerp, prog, eio, eout } = require('../engine/core');

const LOGO = require('url').pathToFileURL(path.join(__dirname, 'logo_whyscape_640.png')).href;
const T = {
  open: { hold: .85, out: 1.30 },                 // logo + blur over the first scene; VO starts at 0.00, never wait for it
  close: { crossfade: [-1.60, -1.08], blurIn: -1.70, logoIn: -1.43, full: -1.03 },   // seconds relative to END
  blurPx: 16, saturate: .85,
  sfx: { chimeOpen: .04, chimeClose: -1.43 },     // chime cue times (open: absolute, close: relative to END)
};

// 0 = sharp, 1 = full brand blur
function blurAmount(t, END) {
  if (t < T.open.out) return 1 - eio(prog(t, T.open.hold, T.open.out));
  if (t >= END + T.close.blurIn) return eio(prog(t, END + T.close.blurIn, END + T.close.full));
  return 0;
}
// 0 → episode's own last scene, 1 → episode's first scene (loop target)
function loopMix(t, END) { return eio(prog(t, END + T.close.crossfade[0], END + T.close.crossfade[1])); }

function logo(t, END) {
  let o = 0, s = 1;
  if (t < T.open.out) { const k = eio(prog(t, T.open.hold, T.open.out)); o = 1 - k; s = 1 + .06 * k; }
  else if (t >= END + T.close.logoIn) { const k = eout(prog(t, END + T.close.logoIn, END + T.close.full)); o = k; s = 1.06 - .06 * k; }
  if (o <= 0) return '';
  return `<div style="position:absolute;left:0;right:0;top:470px;text-align:center;opacity:${o.toFixed(3)};transform:scale(${s.toFixed(4)});transform-origin:50% 300px">
    <img src="${LOGO}" style="width:560px;height:560px;filter:drop-shadow(0 18px 30px rgba(31,77,74,.28))">
    <div style="margin-top:34px;font-family:Nunito;font-weight:900;font-size:96px;letter-spacing:14px;color:#1F4D4A;padding-left:14px;
      text-shadow:0 0 1px #F6F3EB,0 4px 0 #F6F3EB,4px 0 0 #F6F3EB,-4px 0 0 #F6F3EB,0 -4px 0 #F6F3EB,0 10px 24px rgba(246,243,235,.9)">WHYSCAPE</div>
    <div style="margin:14px auto 0;width:150px;height:12px;border-radius:6px;background:#F2A53A;box-shadow:0 0 0 4px #F6F3EB"></div></div>`;
}

module.exports = { T, blurAmount, loopMix, logo, LOGO };
