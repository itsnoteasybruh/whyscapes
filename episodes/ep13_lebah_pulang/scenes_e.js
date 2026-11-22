// EP13 · E — going home: the clues are used TOGETHER (sky direction, the travel estimate, then tree / garden / the shape of the
// place) — a few candidate headings, then a correction past landmarks the viewer has already seen; if one clue helps less, others
// take over; the displacement experiment (closed carrier box, release elsewhere, tracked flight — no numbers); "not a magic line";
// the payoff at the hive door with the hidden layers stacking briefly; CTA in an unfamiliar garden; back to the first scene.
const L = require('./lib');
const A = require('./scenes_a');
const { K, M, H, GD, BEE, CM, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, noise, W, svg, TAG, camKeys, camT, rv, pulseK, blinkAt, ring, hero, mpiAt, END, VO_END } = L;

const E = { saat: W('saat', 73.5), bersama: W('bersama'), arah: W('arah', 77), perkiraan: W('perkiraan', 78), pohon: W('pohon', 79.5), kebun: W('kebun', 80.5), bentuk: W('bentuk', 81),
  kalau: W('kalau', 83), kurang: W('kurang'), lain: W('lain', 85), peneliti: W('peneliti'), memindahkan: W('memindahkan'), lokasi: W('lokasi'), melacak: W('melacak'),
  mengenal: W('mengenal'), ingatannya: W('ingatannya'), arah2: W('arah', 94), jadi: W('jadi', 96), garis: W('garis', 97), ajaib: W('ajaib'), di: W('di', 99), belok: W('belok', 100),
  tersembunyi: W('tersembunyi'), membaca: W('membaca'), melihat: W('melihat', 105), mengenali: W('mengenali', 106.5), dilewati: W('dilewatinya'),
  kalau2: W('kalau', 109), asing: W('asing'), hp: W('hp', 111), yakin: W('yakin'), lebah: W('lebah', 112) };
const GY = A.GY;

// ---------- 1. homing from the flowers (top view): candidate headings → sky + estimate + landmarks → correction → hive ----------
const homePath = BEE.fly([[E.saat, 1350, 40], [E.arah + .6, 1180, 10], [E.perkiraan + .8, 960, -30], [E.pohon + .5, 620, -110], [E.kebun + .6, 420, -80], [E.bentuk + 1.2, 200, -30], [E.kalau + .6, 90, 0]], { wobble: 10 });
function homing(t) {
  const b0 = homePath(t), arrived = prog(t, E.kalau + .6, E.kalau + 1.2);
  // after arriving, the bee hovers in front of the door (small figure-eight) instead of freezing
  const hv = (t - E.kalau) * 2.4, b = { ...b0, x: b0.x + arrived * 40 * Math.sin(hv), y: b0.y + arrived * 22 * Math.sin(hv * 2), ang: arrived ? 270 + 25 * Math.cos(hv) : b0.ang };
  const cam = { x: lerp(1200, 500, prog(t, E.saat, E.bentuk + .8)) - 120 * eio(prog(t, E.bentuk + .8, E.peneliti)), y: -30, s: lerp(.85, .6, prog(t, E.saat, E.bentuk)) * (1 + .12 * eio(prog(t, E.bentuk + .8, E.peneliti))) };
  let w = GD.topMap(t, { hi: { tree: rv(t, E.pohon, .3) * (1 - prog(t, E.kebun, E.kebun + .4)), edge: rv(t, E.kebun, .3) * (1 - prog(t, E.bentuk, E.bentuk + .4)), hive: rv(t, E.kalau, .3) } });
  // a few candidate headings (short dashed arcs) on "dipakai bersama", fading as the clues come in
  const ck = rv(t, E.saat + .3, .4) * (1 - prog(t, E.arah, E.perkiraan));
  if (ck > 0) [-50, -15, 25].forEach((a, i) => { const r = 260; w += `<path d="M${1350},40 q${f1(-r * .6)},${f1(-a * 2)} ${f1(-r * Math.cos(a * Math.PI / 180))},${f1(-r * Math.sin(a * Math.PI / 180))}" fill="none" stroke="#F6F3EB" stroke-width="12" stroke-dasharray="14 12" opacity="${f3(ck * (i === 1 ? 1 : .6))}"/>`; });
  // flown track so far (wiggly, corrected — never a straight neon line)
  const tr = []; for (let tt = E.saat; tt <= t; tt += .08) { const p = homePath(tt); tr.push([p.x, p.y]); }
  if (tr.length > 2) w += `<path d="${H.smoothPath(tr)}" fill="none" stroke="#F6F3EB" stroke-width="12" stroke-dasharray="4 20" stroke-linecap="round"/>`;
  w += hero(b.x, b.y, 1.5, t, { top: true, ang: b.ang });
  let g = `<g transform="${camT(cam.x, cam.y, cam.s)}">${w}</g>`;
  // the clue chips appear one by one WITH the words (sky / estimate / places)
  const chip = (i, a, txt, col) => { const k = rv(t, a, .3); if (k <= 0) return ''; const dim = i === 0 ? prog(t, E.kurang, E.kurang + .5) * (1 - prog(t, E.peneliti, E.peneliti + .5)) : 0, glow = i > 0 ? pulseK(t, E.lain, 1.2) : 0;
    return `<g opacity="${f3(k * (1 - .6 * dim))}">${TAG(txt, { s: 1 + .08 * glow, o: 1 }, 540, 240 + i * 78, { size: 30, fill: dim > .5 ? '#C3CDCF' : col })}</g>`; };
  g += chip(0, E.arah, 'ARAH LANGIT', '#FFD27A') + chip(1, E.perkiraan, 'PERKIRAAN JALAN', P.tealGlow) + chip(2, E.pohon, 'TEMPAT YANG DIKENAL', P.orange);
  return svg(g);
}

