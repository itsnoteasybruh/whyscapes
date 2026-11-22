// LOCATION KIT v1.14 (EP13 "Lebah Pulang ke Sarang") — a tropical garden at the edge of a neighbourhood, with FIXED landmarks
// so every view (side panorama, top map, bee's-eye) shows the same places in the same spots.
// World map (px, x = east, y = south on the top map): hive H at (0, 0), entrance facing east; kersen tree T; bamboo fence along
// y = 140; banana row = garden edge at x = EDGE; flower beds beyond; houses north; skyline (tower + twin peaks) far north-east.
// Side panorama = looking north: x on screen = map x; depth layers with parallax (sky 0, skyline .12, houses .4, fence .8, main 1, front 1.3).
const { PALETTE: P, LINE, S, lerp, clamp, eio } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash, noise } = H;

const G = {
  sky: '#D6ECEA', skyWarm: '#F3E2C2', hill: '#BFD7CC', hillD: '#A6C6B8', ground: '#CFE0A8', groundD: '#B7CF8E', soil: '#C9A57A', path: '#E3D3B0',
  hive: '#E8C27A', hiveD: '#C99A4E', roof: '#2A5F5B', stand: '#8A5A2B', trunk: '#7A5230', crown: '#3F8F7F', crownD: '#2A6B5E', crownL: '#6FB59A',
  banana: '#6FB55A', bananaD: '#4C8F3E', bamboo: '#D9B46A', bambooD: '#B08A44', house: ['#EDE4D3', '#F0D9C2', '#D8E3DD'], roofs: ['#B5532A', '#2A5F5B', '#8E6A4C'],
  flowers: ['#F2A53A', '#E0572F', '#F6F3EB', '#C96FA0', '#F2C94C'], stem: '#4C8F3E', mark: '#3FB8A9',
};
// landmark positions (map x, map y) — shared by all views
const LM = { HIVE: [0, 0], TREE: [300, -60], EDGE: 760, BEDS: [[980, -40], [1120, 60], [1260, -90], [1400, 30], [1540, -30]], FENCE: [-300, 820, 140], HOUSES: [[-420, -380], [-150, -420], [180, -440], [520, -400]], SKY: 1700 };

