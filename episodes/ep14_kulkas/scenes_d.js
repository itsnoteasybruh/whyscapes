// EP14 · D — "Basi dan aman itu bukan ukuran yang sama": two gauges that do not line up → two doors (spoilage microbes you can
// smell vs germs that make people sick, drawn as dashed/invisible) → the sniff test: it smells fine… "Belum tentu" (lens shows dashed
// outlines = a possible risk you cannot see; no claim that this box IS contaminated).
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, lens, card, ICON } = L;

const D = { terus: W('terus', 62), satu: W('satu', 62), terkecoh: W('terkecoh'), basi: W('basi'), aman: W('aman'), bukan: W('bukan', 66.5), ukuran: W('ukuran'), sama: W('sama', 67.5),
  bakteri: W('bakteri', 68), bau: W('bau', 69), berbeda: W('berbeda'), kuman: W('kuman'), sakit: W('sakit'), jadi: W('jadi', 72.5), wangi: W('wangi'), aman2: W('aman', 73),
  belum: W('belum'), tentu: W('tentu'), biar: W('biar') };
const paper = t => { K.setNow(t); return K.grid('ripple'); };

// ---------- 1. two measures: BASI (smell) and AMAN (safety) — two rulers whose marks do not line up ----------
function twoMeters(t) {
  let g = paper(t);
  const mk = 1 - eio(prog(t, D.basi - .3, D.basi + .2));
  g += `<g opacity="${f3(.25 + .75 * mk)}">${mpiAt(540, 1250, 1.6, t < D.terkecoh ? 'berpikir' : 'bingung', { eye: [0, -6], blink: blinkAt(t, [64.1]) })}</g>`;
  if (t > D.satu && t < D.basi + .3) { const k = rv(t, D.satu, .3) * mk; g += `<g opacity="${f3(k)}" transform="translate(690,520) scale(${f3(1.3 * k)})">${M.questionMark(0, 0, 1.3, P.orange)}</g>`; }
  const ruler = (x, k, label, icon, ticks, col) => {
    if (k <= 0) return '';
    let r = `<g opacity="${f3(clamp(k * 2))}" transform="translate(${x},${f1(lerp(1400, 0, eout(k)))})"><rect x="-90" y="420" width="180" height="760" rx="30" fill="${col}" ${L.S(7)}/>`;
    ticks.forEach(y => { r += `<path d="M-90,${y} L-30,${y}" ${L.S(7)}/>`; });
    return r + `<g transform="translate(0,330)">${card(0, 0, 1, label, icon)}</g></g>`;
  };
  g += ruler(300, rv(t, D.basi - .1, .5), 'BASI', ICON.nose, [520, 640, 760, 880, 1000, 1120], '#E9EAD2');
  g += ruler(780, rv(t, D.aman - .1, .5), 'AMAN', ICON.shield, [560, 720, 820, 980, 1100], '#DDF0F4');
  // the marks do not line up: dashed connectors that miss each other
  const nk = rv(t, D.ukuran, .4);
  if (nk > 0) { [[640, 720], [880, 980], [1000, 820]].forEach(([a, b], i) => { g += `<path d="M390,${a} L690,${b}" stroke="${P.alert}" stroke-width="7" stroke-dasharray="14 12" opacity="${f3(nk * .8)}"/>`; });
    g += `<g opacity="${f3(nk)}" transform="translate(540,820)"><circle r="56" fill="#F6F3EB" ${L.S(6)}/><text y="22" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="70" fill="${LINE}">≠</text></g>`; }
  return svg(g);
}
// ---------- 2. two doors: spoilage you can smell vs germs that make people sick (often no sign) ----------
function door(x, k, inner, label, col, id) {
  const w = 400, h = 760, y = 300, o = eio(clamp(k));
  let g = `<rect x="${x - w / 2 - 20}" y="${y - 20}" width="${w + 40}" height="${h + 20}" rx="40" fill="${LINE}"/><defs><clipPath id="dr${id}"><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="30"/></clipPath></defs>
    <g clip-path="url(#dr${id})"><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" fill="#1D3835"/>${inner}</g>`;
  const dw = w * (1 - o * .82);
  g += `<path d="M${x - w / 2},${y} L${f1(x - w / 2 + dw)},${f1(y + 30 * o)} L${f1(x - w / 2 + dw)},${f1(y + h - 30 * o)} L${x - w / 2},${y + h} Z" fill="${col}" ${L.S(7)}/>`;
  if (o < .6) g += `<circle cx="${f1(x - w / 2 + dw - 40)}" cy="${y + h / 2}" r="16" fill="${P.orange}" ${L.S(4)}/>`;
  return g + TAG(label, { s: rv(k, 0, .3), o: clamp(k * 2) }, x, y + h + 80, { size: 28, fill: id === 'a' ? P.orange : '#F6F3EB' });
}
function twoDoors(t) {
  let g = paper(t);
  const ka = prog(t, D.bakteri - .1, D.bakteri + .5), kb = prog(t, D.kuman - .1, D.kuman + .5);
  let ia = ''; for (let i = 0; i < 6; i++) ia += MB.cell(i % 2 ? 'rod' : 'yeast', 200 + (i % 3) * 100 + 10 * Math.sin(t + i), 760 + Math.floor(i / 3) * 150, 2, t, { ang: i * 40 });
  ia += FG.odor(t, 280, 680, rv(t, D.bau, .4), { n: 4, w: 260, h: 340, sw: 11 });
  let ib = ''; for (let i = 0; i < 6; i++) ib += MB.cell(i % 2 ? 'rod' : 'coccus', 680 + (i % 3) * 100 + 10 * Math.sin(t * 1.1 + i), 760 + Math.floor(i / 3) * 150, 2, t, { ang: i * 50, hidden: true, o: .5 + .5 * rv(t, D.sakit, .5) });
  g += door(280, ka, ia, 'PEMBUSUK', '#E9EAD2', 'a') + door(800, kb, ib, 'BIKIN SAKIT', '#DDF0F4', 'b');
  const vk = rv(t, D.berbeda, .3);
  if (vk > 0) g += `<path d="M540,${f1(1100 - 820 * vk)} L540,1100" stroke="${P.orange}" stroke-width="10" stroke-dasharray="20 14" stroke-linecap="round"/>`;
  g += TAG('TERCIUM', { s: rv(t, D.bau, .3), o: rv(t, D.bau, .3) }, 280, 220, { size: 26, fill: '#F6F3EB' }) + TAG('SERING TAK TAMPAK', { s: rv(t, D.sakit, .3), o: rv(t, D.sakit, .3) }, 800, 220, { size: 26, fill: '#F6F3EB' });
  return svg(g);
}
// ---------- 3. "Jadi, masih wangi berarti aman? Belum tentu." ----------
function counterBG(t) {
  let g = `<rect x="-200" y="-200" width="1480" height="2320" fill="${P.cream}"/>`;
  for (let y = 150; y < 1160; y += 96) g += `<path d="M-200,${y} L1280,${y}" stroke="#E2D6C2" stroke-width="4"/>`;
  for (let x = 10; x < 1280; x += 96) g += `<path d="M${x},150 L${x},1160" stroke="#E2D6C2" stroke-width="4"/>`;
  return g + `<rect x="640" y="140" width="380" height="300" rx="16" fill="#BFE3EC" ${L.S(8)}/><path d="M830,140 L830,440 M640,290 L1020,290" ${L.S(8)}/>`;
}
const counterFront = `<rect x="-200" y="1150" width="1480" height="40" fill="${P.wood}" ${L.S(6)}/><path d="M-200,1162 L1280,1162" stroke="#D2A777" stroke-width="5"/><rect x="-200" y="1190" width="1480" height="800" fill="${P.teal}"/>
  <rect x="80" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="400" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="720" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/>`;
