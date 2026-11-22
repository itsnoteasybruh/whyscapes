// LOCATION KIT v1.9 (EP08 "72 Jam Tanpa Internet") — everyday commerce, connectivity and logistics props.
// Same family as the rest of the kit: flat fills, #231E1A outline (S()), cream / teal / orange palette, soft one-tone shadows.
// Every prop is drawn around its own anchor (x, y = bottom-centre unless noted) at scale s, so scenes can place it anywhere.
// Generic only: no real bank, payment, ride-hailing or shipping brand, no official QRIS logo (a plain QR pattern stands in).
const { PALETTE: P, LINE, S, lerp, clamp, prog, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash } = H;

const CM = {
  screen: '#BFE6EE', screenD: '#2B3A38', body: '#2B3A38', bodyHi: '#3B4C4A', paper: '#FBF8F2', receipt: '#F4EFE4',
  shelf: '#C9A47A', shelfD: '#A8835B', counter: '#E7D9BF', counterD: '#CDBB98', steel: '#AEB8B9', steelD: '#7D8786',
  ok: '#3FB8A9', wait: '#F2A53A', bad: '#E0483E', dim: '#9AA3A2', cash: '#9DB87A', cashD: '#6E8E4E', coin: '#E7C46A',
  pub: '#3FB8A9', priv: '#E08A3C', box: '#D9B27C', boxD: '#B88E58', sea: '#8FD3E3', seaD: '#5DA9C9',
};
const deg = r => r * 180 / Math.PI;

// ---------- small UI marks (used on screens, cards and in the air) ----------
function spinner(cx, cy, r, t, o = {}) {           // loading ring: 8 dots, one bright head rotating
  const col = o.col || P.teal, n = 8; let g = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * (o.speed ?? 5), age = (i / n);
    g += `<circle cx="${f1(cx + r * Math.cos(a))}" cy="${f1(cy + r * Math.sin(a))}" r="${f1(r * .16 * (.55 + .45 * age))}" fill="${col}" opacity="${f3((.2 + .8 * age) * (o.o ?? 1))}"/>`;
  }
  return g;
}
const tick = (x, y, s = 1, o = 1, col = CM.ok) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><circle r="26" fill="${col}" ${S(5)}/><path d="M-12,1 L-3,10 L13,-9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const qmark = (x, y, s = 1, o = 1, col = CM.wait) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><circle r="26" fill="${col}" ${S(5)}/><text y="12" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="36" fill="${LINE}">?</text></g>`;
const retry = (x, y, s = 1, o = 1, col = '#E7C46A') => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><circle r="26" fill="${col}" ${S(5)}/><path d="M11,-6 A12,12 0 1 0 12,6" fill="none" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/><path d="M6,-12 L13,-6 L5,-1" fill="none" stroke="${LINE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
function hourglass(x, y, s = 1, t = 0, o = 1) {    // sand runs; flips every 3 s
  const k = (t % 3) / 3, flip = Math.floor(t / 3) % 2 ? 180 : 0, fl = eio(clamp(((t % 3) - 2.75) / .25));
  return `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(flip + 180 * fl)})">
    <path d="M-20,-30 L20,-30 L4,0 L20,30 L-20,30 L-4,0 Z" fill="#F6F3EB" ${S(4)}/>
    <path d="M${f1(-14 + 10 * k)},${f1(-24 + 20 * k)} L${f1(14 - 10 * k)},${f1(-24 + 20 * k)} L2,-2 L-2,-2 Z" fill="${CM.wait}"/>
    <path d="M${f1(-15 * k)},28 L${f1(15 * k)},28 L0,${f1(28 - 16 * k)} Z" fill="${CM.wait}"/><path d="M0,-2 L0,26" stroke="${CM.wait}" stroke-width="2" opacity="${f3(k < .95 ? 1 : 0)}"/>
    <rect x="-26" y="-36" width="52" height="8" rx="4" fill="${P.wood}" ${S(3)}/><rect x="-26" y="28" width="52" height="8" rx="4" fill="${P.wood}" ${S(3)}/></g>`;
}
// generic QR pattern (deterministic noise inside three finder squares) — NOT the QRIS mark
function qr(x, y, w, seed = 3) {
  const n = 17, c = w / n; let g = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(w)}" fill="#fff"/>`;
  const finder = (i, j) => `<rect x="${f1(x + i * c)}" y="${f1(y + j * c)}" width="${f1(7 * c)}" height="${f1(7 * c)}" fill="${LINE}"/><rect x="${f1(x + (i + 1) * c)}" y="${f1(y + (j + 1) * c)}" width="${f1(5 * c)}" height="${f1(5 * c)}" fill="#fff"/><rect x="${f1(x + (i + 2) * c)}" y="${f1(y + (j + 2) * c)}" width="${f1(3 * c)}" height="${f1(3 * c)}" fill="${LINE}"/>`;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i < 8 && j < 8) || (i > 8 && j < 8) || (i < 8 && j > 8)) continue;
    if (hash(i * 31 + j * 7 + seed) > .52) g += `<rect x="${f1(x + i * c)}" y="${f1(y + j * c)}" width="${f1(c + .3)}" height="${f1(c + .3)}" fill="${LINE}"/>`;
  }
  return g + finder(0, 0) + finder(10, 0) + finder(0, 10);
}
// signal bars (k = how many lit 0..4) and wifi fan
function bars(x, y, s, k, o = {}) {
  let g = '';
  for (let i = 0; i < 4; i++) g += `<rect x="${f1(x + i * 12 * s)}" y="${f1(y - (10 + i * 8) * s)}" width="${f1(8 * s)}" height="${f1((10 + i * 8) * s)}" rx="${f1(2 * s)}" fill="${i < k ? (o.on || P.teal) : (o.off || '#C9CFCC')}"/>`;
  return g;
}
function wifi(x, y, s, k, o = {}) {                  // k = arcs lit 0..3; o.x = crossed out
  let g = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 * s)}" fill="${k > 0 ? (o.on || P.teal) : '#C9CFCC'}"/>`;
  [16, 28, 40].forEach((r, i) => { g += `<path d="M${f1(x - r * s * .72)},${f1(y - r * s * .72)} A${f1(r * s)},${f1(r * s)} 0 0 1 ${f1(x + r * s * .72)},${f1(y - r * s * .72)}" fill="none" stroke="${i < k ? (o.on || P.teal) : '#C9CFCC'}" stroke-width="${f1(6 * s)}" stroke-linecap="round"/>`; });
  if (o.x) g += `<path d="M${f1(x - 26 * s)},${f1(y - 44 * s)} L${f1(x + 26 * s)},${f1(y + 4 * s)}" stroke="${CM.bad}" stroke-width="${f1(7 * s)}" stroke-linecap="round" opacity="${f3(o.x)}"/>`;
  return g;
}

