// CREATURE KIT v1.15 (EP14) — microbes as an EXPLANATION VISUAL, never as a claimed species portrait.
// Simple flat shapes, no faces, no costumes: rod (batang), coccus (bulat), yeast (oval bertunas), mold (benang + spora),
// and a "hidden risk" style (dashed outline, almost transparent) for germs that do not announce themselves.
//   cell(kind, x, y, s, t, o)   one microbe; o.col, o.ang, o.split 0..1 (dividing), o.hidden (dashed), o.o opacity
//   colony(t, o)                deterministic growth: n(t) = n0·2^((t−t0)/td), capped at o.max; newborns slide out of a parent
//                               (no popping out of nowhere). o.rate can be a function of time (slow ↔ fast) — integrated, so
//                               slowing down never moves cells backwards. o.x/o.y/o.w/o.h = area, o.kind, o.seed.
//   hyphae(t, x, y, k, o)       mold threads growing from a point (k 0..1 = length), spores at the tips
//   enzyme(x, y, s, t, o)       enzyme as a small "scissors" shape cutting a chain (explainer), o.cut 0..1
//   chain(x0, x1, y, t, o)      a molecule chain (beads) that can be cut at o.cuts [x…] with gap o.gap
// Colours: spoilage = olive/green family; yeast = cream-amber; mold = grey-green; hidden risk = cream dashed.
const { PALETTE: P, LINE, S, lerp, clamp, prog, eout, back } = require('../engine/core');
const { f1, f3, hash } = require('../world/haze');

const MB = { rod: '#9DB87A', rodD: '#6F8C52', coccus: '#C9B26A', yeast: '#EAD29A', mold: '#AEBBA0', moldSpore: '#7E8F76', hidden: '#F6F3EB', enzyme: '#F2A53A', bead: '#E8C98F' };