// ---------- 2. the displacement experiment (only from "Peneliti"): closed carrier box, release elsewhere, tracked flight ----------
function experiment(t) {
  let g = `<rect width="1080" height="1920" fill="#EDE6D8"/>${K.grid('ripple')}`;
  // research table with a closed, ventilated carrier box (bee safe inside)
  const box = rv(t, E.peneliti, .4);
  g += `<g opacity="${f3(box)}"><rect x="200" y="980" width="680" height="40" rx="10" fill="${GD.G.stand}" ${L.S(6)}/><path d="M260,1020 L260,1240 M820,1020 L820,1240" ${L.S(14)}/></g>`
    + `<g opacity="${f3(box * (1 - prog(t, E.lokasi + .3, E.lokasi + .8)))}"><g transform="translate(${f1(lerp(540, 900, eio(prog(t, E.memindahkan, E.lokasi + .3))))},${f1(lerp(940, 760, eio(prog(t, E.memindahkan, E.lokasi + .3))))})"><rect x="-90" y="-70" width="180" height="120" rx="14" fill="#F6F3EB" ${L.S(6)}/>${[0, 1, 2, 3].map(i => `<circle cx="${-45 + i * 30}" cy="-20" r="7" fill="${LINE}" opacity=".5"/>`).join('')}<path d="M-50,-70 C-50,-110 50,-110 50,-70" fill="none" ${L.S(8)}/></g></g>`;
  // two release areas: one the bee knows (landmarks), one it knows less (open, plain) — drawn as top-view tiles
  const zk = rv(t, E.lokasi, .5);
  if (zk > 0) {
    const tile = (x, y, known) => `<g opacity="${f3(zk)}"><rect x="${x - 220}" y="${y - 220}" width="440" height="440" rx="30" fill="${known ? GD.G.ground : '#D9DCC8'}" ${L.S(7)}/>`
      + (known ? `<circle cx="${x - 60}" cy="${y - 50}" r="70" fill="${GD.G.crown}" ${L.S(5)}/>${[0, 1, 2, 3].map(i => `<circle cx="${x + 120}" cy="${y - 150 + i * 70}" r="30" fill="${GD.G.banana}" ${L.S(4)}/>`).join('')}<rect x="${x - 160}" y="${y + 120}" width="60" height="60" rx="8" fill="${GD.G.roof}" ${L.S(5)}/>`
                : [0, 1, 2, 3, 4, 5].map(i => `<path d="M${f1(x - 150 + 60 * i)},${f1(y - 100 + 40 * Math.sin(i))} l-8,-24 m8,24 l0,-30 m0,30 l10,-22" stroke="#B5B99E" stroke-width="6" stroke-linecap="round"/>`).join('')) + '</g>';
    g += tile(300, 600, true) + tile(780, 600, false);
    g += TAG('DIKENAL', { s: zk, o: zk }, 300, 330, { size: 28, fill: P.tealGlow }) + TAG('KURANG DIKENAL', { s: zk, o: zk }, 780, 330, { size: 28, fill: '#F6F3EB' });
    // tracked flights (dotted) after "melacak": the known tile heads off toward its hive corner after a short search; the other searches longer
    const tk = prog(t, E.melacak, E.ingatannya + 1.2);
    const track = (x, y, known) => { const pts = []; const n = Math.floor(60 * tk); for (let i = 0; i <= n; i++) { const u = i / 60, r = known ? 60 * (1 - u) + 10 : 50 + 40 * Math.sin(u * 9), a = u * (known ? 8 : 14);
      pts.push(known ? [x + 40 * Math.cos(a) * (1 - u) - 150 * eio(clamp((u - .45) / .55)), y + 30 * Math.sin(a) * (1 - u) + 170 * eio(clamp((u - .45) / .55))] : [x + r * Math.cos(a) * (.8 + u), y + r * Math.sin(a) * (.8 + u)]); }
      return pts.length > 2 ? `<path d="${H.smoothPath(pts)}" fill="none" stroke="${P.orange}" stroke-width="8" stroke-dasharray="2 14" stroke-linecap="round"/>` + (pts.length ? BEE.top(pts.at(-1)[0], pts.at(-1)[1], .5, 0, { t, mark: true }) : '') : ''; };
    g += track(300, 600, true) + track(780, 600, false);
    // memory overlay on the known tile ("memakai ingatannya")
    const mk = rv(t, E.ingatannya, .4);
    if (mk > 0) g += `<circle cx="240" cy="550" r="110" fill="none" stroke="${P.teal}" stroke-width="10" stroke-dasharray="18 12" opacity="${f3(mk)}"/>`;
  }
  // a researcher (same universe) at the table, writing — respectful, small
  g += `<g opacity="${f3(box)}" transform="translate(${f1(160 - 117 * .62)},${f1(1240 - 456 * .62)}) scale(.62)">${L.MT ? '' : ''}${require('../../series/character/people').person({ skin: 'deep', hair: '#1E1A17', hairStyle: 'curly', topColor: '#F6F3EB', pants: '#2E3A56', glasses: true, expr: 'netral', arm: 'clipboard', shadow: 'none' })}</g>`;
  g += TAG('PENELITIAN', { s: box, o: box * (1 - prog(t, E.lokasi, E.lokasi + .4)) }, 540, 820, { size: 32 });
  return svg(g);
}

