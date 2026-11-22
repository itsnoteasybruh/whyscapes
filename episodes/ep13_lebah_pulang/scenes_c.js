// EP13 · C — keeping direction: one clue is "above": the sun. The bee holds an ANGLE to the sun (compass); the sun keeps moving
// through the day, so the angle the bee uses must change with the time of day — a time-compensated sun compass linked to an
// internal (biological) clock, drawn as an abstract dial with no numbers. Then the "lupa naruh kunci" insert with Mpi.
const L = require('./lib');
const A = require('./scenes_a');
const { K, M, H, GD, BEE, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, noise, W, svg, TAG, camKeys, camT, rv, pulseK, blinkAt, ring, hero, mpiAt } = L;

const C = { lalu: W('lalu', 39), menjaga: W('menjaga'), salah: W('salah'), atas: W('atas', 43), matahari: W('matahari', 43), posisinya: W('posisinya'), kompas: W('kompas'),
  tapi: W('tapi', 47), bergeser: W('bergeser'), hari: W('hari'), karena: W('karena'), jam: W('jam'), biologis: W('biologis'), kompasnya: W('kompasnya'), waktu: W('waktu'),
  kita: W('kita', 55), lupa: W('lupa'), kunci: W('kunci'), tersinggung: W('tersinggung'), terus: W('terus', 58) };
const GY = A.GY;

// ---------- 1. how does it keep its direction? … look up: the sun ----------
function lookUp(t) {
  const up = eio(prog(t, C.salah, C.atas + .3));
  const gy = GY + 700 * up, camX = 900 + 60 * Math.sin(t * .3);
  let g = GD.panorama(t, camX, { gy, zoom: 1, sunX: 640, sunY: 360 + 260 * up });
  // the bee hesitates between directions ("menjaga arah?"): three dashed arrows that fade in, then out as we look up
  const qk = rv(t, C.menjaga, .4) * (1 - up);
  const bx = 540, by = 700 + 120 * up;
  if (qk > 0) [-60, 0, 60].forEach((a, i) => { g += `<g opacity="${f3(qk)}" transform="translate(${bx},${by}) rotate(${a - 90})"><path d="M60,0 L190,0 M160,-22 L194,0 L160,22" fill="none" stroke="#F6F3EB" stroke-width="12" stroke-dasharray="18 12" stroke-linecap="round" stroke-linejoin="round"/></g>`; });
  g += hero(bx, by, .9, t, {});
  if (qk > .3) g += `<g transform="translate(${bx + 90},${by - 120}) scale(${f3(qk)})">${M.questionMark(0, 0, 1)}</g>`;
  const sk = pulseK(t, C.matahari, 1.4);
  if (sk > 0) g += `<circle cx="640" cy="${f1(360 + 260 * up)}" r="${f1(110 + 30 * sk)}" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="20 14" opacity="${f3(sk)}"/>`;
  return svg(g);
}

