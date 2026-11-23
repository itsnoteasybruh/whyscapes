// EP14 v2 · E — the practical steps as Mpi's actions; every number appears ONLY on the word that says it:
//   "…masuk kulkas dalam 2 jam" (clock wedge completes on "2") → "lebih dari 32 derajat, batasnya 1 jam" (room thermometer rises on "32",
//   the wedge halves on "1") → shallow containers, cutaway: shallow cools faster → fridge thermometer "4 °C" / "≤ 4 °C" → date label,
//   "umumnya 3–4 hari" (a general guide for leftovers handled right, not a guarantee) → freezer on "bekukan".
//   A checklist strip of icons builds at the top (no numbers in it).
// Then the close: back in the kitchen, the original box from the hook: the cold slows the process, time keeps running →
// teaser: "hik!" (Mpi hiccups), the comment bubble, the orange trail leaving the frame (next episode).
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, microBG, lens, card } = L;
const Bm = require('./scenes_b'), Dm = require('./scenes_d');
const CN = require('../../series/world/canopy');

const E = { makanan: W('makanan', 33.5), rusak: W('rusak'), masuk: W('masuk', 34.5), kulkas: W('kulkas', 35), dua: W('2'), jam: W('jam'),
  kalau: W('kalau'), suhu: W('suhu'), lebih: W('lebih', 37.5), t32: W('32'), derajat: W('derajat'), batasnya: W('batasnya'), satu: W('1'),
  simpan: W('simpan'), masakan: W('masakan', 41), wadah: W('wadah'), dangkal: W('dangkal'), cepat: W('cepat'), dingin: W('dingin', 43.5),
  jaga: W('jaga'), kulkas2: W('kulkas', 44.5), empat: W('4'), rendah: W('rendah'), sisa2: W('sisa', 47), umumnya: W('umumnya'), tigaempat: W('34'), hari: W('hari'),
  lama: W('lama'), bekukan: W('bekukan'),
  dinginEnd: W('dingin', 52.5), memperlambat: W('memperlambat', 53), proses: W('proses'), tapi: W('tapi', 54), waktu: W('waktu'), tetap: W('tetap'), berjalan: W('berjalan'),
  lalu: W('lalu'), bunyi: W('bunyi'), hik: W('hik'), cegukan: W('cegukan'), berasal: W('berasal'), tulis: W('tulis'), tebakan: W('tebakan'), komentar: W('komentar'),
  ditelusuri: W('ditelusuri'), berikutnya: W('berikutnya') };
E.masakan2 = W('masakan', E.sisa2); E.kalau2 = W('kalau', E.hari); E.bisa = W('bisa', E.komentar);
const MX = 430, MY = 1325, MS = 1.45;

// checklist strip (icons only), top of frame; each icon pops on its step word
const STEPS = [['clock', E.dua], ['shallow', E.dangkal], ['thermo', E.empat], ['label', E.masakan2], ['snow', E.bekukan]];
function strip(t) {
  const k0 = rv(t, E.makanan, .4) * (1 - prog(t, E.dinginEnd - .2, E.dinginEnd + .3)); if (k0 <= 0) return '';
  let g = `<g opacity="${f3(k0)}"><rect x="165" y="150" width="750" height="120" rx="60" fill="#F6F3EB" ${L.S(6)}/>`;
  STEPS.forEach(([id, a], i) => {
    const x = 240 + i * 150, y = 210, k = rv(t, a, .35);
    g += `<circle cx="${x}" cy="${y}" r="44" fill="${k > 0 ? '#FFF1D6' : '#EDE5D5'}" stroke="${LINE}" stroke-width="4" stroke-dasharray="${k > 0 ? 'none' : '8 7'}"/>`;
    if (k <= 0) return;
    const ic = { clock: `<circle r="26" fill="#FBF6EC" ${L.S(4)}/><path d="M0,0 L0,-16 M0,0 L12,6" ${L.S(4)}/>`,
      shallow: `<rect x="-30" y="-6" width="60" height="22" rx="6" fill="#F6F3EB" ${L.S(4)}/><rect x="-34" y="-14" width="68" height="10" rx="4" fill="${FG.FR.lid}" ${L.S(3)}/>`,
      thermo: `<circle r="24" fill="#FBF6EC" ${L.S(4)}/><path d="M0,0 L-14,-12" ${L.S(5)}/>`, label: `<rect x="-28" y="-16" width="56" height="32" rx="5" fill="#FFF6D8" ${L.S(4)}/><path d="M-18,0 L18,0" stroke="#C9B98E" stroke-width="5"/>`, snow: FG.snow(0, 0, .8, FG.FR.coldD) }[id];
    g += `<g transform="translate(${x},${y}) scale(${f3(K.back(k))})">${ic}</g>`;
  });
  return g + '</g>';
}
const withStrip = (t, body) => svg(body + strip(t));
const SHELF = [FG.FX + 14 + (FG.FR.w - 28) * .52, FG.FY + 254 + (FG.FR.h - 268) * .62];

