// WHYSCAPE PHEROMONE LAYER (kit v1.4, EP03) — an EXPLANATORY visualisation of a chemical trail, never a real glowing line.
// It is only drawn inside "investigation mode" (a lens / tinted layer). Outside that mode the floor stays plain.
//   DEFS                         filters (soft glow) used by the layer
//   tint(o)                      investigation tint: cool, slightly darker floor so the trail can read
//   trail(r, s0, s1, I, o)       dabs along route r (from series/creatures/ant route()) between arc lengths s0..s1,
//                                intensity I (0 = gone … 1 = one ant … 2+ = busy trail). o.seed jitters the dabs, o.pulse (0..1) breathes.
//   lensRing(cx, cy, r, label)   the lens rim that marks the investigation window (dark frame + orange ring)
const { at } = require('./ant');
const MINT = '#8EF3DF', MINT_D = '#2FB8A2', TINT = '#123A36';
const DEFS = `<filter id="pherGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>`;
const tint = (o = {}) => `<rect x="-900" y="-900" width="2880" height="3720" fill="${TINT}" opacity="${o.op ?? .36}"/>`;
function trail(r, s0, s1, I, o = {}) {
  if (I <= .01 || s1 - s0 < 2) return '';
  const k = Math.min(1, I), big = Math.min(1, Math.max(0, I - 1));
  const step = o.step || 24, seed = o.seed || 0, pulse = o.pulse || 0;
  let pts = [], dabs = '';
  for (let s = s0; s <= s1; s += 6) { const p = at(r, s); pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`); }
  const under = `<polyline points="${pts.join(' ')}" fill="none" stroke="${MINT_D}" stroke-width="${(18 + 26 * big).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(.28 * k + .2 * big).toFixed(3)}" filter="url(#pherGlow)"/>`;
  const first = Math.ceil(s0 / step) * step;
  for (let s = first; s <= s1; s += step) {
    const i = Math.round(s / step), p = at(r, s), a = (p.ang + 90) * Math.PI / 180, j = 5 * Math.sin(i * 2.3 + seed);
    const rr = (3.2 + 2.2 * k + 2.6 * big) * (1 + .18 * pulse * Math.sin(i * .9 + pulse * 6));
    dabs += `<circle cx="${(p.x + Math.cos(a) * j).toFixed(1)}" cy="${(p.y + Math.sin(a) * j).toFixed(1)}" r="${rr.toFixed(2)}" fill="${MINT}" opacity="${(.45 + .5 * k).toFixed(3)}"/>`;
  }
  return under + dabs;
}
function lensRing(cx, cy, r, label = '') {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#231E1A" stroke-width="16"/><circle cx="${cx}" cy="${cy}" r="${r - 10}" fill="none" stroke="#F2A53A" stroke-width="5"/>`;
}
module.exports = { DEFS, tint, trail, lensRing, MINT, MINT_D, TINT };