// ---------- pieces (side view, base at (x, y), s = scale) ----------
function hive(x, y, s = 1, t = 0, o = {}) {      // wooden box hive on a stand; entrance slit on the RIGHT (east); a few bees at the door
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  g += `<path d="M-70,0 L-62,-70 M70,0 L62,-70" stroke="${G.stand}" stroke-width="12" stroke-linecap="round"/><rect x="-80" y="-80" width="160" height="14" rx="4" fill="${G.stand}" ${S(4)}/>`;
  g += `<rect x="-74" y="-230" width="148" height="150" rx="8" fill="${G.hive}" ${S(5)}/><path d="M-74,-160 L74,-160" stroke="${G.hiveD}" stroke-width="5"/>`;
  g += `<path d="M-92,-230 L0,-276 L92,-230 Z" fill="${G.roof}" ${S(5)}/>`;
  g += `<rect x="30" y="-104" width="50" height="12" rx="6" fill="${LINE}"/>`;            // entrance slit (east side, toward the viewer's right)
  if (o.hi) g += `<ellipse cx="55" cy="-98" rx="52" ry="28" fill="none" stroke="${P.orange}" stroke-width="7" stroke-dasharray="14 10" opacity="${f3(o.hi)}"/>`;
  // door traffic: tiny bees hovering (deterministic)
  for (let i = 0; i < (o.traffic ?? 3); i++) { const a = t * (1.4 + i * .3) + i * 2.1; g += `<g transform="translate(${f1(70 + 30 * Math.cos(a))},${f1(-120 + 14 * Math.sin(a * 1.3))}) scale(.12)"><ellipse cx="-40" cy="6" rx="38" ry="24" fill="#E7B84A" ${S(10)}/><circle r="22" fill="#F3D58A" ${S(10)}/><ellipse cx="0" cy="-30" rx="40" ry="16" fill="#E8F6F8" opacity=".7"/></g>`; }
  return g + '</g>';
}
// the kersen tree: tall leaning trunk, wide flat umbrella crown with a notch (recognisable silhouette)
function kersen(x, y, s = 1, t = 0, o = {}) {
  const sw = 3 * noise(t * .6, 4);
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  g += `<path d="M-14,0 C-10,-120 10,-200 34,-300 L54,-296 C34,-200 18,-110 16,0 Z" fill="${G.trunk}" ${S(5)}/><path d="M30,-250 C70,-280 110,-290 150,-300" fill="none" stroke="${G.trunk}" stroke-width="16" stroke-linecap="round"/>`;
  g += `<g transform="translate(${f1(sw)},0)"><path d="M-170,-300 C-200,-360 -110,-420 -20,-400 C10,-440 120,-450 170,-400 C250,-410 280,-340 240,-300 C180,-270 120,-300 80,-290 C60,-320 30,-320 10,-292 C-60,-270 -140,-260 -170,-300 Z" fill="${G.crown}" ${S(6)}/>`
    + `<path d="M-120,-330 C-80,-370 -20,-380 20,-370" fill="none" stroke="${G.crownL}" stroke-width="12" stroke-linecap="round" opacity=".8"/>`;
  for (let i = 0; i < 6; i++) g += `<circle cx="${-120 + i * 60}" cy="${-310 - 20 * hash(i)}" r="7" fill="#E0483E" ${S(2.5)}/>`;   // small red kersen fruits
  g += `</g>`;
  if (o.hi) g += `<path d="M-200,-280 C-220,-380 -100,-460 20,-440 C140,-480 290,-420 270,-290" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="20 14" opacity="${f3(o.hi)}"/>`;
  return g + '</g>';
}
function banana(x, y, s = 1, t = 0, seed = 0) {
  const sw = 6 * noise(t * .8, seed);
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-12,0 L-9,-150 L9,-150 L12,0 Z" fill="${G.bananaD}" ${S(4)}/>`;
  [[-1, -150, 30], [1, -150, -20], [-1, -130, 70], [1, -140, 40]].forEach(([sd, yy, a], i) => { const r = a + sw * (i % 2 ? 1 : -1);
    g += `<path transform="translate(0,${yy}) rotate(${f1(sd * (40 + r * .5))})" d="M0,0 C${sd * 40},-30 ${sd * 110},-40 ${sd * 150},-10 C${sd * 110},0 ${sd * 50},6 0,0 Z" fill="${i % 2 ? G.banana : G.bananaD}" ${S(4)}/>`; });
  return g + '</g>';
}
function flowerClump(x, y, s = 1, t = 0, seed = 0, o = {}) {
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  for (let i = 0; i < 7; i++) {
    const hx = -60 + 20 * i + 10 * hash(seed + i), hh = 50 + 50 * hash(seed * 3 + i), sway = 4 * Math.sin(t * 1.6 + i + seed) + (o.dip && i === 3 ? o.dip : 0);
    const col = G.flowers[Math.floor(hash(seed * 7 + i) * 5)];
    g += `<path d="M${f1(hx)},0 Q${f1(hx + sway / 2)},${f1(-hh / 2)} ${f1(hx + sway)},${f1(-hh)}" fill="none" stroke="${G.stem}" stroke-width="4"/>`
      + [0, 72, 144, 216, 288].map(a => `<ellipse cx="${f1(hx + sway + 9 * Math.cos(a * Math.PI / 180))}" cy="${f1(-hh + 9 * Math.sin(a * Math.PI / 180))}" rx="8" ry="6" fill="${col}" ${S(2)} transform="rotate(${a} ${f1(hx + sway + 9 * Math.cos(a * Math.PI / 180))} ${f1(-hh + 9 * Math.sin(a * Math.PI / 180))})"/>`).join('')
      + `<circle cx="${f1(hx + sway)}" cy="${f1(-hh)}" r="5" fill="#F2C94C" ${S(2)}/>`;
  }
  return g + '</g>';
}
function fence(x0, x1, y, s = 1) {               // bamboo fence
  let g = `<path d="M${x0},${f1(y - 70 * s)} L${x1},${f1(y - 70 * s)} M${x0},${f1(y - 30 * s)} L${x1},${f1(y - 30 * s)}" stroke="${G.bambooD}" stroke-width="${f1(8 * s)}"/>`;
  for (let x = Math.ceil(x0 / (60 * s)) * 60 * s; x < x1; x += 60 * s) g += `<rect x="${f1(x - 6 * s)}" y="${f1(y - 100 * s)}" width="${f1(12 * s)}" height="${f1(100 * s)}" rx="${f1(4 * s)}" fill="${G.bamboo}" ${S(Math.max(2, 3 * s))}/>`;
  return g;
}
function house(x, y, s = 1, i = 0) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-90" y="-120" width="180" height="120" fill="${G.house[i % 3]}" ${S(4)}/><path d="M-110,-120 L0,-190 L110,-120 Z" fill="${G.roofs[i % 3]}" ${S(4)}/><rect x="-60" y="-80" width="40" height="40" fill="#BFE3EC" ${S(3)}/><rect x="20" y="-70" width="36" height="70" fill="${G.stand}" ${S(3)}/></g>`;
}
// far skyline: hills, a TOWER and TWIN PEAKS (the "garis langit" landmark), drawn the same everywhere
function skyline(x, y, s = 1, o = {}) {
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  g += `<path d="M-900,0 C-700,-120 -500,-60 -300,-140 C-200,-260 -120,-250 -60,-150 C0,-270 80,-260 140,-140 C300,-80 500,-160 900,0 Z" fill="${G.hill}"/>`;   // twin peaks in the middle
  g += `<path d="M420,-90 L430,-300 L446,-300 L456,-90 Z" fill="${G.hillD}"/><circle cx="438" cy="-312" r="16" fill="${G.hillD}"/><path d="M438,-330 L438,-370" stroke="${G.hillD}" stroke-width="5"/>`;   // tower
  if (o.hi) g += `<path d="M-320,-150 C-200,-280 -120,-270 -60,-170 C0,-290 90,-280 150,-150 M405,-100 L420,-330 L460,-330 L470,-100" fill="none" stroke="${P.orange}" stroke-width="9" stroke-dasharray="18 12" opacity="${f3(o.hi)}"/>`;
  return g + '</g>';
}
function sun(x, y, r = 60, k = 1) { return `<g opacity="${f3(k)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="#FFF4D6" opacity=".45"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#FFD27A" ${S(5)}/></g>`; }

