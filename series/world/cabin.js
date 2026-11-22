// LOCATION KIT v1.13 (EP12 "Mabuk Perjalanan") — riding as a PASSENGER. Indonesia: right-hand drive (driver on the car's RIGHT),
// so the front passenger sits on the car's LEFT. Four views, all deterministic in their inputs:
//   cabinFront(t, o)   looking into the car through the windshield: driver (viewer-left), passenger Mpi (viewer-right) with seatbelt,
//                      the street behind recedes through the rear window; o.turn shifts the street sideways (no frame rotation)
//   shoulderPOV(t, o)  over Mpi's shoulder: phone in his hands, the road ahead through the windshield
//   povPassenger(t, o) from the passenger seat: road + horizon ahead, dashboard, only the edge of the steering wheel (driver's side)
//   carTopOpen(x, y, ang, o)  the car from above with the roof removed: four seats, driver + Mpi heads (Mpi = tuft), phone glow
// Motion rule: the world moves because the car moves (o.dist = metres travelled); nothing slides by itself.
const { PALETTE: P, LINE, S, lerp, clamp, eio } = require('../engine/core');
const M = require('../character/mpi');
const PE = require('../character/people');
const H = require('./haze');
const { f1, f3, hash } = H;

const CB = {
  body: '#E7C46A', bodyD: '#C9A24A', glass: '#CFE7EC', glassD: '#9CC9D3', interior: '#46524F', seat: '#6B7775', seatD: '#56615F',
  dash: '#2F3B39', belt: '#3A3F3E', buckle: '#C3CDCF', asphalt: '#5F6563', lane: '#EDE6D6', walk: '#DCD2BF', sky: '#DDEFF2',
  houses: ['#EDE4D3', '#E3D6C0', '#D8E3DD', '#F0D9C2', '#D3DDD8'], roofs: ['#B5532A', '#2A5F5B', '#8E6A4C'], leaf: '#3F8F7F', leafD: '#2A6B5E',
};
// perspective helper for the road views: X metres right of the eye line, z metres ahead, Yup metres up
const persp = (vx, vy, f, h) => ({ x: (X, z) => vx + f * X / z, y: (Yup, z) => vy + f * (h - Yup) / z });

