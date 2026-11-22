// LOCATION KIT v1.11 (EP10 "Sehari Tanpa Pohon") — street trees and what they do, as readable explainer props.
// Flat fills, #231E1A outline, kit palette. Anchors: (x, y) = bottom-centre unless noted; s = scale.
// Content rules baked in: no thermometer numbers, no "whole city" meters; heat = warm tint + slow shimmer (not fire);
// rain = drops + one drain path (no flood imagery); vanishing = leaves lifting away (no destruction, no stumps/chainsaws).
const { PALETTE: P, LINE, S, lerp, clamp, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash } = H;

const CN = {
  leaf: '#4E9A83', leafD: '#2F6F60', leafL: '#7DBFA0', trunk: '#8A6446', trunkD: '#6B4A33', soil: '#9C7A55', soilD: '#7E5F3E', grate: '#5A6463',
  walk: '#E3DACB', walkD: '#D3C8B4', kerb: '#C9BFAE', road: '#4A5453', roadL: '#5B6564', verge: '#B9C99A', vergeD: '#9FB482',
  heat: '#F2A53A', heatD: '#E07A5F', cool: '#9FD8E6', water: '#7FC3DB', waterD: '#4E9CB8', vapor: '#E8F6FA', shade: '#2F4A47',
  angkot: '#3FA68F', angkotD: '#2C7A69', sky: { night: '#2B3557', dawn: '#F3D9B8', day: '#CFE6EE', noon: '#E6EEDF', dusk: '#F0B98A', rain: '#9FAEB3' },
};

