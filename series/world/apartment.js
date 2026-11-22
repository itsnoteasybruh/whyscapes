// WHYSCAPE WORLD — APARTMENT + LIFT (kit v1.5, EP04). Same series rules: cream/teal/orange palette, #231E1A line,
// paper dots, flat fill + one shade, one quiet living detail per shot.
//   street(t, o)        Mpi's house (left) and the apartment tower (right): sidewalk, road, trees, a passing car, drifting clouds
//   lobby(t, o)         lobby with three lifts (centre = Mpi's lift), call-button panel (▲▼), floor indicators, plant, bench
//   liftDoors(...)      two-panel centre-opening doors
//   cabin(t, o)         inside the cabin (front cross-section): back wall, side walls, handrail, button panel + digital indicator
//   panelClose(t, o)    the button panel close-up (1–10, ▲▼ none; destination buttons only)
//   landing8(t, o)      floor 8 corridor: landing doors + cabin doors (two layers), wall sign "8"
//   cutaway(t, o)       building section: shaft with floors 1–10, cabin (with sensor head + measuring wheel), floor-zone markers,
//                       controller on top, optional signal pulses. Pure function of options (carY in floors, lit markers…)
//   controller(x, y, s, o)  the controller box with a small screen (TUJUAN / POSISI)
//   encoderClose(t, o)  close-up: toothed measuring wheel rolling on a vertical toothed tape, encoder housing, pulse ticks
const { PALETTE: P, LINE, S, lerp, clamp } = require('../engine/core');
const f1 = x => (+x).toFixed(1);
const STEEL = '#C9D3D2', STEEL_D = '#9FAEAD', STEEL_HI = '#E4EBEA', LIT = '#FFB347', DIG = '#FF9A3C';

