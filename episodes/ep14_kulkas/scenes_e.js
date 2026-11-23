// EP14 · E — the practical steps as Mpi's actions (numbers ONLY on the word that says them): store quickly → leftovers ≤ 2 jam at room
// temperature → divide into small/shallow containers (cutaway: shallow cools faster) → fridge thermometer ≤ 4 °C → date label,
// 3–4 hari "umumnya" → freeze for longer. A checklist strip of icons builds at the top (no numbers in it).
// Then the close: the hidden process in the "still" box → extra time, with a limit → "Ngaku…": the mystery box at the back of the fridge.
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, microBG, lens, card } = L;
const Bm = require('./scenes_b'), Dm = require('./scenes_d');
const CN = require('../../series/world/canopy');

const E = { biar: W('biar'), simpan: W('simpan', 76), rusak: W('rusak', 78), secepatnya: W('secepatnya'), untuk: W('untuk'), sisa: W('sisa', 79), suhu: W('suhu', 80), ruang: W('ruang'),
  dua: W('2'), jam: W('jam', 82), bagi: W('bagi'), wadah: W('wadah', 83), kecil: W('kecil'), dangkal: W('dangkal'), cepat: W('cepat', 85), dingin: W('dingin', 85),
  jaga: W('jaga'), suhu2: W('suhu', 86), empat: W('4'), rendah: W('rendah'), sisa2: W('sisa', 89), disimpan: W('disimpan'), benar: W('benar'), umumnya: W('umumnya'),
  tigaempat: W('34'), hari: W('hari', 93), kalau: W('kalau'), lama: W('lama', 95), bekukan: W('bekukan'), jadi: W('jadi', 96), kotak: W('kotak', 96), diam: W('diam'),
  proses: W('proses'), tersembunyi: W('tersembunyi'), berjalan: W('berjalan'), kulkas: W('kulkas', 101.5), tambahan: W('tambahan'), tapi: W('tapi', 104), batas: W('batas'),
  ngaku: W('ngaku'), nemu: W('nemu', 107), misterius: W('misterius'), kelupaan: W('kelupaan'), belakang: W('belakang'), kulkasEnd: W('kulkas', 109.6) };
const MX = 430, MY = 1325, MS = 1.45;

// checklist strip (icons only), top of frame; each icon pops on its step word
const STEPS = [['fridge', E.simpan], ['clock', E.dua], ['shallow', E.dangkal], ['thermo', E.empat], ['label', E.disimpan], ['snow', E.bekukan]];
function strip(t) {
  const k0 = rv(t, E.biar, .4) * (1 - prog(t, E.jadi - .2, E.jadi + .3)); if (k0 <= 0) return '';
  let g = `<g opacity="${f3(k0)}"><rect x="90" y="150" width="900" height="120" rx="60" fill="#F6F3EB" ${L.S(6)}/>`;
  STEPS.forEach(([id, a], i) => {
    const x = 165 + i * 150, y = 210, k = rv(t, a, .35);
    g += `<circle cx="${x}" cy="${y}" r="44" fill="${k > 0 ? '#FFF1D6' : '#EDE5D5'}" stroke="${LINE}" stroke-width="4" stroke-dasharray="${k > 0 ? 'none' : '8 7'}"/>`;
    if (k <= 0) return;
    const ic = { fridge: `<rect x="-20" y="-30" width="40" height="60" rx="8" fill="${FG.FR.body}" ${L.S(4)}/><path d="M-20,-10 L20,-10" ${L.S(4)}/>`, clock: `<circle r="26" fill="#FBF6EC" ${L.S(4)}/><path d="M0,0 L0,-16 M0,0 L12,6" ${L.S(4)}/>`,
      shallow: `<rect x="-30" y="-6" width="60" height="22" rx="6" fill="#F6F3EB" ${L.S(4)}/><rect x="-34" y="-14" width="68" height="10" rx="4" fill="${FG.FR.lid}" ${L.S(3)}/>`,
      thermo: `<circle r="24" fill="#FBF6EC" ${L.S(4)}/><path d="M0,0 L-14,-12" ${L.S(5)}/>`, label: `<rect x="-28" y="-16" width="56" height="32" rx="5" fill="#FFF6D8" ${L.S(4)}/><path d="M-18,0 L18,0" stroke="#C9B98E" stroke-width="5"/>`, snow: FG.snow(0, 0, .8, FG.FR.coldD) }[id];
    g += `<g transform="translate(${x},${y}) scale(${f3(K.back(k))})">${ic}</g>`;
  });
  return g + '</g>';
}
const withStrip = (t, body) => svg(body + strip(t));