function cell(kind, x, y, s = 1, t = 0, o = {}) {
  const ang = o.ang ?? 0, sp = clamp(o.split || 0), op = o.o ?? 1, hid = !!o.hidden;
  const fill = hid ? 'none' : (o.col || MB[kind] || MB.rod);
  const st = hid ? `stroke="${MB.hidden}" stroke-width="4" stroke-dasharray="7 7" stroke-linecap="round"` : S(3.5);
  const wig = 4 * Math.sin(t * 2.3 + x * .07);
  let body = '';
  if (kind === 'rod') {
    const L = 46 + 18 * sp, pinch = 9 * sp;
    body = `<path d="M${-L / 2},0 C${-L / 2},-15 ${-L / 2 + 12},-15 ${-L / 2 + 14},-15 L-4,-15 C-2,${-15 + pinch} 2,${-15 + pinch} 4,-15 L${L / 2 - 14},-15 C${L / 2 - 12},-15 ${L / 2},-15 ${L / 2},0 C${L / 2},15 ${L / 2 - 12},15 ${L / 2 - 14},15 L4,15 C2,${15 - pinch} -2,${15 - pinch} -4,15 L${-L / 2 + 14},15 C${-L / 2 + 12},15 ${-L / 2},15 ${-L / 2},0 Z" fill="${fill}" ${st}/>`;
    if (!hid) body += `<path d="M${-L / 2 + 10},-6 L${-L / 2 + 22},-8" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/><path d="M${L / 2},0 q10,${f1(wig)} 20,0" fill="none" ${S(2.5)}/>`;
  } else if (kind === 'coccus') {
    const d = 13 * sp;
    body = `<circle cx="${f1(-d)}" r="15" fill="${fill}" ${st}/>${sp > .05 ? `<circle cx="${f1(d)}" r="15" fill="${fill}" ${st}/>` : ''}${hid ? '' : `<circle cx="${f1(-d - 5)}" cy="-5" r="4" fill="#fff" opacity=".5"/>`}`;
  } else if (kind === 'yeast') {
    const b = 6 + 12 * sp;
    body = `<ellipse rx="22" ry="17" fill="${fill}" ${st}/><ellipse cx="${f1(18 + b * .6)}" cy="${f1(-10 - b * .3)}" rx="${f1(b)}" ry="${f1(b * .8)}" fill="${fill}" ${st}/>${hid ? '' : '<ellipse cx="-6" cy="-5" rx="6" ry="4" fill="#fff" opacity=".5"/>'}`;
  } else if (kind === 'mold') {
    body = `<circle r="12" fill="${fill}" ${st}/><circle r="5" fill="${MB.moldSpore}"/>`;
  }
  return `<g opacity="${f3(op)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(ang + 8 * Math.sin(t * .9 + y * .05))}) scale(${f3(s)})">${body}</g>`;
}
// integral of a doubling rate r(τ) (doublings per second) from a to b, numerically (τ step 0.05 s)
function doublings(rate, a, b) { if (b <= a) return 0; if (typeof rate === 'number') return rate * (b - a); let acc = 0; for (let x = a; x < b; x += .05) acc += rate(Math.min(b, x + .025)) * Math.min(.05, b - x); return acc; }
function colony(t, o = {}) {
  const { x = 540, y = 700, w = 600, h = 300, kind = 'rod', n0 = 2, max = 40, seed = 1, s = 1, t0 = 0 } = o;
  const D = doublings(o.rate ?? .5, t0, t), n = Math.min(max, n0 * Math.pow(2, D));
  // positions: a deterministic tree; cell i>n0 has parent floor(i/2); its home is offset from the parent
  const pos = [];
  for (let i = 0; i < Math.ceil(n) + 1 && i < max; i++) {
    if (i < n0) { pos.push([x + (hash(seed * 31 + i) - .5) * w * .5, y + (hash(seed * 17 + i) - .5) * h * .5]); continue; }
    const p = pos[Math.floor(i / 2)] || pos[0], a = hash(seed * 7 + i) * Math.PI * 2, r = 58 + 26 * hash(seed + i * 3);
    pos.push([clamp(p[0] + Math.cos(a) * r, x - w / 2, x + w / 2), clamp(p[1] + Math.sin(a) * r * .7, y - h / 2, y + h / 2)]);
  }
  let g = '';
  for (let i = 0; i < pos.length; i++) {
    const born = i < n0 ? -1 : (n - i);                         // how far past its birth (in cells); 0..1 = sliding out
    if (born < 0 && i >= n0) continue;
    const k = i < n0 ? 1 : clamp(born), p = pos[i], par = i < n0 ? p : pos[Math.floor(i / 2)];
    const px = lerp(par[0], p[0], eout(k)), py = lerp(par[1], p[1], eout(k));
    const splitting = clamp((n - (2 * i) ) );                   // a parent shows a pinch just before its child leaves
    g += cell(kind, px, py, s * (o.scale ? o.scale(i) : 1), t + i, { ang: hash(i * 13 + seed) * 180, col: o.col, hidden: o.hidden, o: (o.o ?? 1) * (i < n0 ? 1 : clamp(k * 3)) });
  }
  return { svg: g, n };
}
function hyphae(t, x, y, k, o = {}) {
  if (k <= 0) return '';
  const n = o.n || 5, L = (o.len || 160) * clamp(k), col = o.col || MB.mold; let g = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * .42 + .08 * Math.sin(t * .7 + i), mid = [x + Math.cos(a) * L * .5 + 14 * Math.sin(i), y + Math.sin(a) * L * .5];
    const end = [x + Math.cos(a) * L, y + Math.sin(a) * L];
    g += `<path d="M${f1(x)},${f1(y)} Q${f1(mid[0] + 20)},${f1(mid[1])} ${f1(end[0])},${f1(end[1])}" fill="none" stroke="${LINE}" stroke-width="9" stroke-linecap="round"/><path d="M${f1(x)},${f1(y)} Q${f1(mid[0] + 20)},${f1(mid[1])} ${f1(end[0])},${f1(end[1])}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`;
    if (k > .6) g += `<circle cx="${f1(end[0])}" cy="${f1(end[1])}" r="${f1(11 * clamp((k - .6) / .4))}" fill="${MB.moldSpore}" ${S(3)}/>`;
  }
  return `<g opacity="${f3(o.o ?? 1)}">${g}</g>`;
}
function chain(x0, x1, y, t, o = {}) {
  const gap = o.gap || 0, cuts = o.cuts || [], n = Math.round((x1 - x0) / 34); let g = '', prev = null;
  for (let i = 0; i <= n; i++) {
    let bx = x0 + i * 34; const shift = cuts.reduce((a, c) => a + (bx > c ? gap : 0), 0); bx += shift;
    const by = y + 6 * Math.sin(t * 1.5 + i * .8);
    if (prev && !cuts.some(c => prev[2] < c && x0 + i * 34 > c && gap > 3)) g += `<path d="M${f1(prev[0])},${f1(prev[1])} L${f1(bx)},${f1(by)}" ${S(5)}/>`;
    prev = [bx, by, x0 + i * 34];
    g += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="13" fill="${o.col || MB.bead}" ${S(3.5)}/>`;
  }
  return g;
}
function enzyme(x, y, s = 1, t = 0, o = {}) {
  const c = clamp(o.cut || 0), open = 26 * (1 - Math.abs(Math.sin(c * Math.PI)));      // jaws close once while cutting
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.ang || 0)})">
    <path d="M0,0 C-30,-10 -54,-${f1(20 + open)} -60,-${f1(4 + open)} C-40,-${f1(open * .2)} -20,-6 0,0 Z" fill="${MB.enzyme}" ${S(4)}/>
    <path d="M0,0 C-30,10 -54,${f1(20 + open)} -60,${f1(4 + open)} C-40,${f1(open * .2)} -20,6 0,0 Z" fill="${P.orangeDeep}" ${S(4)}/>
    <circle cx="22" r="24" fill="${MB.enzyme}" ${S(4)}/><circle cx="16" cy="-6" r="6" fill="#fff" opacity=".6"/></g>`;
}
module.exports = { MB, cell, colony, doublings, hyphae, chain, enzyme };
