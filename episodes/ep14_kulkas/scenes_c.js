// EP14 · C — the remote joke (slow motion works, pause does not) → the head start: food can already carry a "modal" before the door
// closes → left too long on the table (time-lapse clock, warm) → one big deep tub: the centre stays warm longer (cutaway) →
// once inside, the lost time cannot be rewound (rewind button joke).
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, microBG, lens } = L;
const CN = require('../../series/world/canopy');
const Bm = require('./scenes_b');

const C = { anggap: W('anggap'), kulkas: W('kulkas', 43), tombol: W('tombol'), slow: W('slow'), bukan: W('bukan', 45), pause: W('pause'), masalahnya: W('masalahnya'),
  modal: W('modal'), rusak: W('rusak'), sebelum: W('sebelum'), pintu: W('pintu'), ditutup: W('ditutup'), misalnya: W('misalnya'), sisa: W('sisa'), dibiarkan: W('dibiarkan'),
  lama: W('lama', 54), meja: W('meja'), atau: W('atau', 55), ditaruh: W('ditaruh'), wadah: W('wadah'), besar: W('besar'), tengahnya: W('tengahnya'), dingin: W('dingin', 58.5),
  begitu: W('begitu'), masuk: W('masuk', 59.5), waktu: W('waktu', 60), terlewat: W('terlewat'), diputar: W('diputar'), balik: W('balik', 61), terus: W('terus') };
const MX = 430, MY = 1325, MS = 1.45;
const toScr = (rx, ry, x = MX, y = MY, s = MS) => [x - 117 * s + rx * s, y - 456 * s + ry * s];

// Mpi pointing a remote at the fridge: raise 0..1, which button, press amount
function mpiRemote(t, raise, press, k, expr) {
  const rx = lerp(150, 252, raise), ry = lerp(344, 238, raise);
  const [sx, sy] = toScr(rx, ry);
  return mpiAt(MX, MY, MS, expr, { right: { e: [lerp(196, 236, raise), lerp(318, 290, raise)], h: [rx, ry] }, eye: [8, -6], blink: blinkAt(t, [44.2, 47.9, 61.0]) })
    + FG.remote(sx + 8, sy - 30, .42, { press, k, rot: lerp(0, 62, raise) });
}
// slow-time inset: the box surface in the fridge, everything moving slowly; a small dial keeps turning
function slowLens(t, x, y, r, k, id, speed) {
  const ts = 40 + t * speed;
  const inner = `<g transform="translate(${x},${y + 30}) scale(.55) translate(-540,-1000)">${microBG(ts, { id: 'sl' + id })}${Bm.community(ts, { speed: .5 })}</g>
    <g transform="translate(${x + r * .45},${y - r * .5})"><circle r="38" fill="#F6F3EB" ${L.S(5)}/><path transform="rotate(${f1(ts * 60)})" d="M0,0 L0,-26" ${L.S(6)}/></g>`;
  return lens(x, y, r, k, inner, id);
}