// ---------- small parts ----------
function tree(x, y, s, t, ph = 0) {
  const sway = 3 * Math.sin(t * 1.3 + ph);
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="M-10,0 L-6,-120 L6,-120 L10,0 Z" fill="${P.wood}" ${S(6)}/>
    <g transform="rotate(${f1(sway)} 0 -120)"><circle cx="-46" cy="-150" r="56" fill="${P.tealLeaf}" ${S(6)}/><circle cx="40" cy="-160" r="60" fill="${P.tealLeaf}" ${S(6)}/><circle cx="-4" cy="-210" r="62" fill="#4FA08E" ${S(6)}/>
    <path d="M-30,-210 Q-10,-236 18,-226" fill="none" stroke="#7CC2AE" stroke-width="7" stroke-linecap="round"/></g></g>`;
}
function car(x, y, s = 1, col = P.orange) {
  return `<g transform="translate(${f1(x)},${y}) scale(${s})"><ellipse cx="0" cy="8" rx="150" ry="12" fill="#000" opacity=".12"/>
    <path d="M-140,-10 L-140,-50 C-140,-60 -132,-66 -122,-66 L-70,-66 L-40,-108 L60,-108 L100,-66 L128,-66 C138,-66 144,-58 144,-48 L144,-10 Z" fill="${col}" ${S(6)}/>
    <path d="M-30,-98 L56,-98 L84,-68 L-52,-68 Z" fill="#BFE3EC" ${S(5)}/><path d="M14,-98 L14,-68" ${S(5)}/>
    <circle cx="-84" cy="-8" r="26" fill="#2B2F2E" ${S(6)}/><circle cx="-84" cy="-8" r="10" fill="${STEEL}"/><circle cx="88" cy="-8" r="26" fill="#2B2F2E" ${S(6)}/><circle cx="88" cy="-8" r="10" fill="${STEEL}"/></g>`;
}
function liftDoors(x, y, w, h, open, o = {}) {        // centre-opening doors inside a frame; open 0..1
  const half = w / 2, gap = half * open * .92;
  const panel = (px, pw) => `<rect x="${f1(px)}" y="${y}" width="${f1(pw)}" height="${h}" fill="${o.col || STEEL}" ${S(5)}/><path d="M${f1(px + 10)},${y + 12} L${f1(px + 10)},${y + h - 12}" stroke="${STEEL_HI}" stroke-width="5" opacity=".8"/>`;
  return `<rect x="${x - 26}" y="${y - 26}" width="${w + 52}" height="${h + 26}" rx="10" fill="${o.frame || '#8E9C9B'}" ${S(6)}/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.inside || '#2E3B3A'}"/>${o.insideSvg || ''}
    <g clip-path="url(#ld${x}_${y})"><clipPath id="ld${x}_${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>${panel(x - gap, half)}${panel(x + half + gap, half)}</g>`;
}
function indicator(x, y, txt, o = {}) {               // floor indicator: dark box with orange digits + arrow
  const w = o.w || 120, h = o.h || 64;
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" fill="#1D2524" ${S(5)}/>
    ${o.arrow ? `<path d="M${x - w / 2 + 22},${y + 10} L${x - w / 2 + 34},${y - 10} L${x - w / 2 + 46},${y + 10} Z" fill="${DIG}" transform="${o.arrow === 'down' ? `rotate(180 ${x - w / 2 + 34} ${y})` : ''}"/>` : ''}
    <text x="${x + (o.arrow ? 16 : 0)}" y="${y + h * .26}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${h * .72}" fill="${DIG}">${txt}</text>
    ${o.glow ? `<rect x="${x - w / 2 - 8}" y="${y - h / 2 - 8}" width="${w + 16}" height="${h + 16}" rx="14" fill="none" stroke="${LIT}" stroke-width="6" opacity="${o.glow}"/>` : ''}`;
}
function callPanel(x, y, o = {}) {                    // lobby call buttons: ▲ / ▼
  const up = o.up || 0;
  return `<rect x="${x - 34}" y="${y - 70}" width="68" height="140" rx="12" fill="${STEEL_D}" ${S(5)}/>
    <circle cx="${x}" cy="${y - 30}" r="22" fill="${up ? LIT : STEEL_HI}" ${S(4)}/>${up ? `<circle cx="${x}" cy="${y - 30}" r="${30 + 8 * up}" fill="${LIT}" opacity="${(.3 * up).toFixed(2)}"/>` : ''}<path d="M${x - 10},${y - 24} L${x},${y - 38} L${x + 10},${y - 24} Z" fill="${LINE}"/>
    <circle cx="${x}" cy="${y + 30}" r="22" fill="${STEEL_HI}" ${S(4)}/><path d="M${x - 10},${y + 24} L${x},${y + 38} L${x + 10},${y + 24} Z" fill="${LINE}"/>`;
}

// ---------- STREET ----------
function street(t, o = {}) {
  const cl = (x0, y, s, v) => { const x = ((x0 + t * v) % 1500) - 200; return `<g transform="translate(${f1(x)},${y}) scale(${s})" opacity=".9"><ellipse cx="0" cy="0" rx="90" ry="34" fill="#fff"/><ellipse cx="-50" cy="10" rx="60" ry="26" fill="#fff"/><ellipse cx="56" cy="8" rx="64" ry="28" fill="#fff"/></g>`; };
  let tower = `<rect x="560" y="120" width="460" height="1380" fill="#E8DCC6" ${S(7)}/><rect x="560" y="120" width="460" height="40" fill="${P.teal}" ${S(6)}/>`;
  for (let f = 0; f < 10; f++) for (let c = 0; c < 4; c++) { const wx = 590 + c * 108, wy = 190 + f * 112, lit = ((f * 7 + c * 3) % 5 === 0);
    tower += `<rect x="${wx}" y="${wy}" width="80" height="70" rx="6" fill="${lit ? '#FFE3A8' : '#BFE3EC'}" ${S(4)}/><path d="M${wx + 40},${wy} L${wx + 40},${wy + 70}" stroke="${LINE}" stroke-width="3"/>`; }
  tower += `<rect x="690" y="1310" width="200" height="190" fill="#BFE3EC" ${S(6)}/><path d="M790,1310 L790,1500" ${S(5)}/><rect x="660" y="1270" width="260" height="44" rx="8" fill="${P.teal}" ${S(5)}/>
    <text x="790" y="1302" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="28" fill="${P.creamLight}" letter-spacing="4">LOBI</text>`;
  const house = `<path d="M60,1100 L250,960 L440,1100 Z" fill="${P.orange}" ${S(7)}/><rect x="90" y="1100" width="320" height="400" fill="${P.creamLight}" ${S(7)}/>
    <rect x="200" y="1300" width="100" height="200" rx="8" fill="${P.teal}" ${S(6)}/><circle cx="282" cy="1404" r="7" fill="${P.orange}"/><rect x="120" y="1160" width="90" height="90" rx="6" fill="#BFE3EC" ${S(5)}/><rect x="300" y="1160" width="90" height="90" rx="6" fill="#BFE3EC" ${S(5)}/>`;
  const carX = o.carX ?? (-300 + ((t * 260) % 1800));
  return `<rect x="-400" y="-400" width="1880" height="2800" fill="#DDEFF2"/>${cl(100, 300, 1, 18)}${cl(800, 200, .8, 12)}${cl(1300, 420, .7, 15)}
    ${house}${tower}${tree(500, 1500, .9, t)}${tree(1040, 1500, .8, t, 1.3)}
    <rect x="-400" y="1500" width="1880" height="70" fill="#E3D6C0" ${S(5)}/><path d="M-400,1536 L1480,1536" stroke="#D2C3A8" stroke-width="3" stroke-dasharray="40 30"/>
    <rect x="-400" y="1570" width="1880" height="900" fill="#8E9493"/><path d="M-400,1720 L1480,1720" stroke="${P.creamLight}" stroke-width="10" stroke-dasharray="80 60"/>
    ${car(carX, 1700, .9, o.carCol || P.orange)}<rect x="-400" y="-400" width="1880" height="2800" fill="url(#paper)"/>`;
}

// ---------- LOBBY (front view; floor line at y 1500) ----------
const LOBBY = { floorY: 1500, doors: [[150, 1060, 240, 440], [420, 1060, 240, 440], [690, 1060, 240, 440]] , call: [960, 1240] };
function lobby(t, o = {}) {
  const fy = LOBBY.floorY;
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#F1E8D8"/>`;
  for (let x = -400; x < 1480; x += 180) g += `<rect x="${x}" y="200" width="170" height="${fy - 200}" fill="#F6EEDF" stroke="#E2D6C2" stroke-width="3"/>`;
  g += `<rect x="-400" y="200" width="1880" height="30" fill="${P.wood}" ${S(5)}/><rect x="-400" y="${fy - 40}" width="1880" height="40" fill="${P.teal}" ${S(5)}/>`;
  // lights
  for (let x = 120; x < 1080; x += 300) g += `<ellipse cx="${x}" cy="240" rx="70" ry="14" fill="#FFF3D6" ${S(4)}/>`;
  const opens = o.open || [0, 0, 0], floors = o.floors || ['1', '1', '1'];
  LOBBY.doors.forEach(([x, y, w, h], i) => {
    g += liftDoors(x, y, w, h, opens[i], { insideSvg: o.inside && o.inside[i] ? o.inside[i] : '' });
    g += indicator(x + w / 2, y - 80, floors[i], { arrow: o.arrows && o.arrows[i], glow: o.indGlow && o.indGlow[i], w: 130, h: 62 });
  });
  g += callPanel(LOBBY.call[0], LOBBY.call[1], { up: o.callUp || 0 });
  // plant + bench
  g += `<rect x="1010" y="1330" width="80" height="170" rx="8" fill="${P.wood}" ${S(5)}/><g transform="rotate(${f1(2 * Math.sin(t))} 1050 1330)"><path d="M1050,1330 C1000,1250 990,1180 1020,1120 M1050,1330 C1080,1240 1110,1190 1100,1120 M1050,1330 C1050,1240 1050,1180 1060,1100" fill="none" stroke="${P.tealLeaf}" stroke-width="22" stroke-linecap="round"/></g>`;
  // floor
  g += `<rect x="-400" y="${fy}" width="1880" height="900" fill="#E6DAC4"/>`;
  let yy = fy, d = 28; while (yy < 2300) { g += `<path d="M-400,${f1(yy)} L1480,${f1(yy)}" stroke="#D6C7AE" stroke-width="${f1(2 + (yy - fy) / 200)}"/>`; yy += d; d *= 1.3; }
  for (let i = -10; i <= 10; i++) { const xb = 540 + i * 240; g += `<path d="M${f1(540 + (xb - 540) * .28)},${fy} L${xb + (xb - 540) * .6},2300" stroke="#D6C7AE" stroke-width="3"/>`; }
  return g + `<rect x="-400" y="-400" width="1880" height="2800" fill="url(#paper)"/>`;
}