// ---------- the street tree ----------
// k = vanish 0..1 (0 = whole tree; leaves lift away first, then the trunk sinks into its pit). ghost = dashed outline only (memory / "biasanya").
const CLUST = [[-170, -330, 120], [170, -340, 125], [-60, -430, 140], [90, -440, 130], [0, -360, 150], [-230, -250, 90], [235, -255, 92], [-110, -520, 96], [120, -520, 92]];
function canopyPath(s, inflate = 0) { return CLUST.map(([x, y, r]) => `<circle cx="${f1(x * s)}" cy="${f1(y * s)}" r="${f1((r + inflate) * s)}"/>`).join(''); }
function streetTree(x, y, s, t, o = {}) {
  const k = clamp(o.k || 0), sw = (o.sway ?? 1) * 6 * Math.sin(t * .9 + x * .01) * s, seed = o.seed || 0;
  const leafK = eio(clamp(k / .7)), trunkK = eio(clamp((k - .45) / .55));
  if (o.ghost) {
    const go = o.ghost;
    return `<g transform="translate(${f1(x)},${f1(y)})" opacity="${f3(go)}"><g fill="none" stroke="${o.ghostCol || '#FBF6EC'}" stroke-width="${f1(7)}" stroke-dasharray="18 14" stroke-linecap="round">
      <path d="M${f1(-16 * s)},0 L${f1(-12 * s)},${f1(-300 * s)} M${f1(16 * s)},0 L${f1(12 * s)},${f1(-300 * s)}"/>${canopyPath(s).replace(/<circle/g, '<circle fill="none"')}</g></g>`;
  }
  let g = '';
  if (trunkK < 1) {
    const th = 300 * s * (1 - trunkK);
    g += `<path d="M${f1(-18 * s)},0 C${f1(-14 * s)},${f1(-th * .5)} ${f1(-12 * s)},${f1(-th * .8)} ${f1(-10 * s)},${f1(-th)} L${f1(10 * s)},${f1(-th)} C${f1(12 * s)},${f1(-th * .8)} ${f1(14 * s)},${f1(-th * .5)} ${f1(18 * s)},0 Z" fill="${CN.trunk}" ${S(5)}/>`;
    if (trunkK < .3) g += `<path d="M${f1(-6 * s)},${f1(-th * .62)} L${f1(-70 * s)},${f1(-th * .9)} M${f1(6 * s)},${f1(-th * .7)} L${f1(80 * s)},${f1(-th * .98)}" stroke="${CN.trunkD}" stroke-width="${f1(12 * s)}" stroke-linecap="round" opacity="${f3(1 - trunkK / .3)}"/>`;
  }
  if (leafK < 1) {
    const sc = 1 - .35 * leafK, lift = -120 * s * leafK;
    g += `<g transform="translate(${f1(sw)},${f1(lift)}) scale(${f3(sc)})" opacity="${f3(1 - leafK)}">
      <g fill="${CN.leafD}" ${S(5)}>${canopyPath(s, 6)}</g><g fill="${CN.leaf}">${canopyPath(s)}</g>
      ${[[-120, -380], [60, -470], [150, -330], [-30, -300], [-190, -280]].map(([a, b], i) => `<circle cx="${f1(a * s)}" cy="${f1(b * s)}" r="${f1(26 * s)}" fill="${CN.leafL}" opacity=".7"/>`).join('')}</g>`;
  }
  if (k > 0 && k < 1) g += leafBurst(0, -360 * s, s, k, seed);
  return `<g transform="translate(${f1(x)},${f1(y)})">${g}</g>`;
}
function leafBurst(x, y, s, k, seed = 0) {            // leaves drifting up and away while the canopy goes (k 0..1)
  let g = '';
  for (let i = 0; i < 16; i++) {
    const a = hash(seed + i) * Math.PI * 2, r = (120 + 160 * hash(seed + i * 3)) * s, kk = clamp(k * 1.3 - hash(seed + i * 5) * .3);
    if (kk <= 0 || kk >= 1) continue;
    const px = x + Math.cos(a) * r * (.4 + .8 * kk), py = y + Math.sin(a) * r * .5 - 260 * s * kk, rot = 360 * kk * (hash(seed + i * 7) > .5 ? 1 : -1);
    g += `<path transform="translate(${f1(px)},${f1(py)}) rotate(${f1(rot)}) scale(${f3(s * 1.2)})" d="M-16,0 C-8,-9 8,-9 16,0 C8,9 -8,9 -16,0 Z" fill="${i % 3 ? CN.leaf : CN.leafL}" ${S(2.5)} opacity="${f3(1 - kk)}"/>`;
  }
  return g;
}
function treePit(x, y, s = 1, o = {}) {                // square soil pit with a grate, on the sidewalk (stays after the tree is gone)
  const w = 120 * s;
  return `<g transform="translate(${f1(x)},${f1(y)})"><path d="M${f1(-w)},0 L${f1(w)},0 L${f1(w * .86)},${f1(16 * s)} L${f1(-w * .86)},${f1(16 * s)} Z" fill="${o.wet ? CN.soilD : CN.soil}" ${S(4)}/>
    ${[-.6, -.2, .2, .6].map(q => `<path d="M${f1(q * w)},${f1(1)} L${f1(q * w * .9)},${f1(15 * s)}" stroke="${CN.grate}" stroke-width="3"/>`).join('')}</g>`;
}
// shade under a canopy: soft cone from the canopy down to the ground, shifted by the sun (dx = shadow lean), plus a dappled ground patch.
function shadeCone(x, yTop, yGround, w, dx, o = {}) {
  const op = o.o ?? .22, k = o.k ?? 1;
  if (k <= 0) return '';
  const hw = w * .5;
  let g = `<path d="M${f1(x - hw)},${f1(yTop)} L${f1(x + hw)},${f1(yTop)} L${f1(x + hw * .9 + dx)},${f1(yGround)} L${f1(x - hw * .9 + dx)},${f1(yGround)} Z" fill="${CN.shade}" opacity="${f3(op * .55 * k)}"/>`;
  g += `<ellipse cx="${f1(x + dx)}" cy="${f1(yGround)}" rx="${f1(hw * .95)}" ry="${f1(22)}" fill="${CN.shade}" opacity="${f3(op * 1.4 * k)}"/>`;
  for (let i = 0; i < 7; i++) g += `<ellipse cx="${f1(x + dx + (hash(i * 13 + x) - .5) * hw * 1.4)}" cy="${f1(yGround + (hash(i * 7 + x) - .5) * 18)}" rx="${f1(10 + 10 * hash(i))}" ry="5" fill="#FBF6EC" opacity="${f3(.35 * k)}"/>`;
  return g;
}

