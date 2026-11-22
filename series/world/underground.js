// LOCATION KIT v1.8 (EP07 "Terowongan") — reusable city-cutaway / infrastructure library ("proses/infrastruktur").
// Longitudinal section grammar: surface y = 0 (road top), +y goes DOWN into the ground, x runs along the street.
// Everything is drawn in one world space so street, cars, buildings, soil, utilities and works move together under one camera.
// Generic only: nothing here is MRT-Jakarta-specific (TBM / train / ring live in the episode folder).
const { PALETTE: P, LINE, S, lerp, clamp, prog, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash, noise } = H;

const U = {
  asphalt: '#6F7472', asphaltD: '#5C615F', lane: '#EDE6D6', curb: '#C9C2B4', walk: '#DCD2BF',
  fill: '#C9A57A', clay: '#B0855C', silt: '#C7A06E', sand: '#D9BC86', deep: '#9C7650', water: '#8FD3E3',
  pipe: '#5DA9C9', pipeD: '#3F7F9A', cable: '#E08A3C', cableD: '#B5532A', gas: '#E7C46A',
  concrete: '#C9C6BD', concreteD: '#A8A59C', concreteL: '#E3E0D6', steel: '#8E9A9C', steelD: '#5E6A6C', steelL: '#C3CDCF',
  yellow: '#F2C14E', orange: '#F28C28', fence: '#F6F3EB', fenceStripe: '#E0572F', grass: '#9DB87A',
};
// soil strata (depth bands, px). A "label" is only for notes — the scene decides whether to show any text.
const STRATA = [
  { y0: 0, y1: 230, col: U.fill, label: 'urugan' },
  { y0: 230, y1: 620, col: U.clay, label: 'lempung' },
  { y0: 620, y1: 980, col: U.silt, label: 'lanau' },
  { y0: 980, y1: 1420, col: U.sand, label: 'pasir padat' },
  { y0: 1420, y1: 7000, col: U.deep, label: 'lapisan dalam' },
];
// soil section between x0..x1 (world). o.gap: exploded-view gap per layer (pop-up), o.hi: index to highlight (0..1 glow k)
function soil(x0, x1, t, o = {}) {
  const gap = o.gap || 0, hi = o.hi || {};
  let g = '';
  STRATA.forEach((L, i) => {
    const dy = gap * i, y0 = L.y0 + dy, y1 = Math.min(L.y1, o.bottom || 7000) + dy;
    g += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" fill="${L.col}"/>`;
    // texture: pebbles / strokes, world-indexed so they never swim
    const step = 90, a = Math.floor(x0 / step), b = Math.ceil(x1 / step);
    for (let k = a; k <= b; k++) for (let r = 0; r < 3; r++) {
      const hh = hash(k * 17.3 + r * 5.1 + i * 31), x = k * step + 60 * hh, y = y0 + (y1 - y0) * ((r + .5) / 3 + (hash(k * 3.1 + r + i) - .5) * .25);
      if (y > y1 - 10) continue;
      g += i === 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 + 5 * hh)}" fill="#A88A62" opacity=".55"/>`
        : i === 3 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2.5 + 2 * hh)}" fill="#BFA06A" opacity=".8"/><circle cx="${f1(x + 14)}" cy="${f1(y + 6)}" r="2" fill="#BFA06A" opacity=".8"/>`
        : `<path d="M${f1(x)},${f1(y)} q16,-6 32,0 t30,0" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" opacity=".12"/>`;
    }
    if (gap > 0) g += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" fill="none" ${S(5)}/>`;
    if (hi[i] > 0) g += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" fill="#fff" opacity="${f3(.18 * hi[i])}"/><path d="M${f1(x0)},${f1(y0 + 3)} L${f1(x1)},${f1(y0 + 3)}" stroke="${P.orange}" stroke-width="8" opacity="${f3(hi[i])}"/>`;
  });
  return g;
}
// buried utilities along the street (pipe = circle-ish section run as a long band in a longitudinal view)
function pipeRun(x0, x1, y, r, col, o = {}) {
  const hl = o.hi || 0;
  return `<rect x="${f1(x0)}" y="${f1(y - r)}" width="${f1(x1 - x0)}" height="${f1(2 * r)}" rx="${f1(r)}" fill="${col}" ${S(4)}/><rect x="${f1(x0)}" y="${f1(y - r * .55)}" width="${f1(x1 - x0)}" height="${f1(r * .35)}" fill="#fff" opacity=".3"/>`
    + (hl > 0 ? `<rect x="${f1(x0 - 6)}" y="${f1(y - r - 6)}" width="${f1(x1 - x0 + 12)}" height="${f1(2 * r + 12)}" rx="${f1(r + 6)}" fill="none" stroke="${P.orange}" stroke-width="7" opacity="${f3(hl)}"/>` : '');
}
// street surface + sidewalk (section line at y = 0), world-indexed lane dashes
function street(x0, x1, o = {}) {
  let g = `<rect x="${f1(x0)}" y="-18" width="${f1(x1 - x0)}" height="18" fill="${U.asphalt}" ${S(4)}/>`;
  for (let k = Math.floor(x0 / 160); k <= Math.ceil(x1 / 160); k++) g += `<rect x="${k * 160}" y="-12" width="80" height="5" fill="${U.lane}" opacity=".7"/>`;
  return g;
}
// building facades standing on y = 0, world-indexed (same building at the same x every frame)
const BCOLS = ['#E7DCC6', '#D3DDD8', '#EADBC3', '#CFDCD6', '#E2CFB6', '#D8E2E0'];
function buildingRect(k, o = {}) {               // geometry of building k (same formula as buildings()) — for highlights / anchors
  const step = o.step || 300, seed = o.seed || 1, hh = hash(k * 9.7 + seed), w = step * (.62 + .3 * hash(k * 2.3 + seed)), h = (o.hMin || 380) + (o.hVar || 520) * hh;
  return { x: k * step + (step - w) / 2, w, h };
}
function buildings(x0, x1, o = {}) {
  const step = o.step || 300, seed = o.seed || 1, y = o.y || 0; let g = '';
  for (let k = Math.floor(x0 / step) - 1; k <= Math.ceil(x1 / step); k++) {
    if (o.skip && o.skip(k * step)) continue;
    const hh = hash(k * 9.7 + seed), w = step * (.62 + .3 * hash(k * 2.3 + seed)), h = (o.hMin || 380) + (o.hVar || 520) * hh;
    const x = k * step + (step - w) / 2;
    g += H.building(x, y - (o.lift || 0), w, h, BCOLS[(k % 6 + 6) % 6], k + seed, { line: o.line ?? 5, lit: .15, ww: 40, wh: 54, roofC: hh > .6 ? '#9AA6A4' : null });
  }
  return g;
}
// trees on the sidewalk
const sideTree = (x, t, s = 1) => H.tree(x, -18, s, t, { seed: Math.round(x) });
// flowing traffic along the street: cars at world positions that move with a constant speed (wrap over a period)
function traffic(x0, x1, t, o = {}) {
  const CR = require('./city_road');
  const span = o.span || 4000, v = o.v ?? 260, n = o.n || 6, s = o.s || .62, y = o.y ?? -18; let g = '';
  const cols = ['#7FA7B5', '#E7C46A', '#C96F5A', '#9DB46C', '#F6F3EB', '#5E6F8A'];
  for (let i = 0; i < n; i++) {
    const base = (i / n) * span + 137 * hash(i + (o.seed || 0)), x = ((base + v * t) % span + span) % span + (o.origin || x0 - 400);
    if (x < x0 - 300 || x > x1 + 300) continue;
    if (o.block && o.block(x)) continue;
    g += `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.dir === -1 ? -s : s},${s})">${CR.carSide(0, 0, 1, { col: cols[(i + (o.seed || 0)) % 6], dist: x })}</g>`;
  }
  return g;
}
// construction props ------------------------------------------------------------------------
function fence(x0, x1, y = -18, o = {}) {        // hoarding / barrier panels (no logos)
  let g = ''; const w = 120, h = o.h || 150;
  for (let x = x0; x < x1; x += w) g += `<rect x="${f1(x)}" y="${f1(y - h)}" width="${w - 6}" height="${h}" fill="${U.fence}" ${S(4)}/><path d="M${f1(x + 6)},${f1(y - h + 30)} L${f1(x + w - 12)},${f1(y - h + 30)}" stroke="${U.fenceStripe}" stroke-width="12"/><path d="M${f1(x + 6)},${f1(y - 26)} L${f1(x + w - 12)},${f1(y - 26)}" stroke="${P.tealMid}" stroke-width="8"/>`;
  return g;
}
function cone(x, y = -18, s = 1) { return `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><path d="M-22,0 L-8,-60 L8,-60 L22,0 Z" fill="${U.orange}" ${S(4)}/><path d="M-15,-26 L15,-26" stroke="#fff" stroke-width="8"/><rect x="-28" y="-6" width="56" height="8" rx="3" fill="#3A3F3E"/></g>`; }
// crawler crane: base at (x, y) on ground, boom angle a (deg from horizontal), hook line down to (hx, hy) world
function crane(x, y, t, o = {}) {
  const a = (o.angle ?? 62) * Math.PI / 180, L = o.boom || 1100, tx = x + Math.cos(a) * L * (o.dir || 1), ty = y - 120 - Math.sin(a) * L;
  const hx = o.hookX ?? tx, hy = o.hookY ?? ty + 400;
  return `<rect x="${f1(x - 150)}" y="${f1(y - 50)}" width="300" height="50" rx="20" fill="#3A3F3E" ${S(5)}/>${[-110, -55, 0, 55, 110].map(d => `<circle cx="${f1(x + d)}" cy="${f1(y - 25)}" r="16" fill="#6F7472" ${S(3)}/>`).join('')}
    <rect x="${f1(x - 110)}" y="${f1(y - 170)}" width="220" height="120" rx="12" fill="${U.yellow}" ${S(5)}/><rect x="${f1(x - 80)}" y="${f1(y - 150)}" width="70" height="60" rx="6" fill="#BFE3EC" ${S(4)}/>
    <path d="M${f1(x)},${f1(y - 130)} L${f1(tx)},${f1(ty)}" stroke="${LINE}" stroke-width="30" stroke-linecap="round"/><path d="M${f1(x)},${f1(y - 130)} L${f1(tx)},${f1(ty)}" stroke="${U.yellow}" stroke-width="20" stroke-linecap="round"/>
    ${Array.from({ length: 10 }, (_, i) => { const u = (i + .5) / 10; return `<path d="M${f1(lerp(x, tx, u) - 8)},${f1(lerp(y - 130, ty, u) - 6)} L${f1(lerp(x, tx, u + .05) + 8)},${f1(lerp(y - 130, ty, u + .05) + 6)}" stroke="${LINE}" stroke-width="3"/>`; }).join('')}
    <path d="M${f1(tx)},${f1(ty)} L${f1(hx)},${f1(hy)}" stroke="${LINE}" stroke-width="4"/><path d="M${f1(hx - 14)},${f1(hy)} q14,24 28,0" fill="none" stroke="${LINE}" stroke-width="6"/>`;
}
// dump truck (side, facing +x); load 0..1 shows the heap
function truck(x, y, s = 1, o = {}) {
  const load = o.load ?? 0, spin = ((o.dist || 0) / 34) * 57.3;
  const wheel = wx => `<g transform="translate(${wx},-30)"><circle r="34" fill="#2B2F2E" ${S(6)}/><circle r="15" fill="#C9D3D2" ${S(3)}/><g transform="rotate(${f1(spin)})"><path d="M-12,0 L12,0 M0,-12 L0,12" stroke="#7D8786" stroke-width="4"/></g></g>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><ellipse cx="0" cy="2" rx="230" ry="14" fill="#000" opacity=".15"/>
    <path d="M-230,-60 L-230,-170 L60,-170 L80,-60 Z" fill="${o.col || U.orange}" ${S(6)}/>${load > 0 ? `<path d="M-224,-168 C-190,${f1(-168 - 70 * load)} -60,${f1(-168 - 90 * load)} 54,-168 Z" fill="#8A6A48" ${S(5)}/>` : ''}
    <path d="M-210,-150 L40,-150" stroke="#000" stroke-width="6" opacity=".12"/>
    <path d="M90,-60 L90,-180 C90,-196 100,-204 116,-204 L170,-204 C196,-204 214,-186 220,-160 L232,-100 L232,-60 Z" fill="${o.cab || '#F6F3EB'}" ${S(6)}/><path d="M120,-190 L176,-190 C190,-190 200,-180 204,-166 L210,-136 L120,-136 Z" fill="#BFE3EC" ${S(4)}/>
    <rect x="-236" y="-66" width="474" height="18" rx="6" fill="#3A3F3E" ${S(4)}/>${wheel(-170)}${wheel(-90)}${wheel(170)}</g>`;
}
// excavator (side). arm k 0..1 dig cycle
function excavator(x, y, s = 1, k = 0, o = {}) {
  const boom = -40 + 30 * Math.sin(k * Math.PI * 2), stick = 60 + 40 * Math.cos(k * Math.PI * 2);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><rect x="-140" y="-46" width="280" height="46" rx="22" fill="#3A3F3E" ${S(5)}/>
    <rect x="-120" y="-150" width="200" height="104" rx="14" fill="${U.yellow}" ${S(5)}/><rect x="-100" y="-138" width="70" height="66" rx="6" fill="#BFE3EC" ${S(4)}/>
    <g transform="translate(60,-120) rotate(${f1(boom)})"><rect x="0" y="-16" width="220" height="32" rx="14" fill="${U.yellow}" ${S(5)}/>
      <g transform="translate(210,0) rotate(${f1(stick)})"><rect x="0" y="-12" width="160" height="24" rx="10" fill="${U.yellow}" ${S(4)}/><path d="M150,-10 L196,-4 L190,40 L150,24 Z" fill="#6F7472" ${S(4)}/></g></g></g>`;
}
// diaphragm-wall panel being formed (grab + panel), depth d (world px), k 0..1 progress
const dwall = (x, w, d, o = {}) => `<rect x="${f1(x)}" y="0" width="${f1(w)}" height="${f1(d)}" fill="${U.concrete}" ${S(5)}/><path d="M${f1(x + w / 2)},10 L${f1(x + w / 2)},${f1(d - 10)}" stroke="${U.concreteD}" stroke-width="4" stroke-dasharray="20 18"/>` +
  (o.rebar ? `<path d="M${f1(x + 8)},20 L${f1(x + 8)},${f1(d - 12)} M${f1(x + w - 8)},20 L${f1(x + w - 8)},${f1(d - 12)}" stroke="${U.steelD}" stroke-width="3"/>` : '');
// horizontal strut across an excavation
const strut = (x0, x1, y) => `<rect x="${f1(x0)}" y="${f1(y - 14)}" width="${f1(x1 - x0)}" height="28" fill="${U.steel}" ${S(4)}/><path d="M${f1(x0)},${f1(y)} L${f1(x1)},${f1(y)}" stroke="${U.steelD}" stroke-width="3" stroke-dasharray="40 20"/>`;
// survey tools: total station on tripod, prism target, settlement pin
function totalStation(x, y, s = 1, t = 0) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><path d="M0,-90 L-40,0 M0,-90 L40,0 M0,-90 L0,0" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/><path d="M0,-90 L-40,0 M0,-90 L40,0" stroke="${U.yellow}" stroke-width="3"/>
    <rect x="-22" y="-134" width="44" height="46" rx="8" fill="${U.yellow}" ${S(4)}/><circle cx="${f1(10 * Math.sin(t))}" cy="-112" r="9" fill="#2B3A38" ${S(2)}/></g>`;
}
const prism = (x, y, s = 1, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${s})"><path d="M0,0 L0,-30" stroke="${LINE}" stroke-width="5"/><circle cy="-40" r="14" fill="${P.orange}" ${S(4)}/><circle cy="-40" r="6" fill="#fff"/></g>`;
// borehole investigation rig (small drill mast) with a sample core
function boreRig(x, y, depth, s = 1, k = 1) {
  return `<g><rect x="${f1(x - 60 * s)}" y="${f1(y - 40 * s)}" width="${f1(120 * s)}" height="${f1(40 * s)}" rx="10" fill="${U.orange}" ${S(4)}/><path d="M${f1(x)},${f1(y - 40 * s)} L${f1(x)},${f1(y - 300 * s)}" stroke="${LINE}" stroke-width="${f1(16 * s)}"/><path d="M${f1(x)},${f1(y - 40 * s)} L${f1(x)},${f1(y - 300 * s)}" stroke="${U.yellow}" stroke-width="${f1(9 * s)}"/>
    <path d="M${f1(x)},${f1(y)} L${f1(x)},${f1(y + depth * k)}" stroke="${LINE}" stroke-width="${f1(12 * s)}"/><path d="M${f1(x)},${f1(y)} L${f1(x)},${f1(y + depth * k)}" stroke="${U.steelL}" stroke-width="${f1(6 * s)}"/></g>`;
}
// utility marking: sprayed line on the road surface (seen in section as a short colored dash on top of the asphalt)
const sprayMark = (x, w, col, k = 1) => `<rect x="${f1(x)}" y="-26" width="${f1(w * k)}" height="10" rx="5" fill="${col}"/>`;
// scanner beam (handheld locator → ground), dashed cone
const scanBeam = (x, y, depth, t, o = 1) => `<path d="M${f1(x)},${f1(y)} L${f1(x - 80)},${f1(depth)} L${f1(x + 80)},${f1(depth)} Z" fill="${P.tealGlow}" opacity="${f3(.12 * o)}"/>${[0, 1, 2].map(i => { const u = ((t * 1.2 + i / 3) % 1); return `<path d="M${f1(x - 80 * u)},${f1(lerp(y, depth, u))} L${f1(x + 80 * u)},${f1(lerp(y, depth, u))}" stroke="${P.tealGlow}" stroke-width="5" opacity="${f3(o * (1 - u))}"/>`; }).join('')}`;

module.exports = { U, STRATA, soil, pipeRun, street, buildings, buildingRect, sideTree, traffic, fence, cone, crane, truck, excavator, dwall, strut, totalStation, prism, boreRig, sprayMark, scanBeam };