// ---------- CABIN (inside, front cross-section; floor at y 1480) ----------
function cabin(t, o = {}) {
  const lit = o.lit || [], fl = o.floor || '1';
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#2E3B3A"/>`;
  // back wall + side walls in perspective
  g += `<path d="M120,260 L960,260 L960,1300 L120,1300 Z" fill="#DCE4E2" ${S(6)}/>`;
  for (let x = 120; x < 960; x += 168) g += `<rect x="${x + 8}" y="280" width="152" height="1000" rx="6" fill="#E6EDEB" stroke="#C7D2D0" stroke-width="3"/>`;
  g += `<path d="M-200,40 L120,260 L120,1300 L-200,1700 Z" fill="#C3CFCD" ${S(6)}/><path d="M1280,40 L960,260 L960,1300 L1280,1700 Z" fill="#C3CFCD" ${S(6)}/>`;
  g += `<path d="M-200,40 L1280,40 L960,260 L120,260 Z" fill="#EEF2F1" ${S(6)}/>${[300, 540, 780].map(x => `<ellipse cx="${x}" cy="150" rx="70" ry="16" fill="#FFF6DE" ${S(4)}/>`).join('')}`;
  g += `<path d="M-200,1700 L120,1300 L960,1300 L1280,1700 Z" fill="#B8A88E" ${S(6)}/><path d="M120,1300 L960,1300" stroke="#9C8B70" stroke-width="6"/>`;
  g += `<path d="M120,980 L960,980" stroke="${STEEL_D}" stroke-width="18" stroke-linecap="round"/><path d="M120,980 L960,980" stroke="${STEEL_HI}" stroke-width="7" stroke-linecap="round"/>`;
  // panel on the right side wall (perspective)
  const px = 1040, py = 700;
  g += `<path d="M${px - 40},${py - 220} L${px + 60},${py - 250} L${px + 60},${py + 250} L${px - 40},${py + 220} Z" fill="${STEEL_D}" ${S(5)}/>`;
  for (let i = 0; i < 10; i++) { const r = 4 - Math.floor(i / 2), c = i % 2, bx = px - 14 + c * 52, by = py - 150 + r * 72 + c * -6, on = lit.includes(i + 1);
    g += `<circle cx="${bx}" cy="${by}" r="20" fill="${on ? LIT : STEEL_HI}" ${S(4)}/>${on ? `<circle cx="${bx}" cy="${by}" r="30" fill="${LIT}" opacity=".35"/>` : ''}<text x="${bx}" y="${by + 8}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="22" fill="${LINE}">${i + 1}</text>`; }
  g += indicator(540, 330, fl, { arrow: o.arrow, glow: o.indGlow, w: 170, h: 84 });
  return g;
}
function panelClose(t, o = {}) {
  const lit = o.lit || [], press = o.press || 0;
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#C3CFCD"/><rect x="290" y="160" width="500" height="1160" rx="40" fill="${STEEL_D}" ${S(8)}/><rect x="320" y="190" width="440" height="1100" rx="28" fill="#B2C0BE"/>`;
  g += indicator(540, 290, o.floor || '1', { w: 260, h: 120, arrow: o.arrow });
  for (let i = 0; i < 10; i++) { const r = 4 - Math.floor(i / 2), c = i % 2, bx = 430 + c * 220, by = 470 + r * 180, on = lit.includes(i + 1), pr = (i + 1 === 8) ? press : 0;
    g += `<circle cx="${bx}" cy="${by + 6}" r="70" fill="#7E8E8C"/><circle cx="${bx}" cy="${by + 6 * pr}" r="66" fill="${on ? LIT : STEEL_HI}" ${S(7)}/>${on ? `<circle cx="${bx}" cy="${by}" r="${86 + 6 * Math.sin(t * 6)}" fill="${LIT}" opacity=".28"/>` : ''}
      <text x="${bx}" y="${by + 26 + 6 * pr}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="74" fill="${LINE}">${i + 1}</text>`; }
  return g;
}