// ---------- phone (front). anchor = centre of the phone, base size 150×290 at s = 1 ----------
// screen: 'home' | 'pay' (QR scanned, BAYAR button) | 'spin' (payment pending) | 'app' (bank app splash stuck) | 'off' (no signal) | 'queue' | fn(x,y,w,h) custom
function phone(x, y, s, t, o = {}) {
  const W = 150, Hh = 290, sx = -W / 2, sy = -Hh / 2, inset = 10, scrW = W - 2 * inset, scrH = Hh - 46;
  const scx = sx + inset, scy = sy + 26, cx = 0, cy = scy + scrH / 2;
  let scr = `<rect x="${scx}" y="${scy}" width="${scrW}" height="${scrH}" rx="8" fill="${o.bg || '#F4FBFB'}"/>`;
  const sig = o.bars ?? 0;
  scr += bars(scx + 8, scy + 18, .55, sig) + `<rect x="${scx + scrW - 30}" y="${scy + 7}" width="22" height="11" rx="3" fill="none" stroke="${LINE}" stroke-width="2"/><rect x="${scx + scrW - 28}" y="${scy + 9}" width="14" height="7" fill="${P.tealGlow}"/>`;
  const st = o.screen || 'home';
  if (typeof st === 'function') scr += st(scx, scy, scrW, scrH);
  else if (st === 'home') {
    for (let i = 0; i < 9; i++) { const c = i % 3, r = Math.floor(i / 3); scr += `<rect x="${f1(scx + 14 + c * 40)}" y="${f1(scy + 40 + r * 44)}" width="28" height="28" rx="8" fill="${['#F2A53A', '#3FB8A9', '#E07A5F', '#7FA7B5', '#E7C46A', '#9DB87A', '#B5532A', '#5E6F8A', '#F6C6A6'][i]}" ${S(2)}/>`; }
  } else if (st === 'pay' || st === 'spin') {
    scr += `<rect x="${scx + 10}" y="${scy + 30}" width="${scrW - 20}" height="70" rx="10" fill="#fff" ${S(2)}/><circle cx="${scx + 34}" cy="${scy + 65}" r="14" fill="${CM.cash}" ${S(2)}/><rect x="${scx + 56}" y="${scy + 52}" width="60" height="9" rx="4" fill="#C9CFCC"/><rect x="${scx + 56}" y="${scy + 68}" width="40" height="9" rx="4" fill="#C9CFCC"/>`;
    if (st === 'pay') scr += `<rect x="${scx + 14}" y="${scy + scrH - 64}" width="${scrW - 28}" height="44" rx="22" fill="${P.orange}" ${S(3)}/><text x="${cx}" y="${scy + scrH - 34}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="20" fill="${LINE}">BAYAR</text>`;
    else scr += spinner(cx, cy + 34, 30, t, { col: P.teal });
  } else if (st === 'app') {                        // bank app splash: generic vault icon + stuck spinner, no data shown
    scr += `<rect x="${scx}" y="${scy + 24}" width="${scrW}" height="${scrH - 24}" fill="${P.teal}"/><g transform="translate(${cx},${cy - 30})"><path d="M-30,-6 L0,-26 L30,-6 Z" fill="#F6F3EB" ${S(2)}/><rect x="-24" y="-4" width="48" height="30" fill="#F6F3EB" ${S(2)}/><path d="M-14,-2 L-14,24 M0,-2 L0,24 M14,-2 L14,24" stroke="${P.teal}" stroke-width="5"/></g>` + spinner(cx, cy + 50, 22, t, { col: '#F6F3EB' });
  } else if (st === 'off') {
    scr += wifi(cx, cy + 10, 1.3, 0, { x: 1 });
  } else if (st === 'queue') {
    scr += spinner(cx, cy, 34, t, { col: P.orange });
  }
  if (o.overlay) scr += o.overlay(scx, scy, scrW, scrH);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})">
    <rect x="${sx + 6}" y="${sy + 10}" width="${W}" height="${Hh}" rx="24" fill="#000" opacity=".12"/>
    <rect x="${sx}" y="${sy}" width="${W}" height="${Hh}" rx="24" fill="${o.col || CM.body}" ${S(5)}/>${scr}
    <rect x="${-22}" y="${sy + 9}" width="44" height="8" rx="4" fill="#111"/><rect x="${-24}" y="${sy + Hh - 14}" width="48" height="5" rx="2.5" fill="#6F7A78"/></g>`;
}

// ---------- minimarket ----------
function bottle(x, y, s = 1, o = {}) {              // 500 ml water bottle, base at (x, y)
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})"><path d="M-22,0 L-22,-92 C-22,-104 -12,-110 -10,-122 L-10,-132 L10,-132 L10,-122 C12,-110 22,-104 22,-92 L22,0 Z" fill="#DFF3F8" fill-opacity=".92" ${S(4)}/>
    <path d="M-20,-70 L20,-70 L20,-36 L-20,-36 Z" fill="${P.tealGlow}" opacity=".85"/><path d="M-20,-62 L20,-62" stroke="#fff" stroke-width="3" opacity=".6"/>
    <rect x="-12" y="-146" width="24" height="16" rx="4" fill="${P.teal}" ${S(3)}/><path d="M-14,-92 Q-12,-60 -14,-12" stroke="#fff" stroke-width="4" opacity=".7" fill="none"/></g>`;
}
function qrStand(x, y, s = 1, o = {}) {             // acrylic stand on the counter with a generic QR card
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-46,0 L46,0 L40,-12 L-40,-12 Z" fill="${CM.steel}" ${S(3)}/>
    <rect x="-40" y="-140" width="80" height="128" rx="8" fill="${o.col || P.orange}" ${S(4)}/>${qr(-30, -122, 60, o.seed || 3)}
    <rect x="-24" y="-56" width="48" height="10" rx="5" fill="${LINE}" opacity=".8"/><text x="0" y="-21" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="16" fill="${LINE}">SCAN</text></g>`;
}
// cashier screen facing the customer (x, y = base). state 'idle' | 'wait' | 'ok'
function pos(x, y, s, t, o = {}) {
  const st = o.state || 'wait';
  let scr = '';
  if (st === 'wait') scr = spinner(0, -104, 20, t, { col: P.orange, speed: 3 }) + `<rect x="-44" y="-70" width="88" height="10" rx="5" fill="#C9CFCC"/>${[0, 1, 2].map(i => `<circle cx="${-12 + i * 12}" cy="-48" r="4" fill="${P.orange}" opacity="${f3(.3 + .7 * ((Math.floor(t * 3) % 3) === i))}"/>`).join('')}`;
  else if (st === 'ok') scr = tick(0, -96, 1.1);
  else scr = `<rect x="-44" y="-118" width="88" height="10" rx="5" fill="#C9CFCC"/><rect x="-44" y="-98" width="60" height="10" rx="5" fill="#C9CFCC"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-10" y="-30" width="20" height="30" fill="${CM.steelD}" ${S(3)}/><rect x="-40" y="-8" width="80" height="10" rx="4" fill="${CM.steelD}" ${S(3)}/>
    <rect x="-66" y="-150" width="132" height="122" rx="12" fill="${CM.body}" ${S(4)}/><rect x="-56" y="-140" width="112" height="102" rx="6" fill="#F4FBFB"/>${scr}</g>`;
}
// barcode scanner gun on its cradle; beam 0..1
function scanner(x, y, s = 1, beam = 0) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-30,0 L30,0 L22,-22 L-22,-22 Z" fill="${CM.steelD}" ${S(3)}/>
    <path d="M-8,-20 L-14,-70 C-16,-82 -6,-90 6,-90 L40,-92 C50,-92 54,-84 50,-74 L40,-62 L8,-60 L6,-20 Z" fill="${CM.body}" ${S(4)}/>${beam > 0 ? `<path d="M48,-80 L120,-110 L120,-40 Z" fill="${CM.bad}" opacity="${f3(.28 * beam)}"/><path d="M118,-110 L118,-40" stroke="${CM.bad}" stroke-width="4" opacity="${f3(beam)}"/>` : ''}</g>`;
}
// shop shelves (backdrop). x0..x1 on floor y, rows of products with deterministic colours
function shelves(x0, x1, y, o = {}) {
  const h = o.h || 620, rows = o.rows || 4; let g = `<rect x="${f1(x0)}" y="${f1(y - h)}" width="${f1(x1 - x0)}" height="${h}" fill="${CM.shelfD}" ${S(5)}/>`;
  const cols = ['#E07A5F', '#F2A53A', '#3FB8A9', '#7FA7B5', '#E7C46A', '#9DB87A', '#F6F3EB', '#B5532A', '#5E6F8A', '#DFF3F8'];
  for (let r = 0; r < rows; r++) {
    const ry = y - h + (r + 1) * h / rows;
    g += `<rect x="${f1(x0)}" y="${f1(ry - 14)}" width="${f1(x1 - x0)}" height="18" fill="${CM.shelf}" ${S(4)}/>`;
    for (let x = x0 + 14, i = 0; x < x1 - 40; i++) {
      const w = 34 + 26 * hash(i * 3.1 + r * 11 + (o.seed || 0)), hh = 60 + 60 * hash(i * 7.7 + r * 5), c = cols[Math.floor(hash(i * 1.3 + r * 2.9 + (o.seed || 0)) * 10)];
      if (x + w > x1 - 14) break;
      g += `<rect x="${f1(x)}" y="${f1(ry - 14 - hh)}" width="${f1(w)}" height="${f1(hh)}" rx="${hash(i + r) > .6 ? 10 : 4}" fill="${c}" ${S(3)}/><rect x="${f1(x + 5)}" y="${f1(ry - 14 - hh * .62)}" width="${f1(w - 10)}" height="${f1(hh * .22)}" fill="#fff" opacity=".55"/>`;
      x += w + 6;
    }
  }
  return g;
}
// checkout counter seen from the customer side: top at y, front panel down to floor fy
function counter(x0, x1, y, fy, o = {}) {
  return `<rect x="${f1(x0)}" y="${f1(y)}" width="${f1(x1 - x0)}" height="${f1(fy - y)}" fill="${o.col || P.teal}" ${S(6)}/>
    <rect x="${f1(x0 + 30)}" y="${f1(y + 40)}" width="${f1(x1 - x0 - 60)}" height="${f1(fy - y - 80)}" rx="12" fill="#000" opacity=".1"/>
    <rect x="${f1(x0 - 20)}" y="${f1(y - 26)}" width="${f1(x1 - x0 + 40)}" height="30" rx="10" fill="${CM.counter}" ${S(6)}/><path d="M${f1(x0)},${f1(y - 16)} L${f1(x1)},${f1(y - 16)}" stroke="#fff" stroke-width="5" opacity=".5"/>`;
}
// impulse rack / candy box detail on the counter
const candy = (x, y, s = 1) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-50" y="-60" width="100" height="60" rx="6" fill="${CM.shelf}" ${S(4)}/>${[0, 1, 2, 3].map(i => `<rect x="${-42 + i * 22}" y="-80" width="18" height="40" rx="5" fill="${['#E07A5F', '#F2A53A', '#3FB8A9', '#E7C46A'][i]}" ${S(2.5)}/>`).join('')}</g>`;

