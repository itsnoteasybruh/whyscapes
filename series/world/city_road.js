// WHYSCAPE WORLD — CITY ROAD (kit v1.6, EP05 "Kok Macet Padahal Jalan Kosong?"). Same series rules: cream/teal/orange palette,
// #231E1A line, flat fill + one shade, paper feel, one quiet living detail per shot. Indonesia: right-hand drive (driver on the
// car's RIGHT), traffic keeps left. The avenue in this episode is a one-way, three-lane city road with no junctions, no traffic
// lights and no narrowing — on purpose (phantom-jam scenes must show no trigger).
//   TOP (bird's-eye):  roadTop(camY, t, o) · carTop(x, y, o)                 world px, road runs vertically, forward = up (−y)
//   SIDE:              sideStreet(camX, t, o) · carSide(x, y, s, o)          forward = right (+x); far lane + near lane
//   POV (driver seat): povForward(t, o)                                      perspective road, car ahead, dashboard, wheel, mirror
//   FRONT (looking in through the windshield): cabinFront(t, o)            Mpi behind the wheel (viewer-left = car's right)
//   carRear(x, y, sc, o) · ringTrack(t, o) (closed circuit for the 22-car experiment) · towTruck(x, y, s, o) · cone(x, y, s)
const { PALETTE: P, LINE, S, lerp, clamp } = require('../engine/core');
const M = require('../character/mpi');
const MT = require('../character/mpi_turn');
const PE = require('../character/people');
const f1 = x => (+x).toFixed(1), f3 = x => (+x).toFixed(3);
const ASPHALT = '#565C5A', ASPHALT_D = '#4A504E', LANE = '#EDE6D6', GLASS = '#BFE3EC', GLASS_D = '#8FC3CF';
const BRAKE_OFF = '#8A2E26', BRAKE_ON = '#FF4A3D', GLOW = '#FF5A4A';
const CAR_COLS = ['#7FA7B5', '#D9D2C5', '#5E6F8A', '#B5532A', '#3F8F7F', '#E7C46A', '#9AA6A4', '#C9B6A0', '#6E5A8A', '#E8E2D6'];
const MPI_CAR = P.orange;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, L = c => Math.round(c + (255 - c) * k); return '#' + ((1 << 24) + (L(r) << 16) + (L(g) << 8) + L(b)).toString(16).slice(1); };
const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, D = c => Math.round(c * (1 - k)); return '#' + ((1 << 24) + (D(r) << 16) + (D(g) << 8) + D(b)).toString(16).slice(1); };

