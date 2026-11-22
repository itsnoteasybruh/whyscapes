// EP13 · B — after "Coba kita ikuti jejaknya": the ORIENTATION FLIGHT (flashback, warmer light + soft vignette = "earlier").
// The young worker hovers facing the hive and looks at the entrance, then makes wider and wider loops; the same landmarks of the
// garden (tree, garden edge, skyline) are recognised in the order the VO names them; "dia juga belajar" = shape snapshots.
const L = require('./lib');
const A = require('./scenes_a');
const { K, M, H, GD, BEE, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, noise, W, svg, TAG, camKeys, camT, rv, pulseK, blinkAt, ring, hero, SWITCH } = L;

const B = { ternyata: W('ternyata'), sebelum: W('sebelum'), mencari: W('mencari'), lebah: W('lebah', 22), orientasi: W('orientasi'), melihat: W('melihat', 26), pintu: W('pintu'),
  menjelajah: W('menjelajah'), mengenali: W('mengenali', 29), pohon: W('pohon', 31), tepi: W('tepi'), bentuk: W('bentuk', 33), jadi: W('jadi', 35), lewat: W('lewat', 37), belajar: W('belajar'), lalu: W('lalu', 39) };
const GY = A.GY;
const FLASH = '<rect width="1080" height="1920" fill="#F6D9A0" opacity=".16"/><rect width="1080" height="1920" fill="url(#e13vig)"/>';
const VIG = `<radialGradient id="e13vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#3A2A10" stop-opacity="0"/><stop offset="1" stop-color="#3A2A10" stop-opacity=".32"/></radialGradient>`;

// ---------- 1. at the hive: foragers come and go; the flashback starts on "sebelum"; the young bee faces the entrance ----------
function atHive(t) {
  const c = camKeys([[SWITCH - .3, [120, 0, 1.6]], [B.ternyata, [120, 0, 1.6]], [B.orientasi, [140, 0, 1.75]], [B.pintu, [100, 0, 2.3]], [B.menjelajah, [160, 0, 1.6]]], .4)(t);
  const z = c.s, camX = c.x;
  let g = GD.panorama(t, camX, { gy: GY, zoom: z, warm: rv(t, B.sebelum, .8) * .6, sunX: 820, sunY: 260, hi: { hive: rv(t, B.pintu, .3) * (1 - prog(t, B.menjelajah, B.menjelajah + .4)) }, traffic: t < B.sebelum ? 4 : 1 });
  // "sibuk mencari makan": a stream of foragers leaving (before the flashback), then only our young bee
  const sx = mx => 540 + (mx - camX) * z, sy = my => GY - (GY - my) * z;
  if (t < B.sebelum + .6) for (let i = 0; i < 4; i++) { const u = ((t - SWITCH) * .35 + i * .25) % 1; g += BEE.side(sx(70 + u * 700), sy(GY - 110 - u * 400 - 30 * i), .26 * z, { t: t + i, flap: 1 }); }
  // the young bee: hovers in front of the entrance, FACING it (turned back toward the hive), small arcs left/right
  const yb = rv(t, B.lebah, .5);
  if (yb > 0) {
    const a = (t - B.lebah) * 2.2, R = lerp(30, 120, prog(t, B.orientasi, B.menjelajah)), hx = 140 + R * Math.sin(a), hy = GY - 120 - 18 * Math.cos(a * 1.3);
    g += `<g opacity="${f3(yb)}">${hero(sx(hx), sy(hy), .5 * z, t, { flip: true })}</g>`;
  }
  let hud = TAG('PENERBANGAN ORIENTASI', { s: rv(t, B.orientasi, .3), o: rv(t, B.orientasi, .3) * (1 - prog(t, B.menjelajah, B.menjelajah + .3)) }, 540, 260, { size: 32 });
  hud += TAG('DULU', { s: 1, o: rv(t, B.sebelum, .4) * .9 }, 130, 170, { size: 26, fill: '#F6F3EB' });
  return svg(g + (rv(t, B.sebelum, .6) > 0 ? `<g opacity="${f3(rv(t, B.sebelum, .6))}">${FLASH}</g>` : '') + hud, VIG);
}

// ---------- 2. top view: the loops get wider around the hive (a faint trail), the landmarks are there the whole time ----------
function loops(t) {
  const k = prog(t, B.menjelajah, B.pohon), R = r => r;
  const c = camKeys([[B.menjelajah - .3, [100, 0, 1.4]], [B.mengenali, [250, -30, .85]], [B.pohon, [350, -40, .62]]], .45)(t);
  let w = GD.topMap(t, {});
  // spiral trail of the flight so far (faint dashed), growing radius
  const pts = []; const T0 = B.menjelajah - .2;
  for (let tt = T0; tt <= t; tt += .05) { const u = (tt - T0), r = 60 + 200 * u, a = u * 3.2; pts.push([r * Math.cos(a) + 40 * u, r * Math.sin(a) * .8]); }
  if (pts.length > 2) w += `<path d="${H.smoothPath(pts)}" fill="none" stroke="#F6F3EB" stroke-width="16" stroke-dasharray="4 26" stroke-linecap="round" opacity=".95"/>`;
  const last = pts.at(-1) || [80, 0], prev = pts.at(-3) || [60, 0], ang = Math.atan2(last[0] - prev[0], -(last[1] - prev[1])) * 180 / Math.PI;
  w += hero(last[0], last[1], 1.7, t, { top: true, ang });
  let g = `<g transform="${camT(c.x, c.y, c.s)}">${w}</g>`;
  g += TAG('MENJELAJAH LEBIH JAUH', { s: rv(t, B.menjelajah, .3), o: rv(t, B.menjelajah, .3) * (1 - prog(t, B.pohon - .3, B.pohon)) }, 540, 260, { size: 30, fill: '#F6F3EB' });
  return svg(g + `<g opacity=".9">${FLASH}</g>`, VIG);
}