// ---------- wallet / cash ----------
function wallet(x, y, s = 1, open = 1, o = {}) {    // seen from the front, opening like a book; receipts flutter when o.receipts
  const a = lerp(0, 1, eio(clamp(open)));
  const half = (sgn) => `<g transform="scale(${f3(sgn * lerp(.06, 1, a))},1)"><rect x="0" y="-46" width="92" height="92" rx="10" fill="#7A4E32" ${S(4)}/><rect x="10" y="-36" width="72" height="72" rx="6" fill="#8E5F3E"/>
    <path d="M14,-14 L80,-14 M14,6 L80,6" stroke="#5E3A24" stroke-width="3"/></g>`;
  let g = half(-1) + half(1) + `<path d="M0,-46 L0,46" stroke="${LINE}" stroke-width="4"/>`;
  if (a > .4 && o.inside !== false) g += `<rect x="10" y="-40" width="70" height="40" rx="3" fill="${CM.receipt}" ${S(2.5)} opacity="${f3(a)}"/><path d="M18,-30 L70,-30 M18,-20 L60,-20 M18,-10 L66,-10" stroke="#B9AFA0" stroke-width="3" opacity="${f3(a)}"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})">${g}</g>`;
}
function receipt(x, y, s = 1, rot = 0, o = 1) {
  return `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><path d="M-26,-40 L26,-40 L26,34 L20,40 L13,34 L6,40 L-1,34 L-8,40 L-15,34 L-22,40 L-26,34 Z" fill="${CM.receipt}" ${S(3)}/>
    <path d="M-16,-26 L16,-26 M-16,-14 L10,-14 M-16,-2 L16,-2 M-16,10 L4,10" stroke="#B9AFA0" stroke-width="3.5" stroke-linecap="round"/></g>`;
}
const coin = (x, y, s = 1, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse rx="24" ry="24" fill="${CM.coin}" ${S(4)}/><ellipse rx="15" ry="15" fill="none" stroke="#C99A3A" stroke-width="3"/></g>`;
const note = (x, y, s = 1, rot = 0, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><rect x="-56" y="-28" width="112" height="56" rx="6" fill="${CM.cash}" ${S(4)}/><circle r="16" fill="none" stroke="${CM.cashD}" stroke-width="4"/><rect x="-46" y="-18" width="16" height="8" rx="3" fill="${CM.cashD}"/><rect x="30" y="10" width="16" height="8" rx="3" fill="${CM.cashD}"/></g>`;
// stack of coins growing with k (cost meter)
function coinStack(x, y, s, n, o = {}) {
  let g = ''; const N = Math.floor(n), fr = n - N;
  for (let i = 0; i < N + 1; i++) { const k = i < N ? 1 : eout(fr); if (k <= 0) break; g += `<g transform="translate(0,${f1(-i * 13 - (1 - k) * 30)})" opacity="${f3(k)}"><ellipse cx="0" cy="0" rx="34" ry="11" fill="#C99A3A" ${S(3)}/><ellipse cx="0" cy="-5" rx="34" ry="11" fill="${CM.coin}" ${S(3)}/></g>`; }
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">${g}</g>`;
}

// ---------- home network ----------
// router (front): net 0..1 = internet LED state (0 red, 1 teal), blink = red blink; antennas wobble with o.wob
function router(x, y, s, t, o = {}) {
  const net = o.net ?? 0, bl = o.blink ? (Math.sin(t * 9) > 0 ? 1 : .35) : 1, wob = o.wob || 0;
  const led = (lx, col, on) => `<circle cx="${lx}" cy="-36" r="6" fill="${col}" opacity="${f3(on)}"/><circle cx="${lx}" cy="-36" r="6" fill="none" stroke="${LINE}" stroke-width="2"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse cx="0" cy="2" rx="130" ry="10" fill="#000" opacity=".12"/>
    <g transform="rotate(${f1(-8 + wob * Math.sin(t * 11))} -80 -64)"><rect x="-90" y="-176" width="16" height="116" rx="8" fill="${CM.body}" ${S(4)}/></g>
    <g transform="rotate(${f1(8 - wob * Math.sin(t * 11 + 1))} 80 -64)"><rect x="74" y="-176" width="16" height="116" rx="8" fill="${CM.body}" ${S(4)}/></g>
    <rect x="-120" y="-70" width="240" height="70" rx="18" fill="#F6F3EB" ${S(5)}/><rect x="-104" y="-20" width="208" height="8" rx="4" fill="#E3DACB"/>
    ${led(-70, CM.ok, 1)}${led(-40, CM.ok, .5 + .5 * Math.abs(Math.sin(t * 3)))}${led(40, net > .5 ? CM.ok : CM.bad, net > .5 ? 1 : bl)}
    <g transform="translate(70,-42) scale(.42)">${wifi(0, 10, 1, net > .5 ? 3 : 0)}</g></g>`;
}
// LAN cable from a plug (x, y) going down/right; plug k 0..1 (1 = plugged in), held when o.hand
function cable(x, y, len, k = 1, o = {}) {
  const dx = (1 - k) * 46;
  return `<path d="M${f1(x + 30 + dx)},${f1(y)} C${f1(x + 120 + dx)},${f1(y)} ${f1(x + 90)},${f1(y + len)} ${f1(x + 220)},${f1(y + len)}" fill="none" stroke="${LINE}" stroke-width="15" stroke-linecap="round"/><path d="M${f1(x + 30 + dx)},${f1(y)} C${f1(x + 120 + dx)},${f1(y)} ${f1(x + 90)},${f1(y + len)} ${f1(x + 220)},${f1(y + len)}" fill="none" stroke="${o.col || '#5DA9C9'}" stroke-width="9" stroke-linecap="round"/>
    <rect x="${f1(x + dx)}" y="${f1(y - 12)}" width="34" height="24" rx="5" fill="#DFF3F8" ${S(3)}/>`;
}

// ---------- ATM (front), x,y = base centre. on: screen lit; o.queue handled by the scene ----------
function atm(x, y, s, t, o = {}) {
  const on = o.on ?? 1;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse cx="0" cy="3" rx="150" ry="12" fill="#000" opacity=".12"/>
    <rect x="-130" y="-560" width="260" height="560" rx="18" fill="${o.col || '#5E6F8A'}" ${S(6)}/><rect x="-130" y="-560" width="260" height="70" rx="18" fill="${P.teal}" ${S(6)}/>
    <text x="0" y="-512" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="34" letter-spacing="6" fill="#F6F3EB">ATM</text>
    <rect x="-96" y="-460" width="192" height="150" rx="10" fill="${on ? '#E9FBF8' : '#3A4644'}" ${S(5)}/>
    ${on ? `<rect x="-76" y="-436" width="120" height="14" rx="7" fill="${P.tealGlow}"/><rect x="-76" y="-410" width="90" height="12" rx="6" fill="#C9CFCC"/><rect x="-76" y="-370" width="64" height="34" rx="8" fill="${P.orange}" ${S(3)}/><rect x="12" y="-370" width="64" height="34" rx="8" fill="#F6F3EB" ${S(3)}/>` : ''}
    <rect x="-80" y="-286" width="160" height="96" rx="10" fill="#D4D9DA" ${S(4)}/>${Array.from({ length: 12 }, (_, i) => `<rect x="${-66 + (i % 3) * 46}" y="${-276 + Math.floor(i / 3) * 22}" width="38" height="16" rx="4" fill="${(o.press && o.press(i, t)) ? P.orange : '#F6F3EB'}" ${S(2)}/>`).join('')}
    <rect x="-70" y="-170" width="140" height="22" rx="8" fill="${LINE}"/><rect x="-60" y="-166" width="120" height="8" rx="4" fill="#111"/>
    ${o.cash ? note(0, -150 + 26 * eout(o.cash), .8, 0, clamp(o.cash * 3)) : ''}
    <rect x="-110" y="-120" width="220" height="110" rx="10" fill="#000" opacity=".1"/></g>`;
}

// ---------- street commerce ----------
// motor scooter (side, facing +x), x,y = ground under the middle. rider drawn by the scene on top (seat at y-150)
function scooter(x, y, s = 1, t = 0, o = {}) {
  const spin = (o.dist || 0) / 30 * 57.3, col = o.col || '#E7C46A';
  const wheel = wx => `<g transform="translate(${wx},-34)"><circle r="34" fill="#2B2F2E" ${S(5)}/><circle r="13" fill="#C9D3D2" ${S(3)}/><g transform="rotate(${f1(spin)})"><path d="M-10,0 L10,0 M0,-10 L0,10" stroke="#7D8786" stroke-width="4"/></g></g>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><ellipse cx="0" cy="2" rx="150" ry="10" fill="#000" opacity=".14"/>${wheel(-100)}${wheel(104)}
    <path d="M-140,-60 C-140,-100 -110,-120 -60,-120 L20,-120 L40,-60 Z" fill="${col}" ${S(5)}/><path d="M-120,-136 L10,-136 C20,-136 24,-128 20,-120 L-130,-120 C-136,-128 -130,-136 -120,-136 Z" fill="${LINE}"/>
    <path d="M30,-60 L70,-200 L96,-200" fill="none" stroke="${LINE}" stroke-width="16" stroke-linecap="round"/><path d="M30,-60 L70,-200 L96,-200" fill="none" stroke="${CM.steelD}" stroke-width="9" stroke-linecap="round"/>
    <path d="M40,-60 C60,-60 110,-90 130,-60 L138,-40 L40,-40 Z" fill="${col}" ${S(5)}/><circle cx="82" cy="-178" r="10" fill="#FFF3C4" ${S(3)}/>
    ${o.box ? `<rect x="-170" y="-230" width="110" height="96" rx="12" fill="${o.box}" ${S(5)}/><path d="M-160,-200 L-70,-200" stroke="#fff" stroke-width="6" opacity=".6"/>` : ''}</g>`;
}
// food cart (gerobak), front-ish 3/4, x,y = ground centre
function cart(x, y, s = 1, t = 0, o = {}) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse cx="0" cy="2" rx="220" ry="14" fill="#000" opacity=".12"/>
    <circle cx="-150" cy="-40" r="40" fill="#5B4636" ${S(5)}/><circle cx="-150" cy="-40" r="12" fill="#C9A66B" ${S(3)}/>
    <rect x="-200" y="-260" width="390" height="190" rx="14" fill="${o.col || '#F6F3EB'}" ${S(6)}/><rect x="-200" y="-270" width="390" height="30" rx="10" fill="${P.wood}" ${S(5)}/>
    <rect x="-176" y="-226" width="160" height="110" rx="10" fill="#DFF3F8" fill-opacity=".7" ${S(4)}/>${[0, 1, 2].map(i => `<circle cx="${-146 + i * 50}" cy="-160" r="18" fill="${['#E7C46A', '#E07A5F', '#9DB87A'][i]}" ${S(3)}/>`).join('')}
    <path d="M-210,-420 L200,-420 L220,-360 L-230,-360 Z" fill="${P.orange}" ${S(5)}/>${[0, 1, 2, 3, 4].map(i => `<path d="M${-200 + i * 90},-420 L${-210 + i * 90 + 40},-360" stroke="#fff" stroke-width="16" opacity=".6"/>`).join('')}
    <path d="M-190,-360 L-190,-270 M180,-360 L180,-270" stroke="${LINE}" stroke-width="10"/><path d="M-190,-360 L-190,-270 M180,-360 L180,-270" stroke="${CM.steel}" stroke-width="5"/>
    <path d="M190,-120 L290,-150" stroke="${LINE}" stroke-width="14" stroke-linecap="round"/><path d="M190,-120 L290,-150" stroke="${P.wood}" stroke-width="8" stroke-linecap="round"/></g>`;
}
// hand-written sign (cardboard) — text short
function sign(x, y, text, s = 1, rot = 0, o = 1) {
  const w = text.length * 26 + 50;
  return `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><rect x="${-w / 2}" y="-40" width="${w}" height="80" rx="6" fill="#D9B27C" ${S(4)}/><text y="16" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="44" fill="${LINE}">${text}</text></g>`;
}
function notebook(x, y, s = 1, lines = 3, rot = 0) {
  let g = `<rect x="-60" y="-80" width="120" height="160" rx="6" fill="${CM.paper}" ${S(4)}/><path d="M-40,-80 L-40,80" stroke="${CM.bad}" stroke-width="2.5" opacity=".6"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M-50,${-50 + i * 24} L50,${-50 + i * 24}" stroke="#C9D6E0" stroke-width="2"/>`;
  for (let i = 0; i < Math.floor(lines); i++) g += `<path d="M-30,${-56 + i * 24} L${30 - 14 * (i % 2)},${-56 + i * 24}" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})">${g}</g>`;
}
function calculator(x, y, s = 1, t = 0) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-50" y="-74" width="100" height="148" rx="12" fill="#5E6F8A" ${S(4)}/><rect x="-38" y="-62" width="76" height="34" rx="5" fill="#DDEBD7" ${S(2.5)}/>
    <text x="32" y="-36" text-anchor="end" font-family="Nunito" font-weight="900" font-size="22" fill="${LINE}">${String(Math.floor(t * 7) % 900 + 100)}</text>${Array.from({ length: 12 }, (_, i) => `<rect x="${-36 + (i % 3) * 26}" y="${-18 + Math.floor(i / 3) * 22}" width="20" height="16" rx="4" fill="${i % 3 === 2 ? P.orange : '#F6F3EB'}" ${S(2)}/>`).join('')}</g>`;
}

// ---------- logistics ----------
function box(x, y, w, h, o = {}) {                  // cardboard box, base at (x, y) bottom-left
  const col = o.col || CM.box;
  return `<rect x="${f1(x)}" y="${f1(y - h)}" width="${f1(w)}" height="${f1(h)}" fill="${col}" ${S(4)}/><path d="M${f1(x + w / 2 - 10)},${f1(y - h)} L${f1(x + w / 2 - 10)},${f1(y - h + h * .32)} L${f1(x + w / 2 + 10)},${f1(y - h + h * .32)} L${f1(x + w / 2 + 10)},${f1(y - h)}" fill="#EAD5AE" ${S(2.5)}/>
    ${o.label ? `<rect x="${f1(x + 10)}" y="${f1(y - h * .45)}" width="${f1(w * .42)}" height="${f1(h * .26)}" fill="#fff" ${S(2)}/>` : ''}${o.fresh ? `<g transform="translate(${f1(x + w * .72)},${f1(y - h * .32)}) scale(${f3(w / 160)})"><circle r="20" fill="#DFF3F8" ${S(3)}/><path d="M0,-12 L0,12 M-10,-6 L10,6 M-10,6 L10,-6" stroke="${P.waterDeep}" stroke-width="4" stroke-linecap="round"/></g>` : ''}`;
}
function rack(x0, x1, y, h, levels, o = {}) {        // warehouse pallet rack with boxes (deterministic)
  let g = `<rect x="${f1(x0)}" y="${f1(y - h)}" width="12" height="${h}" fill="${P.orange}" ${S(3)}/><rect x="${f1(x1 - 12)}" y="${f1(y - h)}" width="12" height="${h}" fill="${P.orange}" ${S(3)}/>`;
  for (let l = 0; l < levels; l++) {
    const ly = y - l * h / levels;
    g += `<rect x="${f1(x0)}" y="${f1(ly - 12)}" width="${f1(x1 - x0)}" height="12" fill="#5E6F8A" ${S(3)}/>`;
    if (l === levels) continue;
    for (let x = x0 + 22, i = 0; x < x1 - 70; i++) { const w = 60 + 40 * hash(i * 1.7 + l * 9 + (o.seed || 0)), bh = Math.min(h / levels - 28, 50 + 50 * hash(i * 2.9 + l)); if (x + w > x1 - 20) break; g += box(x, ly - 12, w, bh, { label: hash(i + l * 3) > .5 }); x += w + 8; }
  }
  return g;
}
function trolley(x, y, s = 1, t = 0, o = {}) {      // hand pallet truck / trolley with a stack, facing +x
  const sp = (o.dist || 0) / 14 * 57.3;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><rect x="-90" y="-36" width="170" height="16" rx="5" fill="${CM.steelD}" ${S(3)}/>
    ${[-70, 60].map(wx => `<g transform="translate(${wx},-14)"><circle r="14" fill="#2B2F2E" ${S(3)}/><path d="M-6,0 L6,0" stroke="#999" stroke-width="3" transform="rotate(${f1(sp)})"/></g>`).join('')}
    <path d="M-90,-36 L-120,-200" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/><path d="M-90,-36 L-120,-200" stroke="${P.orange}" stroke-width="7" stroke-linecap="round"/><path d="M-136,-200 L-104,-200" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/>
    ${box(-74, -36, 130, 90)}${box(-60, -126, 100, 70, { label: true })}</g>`;
}
// container ship (side, facing −x), x,y = waterline centre; containers = count shown
function ship(x, y, s, t, o = {}) {
  const bob = 4 * Math.sin(t * 1.3), n = o.boxes ?? 10; let g = '';
  const cols = ['#E07A5F', P.teal, '#E7C46A', '#7FA7B5', P.orange];
  for (let i = 0; i < n; i++) { const c = i % 5, r = Math.floor(i / 5); g += `<rect x="${-240 + c * 86}" y="${-150 - r * 46}" width="80" height="44" fill="${cols[(i * 3) % 5]}" ${S(3)}/><path d="M${-230 + c * 86},${-140 - r * 46} L${-230 + c * 86},${-114 - r * 46} M${-210 + c * 86},${-140 - r * 46} L${-210 + c * 86},${-114 - r * 46}" stroke="#000" stroke-width="2" opacity=".2"/>`; }
  return `<g transform="translate(${f1(x)},${f1(y + bob)}) scale(${f3(s)})">${g}
    <path d="M-330,-104 L320,-104 L290,0 L-290,0 Z" fill="${P.rust}" ${S(6)}/><path d="M-320,-70 L312,-70" stroke="#fff" stroke-width="6" opacity=".5"/>
    <rect x="200" y="-230" width="90" height="126" rx="6" fill="#F6F3EB" ${S(5)}/><rect x="212" y="-214" width="66" height="22" rx="4" fill="#BFE3EC" ${S(3)}/></g>`;
}
function sea(x0, x1, y, t) {
  let g = `<rect x="${f1(x0)}" y="${f1(y)}" width="${f1(x1 - x0)}" height="900" fill="${CM.sea}"/>`;
  for (let k = 0; k < 4; k++) g += `<path d="${require('../engine/core').wave(x0, x1, y + 30 + k * 60, 8, 160, t * .3 + k * .37)}" fill="none" stroke="#fff" stroke-width="5" opacity="${f3(.5 - k * .1)}"/>`;
  return g;
}
// quay crane (side), x,y = rail on the quay; trolley u 0..1 along the boom, hook drop d px
function quayCrane(x, y, s, u = .5, d = 200, o = {}) {
  const tx = lerp(-260, 220, u);
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-120,0 L-90,-560 M120,0 L90,-560" stroke="${LINE}" stroke-width="26"/><path d="M-120,0 L-90,-560 M120,0 L90,-560" stroke="${P.orange}" stroke-width="16"/>
    <path d="M-110,-200 L110,-200" stroke="${LINE}" stroke-width="18"/><path d="M-110,-200 L110,-200" stroke="${P.orange}" stroke-width="10"/>
    <rect x="-320" y="-600" width="640" height="44" fill="${P.orange}" ${S(5)}/><rect x="-80" y="-660" width="120" height="64" rx="6" fill="#F6F3EB" ${S(4)}/>
    <rect x="${f1(tx - 30)}" y="-560" width="60" height="30" fill="#3A3F3E" ${S(3)}/><path d="M${f1(tx)},-530 L${f1(tx)},${f1(-530 + d)}" stroke="${LINE}" stroke-width="4"/>
    ${o.load ? `<rect x="${f1(tx - 40)}" y="${f1(-530 + d)}" width="80" height="44" fill="${o.load}" ${S(3)}/>` : `<path d="M${f1(tx - 14)},${f1(-530 + d)} q14,22 28,0" fill="none" stroke="${LINE}" stroke-width="5"/>`}</g>`;
}
// stamp + paper form (backup channel)
function form(x, y, s = 1, k = 0, rot = 0) {         // k 0..1 = stamp mark visible
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><rect x="-60" y="-78" width="120" height="156" rx="4" fill="${CM.paper}" ${S(4)}/>${[0, 1, 2, 3, 4].map(i => `<path d="M-44,${-54 + i * 22} L${44 - 20 * (i % 2)},${-54 + i * 22}" stroke="#B9AFA0" stroke-width="4" stroke-linecap="round"/>`).join('')}
    ${k > 0 ? `<g opacity="${f3(k)}" transform="translate(18,40) rotate(-14) scale(${f3(lerp(1.4, 1, eout(k)))})"><rect x="-36" y="-20" width="72" height="40" rx="6" fill="none" stroke="${CM.bad}" stroke-width="5"/><path d="M-22,0 L22,0" stroke="${CM.bad}" stroke-width="5"/></g>` : ''}</g>`;
}
function stamp(x, y, s = 1, down = 0) {
  return `<g transform="translate(${f1(x)},${f1(y - 60 * (1 - down))}) scale(${f3(s)})"><rect x="-26" y="-14" width="52" height="16" rx="3" fill="${CM.bad}" ${S(3)}/><rect x="-10" y="-56" width="20" height="44" rx="4" fill="${P.wood}" ${S(3)}/><ellipse cx="0" cy="-60" rx="22" ry="12" fill="${P.wood}" ${S(3)}/></g>`;
}

