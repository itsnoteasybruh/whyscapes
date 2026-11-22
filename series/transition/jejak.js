// WHYSCAPE SIGNATURE TRANSITION — "Coba kita ikuti jejaknya" (≈1 s, locked look/motion/sound).
// cream–teal trail fills the screen → 3 orange footprints on the beat → camera follows the last one
// to a magnifier portal → the portal opens onto the DESTINATION (skin, pipe, soil, machine… — episode's choice).
//
// Modular destination: the portal hole reveals whatever the episode's scene() draws underneath at that time.
// So the episode must already be showing its destination from cfg.t0 + 0.6 s (the screen is fully covered then),
// ideally a circular "lens" of radius cfg.radius centred on cfg.center — the portal lands exactly on it.
//
// cfg = { t0, center: [540, 700], radius: 430 }
//   t0  = start of the simplification. Rule: t0 = start of the word "Coba" + 0.04 s (the phrase begins in the previous scene).
const { lerp, prog, eio, eout, back, LINE, PALETTE } = require('../engine/core');

const REL = { steps: [.22, .44, .66], follow: [.66, 1.0], portalIn: .77, open: [1.0, 1.30], gone: 1.54 };   // seconds after t0
const MOTIF = { file: 'series/audio/library/identitas/motif_transisi_jejak.wav', at: REL.steps[0] - .01 }; // taps on the 3 prints, 2 notes on the portal

function sole(fill) {
  return `<path d="M0,-58 C24,-58 32,-34 30,-8 C28,14 20,24 18,34 L-18,34 C-20,24 -28,14 -30,-8 C-32,-34 -24,-58 0,-58 Z" fill="${fill}" stroke="${LINE}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M-17,44 L17,44 C22,44 24,50 22,58 C20,68 12,74 0,74 C-12,74 -20,68 -22,58 C-24,50 -22,44 -17,44 Z" fill="${fill}" stroke="${LINE}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M-16,-30 L16,-30 M-19,-12 L19,-12 M-17,6 L17,6 M-10,58 L10,58" stroke="${PALETTE.creamLight}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
}
const PATH = u => [540 + 210 * Math.sin(u * Math.PI * 1.15 - .4), lerp(1900, 560, u)];

function overlay(t, cfg) {
  const t0 = cfg.t0, [CX, CY] = cfg.center || [540, 700], R = cfg.radius || 430;
  const at = k => t0 + k;
  if (t < t0 || t > at(REL.gone)) return '';
  const cover = eio(prog(t, t0, t0 + .2));
  const fk = eio(prog(t, at(REL.follow[0]), at(REL.follow[1])));
  const [px, py] = PATH(1), s = lerp(1, 1.55, fk), fx = lerp(540, px, fk), fy = lerp(1000, py, fk), sx = lerp(540, CX, fk), sy = lerp(1000, CY, fk);
  const cx = sx + (px - fx) * s, cy = sy + (py - fy) * s;
  const ring = back(prog(t, at(REL.portalIn), at(REL.portalIn) + .22)) * 120 * s / 1.55;
  const r = t < at(REL.open[0]) ? ring : lerp(120, R, eio(prog(t, at(REL.open[0]), at(REL.open[1])))) + 1100 * eio(prog(t, at(REL.open[1]) - .02, at(REL.gone)));
  const draw = eout(prog(t, t0 + .04, t0 + .4));
  let d = ''; for (let j = 0; j <= 50; j++) { const [x, y] = PATH(j / 50); d += (j ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); }
  let prints = '';
  REL.steps.forEach((k, i) => {
    const ts = at(k); if (t < ts - .01) return;
    const u = .3 + i * .24, [x, y] = PATH(u), [x2, y2] = PATH(u + .01);
    const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90, side = (i % 2 ? 1 : -1) * 44;
    const nx = Math.cos(ang * Math.PI / 180) * side, ny = Math.sin(ang * Math.PI / 180) * side;
    const p = back(prog(t, ts, ts + .18)), dust = prog(t, ts, ts + .4);
    prints += `<g transform="translate(${(x + nx).toFixed(1)},${(y + ny).toFixed(1)})">
      ${dust < 1 ? `<ellipse rx="${90 + 70 * dust}" ry="${40 + 30 * dust}" fill="none" stroke="${PALETTE.creamLight}" stroke-width="${6 * (1 - dust)}" opacity="${(1 - dust).toFixed(3)}"/>` : ''}
      <g transform="rotate(${ang.toFixed(1)}) scale(${(1.7 * p).toFixed(3)})">${sole(PALETTE.orange)}</g></g>`;
  });
  const handleO = 1 - prog(t, at(REL.open[0]), at(REL.open[0]) + .15);
  const inner = `<rect x="-2000" y="-2000" width="5000" height="6000" fill="${PALETTE.cream}"/>
    <rect x="-2000" y="-2000" width="5000" height="6000" fill="url(#jj-paper)"/>
    <path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${1 - draw}" fill="none" stroke="${PALETTE.teal}" stroke-width="190" stroke-linecap="round"/>
    <path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${1 - draw}" fill="none" stroke="${PALETTE.tealMid}" stroke-width="150" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${PALETTE.creamLight}" stroke-width="8" stroke-dasharray="4 30" stroke-dashoffset="${(-t * 80).toFixed(1)}" opacity="${(.8 * draw).toFixed(3)}" stroke-linecap="round"/>
    ${prints}${cfg.rider ? cfg.rider(t - t0, PATH) : ''}`;   // kit v1.9: optional thing the prints follow (drawn on the trail, episode-defined)
  const portal = ring > 1 ? `<g opacity="${(1 - prog(t, at(REL.open[1]) - .05, at(REL.open[1]) + .15)).toFixed(3)}">
      <path d="M${(cx + r * .72).toFixed(1)},${(cy + r * .72).toFixed(1)} L${(cx + r * .72 + 150).toFixed(1)},${(cy + r * .72 + 150).toFixed(1)}" stroke="${LINE}" stroke-width="44" stroke-linecap="round" opacity="${handleO}"/>
      <path d="M${(cx + r * .72).toFixed(1)},${(cy + r * .72).toFixed(1)} L${(cx + r * .72 + 150).toFixed(1)},${(cy + r * .72 + 150).toFixed(1)}" stroke="${PALETTE.wood}" stroke-width="30" stroke-linecap="round" opacity="${handleO}"/>
      <circle cx="${cx}" cy="${cy}" r="${r + 14}" fill="none" stroke="${LINE}" stroke-width="38"/>
      <circle cx="${cx}" cy="${cy}" r="${r + 14}" fill="none" stroke="${PALETTE.teal}" stroke-width="26"/>
      <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="${PALETTE.orange}" stroke-width="6"/></g>` : '';
  const hole = r > 1 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/>` : '';
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0">
    <defs><mask id="jj-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920"><rect width="1080" height="1920" fill="#fff"/>${hole}</mask>
      <pattern id="jj-paper" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="4" cy="6" r="1.4" fill="${PALETTE.paperDot}" opacity=".32"/><circle cx="15" cy="17" r="1.1" fill="${PALETTE.paperDot}" opacity=".24"/></pattern></defs>
    <g mask="url(#jj-mask)" opacity="${cover.toFixed(3)}"><g transform="translate(${sx},${sy}) scale(${s}) translate(${-fx},${-fy})">${inner}</g></g>
    ${portal}</svg>`;
}
// time window the episode scene is hidden (switch to the destination anywhere inside it)
const hiddenWindow = t0 => [t0 + .25, t0 + REL.portalIn];

module.exports = { overlay, REL, MOTIF, hiddenWindow, sole };