// ---------- shared: a street seen in perspective (used behind the car and through the windshield) ----------
// dir +1 = objects come toward the viewer (looking forward), −1 = objects recede (looking backward through the rear window)
function perspStreet(t, o) {
  const { vx = 540, vy = 560, f = 520, h = 1.25, dist = 0, dir = 1, w = 1080, hgt = 1920, sky = CB.sky } = o;
  const pr = persp(vx, vy, f, h);
  let g = `<rect x="-200" y="-200" width="${w + 400}" height="${f1(vy + 200)}" fill="${sky}"/><rect x="-200" y="${f1(vy)}" width="${w + 400}" height="${f1(hgt - vy + 200)}" fill="${CB.walk}"/>`;
  // far skyline band
  for (let i = -2; i < 14; i++) { const hh = 40 + hash(i * 3 + 1) * 110; g += `<rect x="${f1(vx - 700 + i * 110)}" y="${f1(vy - hh)}" width="100" height="${f1(hh)}" fill="#C9DCDC"/>`; }
  // road 2 lanes (X −3.4..+3.4)
  const road = (z1, z2) => `M${f1(pr.x(-3.6, z1))},${f1(pr.y(0, z1))} L${f1(pr.x(3.6, z1))},${f1(pr.y(0, z1))} L${f1(pr.x(3.6, z2))},${f1(pr.y(0, z2))} L${f1(pr.x(-3.6, z2))},${f1(pr.y(0, z2))} Z`;
  g += `<path d="${road(1.0, 900)}" fill="${CB.asphalt}"/>`;
  for (const X of [-3.6, 3.6]) g += `<path d="M${f1(pr.x(X, 1.0))},${f1(pr.y(0, 1.0))} L${f1(pr.x(X, 900))},${f1(pr.y(0, 900))}" ${S(5)}/>`;
  // dashes (3 m long, 8 m period) — move with distance travelled
  for (let k = 0; k < 30; k++) { const z1 = 1.5 + k * 8 + ((dir > 0 ? -dist : dist) % 8 + 8) % 8, z2 = z1 + 3; if (z1 < 1.2) continue; g += `<path d="M${f1(pr.x(-.08, z1))},${f1(pr.y(0, z1))} L${f1(pr.x(.08, z1))},${f1(pr.y(0, z1))} L${f1(pr.x(.08, z2))},${f1(pr.y(0, z2))} L${f1(pr.x(-.08, z2))},${f1(pr.y(0, z2))} Z" fill="${CB.lane}"/>`; }
  // roadside objects every 12 m (houses / shops alternate with trees and poles), both sides, depth-sorted far → near
  const items = [];
  const per = 12, off = ((dir > 0 ? -dist : dist) % per + per) % per;
  for (let k = 0; k < 18; k++) {
    const z = 2 + k * per + off, idx = Math.round((k * per + (dir > 0 ? dist : -dist)) / per);
    for (const side of [-1, 1]) items.push({ z, side, kind: hash(idx * 7.1 + side * 3) });
  }
  items.sort((a, b) => b.z - a.z).forEach(({ z, side, kind }) => {
    if (z < 1.6) return;
    const X = side * 5.2, sx = pr.x(X, z), sy = pr.y(0, z), sc = f / z;
    if (kind < .45) {   // house / shop
      const wd = 7 * sc, ht = (4.5 + 3 * kind) * sc, col = CB.houses[Math.floor(kind * 20) % 5], x0 = side < 0 ? sx - wd : sx;
      g += `<rect x="${f1(x0)}" y="${f1(sy - ht)}" width="${f1(wd)}" height="${f1(ht)}" fill="${col}" ${S(Math.max(1.5, 4 * sc / 40))}/>`
        + `<rect x="${f1(x0 + wd * .2)}" y="${f1(sy - ht * .7)}" width="${f1(wd * .25)}" height="${f1(ht * .25)}" fill="${CB.glassD}"/><rect x="${f1(x0 + wd * .6)}" y="${f1(sy - ht * .7)}" width="${f1(wd * .25)}" height="${f1(ht * .25)}" fill="${CB.glassD}"/>`
        + `<rect x="${f1(x0 - wd * .03)}" y="${f1(sy - ht - .5 * sc)}" width="${f1(wd * 1.06)}" height="${f1(.6 * sc)}" fill="${CB.roofs[Math.floor(kind * 10) % 3]}"/>`;
    } else if (kind < .8) {   // tree
      const r = 1.6 * sc;
      g += `<rect x="${f1(sx - .15 * sc)}" y="${f1(sy - 2.6 * sc)}" width="${f1(.3 * sc)}" height="${f1(2.6 * sc)}" fill="#8A5A2B"/><circle cx="${f1(sx)}" cy="${f1(sy - 3.4 * sc)}" r="${f1(r)}" fill="${CB.leaf}" ${S(Math.max(1.5, 3 * sc / 40))}/>`;
    } else {   // lamp pole
      g += `<path d="M${f1(sx)},${f1(sy)} L${f1(sx)},${f1(sy - 5 * sc)} L${f1(sx - side * .9 * sc)},${f1(sy - 5 * sc)}" fill="none" stroke="#5E6A6C" stroke-width="${f1(Math.max(2, .16 * sc))}"/>`;
    }
  });
  return g;
}