// ---------- status cards (decisions waiting for an answer) ----------
// kind: 'pay' | 'order' | 'stock' | 'doc' | 'login' | 'msg' | 'check' | 'ship'; state: 'wait' | 'ok' | 'q' | 'retry' | 'stuck' | 'dim'
function cardIcon(kind) {
  switch (kind) {
    case 'pay': return `<rect x="-26" y="-18" width="52" height="36" rx="6" fill="${CM.cash}" ${S(3)}/><circle r="9" fill="none" stroke="${CM.cashD}" stroke-width="3"/>`;
    case 'order': return `<path d="M-24,-16 L24,-16 L18,20 L-18,20 Z" fill="${P.orange}" ${S(3)}/><path d="M-12,-16 C-12,-30 12,-30 12,-16" fill="none" ${S(3)}/>`;
    case 'stock': return box(-24, 20, 48, 40);
    case 'doc': return `<path d="M-18,-24 L10,-24 L20,-14 L20,24 L-18,24 Z" fill="${CM.paper}" ${S(3)}/><path d="M-10,-8 L12,-8 M-10,2 L12,2 M-10,12 L4,12" stroke="#B9AFA0" stroke-width="3"/>`;
    case 'login': return `<circle cx="-8" cy="0" r="12" fill="none" stroke="${LINE}" stroke-width="5"/><path d="M4,0 L26,0 M18,0 L18,10 M24,0 L24,8" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/>`;
    case 'msg': return `<path d="M-24,-16 L24,-16 L24,12 L-4,12 L-14,22 L-14,12 L-24,12 Z" fill="${P.tealGlow}" ${S(3)}/>`;
    case 'check': return `<circle cx="-4" cy="-4" r="14" fill="#DFF3F8" ${S(4)}/><path d="M6,6 L20,20" stroke="${LINE}" stroke-width="6" stroke-linecap="round"/>`;
    case 'ship': return `<path d="M-26,0 L26,0 L20,14 L-20,14 Z" fill="${P.rust}" ${S(3)}/><rect x="-18" y="-16" width="16" height="14" fill="${P.teal}" ${S(2)}/><rect x="2" y="-16" width="16" height="14" fill="${P.orange}" ${S(2)}/>`;
    case 'water': return bottle(0, 22, .32);
    default: return '';
  }
}
function card(x, y, s, t, o = {}) {
  const st = o.state || 'wait', dim = st === 'dim' || st === 'stuck';
  const badge = st === 'ok' ? tick(42, -34, .62) : st === 'q' ? qmark(42, -34, .62) : st === 'retry' ? retry(42, -34, .62) : st === 'wait' ? `<g transform="translate(42,-34)"><circle r="17" fill="#fff" ${S(3)}/>${spinner(0, 0, 9, t, { col: P.orange })}</g>` : st === 'stuck' ? `<g transform="translate(42,-34)"><circle r="17" fill="#fff" ${S(3)}/>${[-6, 0, 6].map((d, i) => `<circle cx="${d}" r="2.6" fill="${CM.dim}"/>`).join('')}</g>` : '';
  return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(o.rot || 0)}) scale(${f3(s)})"><rect x="-52" y="-40" width="110" height="86" rx="14" fill="#000" opacity=".14" transform="translate(4,6)"/>
    <rect x="-52" y="-40" width="104" height="80" rx="14" fill="${dim ? '#E9E4DA' : '#FBF8F2'}" ${S(4)}/><g opacity="${dim ? .55 : 1}">${cardIcon(o.kind || 'order')}</g>${badge}${o.hi ? `<rect x="-58" y="-46" width="116" height="92" rx="18" fill="none" stroke="${P.orange}" stroke-width="6" opacity="${f3(o.hi)}"/>` : ''}</g>`;
}

// ---------- the network as a picture (metaphor, not a pipe) ----------
// arc between two points; on 0..1 (lit), flow = pulses moving along; dead = grey dashes
function arc(x0, y0, x1, y1, h, t, o = {}) {
  const on = o.on ?? 1, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - h, d = `M${f1(x0)},${f1(y0)} Q${f1(mx)},${f1(my)} ${f1(x1)},${f1(y1)}`, col = o.col || CM.pub;
  let g = `<path d="${d}" fill="none" stroke="${CM.dim}" stroke-width="${o.w || 5}" stroke-dasharray="3 12" stroke-linecap="round" opacity="${f3((o.ghost ?? .55) * (1 - on))}"/>`;
  if (on > 0) {
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${(o.w || 5) + 2}" stroke-linecap="round" opacity="${f3(.85 * on)}"/>`;
    const n = o.n || 2;
    for (let i = 0; i < n; i++) { const u = ((t * (o.speed || .55) + i / n + (o.ph || 0)) % 1), bx = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, by = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1; g += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1((o.w || 5) * 1.4)}" fill="#fff" stroke="${col}" stroke-width="3" opacity="${f3(on)}"/>`; }
  }
  return g;
}
// globe: centre, radius, rotation phase (deg of longitude); land drawn as soft blobs; o.lights = city dots (stay on)
const LAND = [[-20, 10, 34, 22], [-45, -20, 22, 30], [30, 20, 26, 18], [70, -10, 30, 24], [110, 25, 22, 16], [150, -25, 26, 20], [200, 15, 34, 26], [250, -5, 22, 28], [300, 30, 28, 18], [-90, 30, 20, 14]];
function globe(cx, cy, r, rot, t, o = {}) {
  let g = `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="#5DA9C9" ${S(6)}/><clipPath id="gclip${Math.round(cx)}_${Math.round(cy)}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath><g clip-path="url(#gclip${Math.round(cx)}_${Math.round(cy)})">`;
  const pts = [];
  LAND.forEach(([lon, lat, w, h], i) => {
    const a = (lon + rot) * Math.PI / 180, z = Math.cos(a); if (z < -.1) return;
    const x = cx + r * Math.sin(a) * Math.cos(lat * Math.PI / 180), y = cy - r * Math.sin(lat * Math.PI / 180);
    g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w / 90 * r * Math.max(.2, z))}" ry="${f1(h / 90 * r)}" fill="#9DB87A" ${S(3)}/>`;
    pts.push([x, y, z, i]);
  });
  if (o.lights !== false) pts.forEach(([x, y, z, i]) => { for (let k = 0; k < 4; k++) g += `<circle cx="${f1(x + (hash(i * 7 + k) - .5) * r * .25 * z)}" cy="${f1(y + (hash(i * 3 + k * 5) - .5) * r * .2)}" r="${f1(r * .018)}" fill="#FFE9A8" opacity="${f3(.9 * z)}"/>`; });
  g += `<ellipse cx="${f1(cx - r * .35)}" cy="${f1(cy - r * .4)}" rx="${f1(r * .35)}" ry="${f1(r * .2)}" fill="#fff" opacity=".18"/></g>`;
  globe.last = pts;
  return g;
}