function sniffTest(t) {
  const lean = eio(prog(t, D.wangi - .4, D.wangi)) * (1 - eio(prog(t, D.aman2, D.aman2 + .4)));
  const expr = t < D.wangi - .4 ? 'penasaran' : t < D.aman2 ? 'menghirup' : t < D.belum ? 'lega' : 'prihatin';
  let g = counterBG(t) + mpiAt(250 + 40 * lean, 1440 - 30 * lean, 1.6, expr, { tilt: 7 * lean, eye: [10, 6], blink: blinkAt(t, [74.0]) }) + counterFront;
  g += FG.box(600, 1150, 1.3, { lid: 1, spoil: 0 });
  // "wangi": soft cream sparkle lines (not odor)
  const wk = rv(t, D.wangi, .4) * (1 - prog(t, D.belum, D.belum + .5));
  if (wk > 0) for (let i = 0; i < 3; i++) { const ph = (t * .4 + i / 3) % 1; g += `<path d="M${520 + i * 80},${f1(900 - 200 * ph)} l0,-30 M${505 + i * 80},${f1(885 - 200 * ph)} l30,0" stroke="#F6F3EB" stroke-width="8" stroke-linecap="round" opacity="${f3(wk * Math.sin(Math.PI * ph))}"/><path d="M${520 + i * 80},${f1(900 - 200 * ph)} l0,-30 M${505 + i * 80},${f1(885 - 200 * ph)} l30,0" stroke="${P.orange}" stroke-width="3" stroke-linecap="round" opacity="${f3(wk * Math.sin(Math.PI * ph))}"/>`; }
  if (t > D.aman2 && t < D.belum + .2) { const k = rv(t, D.aman2, .3); g += `<g transform="translate(400,560) scale(${f3(1.4 * K.back(k))})">${M.questionMark(0, 0, 1.4, P.orange)}</g>`; }
  // "Belum tentu": a magnifier over the food shows dashed outlines (possible, unseen) — not a verdict on this box
  const lk = rv(t, D.belum, .4);
  if (lk > 0) {
    let inner = `<rect x="380" y="300" width="440" height="440" fill="#F4EBD6"/>`;
    for (let i = 0; i < 5; i++) inner += MB.cell(i % 2 ? 'rod' : 'coccus', 470 + (i % 3) * 120 + 8 * Math.sin(t + i), 470 + Math.floor(i / 3) * 130, 1.8, t, { hidden: true, ang: i * 37 });
    inner = inner.replace(/stroke="#F6F3EB"/g, `stroke="${LINE}"`);
    g += lens(600, 520, 200, lk, inner, 'st');
    g += TAG('BISA TAK TERCIUM', { s: rv(t, D.tentu, .3), o: rv(t, D.tentu, .3) }, 600, 230, { size: 28 });
  }
  return svg(g);
}
const list = [[twoMeters, D.terus - .2, 'xf', .35], [twoDoors, D.bakteri - .25, 'xf', .35], [sniffTest, D.jadi - .2, 'xf', .35]];
module.exports = { list, D, twoMeters, twoDoors, sniffTest, counterBG, counterFront };
