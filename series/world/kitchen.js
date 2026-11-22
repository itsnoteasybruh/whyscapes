// WHYSCAPE WORLD — Mpi's KITCHEN (kit v1.4, EP03). It extends Mpi's house: the same cream/teal/orange palette,
// #231E1A line, wall pattern dots, a chair-rail style counter edge and perspective floor that vanishes at x 540.
//   front(t, o)  front view of the kitchen (1080×1920). The floor starts at FLOOR_Y; the kick-plate crack (ant nest
//                entrance) is at CRACK. Living details: kettle steam and a slow window light drift.
//   floorTop(o)  the SAME floor seen from above for the ant scenes (world units, 1080 × 1920 at scale 1). The cabinet
//                kick plate is along the top, the nest crack is top-left, the stool leg is in the middle, the bottle cap
//                is at the fork, and the crumb is bottom-right. These positions are fixed for the whole episode.
//   frontAnts / persp: helpers that put top-view ants onto the perspective floor of the front view.
const { PALETTE: P, LINE, S, lerp } = require('../engine/core');

const FLOOR_Y = 1290, VP = [540, 420];
const CRACK = [292, 1290];
// ---------- front view ----------
function tilesBacksplash(x0, y0, x1, y1, sz = 64) {
  let g = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#F7F2E8"/>`;
  for (let y = y0; y <= y1; y += sz) g += `<path d="M${x0},${y} L${x1},${y}" stroke="#E2D6C2" stroke-width="3"/>`;
  for (let x = x0; x <= x1; x += sz) g += `<path d="M${x},${y0} L${x},${y1}" stroke="#E2D6C2" stroke-width="3"/>`;
  return g;
}
function cabinetDoor(x, y, w, h, knob = 'r') {
  const kx = knob === 'r' ? x + w - 28 : x + 28;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${P.tealMid}" ${S(5)}/>
    <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="6" fill="none" stroke="${P.teal}" stroke-width="5"/>
    <circle cx="${kx}" cy="${y + h / 2}" r="10" fill="${P.orange}" ${S(4)}/>`;
}
// floor in perspective: horizontal joints get closer toward the back wall, radial joints meet at VP
function floorPersp() {
  let g = `<rect x="-400" y="${FLOOR_Y}" width="1880" height="${2800 - FLOOR_Y}" fill="#EADFCB"/>`;
  let y = FLOOR_Y, d = 34;
  while (y < 2800) { g += `<path d="M-400,${y.toFixed(1)} L1480,${y.toFixed(1)}" stroke="#D6C7AE" stroke-width="${(2 + (y - FLOOR_Y) / 220).toFixed(1)}"/>`; y += d; d *= 1.28; }
  for (let i = -12; i <= 12; i++) { const xb = 540 + i * 230; const xt = lerp(VP[0], xb, (FLOOR_Y - VP[1]) / (2000 - VP[1])), xe = lerp(VP[0], xb, (2800 - VP[1]) / (2000 - VP[1]));
    g += `<path d="M${xt.toFixed(1)},${FLOOR_Y} L${xe.toFixed(1)},2800" stroke="#D6C7AE" stroke-width="3"/>`; }
  return g + `<rect x="-200" y="${FLOOR_Y}" width="1480" height="60" fill="#000" opacity=".05"/>`;
}
function stool(x, top = 1180) {      // small round wooden stool on the floor (front view)
  return `<ellipse cx="${x}" cy="${top + 300}" rx="120" ry="16" fill="#000" opacity=".1"/>
    <path d="M${x - 70},${top + 20} L${x - 92},${top + 296} M${x + 70},${top + 20} L${x + 92},${top + 296} M${x - 20},${top + 24} L${x - 26},${top + 276} M${x + 20},${top + 24} L${x + 26},${top + 276}" stroke="${LINE}" stroke-width="22" stroke-linecap="round"/>
    <path d="M${x - 70},${top + 20} L${x - 92},${top + 296} M${x + 70},${top + 20} L${x + 92},${top + 296} M${x - 20},${top + 24} L${x - 26},${top + 276} M${x + 20},${top + 24} L${x + 26},${top + 276}" stroke="${P.wood}" stroke-width="13" stroke-linecap="round"/>
    <path d="M${x - 84},${top + 180} L${x + 84},${top + 180}" stroke="${LINE}" stroke-width="16" stroke-linecap="round"/><path d="M${x - 84},${top + 180} L${x + 84},${top + 180}" stroke="#A47548" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="${x}" cy="${top + 14}" rx="120" ry="30" fill="#A47548" ${S(6)}/><ellipse cx="${x}" cy="${top}" rx="120" ry="30" fill="${P.wood}" ${S(6)}/>
    <path d="M${x - 70},${top - 6} Q${x},${top - 22} ${x + 70},${top - 6}" fill="none" stroke="#D2A777" stroke-width="5" stroke-linecap="round"/>`;
}
function front(t, o = {}) {
  const drift = 18 * Math.sin(t * .15);
  const steam = [0, 1, 2].map(i => { const k = ((t * .45 + i / 3) % 1); return `<path d="M${712 + 8 * Math.sin(t * 2 + i)},${842 - 120 * k} q14,-14 0,-28 q-14,-14 0,-28" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="${(.7 * (1 - k)).toFixed(3)}"/>`; }).join('');
  const plate = `<ellipse cx="420" cy="896" rx="104" ry="20" fill="#fff" ${S(5)}/>${[[372, 880], [420, 872], [466, 880]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#D9A55B" ${S(4)}/><circle cx="${x - 7}" cy="${y - 6}" r="3" fill="#B9853F"/><circle cx="${x + 8}" cy="${y + 4}" r="3" fill="#B9853F"/>`).join('')}`;
  const jar = `<rect x="140" y="790" width="96" height="112" rx="18" fill="#DFF3F8" fill-opacity=".8" ${S(5)}/><rect x="132" y="772" width="112" height="26" rx="8" fill="${P.orange}" ${S(5)}/><rect x="152" y="836" width="72" height="56" rx="10" fill="#E9D6A8"/>`;
  const kettle = `<path d="M650,904 C640,860 664,842 712,842 C760,842 784,860 774,904 Z" fill="${P.creamLight}" ${S(5)}/><path d="M774,872 L808,850" ${S(9)}/><path d="M684,842 C684,818 740,818 740,842" fill="none" ${S(7)}/>${steam}`;
  return `<rect x="-400" y="-400" width="1880" height="2800" fill="${P.cream}"/><rect x="-400" y="-400" width="1880" height="2800" fill="url(#paper)"/>
    ${tilesBacksplash(-384, 440, 1472, 900)}
    <g transform="translate(${drift.toFixed(1)},0)"><path d="M610,560 L930,560 L1080,1290 L560,1290 Z" fill="#FFF6DF" opacity=".35"/></g>
    <rect x="620" y="150" width="330" height="270" rx="14" fill="#BFE3EC" ${S(8)}/><path d="M785,150 L785,420 M620,285 L950,285" ${S(8)}/>
    <path d="M640,400 C700,360 760,380 800,340 C840,300 900,330 930,300 L930,400 Z" fill="${P.tealLeaf}" opacity=".5"/>
    <rect x="596" y="414" width="378" height="26" rx="8" fill="${P.wood}" ${S(6)}/>
    ${cabinetDoor(30, 120, 250, 300, 'r')}${cabinetDoor(290, 120, 250, 300, 'l')}
    <rect x="-400" y="900" width="1880" height="44" fill="${P.wood}" ${S(6)}/><path d="M-400,912 L1480,912" stroke="#D2A777" stroke-width="5"/>
    ${jar}${plate}${kettle}
    <rect x="-400" y="944" width="1880" height="300" fill="${P.teal}"/>${cabinetDoor(-230, 960, 240, 270, 'r')}${cabinetDoor(1070, 960, 240, 270, 'l')}
    ${cabinetDoor(20, 960, 240, 270, 'r')}${cabinetDoor(270, 960, 240, 270, 'l')}${cabinetDoor(560, 960, 240, 270, 'r')}${cabinetDoor(810, 960, 250, 270, 'l')}
    <rect x="-400" y="1244" width="1880" height="46" fill="#173A37" ${S(5)}/>
    <path d="M${CRACK[0] - 22},1290 C${CRACK[0] - 20},1270 ${CRACK[0] + 20},1270 ${CRACK[0] + 22},1290 Z" fill="#120E0C"/>
    ${floorPersp()}${o.stool === false ? '' : stool(o.stoolX || 230, o.stoolTop || 1250)}`;
}
// perspective helper for the front view: floor point (u = x on the floor 0..1080, v = depth 0 back … 1 front) → screen
function persp(u, v) { const y = lerp(FLOOR_Y, 1960, v * v * .4 + v * .6); const k = (y - VP[1]) / (1920 - VP[1]); return { x: VP[0] + (u - VP[0]) * k, y, k }; }

// ---------- the same floor seen from above (ant world) ----------
const TOP = {
  nest: [230, 150], legC: [420, 760], legR: 74, cap: [690, 1190], capR: 58, crumb: [820, 1560],
  // main route (A) nest → bend under the stool leg → fork → left of the cap → crumb; branch B passes right of the cap
  routeA: [[230, 160], [244, 330], [262, 560], [282, 760], [318, 880], [420, 930], [560, 990], [612, 1080], [612, 1220], [668, 1350], [760, 1470], [812, 1538]],
  routeB: [[612, 1080], [700, 1086], [790, 1140], [806, 1260], [820, 1400], [822, 1530]],
  bend: [318, 880], fork: [600, 1040],
};
function floorTop(o = {}) {
  const tile = 180;
  let g = `<rect x="-900" y="-900" width="2880" height="3720" fill="#EFE6D6"/>`;
  for (let r = -5; r < 16; r++) for (let c = -5; c < 11; c++) if ((r + c) % 2 === 0) g += `<rect x="${c * tile}" y="${150 + r * tile}" width="${tile}" height="${tile}" fill="#F3ECDF"/>`;
  for (let y = 150; y < 2800; y += tile) g += `<path d="M-900,${y} L1980,${y}" stroke="#D9CCB5" stroke-width="5"/>`;
  for (let x = -900; x < 1980; x += tile) g += `<path d="M${x},150 L${x},2800" stroke="#D9CCB5" stroke-width="5"/>`;
  // specks of dust (static)
  for (let i = 0; i < 40; i++) g += `<circle cx="${(i * 263) % 1500 - 200}" cy="${200 + (i * 431) % 2200}" r="${2 + i % 3}" fill="#CDBEA3" opacity=".6"/>`;
  // cabinet kick plate along the top + nest crack
  g += `<rect x="-900" y="-900" width="2880" height="1050" fill="#173A37"/><rect x="-900" y="118" width="2880" height="32" fill="${P.teal}"/><path d="M-900,150 L1980,150" ${S(6)}/>
    <path d="M${TOP.nest[0] - 46},152 C${TOP.nest[0] - 40},118 ${TOP.nest[0] + 40},118 ${TOP.nest[0] + 46},152 Z" fill="#120E0C" ${S(4)}/>
    <circle cx="${TOP.nest[0] - 58}" cy="166" r="4" fill="#A88F6E"/><circle cx="${TOP.nest[0] + 62}" cy="170" r="3.4" fill="#A88F6E"/><circle cx="${TOP.nest[0] + 30}" cy="176" r="3" fill="#A88F6E"/>`;
  // stool leg seen from above (round, with shadow) and bottle cap at the fork
  const [lx, ly] = TOP.legC, [cx, cy] = TOP.cap;
  g += `<ellipse cx="${lx + 26}" cy="${ly + 30}" rx="${TOP.legR + 16}" ry="${TOP.legR + 10}" fill="#000" opacity=".13"/><circle cx="${lx}" cy="${ly}" r="${TOP.legR}" fill="${P.wood}" ${S(7)}/>
    <circle cx="${lx}" cy="${ly}" r="${TOP.legR - 20}" fill="none" stroke="#A47548" stroke-width="5"/><circle cx="${lx}" cy="${ly}" r="${TOP.legR - 42}" fill="none" stroke="#A47548" stroke-width="4"/>
    <ellipse cx="${cx + 14}" cy="${cy + 16}" rx="${TOP.capR + 8}" ry="${TOP.capR + 4}" fill="#000" opacity=".12"/><circle cx="${cx}" cy="${cy}" r="${TOP.capR}" fill="${P.creamLight}" ${S(6)}/>
    <circle cx="${cx}" cy="${cy}" r="${TOP.capR - 14}" fill="none" stroke="#D8CBB4" stroke-width="5"/>`;
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g += `<path d="M${(cx + Math.cos(a) * (TOP.capR - 4)).toFixed(1)},${(cy + Math.sin(a) * (TOP.capR - 4)).toFixed(1)} L${(cx + Math.cos(a) * (TOP.capR + 3)).toFixed(1)},${(cy + Math.sin(a) * (TOP.capR + 3)).toFixed(1)}" stroke="${LINE}" stroke-width="3"/>`; }
  return g;
}
module.exports = { front, floorTop, persp, stool, TOP, FLOOR_Y, CRACK, VP };
