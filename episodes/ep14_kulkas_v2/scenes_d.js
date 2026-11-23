// EP14 v2 · D — "Tapi tanpa bau aneh pun, makanan belum tentu aman. Mikroba penyebab sakit tidak selalu memberi tanda."
// From spoilage you can smell to a risk you cannot always see: Mpi sniffs a box that smells normal (no odour lines), the shield gets a "?"
// (not a verdict), then a magnifier shows dashed outlines = germs that may be there without any sign. The sniff is NOT shown as a safety test.
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, lens, card, ICON } = L;

const D = { tapi: W('tapi', 27), tanpa: W('tanpa'), bau: W('bau'), aneh: W('aneh'), belum: W('belum'), tentu: W('tentu'), aman: W('aman'),
  mikroba: W('mikroba', 30.5), penyebab: W('penyebab'), sakit: W('sakit'), tidak: W('tidak'), selalu: W('selalu'), memberi: W('memberi'), tanda: W('tanda') };

function counterBG(t) {
  let g = `<rect x="-200" y="-200" width="1480" height="2320" fill="${P.cream}"/>`;
  for (let y = 150; y < 1160; y += 96) g += `<path d="M-200,${y} L1280,${y}" stroke="#E2D6C2" stroke-width="4"/>`;
  for (let x = 10; x < 1280; x += 96) g += `<path d="M${x},150 L${x},1160" stroke="#E2D6C2" stroke-width="4"/>`;
  return g + `<rect x="640" y="140" width="380" height="300" rx="16" fill="#BFE3EC" ${L.S(8)}/><path d="M830,140 L830,440 M640,290 L1020,290" ${L.S(8)}/>`;
}
const counterFront = `<rect x="-200" y="1150" width="1480" height="40" fill="${P.wood}" ${L.S(6)}/><path d="M-200,1162 L1280,1162" stroke="#D2A777" stroke-width="5"/><rect x="-200" y="1190" width="1480" height="800" fill="${P.teal}"/>
  <rect x="80" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="400" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="720" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/>`;

function sniffRisk(t) {
  const zoom = lerp(1, 1.08, eio(prog(t, D.mikroba - .4, D.mikroba + .6)));
  const lean = eio(prog(t, D.bau - .35, D.bau + .05)) * (1 - eio(prog(t, D.belum - .1, D.belum + .35)));
  const expr = t < D.bau - .35 ? 'penasaran' : t < D.belum - .1 ? 'menghirup' : t < D.mikroba ? 'bingung' : 'prihatin';
  let g = `<g transform="translate(600,900) scale(${f3(zoom)}) translate(-600,-900)">` + counterBG(t);
  g += mpiAt(250 + 40 * lean, 1440 - 30 * lean, 1.6, expr, { tilt: 7 * lean, eye: [10, 6], blink: blinkAt(t, [27.6, 31.3]) }) + counterFront;
  g += FG.box(600, 1150, 1.3, { lid: 1, spoil: 0 }) + '</g>';
  // "tanpa bau aneh": a nose card with a calm check (no odour lines anywhere)
  const nk = rv(t, D.aneh, .35) * (1 - prog(t, D.mikroba - .3, D.mikroba));
  if (nk > 0) g += card(820, 420, nk, 'TIDAK BAU', ICON.nose.replace(/stroke="#9DAA6E"/g, 'stroke="none"'), { rot: 4 });
  // "belum tentu aman": shield card with a "?" (not a verdict on this box)
  const sk = rv(t, D.belum, .35) * (1 - prog(t, D.mikroba - .3, D.mikroba));
  if (sk > 0) {
    g += card(300, 420, sk, 'AMAN?', ICON.shield, { rot: -4 });
    g += `<g opacity="${f3(sk)}" transform="translate(${f1(560)},${f1(560)}) scale(${f3(1.2 * K.back(rv(t, D.tentu, .3)))})">${M.questionMark(0, 0, 1.2, P.orange)}</g>`;
  }
  // "Mikroba penyebab sakit tidak selalu memberi tanda": magnifier on the food, dashed outlines = may be there, no visible sign
  const lk = rv(t, D.mikroba, .45);
  if (lk > 0) {
    let inner = `<rect x="300" y="200" width="600" height="640" fill="#F4EBD6"/>`;
    for (let i = 0; i < 6; i++) inner += MB.cell(i % 2 ? 'rod' : 'coccus', 470 + (i % 3) * 130 + 8 * Math.sin(t + i), 440 + Math.floor(i / 3) * 150, 1.9, t, { hidden: true, ang: i * 37, o: .45 + .45 * rv(t, D.sakit, .5) });
    inner = inner.replace(/stroke="#F6F3EB"/g, `stroke="${LINE}"`);
    g += lens(600, 520, 250, lk, inner, 'sr');
    g += TAG('PENYEBAB SAKIT', { s: rv(t, D.sakit, .3), o: rv(t, D.sakit, .3) }, 600, 200, { size: 30 });
    g += TAG('TAK SELALU ADA TANDA', { s: rv(t, D.tanda, .3), o: rv(t, D.tanda, .3) }, 600, 860, { size: 28, fill: '#F6F3EB' });
  }
  return svg(g);
}
const list = [[sniffRisk, D.tapi - .15, 'xf', .35]];
module.exports = { list, D, sniffRisk, counterBG, counterFront };