// ---------- 3. "bukan garis ajaib di udara": a straight neon line appears on "garis", gets rejected on "ajaib" ----------
function magicLine(t) {
  let g = GD.panorama(t, 700, { gy: GY, zoom: .55, sunX: 820, sunY: 300 });
  const sx = mx => 540 + (mx - 700) * .55;
  const lk = rv(t, E.garis, .3), x = rv(t, E.ajaib, .3), gone = prog(t, E.udara || E.ajaib + .4, E.di);
  if (lk > 0) g += `<g opacity="${f3(lk * (1 - gone))}"><path d="M${f1(sx(1400))},${GY - 150} L${f1(sx(40))},${GY - 60}" stroke="#7CFFB2" stroke-width="16" stroke-linecap="round"/><path d="M${f1(sx(1400))},${GY - 150} L${f1(sx(40))},${GY - 60}" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`;
  if (x > 0) g += `<g opacity="${f3(x * (1 - gone))}" transform="translate(${f1(sx(720))},${GY - 110})"><path d="M-70,-70 L70,70 M70,-70 L-70,70" stroke="${P.alert}" stroke-width="22" stroke-linecap="round"/></g>`;
  // the real bee keeps doing its wiggly corrected flight underneath
  const u = prog(t, E.jadi, E.di + .5), bx = sx(lerp(1300, 300, u)), by = GY - 200 - 60 * Math.sin(u * 7);
  g += hero(bx, by, .5, t, { flip: true });
  return svg(g);
}
E.udara = W('udara');

// ---------- 4. payoff: back in the first garden, past the tree, to the hive door; the hidden layers stack briefly ----------
const payPath = BEE.fly([[E.di - .3, 900, GY - 420], [E.belok, 520, GY - 520], [E.tersembunyi, 300, GY - 380], [E.melihat, 180, GY - 230], [E.dilewati - .3, 80, GY - 120], [E.dilewati + .2, 62, GY - 100]], { wobble: 9 });
function payoff(t) {
  const c = camKeys([[E.di - .3, [700, 0, .8]], [E.belok, [450, 0, 1]], [E.mengenali, [150, 0, 1.5]], [E.dilewati + .3, [110, 0, 1.9]], [E.kalau2 - .1, [110, 0, 1.9]]], .45)(t);
  const sx = mx => 540 + (mx - c.x) * c.s, sy = my => GY - (GY - my) * c.s;
  const reveal = rv(t, E.tersembunyi, .4) * (1 - prog(t, E.dilewati + .2, E.kalau2));
  let g = GD.panorama(t, c.x, { gy: GY, zoom: c.s, sunX: 820, sunY: 300, hi: { tree: rv(t, E.mengenali, .3) * reveal, sky: rv(t, E.mengenali + .3, .3) * reveal, hive: rv(t, E.dilewati - .3, .3) } });
  const b = payPath(t), landed = t > E.dilewati + .2;
  // layers: the sky direction (sun ray), the moving scenery (streaks), the remembered places (handled by hi outlines above)
  const lk = rv(t, E.membaca, .3) * reveal;
  if (lk > 0) g += `<path d="M820,300 L${f1(sx(b.x))},${f1(sy(b.y))}" stroke="#FFD27A" stroke-width="12" stroke-dasharray="18 12" opacity="${f3(lk)}"/>`;
  const mk = rv(t, E.melihat, .3) * reveal;
  if (mk > 0) for (let i = 0; i < 7; i++) { const y = GY + 120 + i * 40, x = ((-t * 900 + i * 260) % 1300 + 1300) % 1300 - 150; g += `<path d="M${f1(x)},${f1(y)} l160,0" stroke="#F6F3EB" stroke-width="8" stroke-linecap="round" opacity="${f3(.7 * mk)}"/>`; }
  g += hero(sx(b.x), sy(b.y), .5 * c.s + .1, t, { flip: !landed && b.flip, flap: landed ? 0 : 1, legs: landed ? 'stand' : 'fly', pollen: 1 });
  g += TAG('PROSES TERSEMBUNYI', { s: rv(t, E.tersembunyi, .3), o: reveal }, 540, 250, { size: 32 });
  return svg(g);
}