// ================= TOP VIEW =================
const TOP = { cx: 540, lanes: 3, laneW: 96, PX: 14 };           // 14 px per metre (a 4.5 m car ≈ the 64 px top-view car)
TOP.w = TOP.lanes * TOP.laneW; TOP.x0 = TOP.cx - TOP.w / 2; TOP.x1 = TOP.cx + TOP.w / 2;
TOP.laneX = i => TOP.x0 + TOP.laneW * (i + .5);
// car seen from above, front pointing up. o: col, brake 0..1, rot (deg), mpi (stripe), sc, ghost (opacity), head (driver head visible)
function carTop(x, y, o = {}) {
  const col = o.col || CAR_COLS[0], b = clamp(o.brake || 0), sc = o.sc || 1, roof = o.mpi ? '#FFE2B3' : lighten(col, .22);
  const glow = b > .02 ? `<ellipse cx="-11" cy="36" rx="${f1(10 + 10 * b)}" ry="${f1(8 + 9 * b)}" fill="${GLOW}" opacity="${f3(.55 * b)}"/><ellipse cx="11" cy="36" rx="${f1(10 + 10 * b)}" ry="${f1(8 + 9 * b)}" fill="${GLOW}" opacity="${f3(.55 * b)}"/>
      <ellipse cx="0" cy="${f1(44 + 6 * b)}" rx="${f1(18 + 10 * b)}" ry="${f1(10 + 8 * b)}" fill="${GLOW}" opacity="${f3(.22 * b)}"/>` : '';
  const stripe = o.mpi ? `<rect x="-4" y="-30" width="8" height="60" fill="${P.teal}"/>` : '';
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(o.rot || 0)}) scale(${sc})" opacity="${o.ghost ?? 1}">
    <rect x="-16" y="-27" width="36" height="64" rx="10" fill="#000" opacity=".16"/>
    ${glow}<rect x="-18" y="-32" width="36" height="64" rx="11" fill="${col}" ${S(4.5)}/>${stripe}
    <path d="M-14,-15 Q0,-21 14,-15 L12,-5 L-12,-5 Z" fill="${GLASS}" ${S(3.5)}/>
    <rect x="-12" y="-5" width="24" height="19" rx="5" fill="${roof}" ${S(3.5)}/>${o.mpi ? `<rect x="-4" y="-5" width="8" height="19" fill="${P.teal}" opacity=".85"/>` : ''}
    <path d="M-12,14 L12,14 L13,22 Q0,26 -13,22 Z" fill="${GLASS_D}" ${S(3.5)}/>
    <rect x="-16" y="27" width="8" height="4.5" rx="2" fill="${b > .3 ? BRAKE_ON : BRAKE_OFF}" stroke="${LINE}" stroke-width="2"/><rect x="8" y="27" width="8" height="4.5" rx="2" fill="${b > .3 ? BRAKE_ON : BRAKE_OFF}" stroke="${LINE}" stroke-width="2"/>
    <rect x="-15" y="-32" width="7" height="4" rx="2" fill="#FFF6D8" stroke="${LINE}" stroke-width="2"/><rect x="8" y="-32" width="7" height="4" rx="2" fill="#FFF6D8" stroke="${LINE}" stroke-width="2"/></g>`;
}
// top-view tree canopy
const canopyTop = (x, y, r, t, ph = 0) => { const sw = 2 * Math.sin(t * 1.1 + ph); return `<g transform="translate(${f1(x + sw)},${f1(y)})"><circle r="${r}" fill="#000" opacity=".12" cx="8" cy="8"/>
  <circle r="${r}" fill="${P.tealLeaf}" ${S(5)}/><circle cx="${-r * .35}" cy="${-r * .3}" r="${r * .55}" fill="#4FA08E"/><circle cx="${r * .3}" cy="${r * .2}" r="${r * .35}" fill="#4FA08E" opacity=".8"/></g>`; };
// building roofs along one side; each block is deterministic from its index
function roofBlock(side, i, y0, h) {
  const xA = side < 0 ? -1500 : TOP.x1 + 74, xB = side < 0 ? TOP.x0 - 74 : 2580, w = xB - xA, k = hash(i * 3 + (side < 0 ? 1 : 7));
  const col = ['#EDE4D3', '#E3D6C0', '#D8CBB4', '#E9DFCC', '#CFDCD6'][Math.floor(k * 5)];
  let g = `<rect x="${xA}" y="${f1(y0)}" width="${w}" height="${f1(h)}" fill="${col}" ${S(6)}/><rect x="${xA}" y="${f1(y0)}" width="${w}" height="12" fill="#000" opacity=".06"/>`;
  const ax = (side < 0 ? xB - 300 : xA + 30) + hash(i + 2) * 200, ay = y0 + 40 + hash(i + 5) * (h - 140);
  g += `<rect x="${f1(ax)}" y="${f1(ay)}" width="70" height="46" rx="6" fill="#C9D3D2" ${S(4)}/><circle cx="${f1(ax + 22)}" cy="${f1(ay + 23)}" r="13" fill="#9FAEAD" ${S(3)}/><circle cx="${f1(ax + 50)}" cy="${f1(ay + 23)}" r="13" fill="#9FAEAD" ${S(3)}/>`;
  if (k > .45) { const tx = (side < 0 ? xB - 260 : xA + 60) + 180 * hash(i + 9), ty = y0 + h * (.55 + .2 * hash(i + 4)); g += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="30" fill="#7FA7B5" ${S(4)}/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="14" fill="#9FC0CB"/>`; }
  if (k < .3) g += `<rect x="${f1(side < 0 ? xB - 300 : xA + 20)}" y="${f1(y0 + h - 70)}" width="280" height="44" rx="6" fill="${P.teal}" opacity=".9" ${S(4)}/>`;
  return g;
}
// o: { bg, ghost } — draws everything visible for camera centre camY (world px) with the camera transform applied by the caller
function roadTop(camY, t, o = {}) {
  const R = o.range || 1500, yA = camY - R, yB = camY + R;
  let g = `<rect x="-1600" y="${yA}" width="4300" height="${yB - yA}" fill="#E7DCC8"/>`;
  // building rows (blocks of 300–460 px) on both sides
  for (const side of [-1, 1]) {
    let y = Math.floor(yA / 400) * 400, i = Math.floor(yA / 400) + (side > 0 ? 1000 : 0);
    while (y < yB) { const h = 300 + hash(i) * 160; g += roofBlock(side, i, y + 6, h - 12); y += h; i++; }
  }
  // sidewalks + curbs
  g += `<rect x="${TOP.x0 - 74}" y="${yA}" width="74" height="${yB - yA}" fill="#E3D6C0"/><rect x="${TOP.x1}" y="${yA}" width="74" height="${yB - yA}" fill="#E3D6C0"/>
    <path d="M${TOP.x0 - 74},${yA} L${TOP.x0 - 74},${yB} M${TOP.x1 + 74},${yA} L${TOP.x1 + 74},${yB}" ${S(5)}/>`;
  for (let y = Math.floor(yA / 40) * 40; y < yB; y += 40) g += `<path d="M${TOP.x0 - 74},${y} L${TOP.x0 - 6},${y} M${TOP.x1 + 6},${y} L${TOP.x1 + 74},${y}" stroke="#D2C3A8" stroke-width="2.5"/>`;
  // asphalt + lane lines
  g += `<rect x="${TOP.x0}" y="${yA}" width="${TOP.w}" height="${yB - yA}" fill="${o.asphalt || ASPHALT}"/>
    <path d="M${TOP.x0},${yA} L${TOP.x0},${yB} M${TOP.x1},${yA} L${TOP.x1},${yB}" stroke="${LINE}" stroke-width="7"/>
    <path d="M${TOP.x0 + 9},${yA} L${TOP.x0 + 9},${yB} M${TOP.x1 - 9},${yA} L${TOP.x1 - 9},${yB}" stroke="${LANE}" stroke-width="5"/>`;
  for (let l = 1; l < TOP.lanes; l++) { const x = TOP.x0 + l * TOP.laneW; g += `<path d="M${x},${yA} L${x},${yB}" stroke="${LANE}" stroke-width="5" stroke-dasharray="44 52" stroke-dashoffset="${f1(((yA % 96) + 96) % 96)}"/>`; }
  // trees on both sidewalks
  for (let y = Math.floor(yA / 230) * 230; y < yB; y += 230) { const j = Math.round(y / 230); g += canopyTop(TOP.x0 - 40, y + 40 * hash(j), 44, t, j) + canopyTop(TOP.x1 + 40, y + 115 + 40 * hash(j + 50), 44, t, j + 2); }
  return g;
}

