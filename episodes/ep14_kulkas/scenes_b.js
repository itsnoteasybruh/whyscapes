// EP14 · B — the MICRO WORLD on the food surface (explanation visual, not a species portrait).
// cold slows, does not stop (two lanes: warm vs cold, both still dividing) → "sebagian bakteri pembusuk" keep growing in the cold →
// time-lapse on the food: smell, taste, texture change in the VO's order → microbes are not the only players: enzymes (inside the
// food) and air (on cut surfaces) → all three keep going in the cold, only slower.
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, ring, camKeys, camT, microBG, lens, card, ICON, SWITCH } = L;

const B = { waktu: W('waktu'), kulkas: W('kulkas', 14), suhu: W('suhu'), dingin: W('dingin'), memperlambat: W('memperlambat'), mikroba: W('mikroba'), tapi: W('tapi'),
  memperlambat2: W('memperlambat', 18.5), menghentikan: W('menghentikan'), sebagian: W('sebagian'), bakteri: W('bakteri'), pembusuk: W('pembusuk'), tumbuh: W('tumbuh'),
  pelan: W('pelanpelan'), mengubah: W('mengubah'), baunya: W('baunya', 26), rasanya: W('rasanya'), teksturnya: W('teksturnya'), dan: W('dan', 30),
  mikroba2: W('mikroba', 31), pemain: W('pemain'), enzim: W('enzim'), bekerja: W('bekerja'), udara: W('udara'), memicu: W('memicu'), bahan: W('bahan'),
  jadi: W('jadi', 38), dingin2: W('dingin', 39), jalan: W('jalan'), cuma: W('cuma'), lambat: W('lambat'), anggap: W('anggap') };
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
// ---------- 1. through the portal: the surface of the food in the fridge (scale changes from the lid to the micro world) ----------
function enterMicro(t) {
  const z = lerp(1.6, 1, eout(prog(t, SWITCH, B.kulkas + .4)));
  let g = `<g transform="translate(540,900) scale(${f3(z)}) translate(-540,-900)">${microBG(t, { id: 'e' })}${community(t, { speed: .35 })}</g>`;
  g += ring(540, 700, 430, (1 - prog(t, SWITCH + 1, SWITCH + 1.6)) * .6, '#F6F3EB');
  g += TAG('PERMUKAAN MAKANAN', { s: rv(t, B.waktu, .3), o: rv(t, B.waktu, .3) * (1 - prog(t, B.suhu, B.suhu + .3)) }, 540, 250, { size: 30, fill: '#F6F3EB' });
  g += TAG('DINGIN', { s: rv(t, B.kulkas, .3), o: rv(t, B.kulkas, .3) }, 540, 330, { size: 34, fill: FG.FR.cold });
  return svg(g);
}
// ---------- 2. two lanes: warm vs cold. Both divide; cold is slower. Then the cold lane takes the frame ("bukan menghentikan") ----------
function lane(t, y0, y1, warm, id, rate, seed) {
  const h = y1 - y0, gy = Math.min(y1 - 170, 1180), sh = gy - 1180;   // micro ground near the lane bottom, never in the subtitle zone
  const col = MB.colony(t, { x: 540, y: gy - 190, w: 820, h: 240, kind: 'rod', n0: 2, max: 30, seed, s: 2.0, t0: B.dingin, rate });
  const bg = `<g transform="translate(0,${f1(sh)})">${microBG(t, { id, warm, frost: !warm })}</g>`;
  return { svg: `<defs><clipPath id="cl${id}"><rect x="0" y="${f1(y0)}" width="1080" height="${f1(h)}"/></clipPath></defs><g clip-path="url(#cl${id})">${bg}${col.svg}</g>${y1 < 1900 && y1 > 5 ? `<path d="M0,${f1(y1)} L1080,${f1(y1)}" stroke="#F6F3EB" stroke-width="10"/>` : ''}`, n: col.n };
}
function twoTracks(t) {
  const take = eio(prog(t, B.memperlambat2 - .2, B.memperlambat2 + .6));
  const split = lerp(760, 0, take);
  const top = lane(t, split - 760 + 0, split, 1, 'w', WARM, 3), bot = lane(t, split, 1920, 0, 'c', COLD, 5);
  let g = bot.svg + (take < 1 ? top.svg : '');
  const lk = rv(t, B.dingin, .3);
  g += TAG('HANGAT', { s: lk, o: lk * (1 - take) }, 230, split - 640, { size: 32, fill: P.orange });
  g += TAG('DINGIN', { s: lk, o: lk }, 230, split + 80, { size: 32, fill: FG.FR.cold });
  g += TAG('MELAMBAT', { s: rv(t, B.memperlambat, .3), o: rv(t, B.memperlambat, .3) }, 820, split + 80, { size: 30, fill: '#F6F3EB' });
  // a time-lapse dial in the cold lane: its hand keeps turning (slowly) — the process never freezes
  const dial = (x, y, a) => `<g transform="translate(${x},${y})"><circle r="56" fill="#F6F3EB" ${L.S(6)}/><path transform="rotate(${f1(a)})" d="M0,0 L0,-40" ${L.S(8)}/><circle r="7" fill="${P.orange}" ${L.S(3)}/></g>`;
  g += dial(930, split + 260, (t - B.dingin) * 40);
  if (take < 1) g += `<g opacity="${f3(1 - take)}">${dial(930, split - 420, (t - B.dingin) * 260)}</g>`;
  const hk = pulseK(t, B.menghentikan - .1, 1.1);
  if (hk > 0) g += ring(540, 1040, 170, hk, '#F6F3EB');
  return svg(g);
}
// ---------- 3. "Sebagian bakteri pembusuk masih bisa tumbuh di suhu kulkas" — only SOME cells are active ----------
function spoilers(t) {
  const sel = rv(t, B.sebagian, .4), act = i => [0, 3, 5, 7].includes(i);
  let g = microBG(t, { id: 's' });
  g += community(t, { speed: .3, hi: (i, k) => act(i) ? sel : 0, dim: (i, k) => act(i) ? 0 : .7 * sel });
  // the active ones divide (slowly) after "tumbuh"
  const col = MB.colony(t, { x: 540, y: 880, w: 820, h: 220, kind: 'rod', n0: 0, max: 0, t0: B.tumbuh, rate: .5 });
  for (const [i, x] of [[0, 110], [3, 479], [5, 725], [7, 971]]) {
    const k = clamp((t - B.tumbuh - i * .15) / 1.4), y = 1060 + 40 * Math.sin(i * 2.3);
    if (k > 0) g += MB.cell('rod', x + 40 * eout(k), y - 50 * eout(k), 1.5, t, { ang: hash(i * 7) * 160 + 30, o: clamp(k * 3) });
  }
  g += col.svg;
  g += TAG('PEMBUSUK', { s: rv(t, B.pembusuk, .3), o: rv(t, B.pembusuk, .3) }, 540, 300, { size: 34 });
  g += TAG('MASIH TUMBUH', { s: rv(t, B.tumbuh, .3), o: rv(t, B.tumbuh, .3) }, 540, 400, { size: 28, fill: '#F6F3EB' });
  return svg(g);
}
// ---------- 4. time-lapse on the food: the surface changes; smell → taste → texture cards in the VO's order ----------
function changes(t) {
  const sp = clamp(.15 + .75 * prog(t, B.pelan, B.teksturnya + 1.4));
  const c = camKeys([[B.pelan - .3, [540, 980, 1.25]], [B.mengubah, [540, 1000, 1.0]], [B.dan, [540, 1000, .96]]], .35)(t);
  let w = `<rect x="-600" y="-600" width="2280" height="3200" fill="#EFE7D6"/><rect x="-600" y="-600" width="2280" height="3200" fill="url(#paper)"/>`;
  w += FG.box(540, 1330, 2.7, { lid: 1, spoil: sp });
  // specks spreading on the food (different kinds = different dots), time-lapse dial above
  for (let i = 0; i < 46; i++) {
    const born = B.pelan + hash(i * 3) * (B.teksturnya + 1 - B.pelan), k = clamp((t - born) / .8); if (k <= 0) continue;
    const x = 180 + hash(i * 11) * 720, y = 940 + hash(i * 17) * 70, kind = ['rod', 'coccus', 'yeast'][i % 3];
    w += MB.cell(kind, x, y, .55 * eout(k), t, { ang: hash(i) * 180, o: .9 });
  }
  w += MB.hyphae(t, 300, 960, prog(t, B.mengubah, B.teksturnya + 1.2), { n: 4, len: 120 }) + MB.hyphae(t, 820, 970, prog(t, B.rasanya, B.teksturnya + 1.5), { n: 3, len: 90 });
  w += FG.odor(t, 540, 900, rv(t, B.baunya, .5), { n: 5, w: 500, h: 380, sw: 12 });
  let g = `<g transform="${camT(c)}">${w}</g>`;
  g += card(200, 360, rv(t, B.baunya, .35), 'BAU', ICON.nose, { rot: -4 }) + card(540, 320, rv(t, B.rasanya, .35), 'RASA', ICON.spoon) + card(880, 360, rv(t, B.teksturnya, .35), 'TEKSTUR', ICON.texture, { rot: 4 });
  g += `<g transform="translate(940,600)"><circle r="48" fill="#F6F3EB" ${L.S(6)}/><path transform="rotate(${f1((t - B.pelan) * 300)})" d="M0,0 L0,-34" ${L.S(7)}/><circle r="6" fill="${P.orange}"/></g>`;
  return svg(g);
}
// ---------- 5. "mikroba bukan satu-satunya pemain": side pan from microbes → enzymes inside the food → air on a cut surface ----------
const camP = camKeys([[B.dan - .3, [540, 900, 1]], [B.pemain, [540, 900, .94]], [B.enzim - .45, [1700, 900, 1]], [B.bekerja + .4, [1700, 900, 1.04]], [B.udara - .45, [2860, 900, 1]], [B.jadi, [2860, 900, 1.05]]], .3);
function players(t) {
  const c = camP(t);
  let w = `<rect x="-600" y="-200" width="4200" height="2400" fill="#1D3835"/>`;
  for (let i = 0; i < 90; i++) { const x = (i * 157) % 4000 - 400, y = ((i * 263) - t * 12) % 1900; w += `<circle cx="${x}" cy="${f1(y < 0 ? y + 1900 : y)}" r="${2 + i % 3}" fill="#BFE6EE" opacity=".18"/>`; }
  // panel 1 — microbes on the surface (what we just saw)
  w += `<g>${microBG(t, { id: 'p', frost: false })}${community(t, { speed: .3 })}</g>`;
  // panel 2 — inside the food: plant cells, molecule chains, enzymes cutting (no microbes here)
  const ox = 1160, cut = prog(t, B.enzim, B.bahan);
  w += `<g transform="translate(${ox},0)"><rect x="40" y="300" width="1000" height="1300" rx="60" fill="#E9F1D9" ${L.S(8)}/>`;
  for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) w += `<rect x="${90 + q * 470}" y="${350 + r * 400}" width="430" height="360" rx="70" fill="#F4F8EA" stroke="#8FB07A" stroke-width="10"/>`;
  [[520, 0], [920, 1], [1320, 2]].forEach(([y, i]) => {
    const cuts = [260 + 60 * i, 540 + 40 * i, 820].filter((cx, j) => cut > j / 3 + i * .08);
    w += MB.chain(150, 930, y, t, { cuts, gap: 22 * clamp(cut * 3 - i * .3) });
    const ex = lerp(150, 900, clamp(cut * 1.3 - i * .12)), ey = y - 40;
    w += MB.enzyme(ex, ey, 1.1, t, { cut: (cut * 9) % 1, ang: -10 });
  });
  w += `</g>`;
  // panel 3 — air on a cut surface: oxygen meets the flesh of a cut fruit, brown patches spread (some foods, not all)
  const ax = 2320, ox2 = prog(t, B.udara, B.bahan + .6), br = prog(t, B.memicu, B.jadi + 1);
  w += `<g transform="translate(${ax},0)"><path d="M100,1250 C100,820 300,560 540,560 C780,560 980,820 980,1250 Z" fill="#B5532A" ${L.S(8)}/><path d="M140,1250 C140,860 320,620 540,620 C760,620 940,860 940,1250 Z" fill="#FBF0CF" ${L.S(5)}/>`;
  w += `<ellipse cx="540" cy="1010" rx="70" ry="110" fill="none" stroke="#D9C28F" stroke-width="8"/>${[0, 72, 144, 216, 288].map(a => `<ellipse transform="rotate(${a} 540 1010)" cx="540" cy="950" rx="9" ry="18" fill="#5A3E2A"/>`).join('')}`;
  for (let i = 0; i < 9; i++) { const x = 220 + hash(i * 5) * 640, y = 760 + hash(i * 9) * 420, r = 30 + 50 * br * hash(i * 13); if (br > hash(i) * .5) w += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * .7)}" fill="#C98E4E" opacity="${f3(.55 * clamp(br * 2 - hash(i)))}"/>`; }
  for (let i = 0; i < 12; i++) { const ph = (t * .25 + i / 12) % 1, x = 160 + (i * 83) % 760, y = lerp(200, 700 + (i % 3) * 140, ph); w += H.o2(x, y, 1.6, i * 30 + t * 20, ox2 * Math.sin(Math.PI * ph)); }
  w += `<path d="M100,1250 L980,1250" ${L.S(8)}/></g>`;
  let g = `<g transform="${camT(c)}">${w}</g>`;
  g += TAG('MIKROBA', { s: rv(t, B.mikroba2, .3), o: rv(t, B.mikroba2, .3) * (1 - prog(t, B.enzim - .6, B.enzim - .3)) }, 540, 220, { size: 32 });
  g += TAG('ENZIM ALAMI', { s: rv(t, B.enzim, .3), o: rv(t, B.enzim, .3) * (1 - prog(t, B.udara - .6, B.udara - .3)) }, 540, 220, { size: 32 });
  g += TAG('UDARA', { s: rv(t, B.udara, .3), o: rv(t, B.udara, .3) }, 540, 220, { size: 32, fill: '#BFE6EE' });
  g += TAG('BEBERAPA BAHAN', { s: rv(t, B.bahan - .4, .3), o: rv(t, B.bahan - .4, .3) }, 540, 310, { size: 26, fill: '#F6F3EB' });
  return svg(g);
}
// ---------- 6. all three keep going in the cold, only slower: three lenses + a speed gauge that never reaches zero ----------
function allSlow(t) {
  const sl = .35;                                          // shared slow time
  const ts = B.jadi + (t - B.jadi) * sl;
  let g = microBG(t * sl, { id: 'a' });
  const ins = [
    [200, 640, 'MIKROBA', `<g transform="translate(200,700) scale(.42) translate(-540,-950)">${community(ts, { speed: .4 })}</g>`],
    [540, 520, 'ENZIM', `<g>${MB.chain(420, 660, 520, ts, { cuts: [520], gap: 14 })}${MB.enzyme(lerp(440, 620, (ts * .2) % 1), 480, .8, ts, { cut: (ts * .6) % 1 })}</g>`],
    [880, 640, 'UDARA', `<g><circle cx="880" cy="700" r="120" fill="#FBF0CF"/><ellipse cx="860" cy="710" rx="${f1(30 + 10 * Math.sin(ts))}" ry="22" fill="#C98E4E" opacity=".6"/>${[0, 1, 2].map(i => H.o2(820 + i * 50, 600 + 30 * Math.sin(ts + i), 1, ts * 40)).join('')}</g>`]];
  ins.forEach(([x, y, lab, inner], i) => { const k = rv(t, B.jadi + i * .15, .4); g += `<g opacity="${f3(k)}"><circle cx="${x}" cy="${y}" r="150" fill="#1D3835"/></g>` + L.lens(x, y, 150, k, inner, 'as' + i) + TAG(lab, { s: k, o: k }, x, y + 200, { size: 26, fill: '#F6F3EB' }); });
  // speed gauge: needle low but never at zero, little wobble = still moving
  const gk = rv(t, B.jalan - .3, .4), a = lerp(-100, -55, rv(t, B.lambat, .5)) + 4 * Math.sin(t * 2);
  g += `<g opacity="${f3(gk)}" transform="translate(540,1130)"><path d="M-200,0 A200,200 0 0 1 200,0" fill="none" stroke="#F6F3EB" stroke-width="26" stroke-linecap="round"/><path d="M-200,0 A200,200 0 0 1 -141,-141" fill="none" stroke="${FG.FR.cold}" stroke-width="26" stroke-linecap="round"/>
    <path transform="rotate(${f1(a + 90)})" d="M0,0 L0,-170" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/><circle r="20" fill="${P.orange}" ${L.S(5)}/>${FG.snow(-230, -150, 1, FG.FR.cold, .9)}</g>`;
  g += TAG('TETAP JALAN', { s: rv(t, B.jalan, .3), o: rv(t, B.jalan, .3) }, 540, 220, { size: 32 });
  g += TAG('LEBIH LAMBAT', { s: rv(t, B.lambat, .3), o: rv(t, B.lambat, .3) }, 540, 310, { size: 28, fill: FG.FR.cold });
  return svg(g);
}

const list = [[enterMicro, SWITCH], [twoTracks, B.dingin - .3, 'xf', .4], [spoilers, B.sebagian - .2, 'xf', .35], [changes, B.pelan - .25, 'xf', .4],
  [players, B.dan - .2, 'xf', .35], [allSlow, B.jadi - .2, 'xf', .4]];
module.exports = { list, B, enterMicro, twoTracks, spoilers, changes, players, allSlow, community };