// ---------- side panorama (looking north). camX = map x at screen centre, gy = ground line on screen, zoom ----------
// o: { look: {sky, warm 0..1}, sunX (screen) , hi: {hive, tree, edge, sky}, butterflies }
function panorama(t, camX, o = {}) {
  const gy = o.gy ?? 1180, z = o.zoom ?? 1, warm = o.warm || 0;
  const L = (par, inner) => `<g transform="translate(${f1(540 - camX * par * z)},0)">${inner}</g>`;
  let g = `<rect width="1080" height="1920" fill="${G.sky}"/>` + (warm > 0 ? `<rect width="1080" height="1920" fill="${G.skyWarm}" opacity="${f3(warm * .6)}"/>` : '');
  if (o.sunX !== undefined) g += sun(o.sunX, o.sunY ?? 360, 56, 1);
  for (let i = 0; i < 4; i++) { const cx = ((i * 420 + t * 10 - camX * .03 * z) % 1500 + 1500) % 1500 - 200; g += `<g transform="translate(${f1(cx)},${180 + i * 70})" opacity=".85"><ellipse rx="90" ry="28" fill="#fff"/><ellipse cx="-50" cy="8" rx="60" ry="22" fill="#fff"/></g>`; }
  // skyline (always at the same map spot; very slow parallax)
  g += L(.12, skyline(LM.SKY * .12 * z + 0, gy - 260, z * .9, { hi: (o.hi || {}).sky }));
  // houses (north)
  g += L(.4, LM.HOUSES.map(([hx], i) => house(hx * .4 * z, gy - 150, .8 * z, i)).join(''));
  // ground
  g += `<rect x="0" y="${f1(gy - 160)}" width="1080" height="${f1(1920 - gy + 160)}" fill="${G.ground}"/><path d="M0,${f1(gy - 160)} L1080,${f1(gy - 160)}" stroke="${G.groundD}" stroke-width="6"/>`;
  // fence (south of the hive, slightly nearer than the main layer → drawn behind main objects, parallax .8)
  g += L(.8, fence(LM.FENCE[0] * .8 * z, LM.FENCE[1] * .8 * z, gy - 40, .9 * z));
  // main layer: hive, tree, banana row (garden edge), flower beds
  let m = '';
  m += kersen(LM.TREE[0] * z, gy, 1.05 * z, t, { hi: (o.hi || {}).tree });
  m += hive(LM.HIVE[0] * z, gy, 1 * z, t, { hi: (o.hi || {}).hive, traffic: o.traffic });
  for (let i = 0; i < 4; i++) m += banana((LM.EDGE + i * 46 - 70) * z, gy + 4 - 6 * i, (1.9 - .1 * i) * z, t, i);
  if ((o.hi || {}).edge) m += `<path d="M${f1((LM.EDGE - 140) * z)},${f1(gy - 330 * z)} L${f1((LM.EDGE + 140) * z)},${f1(gy - 330 * z)}" stroke="${P.orange}" stroke-width="10" stroke-dasharray="20 14" opacity="${f3(o.hi.edge)}"/>`;
  LM.BEDS.forEach(([bx], i) => { m += flowerClump(bx * z, gy + 6, 1.1 * z, t, i * 3.7, { dip: (o.dip || {})[i] || 0 }); });
  g += L(1, m);
  // ground detail in depth bands (never a flat field): texture rows, a garden path with stones, fallen kersen leaves,
  // then big foreground plants at the frame edges (fast parallax) — all world-indexed so nothing slides on its own
  let d1 = '';
  for (let k = -10; k < 60; k++) { const x = k * 90 + 40 * hash(k + 1); d1 += `<path d="M${f1(x)},${f1(gy + 60)} l-7,-26 m7,26 l0,-32 m0,32 l8,-24" stroke="${G.groundD}" stroke-width="5" stroke-linecap="round"/>`; }
  g += L(1.1, d1);
  let d2 = `<path d="M-3000,${f1(gy + 250)} C-1000,${f1(gy + 210)} 1000,${f1(gy + 300)} 6000,${f1(gy + 240)} L6000,${f1(gy + 360)} C1000,${f1(gy + 420)} -1000,${f1(gy + 330)} -3000,${f1(gy + 370)} Z" fill="${G.path}" ${S(4)}/>`;
  for (let k = -20; k < 70; k++) { const x = k * 110 + 50 * hash(k * 2.1), y = gy + 270 + 60 * hash(k * 1.7); if (hash(k * 5.5) > .55) d2 += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(16 + 12 * hash(k))}" ry="${f1(9 + 6 * hash(k + 3))}" fill="#CBB892" ${S(3)}/>`; }
  for (let k = -20; k < 70; k++) { const x = k * 130 + 70 * hash(k * 4.4), y = gy + 180 + 300 * hash(k * 2.9); if (hash(k * 7.7) > .6) d2 += H.leafShape(x, y, .7, 30 + 140 * hash(k), hash(k) > .5 ? '#C9A15A' : G.crownL); }
  for (let k = -20; k < 70; k++) { const x = k * 160 + 80 * hash(k * .7); d2 += `<path d="M${f1(x)},${f1(gy + 470)} l-12,-46 m12,46 l0,-58 m0,58 l14,-44" stroke="${G.groundD}" stroke-width="8" stroke-linecap="round"/>`; if (hash(k * 3.3) > .6) d2 += flowerClump(x + 50, gy + 500, .85 * z, t, k + 50); }
  g += L(1.25, d2);
  let f = '';
  for (let k = -12; k < 50; k++) { const x = k * 420 + 120 * hash(k * 9.1), side = hash(k * 1.3) > .5;
    if (hash(k * 2.2) > .45) f += `<g transform="translate(${f1(x)},${f1(gy + 760)})">${[0, 1, 2, 3, 4].map(i => `<path transform="rotate(${f1(-70 + i * 35 + 6 * Math.sin(t * 1.2 + i + k))})" d="M0,0 C30,-90 30,-220 0,-330 C-30,-220 -30,-90 0,0 Z" fill="${i % 2 ? G.banana : G.bananaD}" ${S(5)}/>`).join('')}</g>`;
    else f += flowerClump(x, gy + 720, 1.8, t, k + 90); }
  g += L(1.6, f);
  return g;
}