// ---------- 3. what it recognises, in the VO's order: tree here, garden edge there, the skyline far away ----------
function landmarks(t) {
  const c = camKeys([[B.pohon - .3, [330, 0, .9]], [B.tepi, [620, 0, .62]], [B.bentuk, [700, 0, .45]], [B.jadi, [700, 0, .45]]], .4)(t);
  let g = GD.panorama(t, c.x, { gy: GY, zoom: c.s, warm: .6, sunX: 820, sunY: 260, hi: { tree: rv(t, B.pohon, .3), edge: rv(t, B.tepi, .3), sky: rv(t, B.bentuk, .3) } });
  const sx = mx => 540 + (mx - c.x) * c.s;
  const bee = { x: lerp(200, 420, prog(t, B.pohon - .3, B.jadi)) + 40 * Math.sin(t * 1.4), y: GY - 300 + 40 * Math.sin(t * 2) };
  g += hero(sx(bee.x), GY - (GY - bee.y) * c.s, .55 * c.s + .15, t, {});
  const lab = (txt, a, x, y) => { const k = rv(t, a, .3); return TAG(txt, { s: k, o: k }, x, y, { size: 30 }); };
  g += lab('POHON', B.pohon, 300, 260) + lab('TEPI KEBUN', B.tepi, 560, 330) + lab('GARIS LANGIT', B.bentuk, 800, 400);
  return svg(g + `<g opacity=".9">${FLASH}</g>`, VIG);
}

// ---------- 4. "dia gak cuma lewat. Dia juga belajar": flying out, shape snapshots are kept (outline cards, not a perfect map) ----------
function learn(t) {
  const camX = lerp(300, 1200, prog(t, B.jadi - .3, B.lalu + .3));
  let g = GD.panorama(t, camX, { gy: GY, zoom: .8, warm: .6 * (1 - prog(t, B.belajar + .4, B.lalu)), sunX: 820, sunY: 260 });
  g += hero(540, 620 + 30 * Math.sin(t * 2), .75, t, {});
  // snapshots: outline cards of tree / edge / skyline stacking at the top-left (memory as shapes)
  const snap = (i, a, inner) => { const k = rv(t, a, .35); if (k <= 0) return ''; return `<g opacity="${f3(k)}" transform="translate(${70 + i * 40},${160 + i * 46}) rotate(${-4 + i * 4})"><rect width="300" height="220" rx="20" fill="#F6F3EB" ${L.S(6)}/><g transform="translate(150,190) scale(.32)">${inner}</g></g>`; };
  const st = `fill="none" stroke="${P.teal}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"`;
  const iconTree = `<path d="M-20,0 C-10,-150 10,-250 40,-330" ${st}/><path d="M-260,-330 C-280,-420 -120,-470 0,-450 C120,-490 300,-440 260,-330 C140,-300 -120,-290 -260,-330 Z" ${st}/>`;
  const iconEdge = [-150, -50, 50, 150].map(x => `<path d="M${x},0 L${x},-180 M${x},-180 C${x - 80},-260 ${x - 120},-220 ${x - 150},-160 M${x},-180 C${x + 80},-260 ${x + 120},-220 ${x + 150},-160" ${st}/>`).join('');
  const iconSky = `<path d="M-400,0 C-300,-80 -200,-40 -120,-120 C-80,-220 -20,-210 20,-120 C60,-220 120,-210 160,-110 C240,-60 320,-80 400,0" ${st}/><path d="M300,-40 L310,-260 L330,-260 L340,-40" ${st}/>`;
  g += snap(0, B.lewat, iconTree);
  g += snap(1, B.lewat + .4, iconEdge);
  g += snap(2, B.belajar, iconSky);
  g += TAG('BELAJAR', { s: rv(t, B.belajar, .3), o: rv(t, B.belajar, .3) }, 760, 260, { size: 36 });
  return svg(g + (prog(t, B.belajar + .4, B.lalu) < 1 ? `<g opacity="${f3(.9 * (1 - prog(t, B.belajar + .4, B.lalu)))}">${FLASH}</g>` : ''), VIG);
}

// jejak rider: a tiny marked bee follows the footprints along the trail
const rider = (dt, PATH) => { const u = clamp(.12 + dt * .75); const [x, y] = PATH(u); return BEE.side(x + 40, y - 70, .35, { t: dt * 3, mark: true }); };

const list = [[atHive, SWITCH], [loops, B.menjelajah - .1, 'xf', .4], [landmarks, B.pohon - .25, 'xf', .35], [learn, B.jadi - .1, 'xf', .35]];
module.exports = { list, rider, B, atHive, loops, landmarks, learn, FLASH, VIG };
