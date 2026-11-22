// WHYSCAPE WORLD — the kitchen floor at ANT LEVEL (kit v1.4 rev 2, EP03). Camera almost on the tiles, looking along the floor
// toward the cabinet kick plate (where the nest crack is). Same floor, same cabinet, same stool as kitchen.js — seen low.
//   lowBack(o)    background: tall kick plate + cabinet doors, nest crack, stool leg, perspective tiles. o.camX scrolls the world
//                 (parallax: wall .35, stool .6, floor 1). o.inv (0..1) adds the investigation tint.
//   proj(X, Z, camX)   ground point (X across, Z depth; Z = Z0 is the actor baseline GY) → {x, y, k}
//   antAt(x, y, sc, dir, o)  a profile ant (series/creatures/ant.antSide) on the floor; dir = 1 moving right, −1 moving left
//   dab(x, y, k, o)          one pheromone dab lying on the floor (ellipse, mint), only for investigation mode
const { PALETTE: P, LINE, S } = require('../engine/core');
const A = require('../creatures/ant'), PH = require('../creatures/pheromone');
const HY = 760, GY = 1180, Z0 = 1, F = 1;
const NEST_X = -380, LEG_X = 900;              // world positions on the wall / mid-floor (camX = 0 → centred view)
function proj(X, Z, camX = 0) { const k = Z0 / Z; return { x: 540 + (X - camX) * k, y: HY + (GY - HY) * k, k }; }
function lowBack(o = {}) {
  const cx = o.camX || 0;
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#EADFCB"/>`;
  // wall: cabinet doors (tall at this height) and the kick plate, parallax .35
  const wx = -cx * .35;
  g += `<g transform="translate(${wx.toFixed(1)},0)"><rect x="-1400" y="-400" width="3900" height="${HY - 140 + 400}" fill="${P.teal}"/>`;
  for (let i = -4; i < 7; i++) { const x = i * 420; g += `<rect x="${x + 14}" y="-200" width="392" height="${HY - 140 + 186}" rx="14" fill="${P.tealMid}" ${S(6)}/><rect x="${x + 44}" y="-170" width="332" height="${HY - 140 + 126}" rx="8" fill="none" stroke="${P.teal}" stroke-width="6"/><circle cx="${x + (i % 2 ? 60 : 360)}" cy="${HY - 300}" r="13" fill="${P.orange}" ${S(4)}/>`; }
  g += `<rect x="-1400" y="${HY - 140}" width="3900" height="140" fill="#173A37"/><path d="M-1400,${HY - 140} L2500,${HY - 140}" ${S(6)}/>`;
  g += `<path d="M${NEST_X - 90},${HY} C${NEST_X - 80},${HY - 70} ${NEST_X + 80},${HY - 70} ${NEST_X + 90},${HY} Z" fill="#0E0A09" ${S(5)}/></g>`;
  // floor tiles in perspective (joints across get closer toward the wall; joints along the view meet at the horizon)
  let y = HY, d = 10;
  while (y < 2100) { g += `<path d="M-400,${y.toFixed(1)} L1480,${y.toFixed(1)}" stroke="#D6C7AE" stroke-width="${(2 + (y - HY) / 160).toFixed(1)}"/>`; y += d; d *= 1.32; }
  const i0 = Math.floor(cx / 260) - 30;
  for (let i = i0; i <= i0 + 60; i++) { const X = i * 260; const p = proj(X, 5, cx), q = proj(X, .4, cx);
    g += `<path d="M${p.x.toFixed(1)},${p.y.toFixed(1)} L${q.x.toFixed(1)},${q.y.toFixed(1)}" stroke="#D6C7AE" stroke-width="4"/>`; }
  g += `<rect x="-400" y="${HY}" width="1880" height="40" fill="#000" opacity=".06"/>`;
  // stool leg in the middle distance, parallax .6
  const lx = LEG_X - cx * .6;
  if (lx > -300 && lx < 1400) g += `<ellipse cx="${(lx + 30).toFixed(1)}" cy="${HY + 132}" rx="130" ry="16" fill="#000" opacity=".14"/><rect x="${(lx - 70).toFixed(1)}" y="-200" width="140" height="${HY + 330}" fill="${P.wood}" ${S(7)}/><path d="M${(lx - 40).toFixed(1)},-200 L${(lx - 40).toFixed(1)},${HY + 120}" stroke="#D2A777" stroke-width="8"/><path d="M${(lx + 40).toFixed(1)},-200 L${(lx + 40).toFixed(1)},${HY + 126}" stroke="#A47548" stroke-width="10"/>`;
  if (o.inv) g += `<rect x="-400" y="-400" width="1880" height="2800" fill="${PH.TINT}" opacity="${(.36 * o.inv).toFixed(3)}"/>`;
  return g;
}
function antAt(x, y, sc, dir = 1, o = {}) {
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(dir * sc).toFixed(3)},${sc.toFixed(3)})">${A.antSide(o)}${o.carry ? `<g transform="translate(36,-14) rotate(10) scale(.8)"><path d="M-7,-8 L6,-9 L10,1 L5,9 L-6,8 L-10,0 Z" fill="${A.COL.CRUMB}" stroke="${LINE}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="-1" cy="-2" r="1.6" fill="${A.COL.CRUMB_D}"/></g>` : ''}</g>`;
}
const dab = (x, y, k, o = {}) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(22 * k * (o.size || 1)).toFixed(1)}" ry="${(6.5 * k * (o.size || 1)).toFixed(1)}" fill="${PH.MINT}" opacity="${(o.op ?? .85).toFixed(3)}"/>` +
  (o.glow ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(40 * k).toFixed(1)}" ry="${(12 * k).toFixed(1)}" fill="${PH.MINT_D}" opacity="${(.3 * o.glow).toFixed(3)}" filter="url(#pherGlow)"/>` : '');
module.exports = { lowBack, proj, antAt, dab, HY, GY, NEST_X, LEG_X };