// ---------- 1. cabin, front view (looking in through the windshield) ----------
// o: { dist, turn (−1..1 lateral push: + = car turning to ITS left → people lean viewer-left), bump (px vertical jiggle),
//      mpi: { expr, eye, right, left, ph, blink, lean (deg), sweat 0..1, pale 0..1, lid 0..1, phone (bool, belt gap) },
//      driver: { spec, lean, wheelRot }, sky, reflect }
function cabinFront(t, o = {}) {
  const turn = o.turn || 0, bump = o.bump || 0, mp = o.mpi || {}, dv = o.driver || {};
  let g = `<rect width="1080" height="1920" fill="${CB.sky}"/>`;
  // the street behind the car (recedes), shifted sideways by the turn
  g += `<g>${perspStreet(t, { vx: 540 - 260 * turn, vy: 520, f: 420, dist: o.dist || 0, dir: -1 })}</g>`;
  const Z = o.zoom ?? 1;                                  // zoom around the roof line: 1.3 fills the frame (hood shrinks, dashboard ≈ y 1325)
  g += `<g transform="translate(540,250) scale(${f3(Z)}) translate(-540,-250)"><g transform="translate(0,${f1(bump)})">`;
  g += `<path d="M110,250 Q540,175 970,250 L1020,335 L60,335 Z" fill="${CB.body}" ${S(7)}/><path d="M60,335 L1020,335 L1080,1190 L0,1190 Z" fill="#33403E" ${S(7)}/>`;
  g += `<clipPath id="cbw"><path d="M112,352 L968,352 L1040,1150 L40,1150 Z"/></clipPath><g clip-path="url(#cbw)">`;
  g += `<rect x="0" y="330" width="1080" height="900" fill="${CB.interior}"/><path d="M80,352 L1000,352 L1000,420 Q540,460 80,420 Z" fill="#5E6B69"/>`;
  // rear window (shows the receding road again, smaller)
  g += `<clipPath id="cbr"><path d="M280,470 L800,470 L770,690 L310,690 Z"/></clipPath><g clip-path="url(#cbr)"><g transform="translate(540,580) scale(.42) translate(-540,-560)">${perspStreet(t, { vx: 540 - 300 * turn, vy: 560, f: 420, dist: o.dist || 0, dir: -1 })}</g></g>`
    + `<path d="M280,470 L800,470 L770,690 L310,690 Z" fill="none" ${S(6)}/>`;
  // seats
  for (const x of [330, 750]) g += `<rect x="${x - 125}" y="640" width="250" height="560" rx="60" fill="${CB.seat}" ${S(6)}/><rect x="${x - 85}" y="575" width="170" height="110" rx="40" fill="${CB.seat}" ${S(6)}/>`;
  // driver (viewer-left = car's right) + steering wheel
  const dl = dv.lean || 0, ds = 1.85;
  g += `<g transform="rotate(${f1(dl)} 330 1110)"><g transform="translate(${f1(330 - 117 * ds)},${f1(1300 - 456 * ds)}) scale(${ds})">${PE.person({ ...(dv.spec || {}), shadow: 'none' })}</g></g>`;
  g += `<g transform="translate(330,1058) rotate(${f1(dv.wheelRot || 0)})"><ellipse rx="150" ry="98" fill="none" stroke="${LINE}" stroke-width="40"/><ellipse rx="150" ry="98" fill="none" stroke="#2B2F2E" stroke-width="30"/>`
    + `<circle cx="-138" cy="-30" r="24" fill="${(dv.spec && PE.SKINS[dv.spec.skin]) || '#E9B98F'}" ${S(5)}/><circle cx="138" cy="-30" r="24" fill="${(dv.spec && PE.SKINS[dv.spec.skin]) || '#E9B98F'}" ${S(5)}/><circle r="26" fill="#2B2F2E" ${S(4)}/></g>`;
  // Mpi (viewer-right = car's left), seated, leaning around the hip; seatbelt from his left shoulder (B-pillar side) to his right hip
  const ms = 1.9, mx = 750, feet = 1300, lean = mp.lean || 0;
  const mpiSvg = M.mpi(mp.expr || 'netral', { shadow: null, eye: mp.eye || [0, 0], blink: mp.blink, right: mp.right, left: mp.left, ph: mp.ph || 0, phL: mp.phL, tilt: mp.tilt });
  const beltClip = mp.phone ? `<clipPath id="cbbelt"><path d="M0,0 L234,0 L234,456 L0,456 Z M108,236 L178,236 L178,306 L108,306 Z" clip-rule="evenodd"/></clipPath>` : '';
  const belt = `${beltClip}<g ${mp.phone ? 'clip-path="url(#cbbelt)"' : ''}><path d="M198,232 L66,352" stroke="${LINE}" stroke-width="20" stroke-linecap="round"/><path d="M198,232 L66,352" stroke="${CB.belt}" stroke-width="13" stroke-linecap="round"/></g><rect x="52" y="340" width="26" height="18" rx="4" fill="${CB.buckle}" ${S(3)}/>`;
  let face = '';
  if ((mp.sweat || 0) > 0) face += `<g opacity="${f3(mp.sweat)}">${H.leafShape ? '' : ''}<path d="M178,128 C184,140 188,148 182,154 C176,158 170,152 172,144 C174,138 176,134 178,128 Z" fill="#BFE6EE" ${S(2.4)}/><path d="M60,150 C64,158 66,164 62,168 C58,170 54,166 56,160 Z" fill="#BFE6EE" ${S(2.2)}/></g>`;
  if ((mp.pale || 0) > 0) face += `<path d="M44,110 C44,86 70,74 117,74 C164,74 190,86 190,110 L190,180 C190,206 172,218 150,218 L84,218 C62,218 44,206 44,180 Z" fill="#CFE3C8" opacity="${f3(.28 * mp.pale)}"/>`;
  g += `<g transform="rotate(${f1(lean)} ${mx} ${feet - 180})"><g transform="translate(${f1(mx - 117 * ms)},${f1(feet - 456 * ms)}) scale(${ms})">${mpiSvg}${belt}${face}</g></g>`;
  // dashboard edge
  g += `<path d="M20,1112 Q540,1072 1060,1112 L1060,1162 L20,1162 Z" fill="${CB.dash}" ${S(6)}/></g>`;
  // glass reflections, frame, hood
  const rf = o.reflect ?? (.5 + .5 * Math.sin(t * .35));
  g += `<path d="M${f1(150 + 600 * rf)},360 L${f1(240 + 600 * rf)},360 L${f1(60 + 600 * rf)},1140 L${f1(-30 + 600 * rf)},1140 Z" fill="#fff" opacity=".1"/>`
    + `<path d="M112,352 L968,352 L1040,1150 L40,1150 Z" fill="none" stroke="${LINE}" stroke-width="10"/>`;
  g += `<path d="M0,1190 L1080,1190 L1080,1920 L0,1920 Z" fill="${CB.body}" ${S(7)}/><path d="M60,1250 Q540,1210 1020,1250" fill="none" stroke="${CB.bodyD}" stroke-width="12"/>`
    + `<path d="M150,1182 L470,1132 M610,1182 L930,1132" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/>`;
  // hood reflection: sky band + tree blobs sliding with the distance travelled (the world is reflected, not painted on)
  const rd = ((o.dist || 0) * 14) % 1400;
  g += `<clipPath id="cbhood"><path d="M0,1196 L1080,1196 L1080,1920 L0,1920 Z"/></clipPath><g clip-path="url(#cbhood)" opacity=".22"><rect x="0" y="1196" width="1080" height="70" fill="#fff"/>`
    + [0, 1, 2].map(i => `<ellipse cx="${f1(((i * 470 + rd) % 1400) - 160)}" cy="1300" rx="120" ry="34" fill="${CB.leafD}"/>`).join('') + `</g></g></g>`;
  return g;
}

