// EP14 v2 · B — the MICRO WORLD on the food surface (explanation visual, not a species portrait).
// "Kulkas itu tombol pelambat, bukan tombol berhenti" (a SLOW button works on the micro world, a STOP button fails; nothing freezes) →
// "Dingin memperlambat pertumbuhan banyak mikroba" (warm vs cold lane, both still dividing) → "Tapi sebagian masih bisa tumbuh" (only SOME
// cells active, the rest dimmed: not all microbes are the same) → "Enzim dan udara pun terus bekerja" (INSIDE the food vs AT the surface,
// side by side) → "Perlahan, rasa, warna, atau teksturnya berubah" (time-lapse on the food, cards in the VO's order).
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, ring, camKeys, camT, microBG, lens, card, ICON, SWITCH } = L;

const B = { kulkas: W('kulkas', 13.4), tombol: W('tombol'), pelambat: W('pelambat'), bukan: W('bukan'), berhenti: W('berhenti'),
  dingin: W('dingin', 16), memperlambat: W('memperlambat'), pertumbuhan: W('pertumbuhan'), banyak: W('banyak'), mikroba: W('mikroba'), tapi: W('tapi'), sebagian: W('sebagian'),
  tumbuh: W('tumbuh'), enzim: W('enzim'), udara: W('udara'), terus: W('terus'), bekerja: W('bekerja'), pelan: W('perlahan'), rasanya: W('rasa'), warna: W('warna'),
  teksturnya: W('teksturnya'), berubah: W('berubah') };
B.tombol2 = W('tombol', B.bukan); B.dan = B.berubah + .9;
const COLD = .16, WARM = 1.05;                         // doublings per second (illustrative, stated in NOTES — not lab values)

// microbes resting on the rice hills (ground y ≈ 1180): a mixed community, each kind drawn differently
function community(t, o = {}) {
  const kinds = ['rod', 'coccus', 'yeast', 'rod', 'coccus', 'rod', 'yeast', 'rod'];
  let g = '';
  for (let i = 0; i < (o.n || 8); i++) {
    const k = kinds[i % kinds.length], x = 110 + i * 123 + 18 * Math.sin(t * (o.speed || .4) + i), y = 1000 - 150 * (i % 2) + 30 * Math.sin(i * 2.3) + 8 * Math.cos(t * .7 + i);
    const hi = o.hi ? o.hi(i, k) : 0, dim = o.dim ? o.dim(i, k) : 0;
    g += MB.cell(k, x, y, 2.6, t * (o.speed || .4) * 2, { ang: hash(i * 7) * 160, col: dim > 0 ? FG.lerpHex(MB.MB[k], '#7F8A88', dim) : undefined, o: 1 - .3 * dim });
    if (hi > 0) g += ring(x, y, 80, hi);
  }
  return g;
}
// ---------- 1. through the portal onto the food in the fridge; "tombol pelambat, bukan tombol berhenti" ----------
const btn = (x, y, k, press, icon, col) => k <= 0 ? '' : `<g transform="translate(${x},${f1(y)}) scale(${f3(K.back(k))})"><rect x="-96" y="-66" width="192" height="148" rx="34" fill="${LINE}"/>
  <rect x="-96" y="${f1(-78 + 12 * press)}" width="192" height="${f1(140 - 12 * press)}" rx="34" fill="${col}" ${L.S(7)}/><g transform="translate(0,${f1(-8 + 6 * press)})">${icon}</g></g>`;