// ================= SIDE VIEW =================
// sideStreet: background (sky, skyline, buildings, back sidewalk, asphalt). Cars and foreground trees are drawn by the scene
// (use SIDE.yFar / SIDE.yNear ground lines; foreground with sideFront()).
const SIDE = { yBase: 1060, yFar: 1158, yNear: 1268, yCurb: 1296, sFar: .8 };
function sideStreet(camX, t, o = {}) {
  const sky = o.sky || '#DDEFF2';
  let g = `<rect x="0" y="0" width="1080" height="1920" fill="${sky}"/>`;
  const cl = (x0, y, s, v, par) => { const x = ((x0 - camX * par + t * v) % 1700 + 1700) % 1700 - 300; return `<g transform="translate(${f1(x)},${y}) scale(${s})" opacity=".9"><ellipse rx="90" ry="34" fill="#fff"/><ellipse cx="-50" cy="10" rx="60" ry="26" fill="#fff"/><ellipse cx="56" cy="8" rx="64" ry="28" fill="#fff"/></g>`; };
  g += cl(200, 230, 1, 10, .05) + cl(900, 160, .8, 7, .05) + cl(1400, 380, .7, 9, .05);
  // far skyline (parallax .22)
  for (let i = -2; i < 9; i++) {
    const par = .22, w = 170, x = i * w - ((camX * par) % w + w) % w, idx = i + Math.floor(camX * par / w), h = 380 + hash(idx) * 360;
    g += `<rect x="${f1(x)}" y="${f1(SIDE.yBase - 60 - h)}" width="${w - 14}" height="${f1(h + 60)}" fill="#C9DCDC" opacity=".9"/>`;
  }
  // mid buildings (parallax .55) with windows and a few awnings
  for (let i = -2; i < 6; i++) {
    const par = .55, w = 260, x = i * w - ((camX * par) % w + w) % w, idx = i + Math.floor(camX * par / w), h = 420 + hash(idx * 3) * 380, top = SIDE.yBase - h;
    const col = ['#EDE4D3', '#E3D6C0', '#F6F3EB', '#E9DFCC', '#D8E3DD'][Math.floor(hash(idx * 7) * 5)];
    g += `<rect x="${f1(x + 8)}" y="${f1(top)}" width="${w - 16}" height="${f1(h)}" fill="${col}" ${S(6)}/><rect x="${f1(x + 8)}" y="${f1(top)}" width="${w - 16}" height="22" fill="${hash(idx) > .5 ? P.teal : '#B9AE9A'}" ${S(5)}/>`;
    for (let r = 0; r < Math.floor((h - 120) / 96); r++) for (let c = 0; c < 3; c++) {
      const wx = x + 32 + c * 72, wy = top + 52 + r * 96, lit = hash(idx * 11 + r * 3 + c) > .82;
      g += `<rect x="${f1(wx)}" y="${f1(wy)}" width="50" height="58" rx="5" fill="${lit ? '#FFE3A8' : GLASS}" ${S(4)}/><path d="M${f1(wx + 4)},${f1(wy + 46)} L${f1(wx + 20)},${f1(wy + 8)}" stroke="#fff" stroke-width="4" opacity=".55"/>`;
    }
    if (hash(idx * 5) > .55) g += `<path d="M${f1(x + 20)},${SIDE.yBase - 120} L${f1(x + w - 20)},${SIDE.yBase - 120} L${f1(x + w - 34)},${SIDE.yBase - 84} L${f1(x + 34)},${SIDE.yBase - 84} Z" fill="${hash(idx * 9) > .5 ? P.orange : P.tealMid}" ${S(5)}/>`;
  }
  // back sidewalk + lamp posts (parallax .85)
  g += `<rect x="0" y="${SIDE.yBase}" width="1080" height="36" fill="#E3D6C0" ${S(5)}/>`;
  for (let i = -1; i < 5; i++) { const par = .85, w = 330, x = i * w - ((camX * par) % w + w) % w; g += `<path d="M${f1(x)},${SIDE.yBase + 20} L${f1(x)},${SIDE.yBase - 250} Q${f1(x)},${SIDE.yBase - 290} ${f1(x + 40)},${SIDE.yBase - 290}" fill="none" stroke="${P.teal}" stroke-width="10" stroke-linecap="round"/><ellipse cx="${f1(x + 48)}" cy="${SIDE.yBase - 286}" rx="16" ry="9" fill="#FFF6D8" ${S(4)}/>`; }
  // asphalt
  g += `<rect x="0" y="${SIDE.yBase + 36}" width="1080" height="${SIDE.yCurb - SIDE.yBase - 36}" fill="${ASPHALT}"/>`;
  const dashOff = ((camX) % 110 + 110) % 110;
  g += `<path d="M0,${SIDE.yFar + 14} L1080,${SIDE.yFar + 14}" stroke="${LANE}" stroke-width="5" stroke-dasharray="60 50" stroke-dashoffset="${f1(dashOff)}"/>`;
  return g;
}
// foreground: curb + front sidewalk (+ an occasional big tree trunk / canopy at parallax 1.3)
function sideFront(camX, t, o = {}) {
  const PF = 1.1;                                   // the front sidewalk is a little closer than the road: one parallax for all of it
  const wx = (w, i) => i * w - camX * PF;           // world slot i → screen x (pre-zoom), stable across frames
  let g = `<rect x="0" y="${SIDE.yCurb}" width="1080" height="${1920 - SIDE.yCurb}" fill="#E3D6C0"/><path d="M0,${SIDE.yCurb} L1080,${SIDE.yCurb}" ${S(7)}/><rect x="0" y="${SIDE.yCurb + 4}" width="1080" height="16" fill="#CDBFA6"/>`;
  const span = (w, fn) => { const i0 = Math.floor((camX * PF - 700) / w), i1 = Math.ceil((camX * PF + 1800) / w); for (let i = i0; i <= i1; i++) fn(i, wx(w, i)); };
  span(160, (i, x) => { g += `<path d="M${f1(x)},${SIDE.yCurb + 20} L${f1(x - 60)},1920" stroke="#D2C3A8" stroke-width="3"/>`; });
  span(250, (i, x) => {
    g += `<rect x="${f1(x - 7)}" y="${SIDE.yCurb + 8}" width="14" height="46" rx="6" fill="${P.teal}" ${S(4)}/>`;                 // bollard
    if (((i % 2) + 2) % 2 === 0) g += `<g transform="translate(${f1(x + 120)},${SIDE.yCurb + 84})"><ellipse cx="0" cy="18" rx="62" ry="9" fill="#000" opacity=".12"/><rect x="-56" y="-30" width="112" height="44" rx="8" fill="${P.wood}" ${S(5)}/><circle cx="-30" cy="-40" r="24" fill="${P.tealLeaf}" ${S(5)}/><circle cx="4" cy="-50" r="28" fill="#4FA08E" ${S(5)}/><circle cx="34" cy="-38" r="22" fill="${P.tealLeaf}" ${S(5)}/></g>`;   // planter (position marker)
    if (((i % 7) + 7) % 7 === 3) g += `<g transform="translate(${f1(x + 125)},${SIDE.yCurb + 190})"><rect x="-80" y="-36" width="160" height="16" rx="6" fill="${P.wood}" ${S(5)}/><path d="M-66,-20 L-66,10 M66,-20 L66,10" ${S(8)}/></g>`;   // bench
  });
  if (o.trees !== false) for (let i = -1; i < 3; i++) {
    const w = 780, x = i * w - ((camX * 1.3) % w + w) % w + 300;
    g += `<g transform="translate(${f1(x)},${SIDE.yCurb + 150})"><ellipse cx="0" cy="8" rx="70" ry="12" fill="#000" opacity=".12"/><path d="M-16,0 L-11,-190 L11,-190 L16,0 Z" fill="${P.wood}" ${S(6)}/></g>`;
  }
  return g;
}
// side-view car facing right, ground contact at y. o: col, brake, dist (px travelled → wheel spin), driver (svg in window coords,
// see headIn()), passenger, mpi (orange + W sticker), squash (brake nose-dip 0..1)
function carSide(x, y, s = 1, o = {}) {
  const col = o.col || CAR_COLS[0], b = clamp(o.brake || 0), spin = ((o.dist || 0) / (30 * s)) * 57.3, dip = (o.dip || 0) * 3;
  const wheel = wx => `<g transform="translate(${wx},-26)"><circle r="30" fill="#2B2F2E" ${S(6)}/><circle r="15" fill="#C9D3D2" ${S(3)}/>
      <g transform="rotate(${f1(spin)})"><path d="M-13,0 L13,0 M0,-13 L0,13" stroke="#7D8786" stroke-width="4"/></g></g>`;
  const glow = b > .02 ? `<ellipse cx="-160" cy="-60" rx="${f1(22 + 30 * b)}" ry="${f1(16 + 18 * b)}" fill="${GLOW}" opacity="${f3(.5 * b)}"/>` : '';
  const winF = 'M8,-122 L54,-122 L92,-84 L8,-84 Z', winR = 'M-76,-84 L-44,-122 L0,-122 L0,-84 Z', id = 'cw' + Math.round(x * 7 + y * 13) % 99991;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><ellipse cx="0" cy="2" rx="170" ry="13" fill="#000" opacity=".16"/>${glow}
    <g transform="rotate(${f1(dip)} 160 -10)">
    <clipPath id="${id}f"><path d="${winF}"/></clipPath><clipPath id="${id}r"><path d="${winR}"/></clipPath>
    <path d="M-158,-24 L-158,-62 C-158,-74 -150,-80 -138,-80 L-84,-84 L-48,-130 L58,-130 L102,-86 L142,-80 C154,-78 162,-70 162,-58 L162,-24 C162,-14 156,-10 146,-10 L-146,-10 C-154,-10 -158,-14 -158,-24 Z" fill="${col}" ${S(6)}/>
    <path d="M-150,-40 L154,-40" stroke="${darken(col, .18)}" stroke-width="10" opacity=".5"/>
    <path d="${winR}" fill="${GLASS}" ${S(5)}/><g clip-path="url(#${id}r)">${o.passenger || ''}<path d="M-60,-88 L-30,-120" stroke="#fff" stroke-width="7" opacity=".55"/></g>
    <path d="${winF}" fill="${GLASS}" ${S(5)}/><g clip-path="url(#${id}f)">${o.driver || ''}<path d="M30,-88 L60,-120" stroke="#fff" stroke-width="7" opacity=".45"/></g>
    <path d="M4,-84 L4,-16 M-82,-84 L-84,-18" stroke="${LINE}" stroke-width="4" opacity=".7"/><rect x="18" y="-74" width="22" height="7" rx="3" fill="${darken(col, .3)}"/>
    ${o.mpi ? `<circle cx="-40" cy="-52" r="15" fill="${P.teal}" ${S(4)}/><text x="-40" y="-46" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="16" fill="${P.orange}">W</text>` : ''}
    <rect x="-162" y="-70" width="16" height="20" rx="4" fill="${b > .3 ? BRAKE_ON : BRAKE_OFF}" ${S(4)}/><rect x="150" y="-66" width="14" height="14" rx="4" fill="#FFF6D8" ${S(4)}/>
    </g>${wheel(-96)}${wheel(100)}</g>`;
}
// a head inside a side window. who: 'mpi' (profile facing right) | person spec. (wx, wy) = head centre in car coords
function headIn(who, wx = 46, wy = -98, sc = .3, o = {}) {
  if (who === 'mpi') return `<g transform="translate(${f1(wx - 160 * sc)},${f1(wy - 168 * sc)}) scale(${sc})">${MT.mpiSide({ arms: [1.25, 1.2], tilt: o.tilt || 0, blink: o.blink, expr: o.expr })}</g>`;
  return `<g transform="translate(${f1(wx - 117 * sc)},${f1(wy - 160 * sc)}) scale(${sc})">${PE.person(who)}</g>`;
}

// ================= REAR VIEW (car ahead, POV) =================
// rear of a car, local units = cm (180 wide), ground at y. o: col, brake, heads [hair colours]
function carRear(x, y, sc, o = {}) {
  const col = o.col || CAR_COLS[2], b = clamp(o.brake || 0), heads = o.heads || ['#2B2420'];
  const lamp = lx => `<rect x="${lx}" y="-98" width="34" height="20" rx="6" fill="${b > .3 ? BRAKE_ON : BRAKE_OFF}" ${S(4)}/>`;
  const glow = b > .02 ? `<ellipse cx="-72" cy="-88" rx="${f1(36 + 40 * b)}" ry="${f1(24 + 26 * b)}" fill="${GLOW}" opacity="${f3(.55 * b)}"/><ellipse cx="72" cy="-88" rx="${f1(36 + 40 * b)}" ry="${f1(24 + 26 * b)}" fill="${GLOW}" opacity="${f3(.55 * b)}"/><ellipse cx="0" cy="-150" rx="${f1(30 + 20 * b)}" ry="${f1(10 + 10 * b)}" fill="${GLOW}" opacity="${f3(.4 * b)}"/>` : '';
  const hd = heads.map((h, i) => { const hx = heads.length === 1 ? 32 : (i ? -34 : 34); return `<circle cx="${hx}" cy="-118" r="19" fill="${h}" ${S(4)}/>`; }).join('');
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(sc * 1000) / 1000})"><ellipse cx="0" cy="0" rx="104" ry="12" fill="#000" opacity=".2"/>
    <rect x="-84" y="-40" width="30" height="40" rx="6" fill="#2B2F2E" ${S(4)}/><rect x="54" y="-40" width="30" height="40" rx="6" fill="#2B2F2E" ${S(4)}/>
    ${glow}<path d="M-92,-30 L-92,-104 C-92,-112 -88,-118 -80,-120 L-66,-160 C-62,-168 -56,-170 -48,-170 L48,-170 C56,-170 62,-168 66,-160 L80,-120 C88,-118 92,-112 92,-104 L92,-30 C92,-22 86,-18 78,-18 L-78,-18 C-86,-18 -92,-22 -92,-30 Z" fill="${col}" ${S(5)}/>
    <path d="M-62,-122 L-52,-158 L52,-158 L62,-122 Z" fill="${GLASS_D}" ${S(4)}/>${hd}<path d="M-40,-128 L-28,-152" stroke="#fff" stroke-width="6" opacity=".45"/>
    ${lamp(-86)}${lamp(52)}<rect x="-22" y="-166" width="44" height="7" rx="3" fill="${b > .3 ? BRAKE_ON : BRAKE_OFF}"/>
    <rect x="-30" y="-68" width="60" height="22" rx="4" fill="#F6F3EB" ${S(3.5)}/><path d="M-88,-38 L88,-38" stroke="${darken(col, .25)}" stroke-width="8"/></g>`;
}