// ---------- 2. over the shoulder: phone in Mpi's hands, road ahead through the windshield ----------
// o: { dist, turn, bump, screen (svg inside the phone, 300×560 box at 0,0), phoneTilt, steady 0..1 (bracket around the phone),
//      phoneDown 0..1 (phone lowered out of the view) }
function shoulderPOV(t, o = {}) {
  const turn = o.turn || 0, bump = o.bump || 0, down = eio(clamp(o.phoneDown || 0));
  let g = `<rect width="1080" height="1920" fill="${CB.interior}"/>`;
  g += `<clipPath id="cbws"><path d="M-20,120 L1100,120 L1100,900 L-20,900 Z"/></clipPath><g clip-path="url(#cbws)">${perspStreet(t, { vx: 560 - 300 * turn, vy: 470 + bump * .5, f: 600, dist: o.dist || 0, dir: 1 })}</g>`;
  g += `<path d="M-20,90 Q540,60 1100,90 L1100,140 Q540,110 -20,140 Z" fill="#33403E" ${S(6)}/><rect x="470" y="130" width="160" height="50" rx="14" fill="#2B3A38" ${S(4)}/>`;
  g += `<path d="M-20,880 Q540,840 1100,880 L1100,1100 L-20,1100 Z" fill="${CB.dash}" ${S(6)}/><rect x="760" y="930" width="220" height="70" rx="12" fill="#22302E" ${S(4)}/>`;
  // Mpi's shoulder + hair at the left edge (from behind)
  g += `<path d="M-40,1920 L-40,1180 C40,1120 170,1120 240,1200 L300,1920 Z" fill="${M.C.jacket}" ${S(7)}/><path d="M-40,1080 C-40,940 60,880 140,900 C200,915 220,980 200,1060 C180,1120 60,1140 -40,1120 Z" fill="${M.C.hair}" ${S(7)}/>`;
  // phone + hands (rises in, can be lowered)
  const py = 760 + 900 * down + bump, rot = (o.phoneTilt || 0);
  g += `<g transform="translate(560,${f1(py)}) rotate(${f1(rot)})">`;
  g += `<path d="M-250,700 C-240,560 -230,470 -175,430 L-150,600 Z" fill="${M.C.jacket}" ${S(6)}/><path d="M250,700 C240,560 230,470 175,430 L150,600 Z" fill="${M.C.jacket}" ${S(6)}/>`;
  g += `<rect x="-170" y="-20" width="340" height="600" rx="40" fill="#22302E" ${S(7)}/><rect x="-150" y="20" width="300" height="520" rx="14" fill="#F4FBFB"/>`;
  g += `<g transform="translate(-150,20)"><clipPath id="cbscr"><rect width="300" height="520" rx="14"/></clipPath><g clip-path="url(#cbscr)">${o.screen || ''}</g></g>`;
  g += `<ellipse cx="-168" cy="400" rx="36" ry="54" fill="${M.C.face}" ${S(5)}/><ellipse cx="168" cy="400" rx="36" ry="54" fill="${M.C.face}" ${S(5)}/><ellipse cx="60" cy="300" rx="30" ry="22" fill="${M.C.face}" ${S(4)}/>`;
  if ((o.steady || 0) > 0) { const k = o.steady; g += `<g opacity="${f3(k)}">${[[-190, -40, 1, 1], [190, -40, -1, 1], [-190, 600, 1, -1], [190, 600, -1, -1]].map(([x, y, sx, sy]) => `<path d="M${x},${y + 70 * sy} L${x},${y} L${x + 70 * sx},${y}" fill="none" stroke="${P.tealGlow}" stroke-width="14" stroke-linecap="round"/>`).join('')}</g>`; }
  g += '</g>';
  return g;
}
// a chat screen for the phone (300×520): bubbles scroll up with `scroll` px
function chatScreen(t, scroll = 0, o = {}) {
  let g = `<rect width="300" height="520" fill="#F4FBFB"/><rect width="300" height="60" fill="${P.teal}"/><circle cx="34" cy="30" r="16" fill="#F6F3EB"/><rect x="62" y="22" width="110" height="16" rx="8" fill="#F6F3EB" opacity=".8"/>`;
  for (let i = 0; i < 14; i++) {
    const me = hash(i * 3.3) > .55, w = 120 + 120 * hash(i * 1.7), y = 90 + i * 74 - scroll;
    if (y < 60 || y > 540) continue;
    g += `<rect x="${me ? 290 - w : 10}" y="${f1(y)}" width="${f1(w)}" height="54" rx="18" fill="${me ? '#D6F0E4' : '#FFFFFF'}" ${S(3)}/><rect x="${me ? 290 - w + 16 : 26}" y="${f1(y + 16)}" width="${f1(w - 40)}" height="9" rx="4" fill="#9AA6A4"/><rect x="${me ? 290 - w + 16 : 26}" y="${f1(y + 32)}" width="${f1((w - 40) * .6)}" height="9" rx="4" fill="#C3CDCF"/>`;
  }
  return g;
}