// ---------- 1. "tombol slow motion, bukan tombol pause" ----------
const camR = camKeys([[C.anggap - .3, [600, 860, 1.12]], [C.slow, [640, 820, 1.18]], [C.pause + 1, [640, 800, 1.2]]], .35);
function remoteJoke(t) {
  const c = camR(t), raise = eio(prog(t, C.anggap, C.tombol));
  const press = t > C.pause - .05 ? 'pause' : t > C.slow - .05 ? 'slow' : null, k = press === 'pause' ? pulseK(t, C.pause - .05, .5) + .4 : press ? pulseK(t, C.slow - .05, .5) + .4 : 0;
  const expr = t < C.slow ? 'penasaran' : t < C.pause + .3 ? 'menyadari' : 'bingung';
  let over = mpiRemote(t, raise, press, clamp(k), expr === 'menyadari' ? 'netral' : expr);
  // beam from the remote to the fridge on each press
  const beam = (a) => { const q = prog(t, a, a + .4); if (q <= 0 || q >= 1) return ''; return `<circle cx="${f1(lerp(700, 830, q))}" cy="${f1(lerp(720, 700, q))}" r="${f1(30 + 80 * q)}" fill="none" stroke="${P.orange}" stroke-width="8" opacity="${f3(1 - q)}"/>`; };
  over += beam(C.slow) + beam(C.pause);
  let g = FG.kitchenView(t, { cam: c, over });
  // slow-motion lens over the fridge door (the hidden process keeps going)
  const lk = rv(t, C.kulkas, .4), sp = t < C.slow ? .6 : .18;
  g += slowLens(t, 640, 520, 230, lk, 'r', sp);
  g += TAG('SLOW MOTION', { s: rv(t, C.slow, .3), o: rv(t, C.slow, .3) }, 640, 830, { size: 30 });
  // pause icon pops, tries, wobbles and is crossed out while the dial still turns
  const pk = rv(t, C.pause, .25);
  if (pk > 0) {
    const sh = 10 * Math.sin((t - C.pause) * 40) * (1 - prog(t, C.pause + .2, C.pause + .9)), x = prog(t, C.pause + .45, C.pause + .7);
    g += `<g transform="translate(${f1(880 + sh)},300) scale(${f3(K.back(pk))})"><circle r="80" fill="#F6F3EB" ${L.S(7)}/><rect x="-28" y="-36" width="18" height="72" rx="6" fill="${LINE}"/><rect x="10" y="-36" width="18" height="72" rx="6" fill="${LINE}"/>
      ${x > 0 ? `<path d="M-60,-60 L${f1(-60 + 120 * x)},${f1(-60 + 120 * x)}" stroke="${P.alert}" stroke-width="16" stroke-linecap="round"/>` : ''}</g>`;
  }
  return svg(g);
}
// ---------- 2. "makanan udah punya modal buat cepat rusak sebelum pintu kulkas ditutup" ----------
const SHELF = [FG.FX + 14 + (FG.FR.w - 28) * .52, FG.FY + 254 + (FG.FR.h - 268) * .62];
function headstart(t) {
  const c = { x: 600, y: 860, s: 1.1 };
  const mv = eio(prog(t, C.pintu - .25, C.ditutup - .15)), door = 1 - eio(prog(t, C.ditutup - .1, C.ditutup + .45));
  const placed = mv >= 1;
  const bx = lerp(MX, SHELF[0], mv), by = lerp(MY - 200, SHELF[1], mv), bs = lerp(.5, .62, mv);
  const arms = mv < .6 ? { left: 'walletL', right: 'walletR' } : { right: { e: [240, 300], h: [290, 280] } };
  let over = mpiAt(MX, MY, MS, t < C.rusak ? 'netral' : 'berpikir', { ...arms, eye: [8, 0], blink: blinkAt(t, [49.0]) });
  if (!placed) over += FG.box(bx, by, bs, { spoil: .2, shadow: false });
  let g = FG.kitchenView(t, { cam: c, door, over, inside: { box: placed ? undefined : false, boxO: { spoil: .2 } } });
  // inset: the same food already carries microbes (the "modal") — the count is NOT reset by the door
  const lk = rv(t, C.masalahnya, .4);
  const col = MB.colony(t, { x: 540, y: 1000, w: 700, h: 260, kind: 'rod', n0: 2, max: 14, seed: 9, s: 2.2, t0: C.masalahnya - 2, rate: t < C.ditutup ? .9 : .15 });
  g += lens(330, 470, 230, lk, `<g transform="translate(330,500) scale(.5) translate(-540,-1000)">${microBG(t, { id: 'hs', warm: t < C.ditutup ? .7 : .2 })}${col.svg}</g>`, 'hs');
  g += TAG('MODAL', { s: rv(t, C.modal, .3), o: rv(t, C.modal, .3) }, 330, 770, { size: 34 });
  return svg(g);
}
// ---------- 3. "sisa masakan dibiarkan terlalu lama di meja" — time-lapse on the counter, warm ----------
function tableTime(t) {
  const c = camKeys([[C.misalnya - .3, [330, 720, 1.5]], [C.meja, [330, 700, 1.7]]], .35)(t);
  const tl = prog(t, C.sisa, C.meja + .6), minutes = 720 + 300 * eio(tl);
  const under = FG.pot(250, 902, .62, t, { steam: 1 - tl }) + CN.heatShimmer(120, 380, 830, t, .4 + .6 * tl, { gap: 90, h: 120 });
  let g = FG.kitchenView(t, { cam: c, clockMin: minutes, under });
  g += `<rect width="1080" height="1920" fill="${P.orange}" opacity="${f3(.08 + .08 * tl)}"/>`;
  const col = MB.colony(t, { x: 540, y: 1000, w: 760, h: 260, kind: 'coccus', n0: 2, max: 30, seed: 4, s: 2.1, t0: C.sisa, rate: 1.4 });
  g += lens(760, 420, 220, rv(t, C.dibiarkan, .4), `<g transform="translate(760,450) scale(.5) translate(-540,-1000)">${microBG(t, { id: 'tt', warm: 1 })}${col.svg}</g>`, 'tt');
  g += TAG('TERLALU LAMA', { s: rv(t, C.lama, .3), o: rv(t, C.lama, .3) }, 760, 710, { size: 30 });
  return svg(g);
}
// ---------- 4. one big deep tub in the fridge: cutaway, edges cool first, the centre stays warm longer ----------
function bigTub(t) {
  let g = `<rect width="1080" height="1920" fill="${FG.FR.bodyD}"/>` + FG.interior(60, 140, 960, 1260, t, { items: false, shelves: [.92] });
  // cold air drifting along the walls
  for (let i = 0; i < 7; i++) { const ph = (t * .3 + i / 7) % 1, x = 120 + i * 140; g += `<path d="M${x},${f1(260 + ph * 600)} q20,30 0,60 q-20,30 0,60" fill="none" stroke="${FG.FR.cold}" stroke-width="10" stroke-linecap="round" opacity="${f3(.7 * Math.sin(Math.PI * ph))}"/>`; }
  const ink = eout(prog(t, C.ditaruh - .1, C.wadah + .3)), big = lerp(.9, 1, eout(prog(t, C.besar, C.besar + .4)));
  const s = 2.0 * big, X = 540, Y = 1300 + 300 * (1 - ink);
  g += FG.box(X, Y, s, { kind: 'big', lid: 0, food: false });
  // cutaway window into the tub, the cooling front moves in slowly from the walls
  const cut = eio(prog(t, C.besar + .2, C.tengahnya - .1));
  if (cut > 0) {
    const w = 320 * s - 70, h = 300 * s - 70, x0 = X - w / 2, y0 = Y - 300 * s + 40;
    const kk = .1 + .35 * prog(t, C.besar + .2, C.begitu);
    g += `<g opacity="${f3(cut)}">${FG.heatSection(x0, y0, w, h * cut + 1, kk, { n: 12 })}</g>`;
    if (t > C.tengahnya - .1) g += ring(X, y0 + h / 2, 120, rv(t, C.tengahnya, .3), '#F6F3EB');
  }
  g += TAG('WADAH BESAR', { s: rv(t, C.besar, .3), o: rv(t, C.besar, .3) }, 540, 260, { size: 32, fill: '#F6F3EB' });
  g += TAG('TENGAHNYA MASIH HANGAT', { s: rv(t, C.tengahnya, .3), o: rv(t, C.tengahnya, .3) }, 540, 350, { size: 28 });
  return svg(g);
}
// ---------- 5. "waktu yang terlewat tadi nggak bisa diputar balik" — the rewind button does nothing ----------
function noRewind(t) {
  const c = camKeys([[C.begitu - .3, [560, 860, 1.1]], [C.diputar, [520, 760, 1.25]]], .35)(t);
  const door = 1 - eio(prog(t, C.masuk, C.masuk + .5)), raise = eio(prog(t, C.waktu, C.terlewat + .3));
  const rw = prog(t, C.diputar - .05, C.diputar + .35), snap = prog(t, C.diputar + .35, C.diputar + .55);
  const minutes = 900 + (t - C.begitu) * 6 - 25 * Math.sin(Math.PI * clamp(rw)) * (1 - snap);
  let over = mpiRemote(t, raise, t > C.diputar - .1 ? 'rew' : null, pulseK(t, C.diputar - .1, .5) + .4, t < C.diputar + .4 ? 'penasaran' : 'bingung');
  let g = FG.kitchenView(t, { cam: c, door, over, clockMin: minutes, inside: { boxO: { spoil: .2 } } });
  const ck = rv(t, C.waktu, .35);
  g += `<g opacity="${f3(ck)}" transform="translate(${f1(300 + 8 * Math.sin((t - C.diputar) * 50) * pulseK(t, C.diputar + .35, .4))},420) scale(${f3(.6 + .4 * ck)})">${CN.clockFace(0, 0, 150, minutes)}</g>`;
  if (t > C.diputar + .5) g += `<g opacity="${f3(rv(t, C.diputar + .5, .2))}"><path d="M200,300 L400,540 M400,300 L200,540" stroke="${P.alert}" stroke-width="18" stroke-linecap="round" opacity=".85"/></g>`;
  g += TAG('TIDAK BISA DIULANG', { s: rv(t, C.balik, .3), o: rv(t, C.balik, .3) }, 300, 680, { size: 28, fill: '#F6F3EB' });
  return svg(g);
}

const list = [[remoteJoke, C.anggap - .2, 'xf', .4], [headstart, C.masalahnya - .2, 'xf', .35], [tableTime, C.misalnya - .2, 'xf', .35], [bigTub, C.atau - .15, 'xf', .35], [noRewind, C.begitu - .2, 'xf', .35]];
module.exports = { list, C, remoteJoke, headstart, tableTime, bigTub, noRewind, mpiRemote };