// ================= POV FORWARD (from Mpi's seat) =================
const POV = { vx: 540, vy: 690, f: 900, h: 1.25, dashY: 1210 };
const pX = (X, z) => POV.vx + POV.f * X / z, pY = (Yup, z) => POV.vy + POV.f * (POV.h - Yup) / z;
// o: { dist (m travelled, moves the world), ahead: [{ z, X, col, brake, heads }], speed (0..1, needle), mirror: svg|undefined,
//      hands: 'wheel' | 'off', sky, empty (no cars ahead), redWash 0..1 }
function povForward(t, o = {}) {
  const d = o.dist || 0;
  let g = `<g transform="translate(0,${f1(o.pitch || 0)})"><rect x="0" y="-60" width="1080" height="2040" fill="${o.sky || '#DDEFF2'}"/><rect x="0" y="${POV.vy}" width="1080" height="${1980 - POV.vy}" fill="#E3D6C0"/>`;
  // far skyline band
  for (let i = 0; i < 12; i++) { const h = 60 + hash(i * 3) * 120; g += `<rect x="${i * 96 - 20}" y="${f1(POV.vy - h)}" width="88" height="${f1(h)}" fill="#C9DCDC"/>`; }
  // road surface: 3 lanes of 3.6 m, Mpi in the LEFT lane (X 0) → road from X −1.8 (left curb) to +9.0
  const RL = -1.8, RR = 9.0;
  const road = (z1, z2) => `M${f1(pX(RL, z1))},${f1(pY(0, z1))} L${f1(pX(RR, z1))},${f1(pY(0, z1))} L${f1(pX(RR, z2))},${f1(pY(0, z2))} L${f1(pX(RL, z2))},${f1(pY(0, z2))} Z`;
  g += `<path d="${road(1.2, 900)}" fill="${ASPHALT}"/>`;
  // curbs / sidewalks
  for (const X of [RL, RR]) g += `<path d="M${f1(pX(X, 1.2))},${f1(pY(0, 1.2))} L${f1(pX(X, 900))},${f1(pY(0, 900))}" ${S(6)}/>`;
  // lane dashes (3 m long, 6 m period) moving toward the camera as we drive
  for (const X of [1.8, 5.4]) for (let k = 0; k < 40; k++) {
    const z1 = 2 + k * 6 - (d % 6), z2 = z1 + 3; if (z1 < 1.4) continue;
    const w = .12; g += `<path d="M${f1(pX(X - w, z1))},${f1(pY(0, z1))} L${f1(pX(X + w, z1))},${f1(pY(0, z1))} L${f1(pX(X + w, z2))},${f1(pY(0, z2))} L${f1(pX(X - w, z2))},${f1(pY(0, z2))} Z" fill="${LANE}"/>`;
  }
  // buildings on both sides (facades at X = ±9 m), drawn far → near
  const blocks = [];
  for (const sgn of [-1, 1]) for (let k = 0; k < 16; k++) {
    const len = 14 + hash(k * 5 + (sgn > 0 ? 3 : 0)) * 10, z1 = 4 + k * 26 - (d % 26) + (sgn > 0 ? 11 : 0), z2 = z1 + len, H = 10 + hash(k * 7 + (sgn > 0 ? 1 : 0) + Math.floor(d / 26)) * 18;
    if (z2 < 1.6) continue; blocks.push({ sgn, z1: Math.max(1.6, z1), z2, H, k: k + Math.floor(d / 26) * 16 });
  }
  blocks.sort((a, b) => b.z1 - a.z1);
  for (const B of blocks) {
    const X = B.sgn < 0 ? -6 : 13.5, col = ['#EDE4D3', '#E3D6C0', '#F6F3EB', '#E9DFCC', '#D8E3DD'][Math.floor(hash(B.k * 3 + B.sgn) * 5)];
    const q = (Ya, Yb, za, zb) => `M${f1(pX(X, za))},${f1(pY(Ya, za))} L${f1(pX(X, zb))},${f1(pY(Ya, zb))} L${f1(pX(X, zb))},${f1(pY(Yb, zb))} L${f1(pX(X, za))},${f1(pY(Yb, za))} Z`;
    g += `<path d="${q(0, B.H, B.z1, B.z2)}" fill="${col}" ${S(Math.max(2, Math.min(6, 60 / B.z1)))}/>`;
    for (let r = 0; r < Math.floor(B.H / 3.4); r++) for (let c = 0; c < 3; c++) {
      const za = B.z1 + 1 + c * (B.z2 - B.z1 - 2) / 3, zb = za + (B.z2 - B.z1 - 2) / 3 * .6;
      if (za < 1.7) continue; g += `<path d="${q(1.2 + r * 3.4, 2.9 + r * 3.4, za, zb)}" fill="${hash(B.k * 13 + r * 3 + c) > .85 ? '#FFE3A8' : GLASS}" opacity=".95"/>`;
    }
  }
  // street trees (billboards at X = ±6.6 m)
  for (const sgn of [-1, 1]) for (let k = 0; k < 14; k++) {
    const z = 3 + k * 18 - (d % 18) + (sgn > 0 ? 9 : 0); if (z < 2.2) continue; const sc = POV.f / z / 100, x = pX(sgn < 0 ? -3.9 : 11.2, z), y = pY(0, z);
    g += `<g transform="translate(${f1(x)},${f1(y)}) scale(${f1(sc * 1000) / 1000})"><path d="M-14,0 L-10,-260 L10,-260 L14,0 Z" fill="${P.wood}" ${S(8)}/><circle cx="-60" cy="-300" r="80" fill="${P.tealLeaf}" ${S(8)}/><circle cx="56" cy="-310" r="86" fill="${P.tealLeaf}" ${S(8)}/><circle cx="0" cy="-380" r="90" fill="#4FA08E" ${S(8)}/></g>`;
  }
  // cars ahead (far → near)
  const cars = (o.ahead || []).slice().sort((a, b) => b.z - a.z);
  for (const c of cars) if (c.z > 3) g += carRear(pX(c.X || 0, c.z), pY(0, c.z), POV.f / c.z / 100, c);
  g += '</g>';
  if (o.redWash > 0) g += `<rect width="1080" height="1920" fill="${GLOW}" opacity="${f3(.12 * o.redWash)}"/>`;
  // car interior: roof, A-pillars (driver on the right: the left pillar is further away, so slimmer), dashboard, wheel, hands
  g += `<path d="M0,0 L1080,0 L1080,150 Q540,110 0,150 Z" fill="#2E3836" ${S(6)}/>
    <path d="M0,150 L120,150 L-20,1100 L-60,1100 Z" fill="#2E3836" ${S(6)}/><path d="M1080,150 L900,150 L1100,1100 L1140,1100 Z" fill="#2E3836" ${S(6)}/>
    <path d="M-20,${POV.dashY} Q540,${POV.dashY - 70} 1100,${POV.dashY} L1100,1920 L-20,1920 Z" fill="#203230" ${S(6)}/>
    <path d="M60,${POV.dashY - 14} Q540,${POV.dashY - 84} 1020,${POV.dashY - 14}" fill="none" stroke="#3B4D4A" stroke-width="10"/>`;
  // cluster with a speed needle (behind the wheel)
  const sp = clamp(o.speed ?? 0), na = lerp(-120, 0, sp) * Math.PI / 180;
  g += `<g transform="translate(700,${POV.dashY + 70})"><ellipse rx="150" ry="74" fill="#13201F" ${S(5)}/><circle cx="-60" cy="4" r="50" fill="#0E1A19" stroke="#3B4D4A" stroke-width="4"/>
    <path d="M-60,4 L${f1(-60 + 40 * Math.sin(na + Math.PI / 2 * 0))},${f1(4 - 40 * Math.cos(na))}" stroke="${P.orange}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="60" cy="4" r="50" fill="#0E1A19" stroke="#3B4D4A" stroke-width="4"/><circle cx="60" cy="4" r="8" fill="${o.brakeLamp ? BRAKE_ON : '#3B4D4A'}"/></g>`;
  // steering wheel (centred in front of the driver = screen centre-right) + hands
  const wx = 700, wy = POV.dashY + 380, rot = o.wheelRot || 0, WR = 280;
  g += `<g transform="translate(${wx},${wy}) rotate(${f1(rot)})"><circle r="${WR}" fill="none" stroke="${LINE}" stroke-width="56"/><circle r="${WR}" fill="none" stroke="#2B2F2E" stroke-width="46"/><circle r="${WR}" fill="none" stroke="#3B4442" stroke-width="10" stroke-dasharray="30 18"/>
    <path d="M-${WR - 20},40 Q0,-30 ${WR - 20},40" fill="none" stroke="${LINE}" stroke-width="52"/><path d="M-${WR - 20},40 Q0,-30 ${WR - 20},40" fill="none" stroke="#2B2F2E" stroke-width="42"/>
    <circle r="78" fill="#2B2F2E" ${S(6)}/><circle r="30" fill="${P.orange}" ${S(5)}/></g>`;
  if (o.hands !== 'off') {
    // Mpi's own forearms (first person): sleeve from the bottom corner → cuff at the wrist → a round fist wrapped over the rim
    const hand = (hx, hy, m, ang) => {
      const wx2 = hx + m * 34, wy2 = hy + 66, sx0 = hx + m * 250, P = `M${f1(sx0)},2000 Q${f1(hx + m * 200)},${f1(hy + 360)} ${f1(wx2)},${f1(wy2)}`;
      return `<path d="${P}" fill="none" stroke="${LINE}" stroke-width="134" stroke-linecap="round"/><path d="${P}" fill="none" stroke="${M.C.jacket}" stroke-width="118" stroke-linecap="round"/>
        <path d="M${f1(sx0 - m * 40)},2000 Q${f1(hx + m * 170)},${f1(hy + 380)} ${f1(wx2 - m * 30)},${f1(wy2 + 30)}" fill="none" stroke="${M.C.jacketHi}" stroke-width="14" stroke-linecap="round" opacity=".7"/>
        <g transform="translate(${f1(wx2)},${f1(wy2)}) rotate(${f1(ang)})"><rect x="-62" y="-22" width="124" height="44" rx="20" fill="${M.C.jacketHi}" ${S(7)}/></g>
        <g transform="translate(${f1(hx)},${f1(hy)}) rotate(${f1(ang)})"><ellipse rx="64" ry="56" fill="${M.C.face}" ${S(7)}/>
          <path d="M-40,-10 Q0,-30 40,-10 M-44,12 Q0,-8 44,12" fill="none" stroke="${LINE}" stroke-width="4" opacity=".5"/>
          <ellipse cx="${m * -30}" cy="-44" rx="26" ry="18" fill="${M.C.face}" ${S(6)}/></g>`;
    };
    const a = rot * Math.PI / 180, hp = ang => [wx + WR * Math.cos(ang + a), wy + WR * Math.sin(ang + a)];
    const [lx, ly] = hp(Math.PI + .6), [rx, ry] = hp(-.6);
    g += hand(lx, ly, -1, -35 + rot) + hand(rx, ry, 1, 35 + rot);
  }
  // rear-view mirror at the car's centre line (left of the driver)
  g += `<path d="M330,0 L330,150" stroke="#2E3836" stroke-width="16"/><g transform="translate(330,190)"><rect x="-150" y="-46" width="300" height="92" rx="30" fill="#2B2F2E" ${S(6)}/>
    <clipPath id="mirr"><rect x="-138" y="-36" width="276" height="72" rx="22"/></clipPath><rect x="-138" y="-36" width="276" height="72" rx="22" fill="#CFE6EA"/><g clip-path="url(#mirr)">${o.mirror || ''}</g>
    <path d="M-110,30 L-70,-30" stroke="#fff" stroke-width="7" opacity=".6"/></g>`;
  return g;
}
// mirror content: cars behind (front view: headlights), n cars, braking glow none (we see their fronts)
function mirrorQueue(n = 4, t = 0, o = {}) {
  let g = `<rect x="-140" y="-40" width="280" height="80" fill="#DDEFF2"/><rect x="-140" y="0" width="280" height="40" fill="${ASPHALT}"/>`;
  for (let i = n - 1; i >= 0; i--) { const s = .35 + i * .0 - i * .06, x = (o.xs ? o.xs[i] : (i % 2 ? 1 : -1) * (20 + i * 18)) * (o.spread ?? 1), y = 24 - i * 6, col = o.cols ? o.cols[i % o.cols.length] : CAR_COLS[(i * 3 + 1) % CAR_COLS.length];
    g += `<g transform="translate(${f1(x)},${y}) scale(${f1(s)})"><path d="M-90,0 L-90,-60 L-60,-110 L60,-110 L90,-60 L90,0 Z" fill="${col}" ${S(6)}/><path d="M-56,-100 L56,-100 L72,-62 L-72,-62 Z" fill="${GLASS}" ${S(5)}/><circle cx="-60" cy="-34" r="14" fill="#FFF6D8" ${S(4)}/><circle cx="60" cy="-34" r="14" fill="#FFF6D8" ${S(4)}/></g>`; }
  return `<g transform="scale(-1,1)">${g}</g>`;
}