// ---------- FLOOR 8 LANDING (corridor; floor at 1480) ----------
function landing8(t, o = {}) {
  const open = o.open || 0, inner = o.inner ?? open;      // landing doors (outer) and cabin doors (inner)
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#EFE3CF"/>`;
  for (let x = -400; x < 1480; x += 160) g += `<path d="M${x},200 L${x},1480" stroke="#E2D3BA" stroke-width="3"/>`;
  g += `<rect x="-400" y="1440" width="1880" height="40" fill="${P.teal}" ${S(5)}/><rect x="-400" y="1480" width="1880" height="900" fill="#D9C7A8"/>`;
  // sign 8
  g += `<rect x="790" y="640" width="190" height="230" rx="18" fill="${P.teal}" ${S(7)}/><text x="885" y="830" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="190" fill="${P.creamLight}">8</text>
    ${o.signGlow ? `<rect x="776" y="626" width="218" height="258" rx="24" fill="none" stroke="${P.orange}" stroke-width="10" opacity="${o.signGlow}"/>` : ''}`;
  // the opening: cabin interior behind two door layers
  const x = 200, y = 640, w = 500, h = 840;
  g += `<rect x="${x - 34}" y="${y - 34}" width="${w + 68}" height="${h + 34}" rx="12" fill="#8E9C9B" ${S(7)}/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#DCE4E2"/>${o.insideSvg || ''}`;
  const panels = (op, col, inset) => { const half = w / 2, gap = half * op * .96; return `<rect x="${f1(x + inset - gap)}" y="${y + inset}" width="${f1(half - inset)}" height="${h - inset}" fill="${col}" ${S(5)}/><rect x="${f1(x + half + gap)}" y="${y + inset}" width="${f1(half - inset)}" height="${h - inset}" fill="${col}" ${S(5)}/>`; };
  g += `<clipPath id="l8clip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#l8clip)">${panels(inner, '#B7C4C2', 14) + panels(open, STEEL, 0)}</g>`;
  g += indicator(x + w / 2, y - 90, '8', { w: 130, h: 62, glow: o.indGlow });
  return g + `<rect x="-400" y="-400" width="1880" height="2800" fill="url(#paper)"/>`;
}