// ---------- top map (north up). cam: {x, y, s}; o.hi like panorama ----------
function topMap(t, o = {}) {
  let g = `<rect x="-3000" y="-3000" width="7000" height="7000" fill="${G.ground}"/>`;
  g += `<path d="M-600,320 C0,300 600,340 1800,300" fill="none" stroke="${G.path}" stroke-width="80" stroke-linecap="round"/>`;
  // houses north
  LM.HOUSES.forEach(([hx, hy], i) => { g += `<rect x="${hx - 90}" y="${hy - 70}" width="180" height="140" fill="${G.roofs[i % 3]}" ${S(5)}/><path d="M${hx - 90},${hy} L${hx + 90},${hy}" stroke="#000" stroke-width="4" opacity=".2"/>`; });
  // fence line
  g += `<path d="M${LM.FENCE[0]},${LM.FENCE[2]} L${LM.FENCE[1]},${LM.FENCE[2]}" stroke="${G.bambooD}" stroke-width="16" stroke-dasharray="30 10"/>`;
  // tree crown (umbrella) + shadow
  const [tx, ty] = LM.TREE, th = (o.hi || {}).tree || 0;
  g += `<ellipse cx="${tx + 30}" cy="${ty + 40}" rx="200" ry="150" fill="#000" opacity=".08"/><path d="M${tx - 190},${ty} C${tx - 200},${ty - 120} ${tx - 40},${ty - 170} ${tx + 40},${ty - 140} C${tx + 160},${ty - 160} ${tx + 230},${ty - 60} ${tx + 180},${ty + 40} C${tx + 140},${ty + 120} ${tx - 20},${ty + 130} ${tx - 100},${ty + 90} C${tx - 170},${ty + 70} ${tx - 190},${ty + 40} ${tx - 190},${ty} Z" fill="${G.crown}" ${S(6)}/>`;
  if (th) g += `<circle cx="${tx}" cy="${ty}" r="240" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="22 14" opacity="${f3(th)}"/>`;
  // banana row = garden edge
  for (let i = -5; i <= 5; i++) g += `<circle cx="${LM.EDGE + 20 * (i % 2)}" cy="${i * 70}" r="46" fill="${i % 2 ? G.banana : G.bananaD}" ${S(4)}/>`;
  if ((o.hi || {}).edge) g += `<rect x="${LM.EDGE - 80}" y="-420" width="160" height="840" rx="40" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="22 14" opacity="${f3(o.hi.edge)}"/>`;
  // flower beds
  LM.BEDS.forEach(([bx, by], i) => { for (let k = 0; k < 9; k++) g += `<circle cx="${f1(bx - 60 + (k % 3) * 60 + 10 * hash(i * 9 + k))}" cy="${f1(by - 60 + Math.floor(k / 3) * 60)}" r="20" fill="${G.flowers[(i + k) % 5]}" ${S(3)}/>`; });
  // hive (box from above) + entrance mark (east)
  const hh = (o.hi || {}).hive || 0;
  g += `<rect x="-60" y="-60" width="120" height="120" rx="10" fill="${G.roof}" ${S(6)}/><rect x="56" y="-18" width="14" height="36" rx="5" fill="${LINE}"/>`;
  if (hh) g += `<circle cx="0" cy="0" r="120" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="22 14" opacity="${f3(hh)}"/>`;
  return g;
}

module.exports = { G, LM, hive, kersen, banana, flowerClump, fence, house, skyline, sun, panorama, topMap };