// ---------- buildings ----------
// bank as a cutaway "pop-up" building: open 0..1 splits the facade; x,y = ground centre
function bank(x, y, s, t, open = 0, o = {}) {
  const W = 520, Hh = 560, dx = 260 * eio(clamp(open));
  const facade = (side) => `<g transform="translate(${f1(side * dx)},0)"><clipPath id="bk${side < 0 ? 'L' : 'R'}"><rect x="${side < 0 ? -W / 2 - 40 : 0}" y="${-Hh - 140}" width="${W / 2 + 40}" height="${Hh + 160}"/></clipPath><g clip-path="url(#bk${side < 0 ? 'L' : 'R'})">
    <path d="M${-W / 2 - 30},${-Hh} L0,${-Hh - 120} L${W / 2 + 30},${-Hh} Z" fill="#E3DCCB" ${S(6)}/><rect x="${-W / 2}" y="${-Hh}" width="${W}" height="${Hh}" fill="#EFE8D8" ${S(6)}/>
    ${[-200, -100, 100, 200].map(c => `<rect x="${c - 22}" y="${-Hh + 40}" width="44" height="${Hh - 70}" fill="#F8F3E8" ${S(4)}/>`).join('')}
    <rect x="${-W / 2 - 20}" y="-30" width="${W + 40}" height="30" fill="#D8CFBC" ${S(5)}/><rect x="-60" y="-220" width="120" height="190" rx="8" fill="${P.teal}" ${S(5)}/>
    <text x="0" y="${-Hh + 26}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="34" letter-spacing="8" fill="${P.teal}">BANK</text></g></g>`;
  const interior = open > .01 ? `<g opacity="${f3(clamp(open * 2))}"><rect x="${-W / 2 + 10}" y="${-Hh + 10}" width="${W - 20}" height="${Hh - 40}" fill="#E8EFEC"/>${o.inside ? o.inside(-W / 2 + 10, -Hh + 10, W - 20, Hh - 40) : ''}</g>` : '';
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse cx="0" cy="4" rx="${W * .62}" ry="16" fill="#000" opacity=".12"/>${interior}${facade(-1)}${facade(1)}</g>`;
}
function serverRack(x, y, s, t, o = {}) {           // x,y base centre; on 0..1 (lights)
  const on = o.on ?? 1; let g = `<rect x="-70" y="-300" width="140" height="300" rx="10" fill="#3A4644" ${S(5)}/>`;
  for (let i = 0; i < 8; i++) { const yy = -284 + i * 34; g += `<rect x="-58" y="${yy}" width="116" height="26" rx="4" fill="#4C5A58" ${S(2.5)}/>${[0, 1, 2].map(k => `<circle cx="${-44 + k * 12}" cy="${yy + 13}" r="4" fill="${hash(i * 3 + k + Math.floor(t * 6 + i)) > .45 ? CM.ok : '#26302F'}" opacity="${f3(on)}"/>`).join('')}<rect x="10" y="${yy + 9}" width="38" height="8" rx="4" fill="#26302F"/>`; }
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">${g}</g>`;
}
// narrow gate (digital queue): two posts + a bar that opens with k; x,y = ground centre
function gate(x, y, s, k = 0, o = {}) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-120" y="-220" width="40" height="220" rx="10" fill="${o.col || P.teal}" ${S(5)}/><rect x="80" y="-220" width="40" height="220" rx="10" fill="${o.col || P.teal}" ${S(5)}/>
    <g transform="translate(-80,-120) rotate(${f1(-80 * eio(clamp(k)))})"><rect x="0" y="-10" width="160" height="20" rx="10" fill="${P.orange}" ${S(4)}/>${[0, 1, 2].map(i => `<rect x="${24 + i * 46}" y="-10" width="20" height="20" fill="#fff" opacity=".7"/>`).join('')}</g>
    <circle cx="-100" cy="-238" r="12" fill="${k > .5 ? CM.ok : CM.bad}" ${S(3)}/></g>`;
}
// clock chip for hour jumps: "JAM 24" pill with a mini clock; p = pop {s,o}; hand angle follows hours
function hourChip(x, y, hours, p, t = 0) {
  if (!p || p.o <= 0) return '';
  const text = `JAM ${hours}`, size = 40, w = text.length * size * .66 + 120, h = 78;
  const ang = (hours % 12) * 30 + t * 40;
  return `<g opacity="${f3(p.o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(p.s)})"><rect x="${-w / 2}" y="${-h / 2 + 7}" width="${w}" height="${h}" rx="${h / 2}" fill="${LINE}"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#FBF6EC" ${S(5)}/>
    <g transform="translate(${-w / 2 + 44},0)"><circle r="26" fill="${P.teal}" ${S(4)}/><path d="M0,0 L0,-17" stroke="#fff" stroke-width="5" stroke-linecap="round" transform="rotate(${f1(ang)})"/><path d="M0,0 L11,0" stroke="${P.orange}" stroke-width="5" stroke-linecap="round" transform="rotate(${f1(ang * .08)})"/><circle r="4" fill="#fff"/></g>
    <text x="${f1(30)}" y="${f1(size * .36)}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${size}" letter-spacing="2" fill="${LINE}">${text}</text></g>`;
}

module.exports = { CM, spinner, tick, qmark, retry, hourglass, qr, bars, wifi, phone, bottle, qrStand, pos, scanner, shelves, counter, candy, wallet, receipt, coin, note, coinStack,
  router, cable, atm, scooter, cart, sign, notebook, calculator, box, rack, trolley, ship, sea, quayCrane, form, stamp, cardIcon, card, arc, globe, bank, serverRack, gate, hourChip };