// ================= FRONT (outside, looking in at Mpi through the windshield) =================
// o: { expr, eye, tilt, blink, right/left arm poses, ph, behind: svg for the rear window, redWash, dip (brake nose dip px), bubble (svg on glass),
//      mpiDy, reflect (0..1 reflection sweep) }
function cabinFront(t, o = {}) {
  const dip = o.dip || 0, Z = o.zoom ?? 1.2;
  let g = `<rect width="1080" height="1920" fill="${o.bg || '#E7DCC8'}"/><g transform="translate(540,300) scale(${Z}) translate(-540,-300)">`;
  // street behind/around the car (blurred-out world: simple shapes)
  g += `<rect x="0" y="0" width="1080" height="900" fill="#DDEFF2"/>`;
  for (let i = 0; i < 6; i++) g += `<rect x="${i * 190 - 30}" y="${120 + hash(i) * 200}" width="170" height="900" fill="${['#EDE4D3', '#E3D6C0', '#D8E3DD'][i % 3]}" ${S(5)} opacity=".9"/>`;
  g += `<g transform="translate(0,${f1(dip)})">`;
  // car body: roof + pillars + hood (orange, Mpi's car)
  g += `<path d="M120,250 Q540,180 960,250 L1010,330 L70,330 Z" fill="${MPI_CAR}" ${S(7)}/>
    <path d="M70,330 L1010,330 L1080,1180 L0,1180 Z" fill="#33403E" ${S(7)}/>`;
  // inside: roof liner, rear window (behind), seats, Mpi (car's RIGHT seat = viewer's LEFT), wheel
  g += `<clipPath id="wsh"><path d="M118,350 L962,350 L1040,1150 L40,1150 Z"/></clipPath><g clip-path="url(#wsh)">
    <rect x="0" y="330" width="1080" height="900" fill="#4A5654"/><path d="M80,350 L1000,350 L1000,420 Q540,460 80,420 Z" fill="#5E6B69"/>
    <path d="M290,470 L790,470 L760,690 L320,690 Z" fill="#DDEFF2" ${S(6)}/><g>${o.behind || ''}</g>
    <path d="M290,470 L790,470 L760,690 L320,690 Z" fill="none" ${S(6)}/>
    <rect x="610" y="640" width="250" height="520" rx="60" fill="#6B7775" ${S(6)}/><rect x="650" y="580" width="170" height="110" rx="40" fill="#6B7775" ${S(6)}/>
    <rect x="200" y="640" width="250" height="520" rx="60" fill="#6B7775" ${S(6)}/><rect x="240" y="580" width="170" height="110" rx="40" fill="#6B7775" ${S(6)}/>
    <g transform="translate(${f1(340 - 117 * 1.95)},${f1(1290 - 456 * 1.95 + (o.mpiDy || 0))}) scale(1.95)">${M.mpi(o.expr || 'netral', { shadow: null, eye: o.eye || [0, 0], tilt: o.tilt, blink: o.blink, left: o.left || 'wheel', right: o.right || 'wheel', ph: o.ph || 0, headDy: o.headDy || 0 })}</g>
    <g transform="translate(340,${f1(1062 + (o.mpiDy || 0) * .3)}) rotate(${f1(o.wheelRot || 0)})"><ellipse rx="152" ry="100" fill="none" stroke="${LINE}" stroke-width="40"/><ellipse rx="152" ry="100" fill="none" stroke="#2B2F2E" stroke-width="30"/><ellipse rx="44" ry="34" fill="#2B2F2E" ${S(6)}/><circle r="14" fill="${P.orange}"/></g>${(o.left || 'wheel') === 'wheel' ? `<circle cx="${f1(340 - 131)}" cy="${f1(1036 + (o.mpiDy || 0))}" r="23" fill="${M.C.face}" ${S(5)}/>` : ''}${(o.right || 'wheel') === 'wheel' ? `<circle cx="${f1(340 + 131)}" cy="${f1(1036 + (o.mpiDy || 0))}" r="23" fill="${M.C.face}" ${S(5)}/>` : ''}
    <path d="M20,1110 Q540,1070 1060,1110 L1060,1160 L20,1160 Z" fill="#203230" ${S(6)}/></g>`;
  // glass reflections + optional bubble on the glass
  const rf = o.reflect ?? (.5 + .5 * Math.sin(t * .4));
  g += `<path d="M${f1(150 + 600 * rf)},360 L${f1(250 + 600 * rf)},360 L${f1(60 + 600 * rf)},1140 L${f1(-40 + 600 * rf)},1140 Z" fill="#fff" opacity=".13"/>
    <path d="M${f1(290 + 600 * rf)},360 L${f1(320 + 600 * rf)},360 L${f1(130 + 600 * rf)},1140 L${f1(100 + 600 * rf)},1140 Z" fill="#fff" opacity=".16"/>
    <path d="M118,350 L962,350 L1040,1150 L40,1150 Z" fill="none" stroke="${LINE}" stroke-width="10"/>${o.bubble || ''}`;
  if (o.redWash > 0) g += `<rect x="0" y="330" width="1080" height="900" fill="${GLOW}" opacity="${f3(.16 * o.redWash)}"/>`;
  // hood + wipers + headlights
  g += `<path d="M0,1180 L1080,1180 L1080,1920 L0,1920 Z" fill="${MPI_CAR}" ${S(7)}/><path d="M60,1240 Q540,1200 1020,1240" fill="none" stroke="#D98A22" stroke-width="12"/>
    <path d="M140,1172 L470,1120 M600,1172 L930,1120" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/>
    <path d="M540,1600 L540,1920" stroke="#D98A22" stroke-width="10" opacity=".6"/><circle cx="540" cy="1720" r="34" fill="${P.teal}" ${S(5)}/><text x="540" y="1733" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="36" fill="${P.orange}">W</text></g></g>`;
  return g;
}