// ---------- 3. passenger POV: road + horizon ahead, dashboard, the steering wheel edge on the right ----------
function povPassenger(t, o = {}) {
  const turn = o.turn || 0, bump = o.bump || 0, DY = o.dashY ?? 1110, VY = o.vy ?? 640;      // dashY/vy: lower the dashboard so the road fills the frame
  let g = `<g transform="translate(0,${f1(bump)})">${perspStreet(t, { vx: 520 - 320 * turn, vy: VY, f: 620, dist: o.dist || 0, dir: 1 })}`;
  if ((o.horizon || 0) > 0) g += `<path d="M-40,${VY} L1120,${VY}" stroke="${P.orange}" stroke-width="10" stroke-dasharray="26 16" opacity="${f3(o.horizon)}"/>`;
  g += `</g><path d="M-40,0 L1120,0 L1120,140 Q540,110 -40,140 Z" fill="#33403E" ${S(6)}/><path d="M-40,0 L80,0 L-40,1200 Z" fill="#33403E" ${S(6)}/><path d="M1120,0 L1000,0 L1120,1200 Z" fill="#33403E" ${S(6)}/>`;
  g += `<path d="M-40,${DY} Q540,${DY - 60} 1120,${DY} L1120,1920 L-40,1920 Z" fill="${CB.dash}" ${S(7)}/><path d="M60,${DY + 40} Q540,${DY - 10} 1020,${DY + 40}" fill="none" stroke="#3D4B49" stroke-width="10"/>`
    + `<rect x="120" y="${DY + 70}" width="160" height="60" rx="14" fill="#22302E" ${S(4)}/>${[0, 1, 2, 3].map(i => `<path d="M${140 + i * 36},${DY + 82} l0,36" stroke="#3D4B49" stroke-width="8" stroke-linecap="round"/>`).join('')}`;
  g += `<g transform="translate(1180,${DY + 190}) rotate(${f1(o.wheelRot || 0)})"><circle r="260" fill="none" stroke="${LINE}" stroke-width="56"/><circle r="260" fill="none" stroke="#2B2F2E" stroke-width="42"/></g>`;
  return g;
}