// ---------- street furniture ----------
function angkotStop(x, y, s = 1) {                     // a pole with a small minibus sign and a bench (no brand, no route numbers)
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-8" y="-420" width="16" height="420" fill="${P.teal}" ${S(4)}/>
    <rect x="-70" y="-500" width="140" height="96" rx="16" fill="#FBF6EC" ${S(5)}/><rect x="-46" y="-480" width="92" height="44" rx="10" fill="${CN.angkot}" ${S(4)}/><circle cx="-26" cy="-430" r="10" fill="${LINE}"/><circle cx="26" cy="-430" r="10" fill="${LINE}"/><rect x="-36" y="-472" width="30" height="18" rx="4" fill="#DFF3F8"/>
    <rect x="70" y="-110" width="220" height="18" rx="6" fill="${P.wood}" ${S(4)}/><path d="M90,-92 L90,0 M270,-92 L270,0" ${S(8)}/></g>`;
}
function streetLamp(x, y, s = 1, on = 0) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M0,0 L0,-520 Q0,-560 40,-560 L80,-560" fill="none" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/><path d="M0,0 L0,-520 Q0,-560 40,-560 L80,-560" fill="none" stroke="#5A6463" stroke-width="8" stroke-linecap="round"/>
    <path d="M60,-566 L110,-566 L100,-546 L70,-546 Z" fill="${on ? '#FFE3A3' : '#DCD6C8'}" ${S(4)}/>${on ? `<circle cx="85" cy="-540" r="70" fill="#FFE3A3" opacity="${f3(.25 * on)}"/>` : ''}</g>`;
}
function angkot(x, y, s, t, o = {}) {                  // small minibus, side view facing right (o.flip faces left); wheels turn with o.dist
  const d = o.dist || 0, fl = o.flip ? -1 : 1, wheel = (cx) => `<g transform="translate(${cx},-34)"><circle r="38" fill="${LINE}"/><circle r="18" fill="#BFB6A4" ${S(3)}/><path d="M-14,0 L14,0" stroke="${LINE}" stroke-width="5" transform="rotate(${f1(d * 1.4)})"/></g>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s * fl)},${f3(s)})"><path d="M-260,-60 L-260,-250 Q-260,-280 -230,-280 L140,-280 Q180,-280 200,-240 L250,-150 L262,-150 L262,-60 Z" fill="${CN.angkot}" ${S(6)}/>
    <rect x="-240" y="-250" width="330" height="70" rx="10" fill="#DFF3F8" ${S(4)}/><path d="M-130,-250 L-130,-180 M-20,-250 L-20,-180" ${S(4)}/><path d="M120,-250 L176,-250 L226,-160 L120,-160 Z" fill="#DFF3F8" ${S(4)}/>
    <rect x="-262" y="-140" width="524" height="18" fill="${CN.angkotD}"/><rect x="-262" y="-112" width="524" height="10" fill="#F2C94C"/><rect x="200" y="-110" width="26" height="16" rx="4" fill="#F6E2A0" ${S(3)}/>${wheel(-160)}${wheel(160)}</g>`;
}
function umbrella(x, y, s = 1, open = 1, rot = 0, col = P.orange) {     // (x, y) = hand grip; canopy above, open 0..1
  const w = 210 * (.25 + .75 * eout(open)), h = 90 * (.6 + .4 * open), L = 360;
  const ribs = [-1, -.5, 0, .5, 1].map(q => `<path d="M0,${-L} Q${f1(q * w * .6)},${f1(-L - h * .7)} ${f1(q * w)},${f1(-L + 12)}" fill="none" stroke="${LINE}" stroke-width="3" opacity=".55"/>`).join('');
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><path d="M0,24 L0,${-L - h}" ${S(6)}/><path d="M0,24 Q0,46 -18,46" fill="none" ${S(6)}/>
    <path d="M${f1(-w)},${-L + 12} Q${f1(-w)},${f1(-L - h * 1.1)} 0,${f1(-L - h * 1.15)} Q${f1(w)},${f1(-L - h * 1.1)} ${f1(w)},${-L + 12} Q${f1(w * .75)},${-L - 4} ${f1(w * .5)},${-L + 12} Q${f1(w * .25)},${-L - 4} 0,${-L + 12} Q${f1(-w * .25)},${-L - 4} ${f1(-w * .5)},${-L + 12} Q${f1(-w * .75)},${-L - 4} ${f1(-w)},${-L + 12} Z" fill="${col}" ${S(5)}/>${ribs}
    <path d="M${f1(-w * .55)},${f1(-L - h * .5)} Q${f1(-w * .3)},${f1(-L - h * .95)} 0,${f1(-L - h)}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/></g>`;
}
function acIndoor(x, y, s = 1, on = 0, t = 0) {        // wall split unit; on 0..1 opens the flap and shows cool air lines
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-130" y="-60" width="260" height="70" rx="18" fill="#F7F4EC" ${S(5)}/><path d="M-110,${f1(8 + 10 * on)} L110,${f1(8 + 10 * on)}" ${S(5)}/><circle cx="100" cy="-38" r="7" fill="${on > .5 ? '#5BC8A0' : '#C9C1B1'}" ${S(2)}/>`;
  if (on > 0) for (let i = 0; i < 4; i++) { const ph = (t * .9 + i * .25) % 1; g += `<path d="M${-80 + i * 50},${f1(30 + 60 * ph)} q20,14 0,28" fill="none" stroke="${CN.cool}" stroke-width="7" stroke-linecap="round" opacity="${f3(on * (1 - ph))}"/>`; }
  return g + '</g>';
}
function acOutdoor(x, y, s = 1, t = 0, spin = 0) {     // outdoor unit on the wall; spin 0..1 fan speed (angle integrates t)
  const a = (t * 900 * spin) % 360;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-110" y="-150" width="220" height="150" rx="12" fill="#ECE7DC" ${S(5)}/><circle cx="-20" cy="-75" r="56" fill="#D9D2C3" ${S(4)}/>
    <g transform="translate(-20,-75) rotate(${f1(a)})">${[0, 120, 240].map(r => `<path transform="rotate(${r})" d="M0,0 C10,-20 30,-40 8,-50 C-6,-40 -6,-20 0,0 Z" fill="#9AA6A4" ${S(2.5)}/>`).join('')}</g>
    ${[-50, -35, -20].map(yy => `<path d="M50,${yy - 40} L90,${yy - 40}" ${S(3)}/>`).join('')}<path d="M-110,0 L-110,24 M110,0 L110,24" ${S(6)}/></g>`;
}
function kwhMeter(x, y, s = 1, t = 0, rate = 0) {      // round analog meter: the disc mark turns faster with rate (no numbers)
  const a = (t * 360 * rate) % 360;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-56" y="-80" width="112" height="140" rx="16" fill="#E7E1D3" ${S(4)}/><circle cx="0" cy="-20" r="40" fill="#F7F4EC" ${S(3)}/>
    <ellipse cx="0" cy="30" rx="38" ry="8" fill="#B9B2A3" ${S(2)}/><rect x="${f1(-4 + 30 * Math.sin(a * Math.PI / 180))}" y="24" width="8" height="12" fill="${P.orange}" opacity="${f3(Math.cos(a * Math.PI / 180) > -.2 ? 1 : .3)}"/>
    <path d="M0,-20 L${f1(26 * Math.sin(a * Math.PI / 90))},${f1(-20 - 26 * Math.cos(a * Math.PI / 90))}" ${S(4)}/></g>`;
}
function clockFace(x, y, r, minutes, o = {}) {        // simple wall clock (time-lapse); minutes since 0:00
  const hA = (minutes / 720) * 360, mA = (minutes % 60) * 6;
  return `<g transform="translate(${f1(x)},${f1(y)})"><circle r="${r}" fill="#FBF6EC" ${S(5)}/>${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M0,${-r + 8} L0,${-r + 18}" ${S(4)}/>`).join('')}
    <path transform="rotate(${f1(hA)})" d="M0,0 L0,${f1(-r * .5)}" ${S(7)}/><path transform="rotate(${f1(mA)})" d="M0,0 L0,${f1(-r * .78)}" ${S(4)}/><circle r="5" fill="${LINE}"/></g>`;
}
function thermo(x, y, s = 1, level = .5, o = {}) {     // thermometer icon WITHOUT numbers (level 0..1)
  const H0 = 150, lv = clamp(level);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-16" y="${-H0}" width="32" height="${H0}" rx="16" fill="#FBF6EC" ${S(4)}/><circle cx="0" cy="18" r="30" fill="${CN.heatD}" ${S(4)}/>
    <rect x="-7" y="${f1(-H0 * lv + 4)}" width="14" height="${f1(H0 * lv + 10)}" fill="${CN.heatD}"/>${[.25, .5, .75].map(q => `<path d="M16,${f1(-H0 * q)} L28,${f1(-H0 * q)}" ${S(3)}/>`).join('')}</g>`;
}
function heatShimmer(x0, x1, y, t, k = 1, o = {}) {   // slow wavy lines rising from a warm surface (k = strength); not flames
  if (k <= 0) return '';
  let g = ''; const n = Math.max(2, Math.round((x1 - x0) / (o.gap || 120))), hgt = o.h || 160, col = o.col || CN.heat;
  for (let i = 0; i < n; i++) {
    const ph = (t * (o.speed || .35) + hash(i * 5 + x0) ) % 1, x = x0 + (i + .5) * (x1 - x0) / n, yy = y - hgt * ph;
    g += `<path d="M${f1(x)},${f1(yy)} q14,-22 0,-44 q-14,-22 0,-44" fill="none" stroke="${col}" stroke-width="${f1(o.w || 7)}" stroke-linecap="round" opacity="${f3(k * .75 * Math.sin(Math.PI * ph))}"/>`;
  }
  return g;
}
function warmTint(x, y, w, h, k, o = {}) {             // surface warming as a warm overlay (k 0..1)
  if (k <= 0) return '';
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${o.rx || 0}" fill="${o.col || CN.heat}" opacity="${f3(k * (o.o ?? .32))}"/>`;
}
function vaporWisp(x, y, t, k = 1, seed = 0, s = 1) {  // water vapour leaving a leaf: small rising curl
  const ph = (t * .5 + hash(seed)) % 1;
  return `<path d="M${f1(x)},${f1(y - 70 * s * ph)} q${f1(12 * s)},${f1(-16 * s)} 0,${f1(-32 * s)} q${f1(-12 * s)},${f1(-16 * s)} 0,${f1(-32 * s)}" fill="none" stroke="${CN.vapor}" stroke-width="${f1(8 * s)}" stroke-linecap="round" opacity="${f3(k * .9 * Math.sin(Math.PI * ph))}"/>`;
}
function drop(x, y, s = 1, col = CN.water, o = 1) { return `<path transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})" d="M0,-16 C6,-6 10,0 10,6 C10,12 5,16 0,16 C-5,16 -10,12 -10,6 C-10,0 -6,-6 0,-16 Z" fill="${col}" ${S(2.5)} opacity="${f3(o)}"/>`; }
function sunDisc(x, y, r = 70, glow = 1) {
  return `<g><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.9)}" fill="#FFE3A3" opacity="${f3(.28 * glow)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#FFD27A" ${S(5)}/></g>`;
}
function moon(x, y, r = 50) { return `<g><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.8)}" fill="#F6F3EB" opacity=".12"/><path d="M${f1(x + r * .3)},${f1(y - r)} A${r},${r} 0 1,0 ${f1(x + r * .3)},${f1(y + r)} A${f1(r * .75)},${f1(r * .75)} 0 1,1 ${f1(x + r * .3)},${f1(y - r)} Z" fill="#F6F3EB" ${S(4)}/></g>`; }
function cloud(x, y, s = 1, col = '#F6F3EB') {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-120,20 C-150,20 -150,-20 -118,-24 C-110,-60 -60,-70 -36,-44 C-20,-80 50,-80 60,-36 C100,-46 130,-10 110,20 Z" fill="${col}" ${S(5)}/></g>`;
}
// street cross-section under the road: soil layer, kerb gutter with an inlet and a pipe (for "tanah, saluran")
function drainCut(x0, x1, yRoad, o = {}) {
  const d = o.depth || 520;
  let g = `<rect x="${f1(x0)}" y="${f1(yRoad)}" width="${f1(x1 - x0)}" height="${f1(d)}" fill="${CN.soil}" ${S(5)}/><rect x="${f1(x0)}" y="${f1(yRoad)}" width="${f1(x1 - x0)}" height="40" fill="${CN.road}" ${S(4)}/>`;
  for (let i = 0; i < 40; i++) g += `<circle cx="${f1(x0 + hash(i * 3) * (x1 - x0))}" cy="${f1(yRoad + 70 + hash(i * 5) * (d - 100))}" r="${f1(5 + 6 * hash(i))}" fill="${CN.soilD}" opacity=".6"/>`;
  return g;
}