// ---------- 2. the sun compass, from above ----------
// home is WEST of the flower beds (fixed). Sun azimuth moves across the day; the bee keeps HOME by changing its angle to the sun.
const SUN_AZ = t => lerp(110, 250, eio(prog(t, C.bergeser, C.biologis + 1.2)));   // deg, 0 = up (north), moving east → west through south
function sunCompass(t) {
  const cx = 540, cy = 820, R = 400, homeAz = 270;                                    // bee at the centre, home to the west
  const comp = prog(t, C.jam, C.jam + .8);                                            // before the clock: the bee keeps the OLD angle (drifts)
  const az = SUN_AZ(t), az0 = SUN_AZ(C.bergeser);
  const relOld = homeAz - az0, heading = lerp(az + relOld, homeAz, eio(comp));         // without compensation the heading turns with the sun
  const warm = prog(t, C.bergeser, C.biologis + 1.2);
  let g = `<rect width="1080" height="1920" fill="#E9F0D8"/><g transform="translate(${f1(cx + 26 * (t - C.posisinya))},${cy}) scale(.55) translate(-760,20)" opacity=".55">${GD.topMap(t, {})}</g>`;
  g += `<rect width="1080" height="1920" fill="${warm > .5 ? '#F3D9B0' : '#D6ECEA'}" opacity="${f3(.25 + .15 * Math.sin(Math.PI * warm))}"/>`;
  // soft shadows of passing clouds drift over the ground (ambient life only; the sun itself is never covered)
  for (let i = 0; i < 4; i++) { const x = ((t * 55 + i * 420) % 1700) - 300, y = 380 + i * 330 + 40 * Math.sin(t * .4 + i); g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(210 + 40 * (i % 2))}" ry="90" fill="#2B3A2A" opacity=".07"/>`; }
  // sky ring + the sun on it
  g += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#F6F3EB" stroke-width="14" stroke-dasharray="6 18" stroke-dashoffset="${f1(-t * 40)}"/>`;   // the sky ring slowly "turns" (sun path), never static
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const [sx, sy] = pt(az, R);
  if (t > C.posisinya - .2) {
    // home marker (west)
    const [hx, hy] = pt(homeAz, R - 10);
    g += `<g transform="translate(${f1(hx)},${f1(hy)})"><rect x="-44" y="-44" width="88" height="88" rx="10" fill="${GD.G.roof}" ${L.S(6)}/><rect x="40" y="-12" width="12" height="24" rx="4" fill="${LINE}"/></g>`;
    // sun ray to the bee and the heading; the angle between them (the "compass")
    g += `<path d="M${f1(sx)},${f1(sy)} L${cx},${cy}" stroke="#FFD27A" stroke-width="14" stroke-dasharray="20 14" opacity=".95"/>`;
    const [ex, ey] = pt(heading, 300);
    g += `<path d="M${cx},${cy} L${f1(ex)},${f1(ey)}" stroke="${comp > .5 ? P.tealGlow : P.orange}" stroke-width="14" stroke-linecap="round"/>`;
    const ak = rv(t, C.kompas, .4);
    if (ak > 0) { const a0 = az, a1 = heading, r = 150, large = Math.abs(((a1 - a0) % 360 + 360) % 360) > 180 ? 1 : 0; const [p0x, p0y] = pt(a0, r), [p1x, p1y] = pt(a1, r);
      g += `<path d="M${f1(p0x)},${f1(p0y)} A${r},${r} 0 ${large} ${a1 > a0 ? 1 : 0} ${f1(p1x)},${f1(p1y)}" fill="none" stroke="${P.orange}" stroke-width="12" opacity="${f3(ak)}"/>`; }
    // without compensation: a dashed ghost of where it would go (off home), before the clock shows up
    const drift = prog(t, C.bergeser, C.jam) * (1 - comp);
    if (drift > .05) { const [gx, gy] = pt(az + relOld, 300); g += `<path d="M${cx},${cy} L${f1(gx)},${f1(gy)}" stroke="${P.alert}" stroke-width="10" stroke-dasharray="16 12" opacity="${f3(drift)}"/>`; }
  }
  g += GD.sun(sx, sy, 58, 1);
  g += hero(cx, cy, 1.1, t, { top: true, ang: heading });
  // the biological clock: an abstract translucent dial (no numbers) whose hand moves WITH the sun, linked to it on "Kompasnya ikut tahu waktu"
  const dk = rv(t, C.jam, .5);
  if (dk > 0) {
    const dx = 870, dy = 330, hand = (az - 110) * 2.2;
    g += `<g opacity="${f3(dk)}"><circle cx="${dx}" cy="${dy}" r="120" fill="#F6F3EB" fill-opacity=".55" ${L.S(6)}/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path transform="rotate(${i * 45} ${dx} ${dy})" d="M${dx},${dy - 104} L${dx},${dy - 88}" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/>`).join('')}
      <path transform="rotate(${f1(hand)} ${dx} ${dy})" d="M${dx},${dy} L${dx},${dy - 90}" stroke="${P.teal}" stroke-width="12" stroke-linecap="round"/><circle cx="${dx}" cy="${dy}" r="12" fill="${P.teal}"/></g>`;
    const lk = rv(t, C.kompasnya, .5);
    if (lk > 0) g += `<path d="M${dx - 90},${dy + 90} Q${f1((dx + sx) / 2 - 80)},${f1((dy + sy) / 2)} ${f1(sx)},${f1(sy - 70)}" fill="none" stroke="${P.orange}" stroke-width="10" stroke-dasharray="18 14" opacity="${f3(lk)}"/>`;
  }
  const tag = (txt, a, b, x, y, fill) => { const k = rv(t, a, .3) * (1 - prog(t, b, b + .3)); return TAG(txt, { s: k, o: k }, x, y, { size: 30, fill }); };
  // slow push-in through the whole explanation (never a still frame), labels stay screen-fixed
  const z = 1 + .08 * eio(prog(t, C.posisinya, C.kita)), drift = 40 * Math.sin((t - C.posisinya) * .55);
  g = `<g transform="translate(${f1(cx + drift)},${cy}) scale(${f3(z)}) translate(${-cx},${-cy})">${g}</g>`;
  g += tag('KOMPAS MATAHARI', C.kompas, C.bergeser, 540, 260) + tag('MATAHARI BERGESER', C.bergeser, C.jam, 540, 260, '#F6F3EB') + tag('JAM BIOLOGIS', C.jam, C.kita, 360, 260, P.tealGlow);
  return svg(g);
}

// ---------- 3. "Kita yang sering lupa naruh kunci, agak tersinggung." — Mpi pats his pockets; a bee zips by on its way ----------
function keys(t) {
  let g = GD.panorama(t, 1150, { gy: GY, zoom: 1.2, sunX: 860, sunY: 300 });
  const pat = Math.sin((t - C.lupa) * 9) > 0;
  const expr = t < C.tersinggung ? 'bingung' : 'tegang';
  g += mpiAt(540, GY + 262 * 1.2, .95, expr, { left: t > C.lupa && t < C.tersinggung + .4 ? (pat ? 'pocket' : 'down') : 'down', right: t > C.lupa && t < C.tersinggung + .4 ? (pat ? 'down' : 'shrug') : 'down', eye: [-4, 6], blink: blinkAt(t, [56.2]) });
  const qk = rv(t, C.kunci, .3);
  if (qk > 0) g += `<g transform="translate(700,${GY - 220}) scale(${f3(1.2 * qk)})">${M.questionMark(0, 0, 1)}</g>`;
  // the marked bee passes behind him toward home, unbothered
  const u = prog(t, C.tersinggung - .2, C.terus + .2);
  if (u > 0 && u < 1) g += BEE.side(lerp(1200, -120, u), GY - 380 + 30 * Math.sin(u * 9), .8, { t, mark: true, flip: true });
  return svg(g);
}

const list = [[lookUp, C.lalu - .1, 'xf', .35], [sunCompass, C.posisinya - .3, 'xf', .4], [keys, C.kita - .1, 'xf', .3]];
module.exports = { list, C, lookUp, sunCompass, keys, SUN_AZ };