// ---------- 1. store perishables quickly ----------
const SHELF = [FG.FX + 14 + (FG.FR.w - 28) * .52, FG.FY + 254 + (FG.FR.h - 268) * .62];
function stepStore(t) {
  const mv = eio(prog(t, E.simpan - .2, E.simpan + .4)), placed = mv >= 1;
  const bx = lerp(MX, SHELF[0], mv), by = lerp(MY - 200, SHELF[1], mv);
  let over = mpiAt(MX, MY, MS, 'netral', { ...(mv < .5 ? { left: 'walletL', right: 'walletR' } : { right: { e: [240, 300], h: [290, 280] } }), eye: [8, -2], blink: blinkAt(t, [77.9]) });
  if (!placed) over += FG.box(bx, by, lerp(.5, .62, mv), { shadow: false, condense: .5 });
  if (mv > 0 && mv < 1) over += [0, 1, 2].map(i => `<path d="M${f1(bx - 180 - i * 20)},${f1(by - 60 + i * 30)} l-80,0" stroke="${P.orange}" stroke-width="8" stroke-linecap="round" opacity=".7"/>`).join('');
  return withStrip(t, FG.kitchenView(t, { cam: { x: 600, y: 880, s: 1.1 }, door: eio(prog(t, E.biar - .3, E.biar + .3)) * (1 - eio(prog(t, E.secepatnya + .3, E.untuk))), over, inside: { box: placed ? undefined : false } })
    + TAG('SECEPATNYA', { s: rv(t, E.secepatnya, .3), o: rv(t, E.secepatnya, .3) }, 540, 360, { size: 30 }));
}
// ---------- 2. leftovers: not more than 2 hours at room temperature (wedge on a clock; "2 JAM" only on "2") ----------
function step2h(t) {
  const c = { x: 330, y: 760, s: 1.5 };
  let g = FG.kitchenView(t, { cam: c, under: FG.pot(250, 902, .62, t, { steam: 1 - prog(t, E.untuk, E.jam + 1) }) });
  const ck = rv(t, E.sisa, .4), sweep = 60 * eio(prog(t, E.ruang + .3, E.dua + .25));   // 2 h = 60° on the hour hand; completes ON the word "2" (QC v1: it was full before "2")
  if (ck > 0) {
    const a = sweep * Math.PI / 180, R = 190, wedge = sweep > .5 ? `<path d="M0,0 L0,${-R} A${R},${R} 0 0 1 ${f1(R * Math.sin(a))},${f1(-R * Math.cos(a))} Z" fill="${P.orange}" opacity=".45"/>` : '';
    g += `<g opacity="${f3(ck)}" transform="translate(720,560) scale(${f3(.7 + .3 * ck)})"><circle r="${R + 14}" fill="#FBF6EC" ${L.S(8)}/>${wedge}${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(d => `<path transform="rotate(${d})" d="M0,${-R + 6} L0,${-R + 26}" ${L.S(d % 90 ? 4 : 7)}/>`).join('')}
      <path transform="rotate(${f1(sweep)})" d="M0,0 L0,${-R * .6}" ${L.S(12)}/><path transform="rotate(${f1(sweep * 12)})" d="M0,0 L0,${-R * .85}" ${L.S(6)}/><circle r="12" fill="${P.orange}" ${L.S(4)}/></g>`;
  }
  g += CN.thermo(150, 560, .9, .62);
  g += TAG('SUHU RUANG', { s: rv(t, E.suhu, .3), o: rv(t, E.suhu, .3) }, 200, 300, { size: 26, fill: '#F6F3EB' });
  g += TAG('2 JAM', { s: rv(t, E.dua, .25), o: rv(t, E.dua, .25) }, 720, 860, { size: 44 });
  return withStrip(t, g);
}
// ---------- 3. divide into small or shallow containers → cutaway: shallow cools faster ----------
function stepShallow(t) {
  let g = Dm.counterBG(t) + mpiAt(170, 1440, 1.5, 'netral', { right: { e: [240, 280], h: [280, 250] }, eye: [10, 4], blink: blinkAt(t, [84.5]) }) + Dm.counterFront;
  g += FG.pot(330, 1150, .7, t, { steam: .6 });
  const slots = [[620, E.wadah, 'small'], [800, E.kecil, 'small'], [960, E.dangkal, 'shallow']];
  slots.forEach(([x, a, kind], i) => { const k = eout(prog(t, a - .1, a + .3)); if (k <= 0) return;
    const fx = lerp(400, x, k), fy = lerp(950, 1150, k) - 120 * Math.sin(Math.PI * k);
    g += FG.box(x, 1150, kind === 'shallow' ? .6 : .7, { kind, lid: 0, food: true }) ;
    if (k < 1) g += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="22" fill="${FG.FR.stew}" ${L.S(4)}/>`; });
  // cutaway comparison (on "cepat dingin"): same elapsed time, the shallow one is cool through, the deep one still warm in the middle
  const ck = rv(t, E.cepat - .2, .4);
  if (ck > 0) { const kk = .2 + .5 * prog(t, E.cepat, E.jaga);
    g += `<g opacity="${f3(ck)}"><rect x="90" y="250" width="900" height="560" rx="40" fill="#F6F3EB" ${L.S(7)}/>${FG.heatSection(170, 330, 280, 380, kk, { n: 8 })}${FG.heatSection(560, 560, 360, 120, kk * 2.2, { n: 12 })}
      ${TAG('DALAM', { s: 1, o: 1 }, 310, 760, { size: 26, fill: '#F6F3EB' })}${TAG('DANGKAL', { s: 1, o: 1 }, 740, 760, { size: 26 })}</g>`; }
  return withStrip(t, g);
}
// ---------- 4. fridge thermometer: "4 °C" only on "4"; "atau lebih rendah" adds ≤ ----------
function stepThermo(t) {
  let g = `<rect width="1080" height="1920" fill="${FG.FR.bodyD}"/>` + FG.interior(60, 140, 960, 1260, t, { shelves: [.45, .82], boxS: 1.2, boxX: .35 });
  const ink = eout(prog(t, E.suhu2 - .3, E.suhu2 + .3)), lv = lerp(.6, .18, eio(prog(t, E.suhu2 + .2, E.empat + .1)));
  const num = t >= E.rendah - .05 ? '≤ 4 °C' : t >= E.empat - .04 ? '4 °C' : '';
  g += FG.thermoDial(lerp(1240, 760, ink), 640, 1.6, lv, { num, numK: rv(t, E.empat - .04, .2) });
  // Mpi's hand (sleeve from the right) placing it
  const hk = ink * (1 - prog(t, E.empat + .4, E.empat + 1));
  if (hk > 0) g += `<path d="M1200,${f1(900)} Q1000,860 ${f1(lerp(1300, 900, hk))},780" fill="none" stroke="${LINE}" stroke-width="64" stroke-linecap="round"/><path d="M1200,900 Q1000,860 ${f1(lerp(1300, 900, hk))},780" fill="none" stroke="${M.C.jacket}" stroke-width="52" stroke-linecap="round"/><circle cx="${f1(lerp(1300, 900, hk))}" cy="780" r="34" fill="${M.C.face}" ${L.S(6)}/>`;
  if (t > E.rendah) { const k = rv(t, E.rendah, .3); g += `<g opacity="${f3(k)}"><path d="M960,560 L960,${f1(560 + 160 * k)}" stroke="${FG.FR.coldD}" stroke-width="16" stroke-linecap="round"/><path d="M930,${f1(690 + 30 * k)} L960,${f1(730 + 30 * k)} L990,${f1(690 + 30 * k)}" fill="none" stroke="${FG.FR.coldD}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>`; }
  return withStrip(t, g);
}
// ---------- 5. date label on the box; "umumnya 3–4 hari" (calendar fills on "3–4") ----------
function stepLabel(t) {
  let g = Dm.counterBG(t) + mpiAt(230, 1440, 1.6, 'netral', { right: { e: [240, 290], h: [300, 262] }, eye: [10, 6], blink: blinkAt(t, [90.2]) }) + Dm.counterFront;
  const lb = rv(t, E.disimpan, .4);
  g += FG.box(600, 1150, 1.3, { lid: 0, label: lb > .5 ? 'SEN' : null, spoil: 0 });
  if (lb > 0 && lb < 1) g += `<path d="M${f1(lerp(520, 660, lb))},950 l40,-60" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/>`;
  const ck = rv(t, E.umumnya - .3, .4);
  g += `<g opacity="${f3(ck)}">${FG.calendar(700, 500, 1.6, { mark: [0, 1, 2, 3], k: prog(t, E.tigaempat - .1, E.hari) })}</g>`;
  if (t > E.tigaempat) g += `<circle cx="${700 + 1.6 * -0}" cy="516" r="34" fill="none" stroke="${P.orange}" stroke-width="6" stroke-dasharray="8 8" opacity="${f3(rv(t, E.hari, .3))}"/>`;
  g += TAG('UMUMNYA', { s: rv(t, E.umumnya, .3), o: rv(t, E.umumnya, .3) }, 700, 250, { size: 28, fill: '#F6F3EB' });
  g += TAG('3–4 HARI', { s: rv(t, E.tigaempat, .25), o: rv(t, E.tigaempat, .25) }, 700, 760, { size: 44 });
  return withStrip(t, g);
}
// ---------- 6. "Kalau mau lebih lama, bekukan." — into the freezer, frost ----------
function stepFreeze(t) {
  const frz = eio(prog(t, E.kalau, E.kalau + .5)) * (1 - eio(prog(t, E.bekukan + .5, E.bekukan + 1))), mv = eio(prog(t, E.lama - .3, E.bekukan));
  const bx = lerp(MX, FG.FX + FG.FR.w / 2, mv), by = lerp(MY - 200, FG.FY + 200, mv);
  let over = mpiAt(MX, MY, MS, t > E.bekukan ? 'lega' : 'netral', { ...(mv < .4 ? { left: 'walletL', right: 'walletR' } : { right: { e: [240, 240], h: [290, 190] } }), eye: [8, -8] });
  over += FG.box(bx, by, lerp(.5, .48, mv), { shadow: false, condense: mv });
  const fk = pulseK(t, E.bekukan, .9);
  if (fk > 0) over += [0, 1, 2, 3, 4].map(i => FG.snow(FG.FX + 60 + i * 60, FG.FY + 120 - 60 * fk * (1 + i % 2), .8, FG.FR.cold, fk)).join('');
  return withStrip(t, FG.kitchenView(t, { cam: { x: 600, y: 820, s: 1.15 }, freezer: frz, over }));
}
// ---------- 7. the "still" box hides a process: from the box in the fridge back to the kitchen ----------
function pullback(t) {
  const c = camKeys([[E.jadi - .3, [SHELF[0], SHELF[1] - 100, 3.0]], [E.diam, [SHELF[0], SHELF[1] - 100, 2.6]], [E.berjalan, [700, 860, 1.25]], [E.kulkas, [640, 880, 1.1]]], .4)(t);
  let over = mpiAt(MX, MY, MS, 'berpikir', { eye: [9, -6], blink: blinkAt(t, [99.0]) });
  let g = FG.kitchenView(t, { cam: c, door: 1, over });
  const lk = rv(t, E.proses, .4);
  const ts = 60 + t * .25;
  const inner = `<g transform="translate(540,560) scale(.6) translate(-540,-1000)">${microBG(ts, { id: 'pb' })}${Bm.community(ts, { speed: .5 })}</g>${MB.enzyme(lerp(420, 640, (ts * .3) % 1), 420, .7, ts, { cut: (ts * .5) % 1 })}${H.o2(640, 360, 1.1, ts * 30, .8)}`;
  g += lens(540, 520, 260, lk, inner, 'pb');
  g += TAG('PROSES TERSEMBUNYI', { s: rv(t, E.tersembunyi, .3), o: rv(t, E.tersembunyi, .3) }, 540, 860, { size: 30 });
  return svg(g);
}
// ---------- 8. "Kulkas memberi kita tambahan waktu. Tapi waktunya tetap ada batas." ----------
function timeBar(t) {
  let g = Dm.counterBG(t).replace(/<rect x="640"[^>]*\/>.*$/, '') + `<rect x="-200" y="-200" width="1480" height="2320" fill="${P.cream}" opacity=".6"/>`;
  K.setNow(t); g += K.grid('trail', [540, 700]);
  const x0 = 140, y = 700, base = 220, ext = 480 * eout(prog(t, E.tambahan - .1, E.tambahan + .9));
  g += `<rect x="${x0}" y="${y - 40}" width="${base}" height="80" rx="40" fill="${P.orange}" ${L.S(7)}/>`;
  if (ext > 2) g += `<rect x="${x0 + base - 40}" y="${y - 40}" width="${f1(ext + 40)}" height="80" rx="40" fill="${FG.FR.cold}" ${L.S(7)}/>${FG.snow(x0 + base + ext / 2, y, .9, FG.FR.coldD, clamp(ext / 200))}`;
  g += `<rect x="${x0}" y="${y - 40}" width="${base}" height="80" rx="40" fill="${P.orange}" ${L.S(7)}/>`;
  g += FG.box(x0 + 60, y - 50, .4, { shadow: false });
  // travelling marker: time keeps moving toward the end
  const mx = x0 + lerp(80, base + ext - 30, prog(t, E.kulkas, E.batas + 1.2));
  g += `<path d="M${f1(mx)},${y - 80} L${f1(mx)},${y + 80}" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/>`;
  const bk = rv(t, E.batas, .3);
  if (bk > 0) g += `<g transform="translate(${f1(x0 + base + ext + 30)},${y}) scale(${f3(K.back(bk))})"><rect x="-14" y="-150" width="28" height="230" rx="10" fill="${LINE}"/><path d="M14,-150 L110,-120 L14,-90 Z" fill="${P.alert}" ${L.S(5)}/></g>`;
  g += TAG('TAMBAHAN WAKTU', { s: rv(t, E.tambahan, .3), o: rv(t, E.tambahan, .3) }, 540, 480, { size: 32, fill: FG.FR.cold });
  g += TAG('ADA BATAS', { s: bk, o: bk }, 540, 920, { size: 32 });
  g += mpiAt(540, 1330, 1.1, t < E.batas ? 'penasaran' : 'menyadari', { eye: [0, -8], blink: blinkAt(t, [104.0]) });
  return svg(g);
}
// ---------- 9. "Ngaku, lo pernah nemu makanan misterius yang kelupaan di belakang kulkas?" ----------
function mystery(t) {
  const c = camKeys([[E.ngaku - .3, [640, 860, 1.2]], [E.misterius, [600, 840, 1.25]], [E.belakang + .4, [520, 860, 1.32]]], .35)(t);
  const grab = eio(prog(t, E.nemu - .2, E.misterius + .1)), pull = eio(prog(t, E.misterius + .1, E.kelupaan + .3));
  const back = `<g transform="translate(0,0)">${pull < .01 ? FG.box(FG.FX + 14 + (FG.FR.w - 28) * .8, FG.FY + 254 + (FG.FR.h - 268) * .33, .45, { lid: 0, fuzz: .9, lidCol: '#8FA08A', shadow: false }) : ''}</g>`;
  const reach = grab * (1 - pull);
  let over;
  if (pull < 1) {
    const [hx, hy] = [(FG.FX + 290 - (MX - 117 * MS)) / MS, (FG.FY + 520 - (MY - 456 * MS)) / MS];
    over = mpiAt(MX, MY, MS, t < E.misterius ? 'penasaran' : 'terkejut', { right: { e: [lerp(196, 260, reach), lerp(318, 230, reach)], h: [lerp(150, hx, reach), lerp(344, hy, reach)] }, eye: [10, -6], blink: blinkAt(t, [107.0]) });
    if (pull > 0) over += FG.box(lerp(FG.FX + 290, MX, pull), lerp(FG.FY + 560, MY - 200, pull), .45, { fuzz: .9, lidCol: '#8FA08A', shadow: false });
  } else {
    over = mpiAt(MX, MY, MS, t < E.belakang ? 'terkejut' : 'penasaran', { left: 'walletL', right: 'walletR', eye: t > E.belakang - .2 ? [0, 2] : [6, -4], blink: blinkAt(t, [110.6]) })
      + FG.box(MX, MY - 200, .45, { fuzz: .9, lidCol: '#8FA08A', shadow: false });
  }
  if (t > E.misterius) over += `<g opacity="${f3(rv(t, E.misterius, .3))}" transform="translate(${MX + 110},${MY - 760})">${M.questionMark(0, 0, 1.3, P.orange)}</g>`;
  return svg(FG.kitchenView(t, { cam: c, door: 1, over, inside: { back } }));
}

const list = [[stepStore, E.biar - .2, 'xf', .35], [step2h, E.untuk - .2, 'xf', .35], [stepShallow, E.bagi - .2, 'xf', .35], [stepThermo, E.jaga - .2, 'xf', .35], [stepLabel, E.sisa2 - .2, 'xf', .35],
  [stepFreeze, E.kalau - .2, 'xf', .35], [pullback, E.jadi - .2, 'xf', .4], [timeBar, E.kulkas - .2, 'xf', .4], [mystery, E.ngaku - .2, 'xf', .35]];
module.exports = { list, E, stepStore, step2h, stepShallow, stepThermo, stepLabel, stepFreeze, pullback, timeBar, mystery };