// ================= RING TRACK (closed circuit, top view) =================
const RING = { cx: 540, cy: 760, r: 410, w: 76 };
function ringTrack(t, o = {}) {
  let g = `<rect x="-1200" y="-1200" width="3480" height="4320" fill="#E7DCC8"/>`;
  g += `<circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r + RING.w / 2 + 40}" fill="#E3D6C0" ${S(6)}/>
    <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r + RING.w / 2}" fill="${ASPHALT}" ${S(7)}/><circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r - RING.w / 2}" fill="#CFE0C6" ${S(7)}/>
    <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r + RING.w / 2 - 10}" fill="none" stroke="${LANE}" stroke-width="4"/><circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r - RING.w / 2 + 10}" fill="none" stroke="${LANE}" stroke-width="4"/>`;
  // a few trees on the infield (no structures: an open, obstacle-free circuit)
  [[-150, -120, 48], [130, -170, 40], [170, 120, 52], [-120, 160, 44], [0, 10, 36]].forEach(([dx, dy, r], i) => { g += canopyTop(RING.cx + dx, RING.cy + dy, r, t, i); });
  return g;
}
// position on the ring for arc-length s (m) with circumference C (m); cars drive counter-clockwise on screen
function ringPos(s, C) { const a = -Math.PI / 2 - (s / C) * Math.PI * 2; return { x: RING.cx + RING.r * Math.cos(a), y: RING.cy + RING.r * Math.sin(a), rot: a * 180 / Math.PI }; }