// ---------- CUTAWAY (building section; floors 1..10, ground of floor f at y = Y0 − (f−1)·FH) ----------
const CUT = { x: 300, w: 300, Y0: 1700, FH: 150, floors: 10 };
const floorY = f => CUT.Y0 - (f - 1) * CUT.FH;
function cutaway(t, o = {}) {
  const { x, w, FH } = CUT, carF = o.carF ?? 1, cy = floorY(carF);          // carF: fractional floor of the cabin floor
  let g = `<rect x="-600" y="-900" width="2280" height="3800" fill="#E9DFCC"/>`;
  // building floors on both sides of the shaft
  for (let f = 1; f <= CUT.floors; f++) { const fy = floorY(f);
    g += `<rect x="-600" y="${fy}" width="${x + 600}" height="18" fill="#CDBDA2" ${S(4)}/><rect x="${x + w}" y="${fy}" width="900" height="18" fill="#CDBDA2" ${S(4)}/>`;
    g += `<text x="${x - 60}" y="${fy - 46}" text-anchor="end" font-family="Nunito" font-weight="900" font-size="54" fill="${f === o.target ? P.orange : '#A8987C'}">${f}</text>`;
    // landing door edge at each floor (right side)
    g += `<rect x="${x + w}" y="${fy - 120}" width="14" height="120" fill="${STEEL_D}" ${S(3)}/>`; }
  g += `<rect x="-600" y="${floorY(CUT.floors) - FH}" width="2280" height="20" fill="#CDBDA2" ${S(4)}/>`;
  // shaft
  g += `<rect x="${x}" y="${floorY(CUT.floors) - FH - 220}" width="${w}" height="${CUT.Y0 - floorY(CUT.floors) + FH + 260}" fill="#3A4746" ${S(6)}/>`;
  g += `<path d="M${x + 24},${floorY(CUT.floors) - FH - 220} L${x + 24},${CUT.Y0 + 40} M${x + w - 24},${floorY(CUT.floors) - FH - 220} L${x + w - 24},${CUT.Y0 + 40}" stroke="#7E8E8C" stroke-width="10"/>`;
  // floor-zone markers on the left rail (one per floor)
  for (let f = 1; f <= CUT.floors; f++) { const on = (o.markers || {})[f] || 0;
    g += `<rect x="${x + 34}" y="${floorY(f) - 62}" width="18" height="44" rx="4" fill="${on ? P.orange : '#C9CED6'}" ${S(3)}/>${on ? `<rect x="${x + 26}" y="${floorY(f) - 70}" width="34" height="60" rx="8" fill="${P.orange}" opacity="${(.35 * on).toFixed(2)}"/>` : ''}`; }
  // ropes + cabin
  g += `<path d="M${x + w / 2},${floorY(CUT.floors) - FH - 200} L${x + w / 2},${f1(cy - 130)}" stroke="#2A2F2E" stroke-width="6"/>`;
  g += `<g transform="translate(0,${f1(cy)})"><rect x="${x + 40}" y="-130" width="${w - 80}" height="130" rx="8" fill="${o.carCol || P.orange}" ${S(6)}/>
    <rect x="${x + 60}" y="-112" width="${w - 120}" height="80" rx="6" fill="#FFE2B0"/><rect x="${x + 46}" y="-146" width="40" height="18" rx="4" fill="#5A6665" ${S(3)}/>
    <circle cx="${x + 66}" cy="-146" r="12" fill="${STEEL_HI}" ${S(3)}/>${o.sensorBeam ? `<path d="M${x + 52},-60 L${x + 34},-60" stroke="${P.orange}" stroke-width="6" opacity="${o.sensorBeam}"/>` : ''}
    <path d="M${x + 40},0 L${x + w - 40},0" stroke="${o.sillCol || LINE}" stroke-width="6"/></g>`;
  // controller at the top
  g += controller(x + w / 2, floorY(CUT.floors) - FH - 360, 1, o.screen || {});
  if (o.extra) g += o.extra;
  return g;
}
function controller(cx, cy, s = 1, o = {}) {
  const lines = o.lines || [];
  return `<g transform="translate(${cx},${cy}) scale(${s})"><rect x="-170" y="-110" width="340" height="220" rx="18" fill="${P.teal}" ${S(7)}/>
    <rect x="-140" y="-80" width="280" height="120" rx="10" fill="#132B29" ${S(5)}/>
    ${lines.map((l, i) => `<text x="0" y="${-36 + i * 48}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="34" fill="${l.col || P.orange}">${l.txt}</text>`).join('')}
    ${[-100, -60, -20].map(x => `<circle cx="${x}" cy="76" r="9" fill="${o.blink ? P.orange : '#5B7774'}"/>`).join('')}
    <text x="80" y="86" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="22" fill="${P.creamLight}" letter-spacing="2">PENGENDALI</text></g>`;
}
function encoderClose(t, o = {}) {
  const ang = o.angle || 0, ticks = o.ticks || 0;
  let g = `<rect x="-400" y="-400" width="1880" height="2800" fill="#3A4746"/>`;
  // vertical toothed tape (moves down as the cabin goes up)
  const off = (o.tape || 0) % 40;
  g += `<rect x="610" y="-400" width="60" height="2800" fill="#B8C2C1" ${S(5)}/>`;
  for (let y = -440 + off; y < 2400; y += 40) g += `<rect x="596" y="${f1(y)}" width="16" height="20" fill="#B8C2C1" ${S(3)}/>`;
  // cabin top (left) + bracket + wheel
  g += `<rect x="-400" y="900" width="900" height="900" fill="${P.orange}" ${S(7)}/><rect x="-400" y="900" width="900" height="40" fill="#E08A3C" ${S(5)}/>`;
  g += `<rect x="360" y="700" width="60" height="230" fill="#5A6665" ${S(5)}/><rect x="380" y="630" width="210" height="60" rx="10" fill="#5A6665" ${S(5)}/>`;
  g += `<g transform="translate(520,660) rotate(${f1(ang)})"><circle r="86" fill="#E4EBEA" ${S(7)}/>${Array.from({ length: 16 }, (_, i) => `<rect x="-8" y="-100" width="16" height="22" rx="3" fill="#E4EBEA" ${S(4)} transform="rotate(${i * 22.5})"/>`).join('')}
    <circle r="26" fill="#5A6665" ${S(5)}/><path d="M0,-70 L0,-30" stroke="${P.orange}" stroke-width="10" stroke-linecap="round"/></g>`;
  // encoder housing on the axle
  g += `<rect x="${o.enc ? 300 : 280}" y="560" width="150" height="120" rx="16" fill="${P.teal}" ${S(6)}/>${o.enc ? `<text x="375" y="634" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="24" fill="${P.creamLight}">ENCODER</text>` : ''}`;
  // pulse ticks leaving the encoder (toward the controller, upward)
  for (let i = 0; i < ticks; i++) { const u = ((t * 2.2 + i / ticks) % 1); g += `<circle cx="${f1(370 - 40 * Math.sin(u * 3))}" cy="${f1(540 - u * 520)}" r="10" fill="${P.orange}" opacity="${(1 - u).toFixed(2)}"/>`; }
  return g;
}
module.exports = { street, lobby, LOBBY, liftDoors, indicator, callPanel, cabin, panelClose, landing8, cutaway, CUT, floorY, controller, encoderClose, tree, car, STEEL, LIT, DIG };