// ---------- 4. car from above, roof removed (heading = up when ang = 0) ----------
// o: { brake 0..1, phone 0..1 (glow at Mpi's lap), mpiLean (px sideways), drvLean, mpiLook (deg), drvLook (deg), col }
function carTopOpen(x, y, ang, o = {}) {
  const col = o.col || CB.body;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(ang)})"><ellipse cx="6" cy="10" rx="120" ry="230" fill="#000" opacity=".14"/>`;
  g += `<rect x="-110" y="-220" width="220" height="440" rx="70" fill="${col}" ${S(6)}/><rect x="-92" y="-120" width="184" height="270" rx="30" fill="${CB.interior}" ${S(5)}/>`;
  g += `<path d="M-92,-120 L92,-120 L80,-170 Q0,-190 -80,-170 Z" fill="${CB.glass}" ${S(5)}/>`;
  for (const [sx, sy] of [[-46, -60], [46, -60], [-46, 60], [46, 60]]) g += `<rect x="${sx - 34}" y="${sy - 34}" width="68" height="78" rx="18" fill="${CB.seat}" ${S(4)}/>`;
  // brake lights
  const b = clamp(o.brake || 0);
  for (const sx of [-70, 70]) g += `<rect x="${sx - 22}" y="206" width="44" height="16" rx="6" fill="${b > .3 ? '#FF4A3D' : '#8A2E26'}" ${S(4)}/>` + (b > .02 ? `<ellipse cx="${sx}" cy="232" rx="${f1(30 + 30 * b)}" ry="${f1(12 + 14 * b)}" fill="#FF5A4A" opacity="${f3(.45 * b)}"/>` : '');
  // driver (car's RIGHT = +x) and Mpi (car's LEFT = −x): heads from above
  const dl = o.drvLean || 0, ml = o.mpiLean || 0;
  g += `<g transform="translate(${f1(46 + dl)},-56) rotate(${f1(o.drvLook || 0)})"><ellipse cx="0" cy="22" rx="40" ry="20" fill="#7FA7B5" ${S(4)}/><circle r="28" fill="#1E1A17" ${S(4)}/><path d="M-10,-26 L0,-38 L10,-26" fill="#E9B98F" ${S(3)}/></g>`;
  g += `<g transform="translate(${f1(-46 + ml)},-56) rotate(${f1(o.mpiLook || 0)})"><ellipse cx="0" cy="22" rx="40" ry="20" fill="${M.C.jacket}" ${S(4)}/><circle r="28" fill="${M.C.hair}" ${S(4)}/><path d="M2,-4 C-6,-14 -2,-26 8,-24 C16,-22 14,-12 6,-12" fill="none" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/></g>`;
  if ((o.phone || 0) > 0) g += `<rect x="${f1(-60 + ml)}" y="-12" width="26" height="40" rx="5" fill="#BFE6EE" ${S(3)} opacity="${f3(o.phone)}"/>`;
  return g + '</g>';
}

module.exports = { CB, persp, perspStreet, cabinFront, shoulderPOV, chatScreen, povPassenger, carTopOpen };