// ---------- 5. CTA: Mpi in an UNFAMILIAR garden (no hive, no kersen, different skyline), phone without guidance, awkward smile ----------
function cta(t) {
  let g = `<rect width="1080" height="1920" fill="#E2EBDD"/>`;
  g += `<path d="M-100,820 C200,700 400,780 600,720 C800,660 1000,760 1200,700 L1200,960 L-100,960 Z" fill="#C9D6C2"/>`;   // unknown, rounded hills (no twin peaks, no tower)
  for (let i = 0; i < 6; i++) g += H.tree(80 + i * 190, 960 + 10 * (i % 2), .9 + .2 * hash(i), t, { seed: i + 20, col: '#5E9C7E', colD: '#3F7A62' });
  g += `<rect x="0" y="950" width="1080" height="970" fill="#CFE0A8"/>`;
  for (let k = 0; k < 40; k++) { const x = (k * 97) % 1100, y = 1000 + (k * 53) % 600; g += `<path d="M${x},${y} l-10,-34 m10,34 l0,-42 m0,42 l12,-30" stroke="#A9C27E" stroke-width="7" stroke-linecap="round"/>`; }
  for (let k = 0; k < 5; k++) g += GD.flowerClump(120 + k * 210, 1340 + 30 * (k % 2), 1.3, t, k + 300);
  const look = Math.sin((t - E.kalau2) * 1.6);
  const push = 1 + .07 * eio(prog(t, E.kalau2 - .2, L.END)), pdx = 30 * Math.sin((t - E.kalau2) * .6);   // slow push + drift: the CTA never sits still
  g += `<g transform="${L.place(540, 1250, .95)}">${M.mpi(t < E.yakin ? 'bingung' : 'lega', { right: 'phone', left: t < E.hp ? 'down' : 'shrug', eye: [10 * look, -2], tilt: 4 * look, blink: blinkAt(t, [110.6, 113.0]) })}</g>`;
  // the phone: no bars, a spinner (no guidance) — generic UI, no app logo
  const pk = rv(t, E.hp, .3);
  if (pk > 0) g += `<g opacity="${f3(pk)}"><rect x="700" y="420" width="260" height="420" rx="34" fill="#22302E" ${L.S(6)}/><rect x="718" y="450" width="224" height="360" rx="14" fill="#F4FBFB"/>${CM.bars(740, 480, .8, 0)}${CM.spinner(830, 640, 50, t)}<path d="M690,830 L600,900" stroke="${LINE}" stroke-width="6" stroke-dasharray="10 8"/></g>`;
  // the marked bee zips past toward its home, on "secepat lebah"
  const u = prog(t, E.lebah - .5, E.lebah + .9);
  if (u > 0 && u < 1) g += BEE.side(lerp(1200, -150, u), 760 - 120 * Math.sin(u * Math.PI), .9, { t, mark: true, flip: true, pollen: 1 });
  return svg(`<g transform="translate(${f1(540 + pdx)},1000) scale(${f3(push)}) translate(-540,-1000)">${g}</g>`);
}

const list = [[homing, E.saat - .1, 'xf', .4], [experiment, E.peneliti - .1, 'xf', .4], [magicLine, E.jadi - .1, 'xf', .35], [payoff, E.di - .1, 'xf', .35], [cta, E.kalau2 - .1, 'xf', .35]];   // the closing cover crossfades the CTA back to the first scene (engine loopMix)
module.exports = { list, E, homing, experiment, magicLine, payoff, cta };