const ICO_SLOW = `<path d="M-46,-26 L-6,0 L-46,26 Z M0,-26 L40,0 L0,26 Z" fill="${LINE}"/>`;
const ICO_STOP = `<rect x="-30" y="-30" width="60" height="60" rx="8" fill="${LINE}"/>`;
function enterMicro(t) {
  const z = lerp(1.6, 1, eout(prog(t, SWITCH, B.kulkas + .4)));
  // the micro world's speed: normal → slowed on "pelambat" (never zero); pressing STOP changes nothing
  const slow = eio(prog(t, B.pelambat, B.pelambat + .6));
  const tt = t < B.pelambat ? t : B.pelambat + (t - B.pelambat) * lerp(1, .3, slow);
  let g = `<g transform="translate(540,900) scale(${f3(z)}) translate(-540,-900)">${microBG(tt, { id: 'e' })}${community(tt, { speed: .4 })}</g>`;
  g += ring(540, 700, 430, (1 - prog(t, SWITCH + 1, SWITCH + 1.6)) * .6, '#F6F3EB');
  g += TAG('DI KULKAS', { s: rv(t, B.kulkas, .3), o: rv(t, B.kulkas, .3) * (1 - prog(t, B.tombol - .25, B.tombol)) }, 540, 260, { size: 34, fill: FG.FR.cold });
  // SLOW button: appears on "tombol", pressed on "pelambat"
  g += btn(300, 330, rv(t, B.tombol, .3), pulseK(t, B.pelambat, .45), ICO_SLOW, FG.FR.cold);
  g += TAG('PELAMBAT', { s: rv(t, B.pelambat, .3), o: rv(t, B.pelambat, .3) }, 300, 490, { size: 28, fill: '#F6F3EB' });
  // STOP button: appears on the 2nd "tombol", pressed on "berhenti" → wobbles, is crossed out; the dial keeps turning
  const k2 = rv(t, B.tombol2, .3);
  if (k2 > 0) {
    const sh = 9 * Math.sin((t - B.berhenti) * 40) * clamp(prog(t, B.berhenti + .1, B.berhenti + .3)) * (1 - prog(t, B.berhenti + .3, B.berhenti + .9)), x = prog(t, B.berhenti + .4, B.berhenti + .65);
    g += `<g transform="translate(${f1(sh)},0)">${btn(780, 330, k2, pulseK(t, B.berhenti, .45), ICO_STOP, P.orange)}</g>`;
    g += TAG('BERHENTI', { s: rv(t, B.berhenti, .3), o: rv(t, B.berhenti, .3) }, 780, 490, { size: 28, fill: '#F6F3EB' });
    if (x > 0) g += `<path d="M690,250 L${f1(690 + 180 * x)},${f1(250 + 180 * x)}" stroke="${P.alert}" stroke-width="18" stroke-linecap="round"/>`;
  }
  // a time-lapse dial: slower after "pelambat", but it never stops
  const dk = rv(t, B.tombol, .3);
  if (dk > 0) g += `<g opacity="${f3(dk)}" transform="translate(540,640)"><circle r="54" fill="#F6F3EB" ${L.S(6)}/><path transform="rotate(${f1((tt - SWITCH) * 200)})" d="M0,0 L0,-38" ${L.S(8)}/><circle r="7" fill="${P.orange}" ${L.S(3)}/></g>`;
  return svg(g);
}
// ---------- 2. two lanes: warm vs cold. Both divide; cold is slower. Then the cold lane takes the frame ----------
function lane(t, y0, y1, warm, id, rate, seed) {
  const h = y1 - y0, gy = Math.min(y1 - 170, 1180), sh = gy - 1180;   // micro ground near the lane bottom, never in the subtitle zone
  const col = MB.colony(t, { x: 540, y: gy - 190, w: 820, h: 240, kind: 'rod', n0: 2, max: 30, seed, s: 2.0, t0: B.dingin, rate });
  const bg = `<g transform="translate(0,${f1(sh)})">${microBG(t, { id, warm, frost: !warm })}</g>`;
  return { svg: `<defs><clipPath id="cl${id}"><rect x="0" y="${f1(y0)}" width="1080" height="${f1(h)}"/></clipPath></defs><g clip-path="url(#cl${id})">${bg}${col.svg}</g>${y1 < 1900 && y1 > 5 ? `<path d="M0,${f1(y1)} L1080,${f1(y1)}" stroke="#F6F3EB" stroke-width="10"/>` : ''}`, n: col.n };
}
function twoTracks(t) {
  const take = eio(prog(t, B.banyak - .1, B.mikroba + .5));          // the cold lane takes the frame on "banyak mikroba"
  const split = lerp(760, 0, take);
  const top = lane(t, split - 760 + 0, split, 1, 'w', WARM, 3), bot = lane(t, split, 1920, 0, 'c', COLD, 5);
  let g = bot.svg + (take < 1 ? top.svg : '');
  const lk = rv(t, B.dingin, .3);
  g += TAG('HANGAT', { s: lk, o: lk * (1 - take) }, 230, split - 640, { size: 32, fill: P.orange });
  g += TAG('DINGIN', { s: lk, o: lk }, 230, split + 80, { size: 32, fill: FG.FR.cold });
  g += TAG('MELAMBAT', { s: rv(t, B.memperlambat, .3), o: rv(t, B.memperlambat, .3) }, 820, split + 80, { size: 30, fill: '#F6F3EB' });
  const dial = (x, y, a) => `<g transform="translate(${x},${y})"><circle r="56" fill="#F6F3EB" ${L.S(6)}/><path transform="rotate(${f1(a)})" d="M0,0 L0,-40" ${L.S(8)}/><circle r="7" fill="${P.orange}" ${L.S(3)}/></g>`;
  g += dial(930, split + 260, (t - B.dingin) * 40);
  if (take < 1) g += `<g opacity="${f3(1 - take)}">${dial(930, split - 420, (t - B.dingin) * 260)}</g>`;
  return svg(g);
}
// ---------- 3. "Tapi sebagian masih bisa tumbuh" — only SOME cells are active ----------
function spoilers(t) {
  const sel = rv(t, B.sebagian, .4), act = i => [0, 3, 5, 7].includes(i);
  let g = microBG(t, { id: 's' });
  g += community(t, { speed: .3, hi: (i, k) => act(i) ? sel : 0, dim: (i, k) => act(i) ? 0 : .7 * sel });
  for (const [i, x] of [[0, 110], [3, 479], [5, 725], [7, 971]]) {
    const k = clamp((t - B.tumbuh - i * .15) / 1.4), y = 1060 + 40 * Math.sin(i * 2.3);
    if (k > 0) g += MB.cell('rod', x + 40 * eout(k), y - 50 * eout(k), 1.5, t, { ang: hash(i * 7) * 160 + 30, o: clamp(k * 3) });
  }
  g += TAG('SEBAGIAN', { s: rv(t, B.sebagian, .3), o: rv(t, B.sebagian, .3) }, 540, 300, { size: 34 });
  g += TAG('MASIH TUMBUH', { s: rv(t, B.tumbuh, .3), o: rv(t, B.tumbuh, .3) }, 540, 400, { size: 28, fill: '#F6F3EB' });
  return svg(g);
}
// ---------- 4. "Enzim dan udara pun terus bekerja": INSIDE the food (enzymes cut chains) | AT the surface (air browns a cut fruit) ----------
function panelEnzyme(t, cut) {
  let w = `<rect x="40" y="300" width="1000" height="1300" rx="60" fill="#E9F1D9" ${L.S(8)}/>`;
  for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) w += `<rect x="${90 + q * 470}" y="${350 + r * 400}" width="430" height="360" rx="70" fill="#F4F8EA" stroke="#8FB07A" stroke-width="10"/>`;
  [[520, 0], [920, 1], [1320, 2]].forEach(([y, i]) => {
    const cuts = [260 + 60 * i, 540 + 40 * i, 820].filter((cx, j) => cut > j / 3 + i * .08);
    w += MB.chain(150, 930, y, t, { cuts, gap: 22 * clamp(cut * 3 - i * .3) });
    w += MB.enzyme(lerp(150, 900, clamp(cut * 1.3 - i * .12)), y - 40, 1.1, t, { cut: (cut * 9) % 1, ang: -10 });
  });
  return w;
}
function panelAir(t, ox2, br) {
  let w = `<path d="M100,1250 C100,820 300,560 540,560 C780,560 980,820 980,1250 Z" fill="#B5532A" ${L.S(8)}/><path d="M140,1250 C140,860 320,620 540,620 C760,620 940,860 940,1250 Z" fill="#FBF0CF" ${L.S(5)}/>`;
  w += `<ellipse cx="540" cy="1010" rx="70" ry="110" fill="none" stroke="#D9C28F" stroke-width="8"/>${[0, 72, 144, 216, 288].map(a => `<ellipse transform="rotate(${a} 540 1010)" cx="540" cy="950" rx="9" ry="18" fill="#5A3E2A"/>`).join('')}`;
  for (let i = 0; i < 9; i++) { const x = 220 + hash(i * 5) * 640, y = 760 + hash(i * 9) * 420, r = 30 + 50 * br * hash(i * 13); if (br > hash(i) * .5) w += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * .7)}" fill="#C98E4E" opacity="${f3(.55 * clamp(br * 2 - hash(i)))}"/>`; }
  for (let i = 0; i < 12; i++) { const ph = (t * .25 + i / 12) % 1, x = 160 + (i * 83) % 760, y = lerp(200, 700 + (i % 3) * 140, ph); w += H.o2(x, y, 1.6, i * 30 + t * 20, ox2 * Math.sin(Math.PI * ph)); }
  return w + `<path d="M100,1250 L980,1250" ${L.S(8)}/>`;
}
function players(t) {
  let g = `<rect x="-20" y="-20" width="1120" height="1960" fill="#1D3835"/>`;
  for (let i = 0; i < 60; i++) { const x = (i * 157) % 1180 - 50, y = ((i * 263) - t * 12) % 1900; g += `<circle cx="${x}" cy="${f1(y < 0 ? y + 1900 : y)}" r="${2 + i % 3}" fill="#BFE6EE" opacity=".16"/>`; }
  const ke = rv(t, B.enzim - .05, .45), ka = rv(t, B.udara - .05, .45);
  const cut = prog(t, B.enzim, B.bekerja + 1.6), ox2 = prog(t, B.udara, B.bekerja + .6), br = prog(t, B.udara + .2, B.bekerja + 1.8);
  const pan = (x, k, inner, id) => k <= 0 ? '' : `<g opacity="${f3(clamp(k * 1.6))}" transform="translate(${x},${f1(470 + 120 * (1 - k))}) scale(.47)"><defs><clipPath id="pc${id}"><rect x="20" y="180" width="1040" height="1460" rx="60"/></clipPath></defs>
    <rect x="20" y="180" width="1040" height="1460" rx="60" fill="#264A46" ${L.S(10)}/><g clip-path="url(#pc${id})">${inner}</g></g>`;
  g += pan(25, ke, panelEnzyme(t, cut), 'e') + pan(545, ka, panelAir(t, ox2, br), 'a');
  g += TAG('ENZIM', { s: ke, o: ke }, 279, 500, { size: 32 }) + TAG('UDARA', { s: ka, o: ka }, 801, 500, { size: 32, fill: '#BFE6EE' });
  g += TAG('DI DALAM BAHAN', { s: rv(t, B.enzim + .3, .3), o: rv(t, B.enzim + .3, .3) }, 279, 1290, { size: 24, fill: '#F6F3EB' });
  g += TAG('DI PERMUKAAN', { s: rv(t, B.udara + .3, .3), o: rv(t, B.udara + .3, .3) }, 801, 1290, { size: 24, fill: '#F6F3EB' });
  g += TAG('TERUS BEKERJA', { s: rv(t, B.bekerja, .3), o: rv(t, B.bekerja, .3) }, 540, 300, { size: 32, fill: '#F6F3EB' });
  return svg(g);
}
// ---------- 5. time-lapse on the food: the surface changes gradually; RASA → WARNA → TEKSTUR in the VO's order ----------
function changes(t) {
  const sp = clamp(.15 + .75 * prog(t, B.pelan, B.berubah + 1));
  const c = camKeys([[B.pelan - .3, [540, 980, 1.25]], [B.rasanya - .35, [540, 1000, 1.0]], [B.dan, [540, 1000, .96]]], .35)(t);
  let w = `<rect x="-600" y="-600" width="2280" height="3200" fill="#EFE7D6"/><rect x="-600" y="-600" width="2280" height="3200" fill="url(#paper)"/>`;
  w += FG.box(540, 1330, 2.7, { lid: 1, spoil: sp });
  for (let i = 0; i < 46; i++) {
    const born = B.pelan + hash(i * 3) * (B.berubah + .6 - B.pelan), k = clamp((t - born) / .8); if (k <= 0) continue;
    const x = 180 + hash(i * 11) * 720, y = 940 + hash(i * 17) * 70, kind = ['rod', 'coccus', 'yeast'][i % 3];
    w += MB.cell(kind, x, y, .55 * eout(k), t, { ang: hash(i) * 180, o: .9 });
  }
  w += MB.hyphae(t, 300, 960, prog(t, B.warna, B.berubah + 1), { n: 4, len: 120 }) + MB.hyphae(t, 820, 970, prog(t, B.teksturnya, B.berubah + 1.2), { n: 3, len: 90 });
  let g = `<g transform="${camT(c)}">${w}</g>`;
  g += card(200, 360, rv(t, B.rasanya, .35), 'RASA', ICON.spoon, { rot: -4 }) + card(540, 320, rv(t, B.warna, .35), 'WARNA', ICON.swatch) + card(880, 360, rv(t, B.teksturnya, .35), 'TEKSTUR', ICON.texture, { rot: 4 });
  g += `<g transform="translate(940,600)"><circle r="48" fill="#F6F3EB" ${L.S(6)}/><path transform="rotate(${f1((t - B.pelan) * 300)})" d="M0,0 L0,-34" ${L.S(7)}/><circle r="6" fill="${P.orange}"/></g>`;
  return svg(g);
}

const list = [[enterMicro, SWITCH], [twoTracks, B.dingin - .25, 'xf', .4], [spoilers, B.tapi - .1, 'xf', .35], [players, B.enzim - .3, 'xf', .35], [changes, B.pelan - .25, 'xf', .4]];
module.exports = { list, B, enterMicro, twoTracks, spoilers, changes, players, community };