// ================= extras =================
const cone = (x, y, s = 1) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><ellipse cx="0" cy="2" rx="30" ry="8" fill="#000" opacity=".15"/><path d="M-26,0 L26,0 L8,-70 L-8,-70 Z" fill="${P.orange}" ${S(5)}/><path d="M-17,-30 L17,-30 L13,-46 L-13,-46 Z" fill="#fff"/><rect x="-32" y="-6" width="64" height="10" rx="4" fill="${P.orange}" ${S(4)}/></g>`;
// tow truck carrying a car (side view, facing right) — for the "already cleared" caveat vignette
function towTruck(x, y, s = 1, o = {}) {
  const spin = ((o.dist || 0) / (30 * s)) * 57.3;
  const wheel = wx => `<g transform="translate(${wx},-30)"><circle r="34" fill="#2B2F2E" ${S(6)}/><circle r="16" fill="#C9D3D2" ${S(3)}/><g transform="rotate(${f1(spin)})"><path d="M-14,0 L14,0 M0,-14 L0,14" stroke="#7D8786" stroke-width="4"/></g></g>`;
  const amber = .5 + .5 * Math.sin((o.t || 0) * 9);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><ellipse cx="-40" cy="2" rx="260" ry="14" fill="#000" opacity=".16"/>
    <rect x="-290" y="-70" width="300" height="34" rx="6" fill="#9AA6A4" ${S(6)}/>
    <g transform="translate(-150,-74) rotate(-6) scale(.72)">${carSide(0, 0, 1, { col: o.carCol || '#7FA7B5' })}</g>
    <path d="M10,-60 L10,-150 C10,-162 18,-170 30,-170 L100,-170 L140,-110 L160,-104 C170,-102 176,-94 176,-84 L176,-46 C176,-38 170,-34 162,-34 L10,-34 Z" fill="${P.orange}" ${S(6)}/>
    <path d="M40,-158 L92,-158 L122,-112 L40,-112 Z" fill="${GLASS}" ${S(5)}/><rect x="44" y="-186" width="40" height="14" rx="5" fill="#FFB347" opacity="${f3(.5 + .5 * amber)}" ${S(4)}/>
    ${wheel(-210)}${wheel(-110)}${wheel(120)}</g>`;
}
module.exports = { TOP, carTop, roadTop, SIDE, sideStreet, sideFront, carSide, headIn, carRear, POV, pX, pY, povForward, mirrorQueue,
  cabinFront, RING, ringTrack, ringPos, cone, towTruck, CAR_COLS, MPI_CAR, ASPHALT, GLOW, BRAKE_ON, hash, lighten, darken, canopyTop };