function rainLines(x0, x1, y0, y1, t, k = 1, o = {}) {   // denser, lighter rain streaks than waste.rain (reads on grey skies)
  let g = ''; const n = Math.round((o.n || 140) * k * (x1 - x0) / 2000), len = o.len || 46;
  for (let i = 0; i < n; i++) { const sp = 1300 + 500 * hash(i * 1.7), x = x0 + hash(i * 3.3) * (x1 - x0), y = y0 + ((t * sp + hash(i * 7.1) * (y1 - y0)) % (y1 - y0));
    g += `<path d="M${f1(x)},${f1(y)} l-10,${len}" stroke="${o.col || '#EEF6F8'}" stroke-width="${o.w || 6}" stroke-linecap="round" opacity="${f3((o.o ?? .8) * Math.min(1, k))}"/>`; }
  return g;
}

const CN_DEFS = `<radialGradient id="cnHeat"><stop offset="0" stop-color="#F2A53A" stop-opacity=".55"/><stop offset=".6" stop-color="#F2A53A" stop-opacity=".18"/><stop offset="1" stop-color="#F2A53A" stop-opacity="0"/></radialGradient>
  <radialGradient id="cnCool"><stop offset="0" stop-color="#9FD8E6" stop-opacity=".5"/><stop offset="1" stop-color="#9FD8E6" stop-opacity="0"/></radialGradient>`;

module.exports = { CN, CN_DEFS, rainLines, streetTree, leafBurst, treePit, shadeCone, angkotStop, streetLamp, angkot, umbrella, acIndoor, acOutdoor, kwhMeter, clockFace, thermo, heatShimmer, warmTint, vaporWisp, drop, sunDisc, moon, cloud, drainCut, CLUST };