// ---------- 1. perishables into the fridge within 2 h; above 32 °C the limit is 1 h (clock wedge + room thermometer) ----------
function stepTime(t) {
  const c = camKeys([[E.makanan - .3, [380, 760, 1.42]], [E.kalau, [360, 760, 1.5]]], .35)(t);
  const hot = eio(prog(t, E.t32 - .1, E.t32 + .5));
  let g = FG.kitchenView(t, { cam: c, under: FG.pot(250, 902, .62, t, { steam: .8 }) });
  g += `<rect width="1080" height="1920" fill="${P.orange}" opacity="${f3(.12 * hot)}"/>`;
  // clock: wedge grows to 60° (= 2 h on the hour hand) only WHILE "dua jam" is spoken (QC r1: it was ~55° before "2"); on "1" it shrinks to 30° (= 1 h)
  const ck = rv(t, E.makanan, .4), sweep = 60 * eio(prog(t, E.dua - .03, E.dua + .45)) - 30 * eio(prog(t, E.satu - .05, E.satu + .3));
  if (ck > 0) {
    const a = sweep * Math.PI / 180, R = 190, wedge = sweep > .5 ? `<path d="M0,0 L0,${-R} A${R},${R} 0 0 1 ${f1(R * Math.sin(a))},${f1(-R * Math.cos(a))} Z" fill="${P.orange}" opacity=".45"/>` : '';
    g += `<g opacity="${f3(ck)}" transform="translate(720,600) scale(${f3(.7 + .3 * ck)})"><circle r="${R + 14}" fill="#FBF6EC" ${L.S(8)}/>${wedge}${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(d => `<path transform="rotate(${d})" d="M0,${-R + 6} L0,${-R + 26}" ${L.S(d % 90 ? 4 : 7)}/>`).join('')}
      <path transform="rotate(${f1(sweep)})" d="M0,0 L0,${-R * .6}" ${L.S(12)}/><path transform="rotate(${f1(sweep * 12)})" d="M0,0 L0,${-R * .85}" ${L.S(6)}/><circle r="12" fill="${P.orange}" ${L.S(4)}/></g>`;
  }
  // room thermometer: appears on "suhu", rises on "32"
  const tk = rv(t, E.suhu, .35);
  if (tk > 0) g += `<g opacity="${f3(tk)}">${CN.thermo(190, 600, 1.05, lerp(.5, .9, hot))}</g>`;
  const k2 = rv(t, E.dua, .25) * (1 - prog(t, E.satu - .1, E.satu + .05)), k1 = rv(t, E.satu, .25);
  g += TAG('2 JAM', { s: k2, o: k2 }, 720, 900, { size: 44 });
  g += TAG('1 JAM', { s: k1, o: k1 }, 720, 900, { size: 44, fill: P.alert, color: '#FFFFFF' });
  g += TAG('> 32 °C', { s: rv(t, E.t32, .25), o: rv(t, E.t32, .25) }, 210, 330, { size: 34, fill: '#F6F3EB' });
  return withStrip(t, g);
}
// ---------- 2. leftovers into shallow containers → cutaway: shallow cools faster ----------
function stepShallow(t) {
  let g = Dm.counterBG(t) + mpiAt(235, 1440, 1.5, 'netral', { right: { e: [240, 280], h: [280, 250] }, eye: [10, 4], blink: blinkAt(t, [42.4]) }) + Dm.counterFront;
  g += FG.pot(400, 1150, .7, t, { steam: .6 });
  const slots = [[620, E.masakan, 'small'], [800, E.wadah, 'shallow'], [960, E.dangkal, 'shallow']];
  slots.forEach(([x, a, kind]) => { const k = eout(prog(t, a - .1, a + .3)); if (k <= 0) return;
    const fx = lerp(400, x, k), fy = lerp(950, 1150, k) - 120 * Math.sin(Math.PI * k);
    g += FG.box(x, 1150, kind === 'shallow' ? .6 : .7, { kind, lid: 0, food: true });
    if (k < 1) g += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="22" fill="${FG.FR.stew}" ${L.S(4)}/>`; });
  const ck = rv(t, E.cepat - .1, .4);
  if (ck > 0) { const kk = .2 + .5 * prog(t, E.cepat, E.jaga);
    g += `<g opacity="${f3(ck)}"><rect x="90" y="330" width="900" height="560" rx="40" fill="#F6F3EB" ${L.S(7)}/>${FG.heatSection(170, 410, 280, 380, kk, { n: 8 })}${FG.heatSection(560, 640, 360, 120, kk * 2.2, { n: 12 })}
      ${TAG('DALAM', { s: 1, o: 1 }, 310, 840, { size: 26, fill: '#F6F3EB' })}${TAG('DANGKAL', { s: 1, o: 1 }, 740, 840, { size: 26 })}</g>`; }
  g += TAG('CEPAT DINGIN', { s: rv(t, E.dingin, .3), o: rv(t, E.dingin, .3) }, 540, 980, { size: 30, fill: FG.FR.cold });
  return withStrip(t, g);
}
// ---------- 3. fridge thermometer: "4 °C" only on "4"; "atau lebih rendah" adds ≤ and the arrow ----------
function stepThermo(t) {
  let g = `<rect width="1080" height="1920" fill="${FG.FR.bodyD}"/>` + FG.interior(60, 140, 960, 1260, t, { shelves: [.45, .82], boxS: 1.2, boxX: .35 });
  const ink = eout(prog(t, E.jaga - .2, E.kulkas2 + .2)), lv = lerp(.6, .18, eio(prog(t, E.kulkas2, E.empat + .1)));
  const num = t >= E.rendah - .05 ? '≤ 4 °C' : t >= E.empat - .04 ? '4 °C' : '';
  g += FG.thermoDial(lerp(1240, 760, ink), 640, 1.6, lv, { num, numK: rv(t, E.empat - .04, .2) });
  const hk = ink * (1 - prog(t, E.empat + .4, E.empat + 1));
  if (hk > 0) g += `<path d="M1200,${f1(900)} Q1000,860 ${f1(lerp(1300, 900, hk))},780" fill="none" stroke="${LINE}" stroke-width="64" stroke-linecap="round"/><path d="M1200,900 Q1000,860 ${f1(lerp(1300, 900, hk))},780" fill="none" stroke="${M.C.jacket}" stroke-width="52" stroke-linecap="round"/><circle cx="${f1(lerp(1300, 900, hk))}" cy="780" r="34" fill="${M.C.face}" ${L.S(6)}/>`;
  if (t > E.rendah) { const k = rv(t, E.rendah, .3); g += `<g opacity="${f3(k)}"><path d="M960,560 L960,${f1(560 + 160 * k)}" stroke="${FG.FR.coldD}" stroke-width="16" stroke-linecap="round"/><path d="M930,${f1(690 + 30 * k)} L960,${f1(730 + 30 * k)} L990,${f1(690 + 30 * k)}" fill="none" stroke="${FG.FR.coldD}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>`; }
  return withStrip(t, g);
}
// ---------- 4. date label on the box; "umumnya … 3–4 hari" (calendar fills on "3–4"; a general guide, not a guarantee) ----------
function stepLabel(t) {
  let g = Dm.counterBG(t) + mpiAt(230, 1440, 1.6, 'netral', { right: { e: [240, 290], h: [300, 262] }, eye: [10, 6], blink: blinkAt(t, [48.9]) }) + Dm.counterFront;
  const lb = rv(t, E.masakan2 - .1, .45);
  g += FG.box(600, 1150, 1.3, { lid: 0, label: lb > .5 ? 'SEN' : null, spoil: 0 });
  if (lb > 0 && lb < 1) g += `<path d="M${f1(lerp(520, 660, lb))},950 l40,-60" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/>`;
  const ck = rv(t, E.umumnya - .3, .4);
  g += `<g opacity="${f3(ck)}">${FG.calendar(700, 560, 1.6, { mark: [0, 1, 2, 3], k: prog(t, E.tigaempat - .1, E.hari) })}</g>`;
  g += TAG('UMUMNYA', { s: rv(t, E.umumnya, .3), o: rv(t, E.umumnya, .3) }, 700, 330, { size: 28, fill: '#F6F3EB' });
  g += TAG('3–4 HARI', { s: rv(t, E.tigaempat, .25), o: rv(t, E.tigaempat, .25) }, 700, 820, { size: 44 });
  return withStrip(t, g);
}
// ---------- 5. "kalau lebih lama, bekukan." — into the freezer, frost ----------
function stepFreeze(t) {
  const frz = eio(prog(t, E.kalau2, E.kalau2 + .45)) * (1 - eio(prog(t, E.bekukan + .5, E.bekukan + 1))), mv = eio(prog(t, E.lama - .3, E.bekukan));
  const bx = lerp(MX, FG.FX + FG.FR.w / 2, mv), by = lerp(MY - 200, FG.FY + 200, mv);
  let over = mpiAt(MX, MY, MS, t > E.bekukan ? 'lega' : 'netral', { ...(mv < .4 ? { left: 'walletL', right: 'walletR' } : { right: { e: [240, 240], h: [290, 190] } }), eye: [8, -8] });
  over += FG.box(bx, by, lerp(.5, .48, mv), { shadow: false, condense: mv });
  const fk = pulseK(t, E.bekukan, .9);
  if (fk > 0) over += [0, 1, 2, 3, 4].map(i => FG.snow(FG.FX + 60 + i * 60, FG.FY + 120 - 60 * fk * (1 + i % 2), .8, FG.FR.cold, fk)).join('');
  return withStrip(t, FG.kitchenView(t, { cam: { x: 600, y: 820, s: 1.15 }, freezer: frz, over })
    + TAG('BEKUKAN', { s: rv(t, E.bekukan, .3), o: rv(t, E.bekukan, .3) }, 760, 360, { size: 32, fill: FG.FR.cold }));
}
// ---------- 6. payoff: back in the kitchen with the ORIGINAL box from the hook. Cold slows the process; the clock keeps running ----------
function payoff(t) {
  const c = camKeys([[E.dinginEnd - .3, [MX + 170, MY - 280, 1.75]], [E.proses, [MX + 160, MY - 300, 1.6]], [E.waktu, [600, 860, 1.15]]], .4)(t);   // Mpi + the box left, lens right
  const minutes = 600 + 240 * prog(t, E.waktu, E.berjalan + 1.2);
  const over = mpiAt(MX, MY, MS, t < E.tapi ? 'berpikir' : 'menyadari', { left: 'walletL', right: 'walletR', eye: [9, -6], blink: blinkAt(t, [53.7]) })
    + FG.box(MX, MY - 200, .5, { lid: 0, spoil: .25, shadow: false });
  let g = FG.kitchenView(t, { cam: c, door: 1, over, clockMin: minutes });
  const lk = rv(t, E.memperlambat, .4) * (1 - prog(t, E.waktu - .3, E.waktu + .05)), ts = 60 + t * .25;   // v2 QC r1: the lens is gone before the clock arrives
  const inner = `<g transform="translate(790,640) scale(.55) translate(-540,-1000)">${microBG(ts, { id: 'pb' })}${Bm.community(ts, { speed: .5 })}</g>${MB.enzyme(lerp(690, 870, (ts * .3) % 1), 520, .7, ts, { cut: (ts * .5) % 1 })}${H.o2(880, 470, 1.1, ts * 30, .8)}`;
  g += lens(790, 600, 215, lk, inner, 'pb');
  g += TAG('MELAMBAT', { s: rv(t, E.memperlambat, .3), o: lk }, 790, 880, { size: 30, fill: FG.FR.cold });
  const wk = rv(t, E.waktu + .05, .35);
  if (wk > 0) g += `<g opacity="${f3(wk)}" transform="translate(760,470) scale(${f3(.6 + .4 * wk)})">${CN.clockFace(0, 0, 150, minutes)}</g>`;
  g += TAG('TETAP BERJALAN', { s: rv(t, E.berjalan, .3), o: rv(t, E.berjalan, .3) }, 760, 700, { size: 30 });
  return svg(g);
}
// ---------- 7. teaser: "dari mana bunyi 'hik!' saat cegukan berasal?" → comment bubble → the trail leaves for the next episode ----------
function teaser(t) {
  const c = camKeys([[E.lalu - .3, [600, 860, 1.15]], [E.hik, [520, 900, 1.3]], [E.tulis, [560, 860, 1.2]], [E.ditelusuri, [600, 820, 1.1]]], .35)(t);
  const hic = pulseK(t, E.hik - .03, .35);                                    // a single hiccup jolt on "hik!"
  const expr = t < E.hik - .03 ? 'berpikir' : t < E.cegukan ? 'terkejut' : t < E.tulis ? 'bingung' : 'penasaran';
  const over = mpiAt(MX, MY - 40 * hic, MS, expr, { left: 'walletL', right: t > E.tulis ? 'point' : 'walletR', eye: t > E.tulis ? [2, 0] : [9, -6], bodyDy: -8 * hic, blink: blinkAt(t, [58.3, 61.2]) });
  let g = FG.kitchenView(t, { cam: c, door: 0, over });
  const hk = rv(t, E.hik - .03, .2) * (1 - prog(t, E.hik + .6, E.hik + 1));
  if (hk > 0) g += `<g opacity="${f3(hk)}" transform="translate(${MX + 230},${MY - 760}) scale(${f3(.6 + .5 * K.back(hk))}) rotate(-8)">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path transform="rotate(${i * 45})" d="M0,-70 L0,-110" stroke="${P.orange}" stroke-width="12" stroke-linecap="round"/>`).join('')}
    <text y="22" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="72" fill="${LINE}" stroke="#F6F3EB" stroke-width="10" paint-order="stroke">HIK!</text></g>`;
  if (t > E.berasal) g += `<g opacity="${f3(rv(t, E.berasal, .3) * (1 - prog(t, E.tulis - .2, E.tulis + .1)))}" transform="translate(${MX + 120},${MY - 780})">${M.questionMark(0, 0, 1.3, P.orange)}</g>`;
  // comment bubble on "tulis … komentar" (no handle, no text: just a guess bubble)
  const bk = rv(t, E.tulis, .35);
  if (bk > 0) g += `<g transform="translate(760,520) scale(${f3(K.back(bk))})"><path d="M-170,-110 H170 A40,40 0 0 1 210,-70 V60 A40,40 0 0 1 170,100 H-40 L-110,160 L-90,100 H-170 A40,40 0 0 1 -210,60 V-70 A40,40 0 0 1 -170,-110 Z" fill="#F6F3EB" ${L.S(8)}/>
    ${[0, 1, 2].map(i => `<circle cx="${-70 + i * 70}" cy="-6" r="18" fill="${i === 1 ? P.orange : LINE}" opacity="${f3(.4 + .6 * pulseK(t, E.tebakan + i * .15, .5))}"/>`).join('')}</g>`;
  // the signature trail leaves the frame on "ditelusuri berikutnya"
  const tk = prog(t, E.ditelusuri - .1, E.berikutnya + .6);
  if (tk > 0) { let d = ''; for (let i = 0; i <= 24; i++) { const q = i / 24 * tk, x = lerp(MX + 160, 1180, q), y = 1240 - 220 * Math.sin(Math.PI * q * .9); d += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(9 + 3 * (i % 2))}" fill="${P.orange}" opacity="${f3(.85)}"/>`; } g += d; }
  return svg(g);
}

const list = [[stepTime, E.makanan - .2, 'xf', .35], [stepShallow, E.simpan - .2, 'xf', .35], [stepThermo, E.jaga - .2, 'xf', .35], [stepLabel, E.sisa2 - .2, 'xf', .35],
  [stepFreeze, E.kalau2 - .2, 'xf', .35], [payoff, E.dinginEnd - .2, 'xf', .4], [teaser, E.lalu - .2, 'xf', .4]];
module.exports = { list, E, stepTime, stepShallow, stepThermo, stepLabel, stepFreeze, payoff, teaser };
