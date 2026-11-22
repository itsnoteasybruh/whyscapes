// WHYSCAPE EP14 — "Kenapa Makanan di Kulkas Tetap Basi?" (cover: KOK BASI DI KULKAS?) · timeline, beats, helpers.
// Master = audio/vo.mp3 (109,48 s, md5 ada4bee5…), played 1,00x, uncut, starting at VO_OFFSET (behind the cover, STANDARDS §16).
// transcript.json is in VIDEO time (= aligned VO time + VO_OFFSET, tools/apply_offset.py), so every W() is already video time.
const path = require('path');
const SERIES = path.join(__dirname, '..', '..', 'series');
const K = require(path.join(SERIES, 'engine', 'core'));
const M = require(path.join(SERIES, 'character', 'mpi'));
const H = require(path.join(SERIES, 'world', 'haze'));
const FG = require(path.join(SERIES, 'world', 'fridge'));
const MB = require(path.join(SERIES, 'creatures', 'microbe'));
M.setStyle({ hair: 'v2' });
const { PALETTE: P, LINE, pop, prog, eio, eout, lerp, clamp, fade, place, svgPill, S } = K;
const { f1, f3, hash } = H;

const VO_OFFSET = 1.0;
const tr = require('./transcript.json');
const KEYWORDS = ['kulkas', 'aneh', 'awet', 'jejaknya', 'memperlambat', 'menghentikan', 'pembusuk', 'baunya', 'rasanya', 'teksturnya', 'enzim', 'udara', 'lambat',
  'pause', 'modal', 'meja', 'tengahnya', 'balik', 'aman', 'kuman', 'tentu', 'secepatnya', '2', 'dangkal', '4', '34', 'bekukan', 'tersembunyi', 'batas', 'misterius'];
const tl = K.timeline(tr, { keywords: KEYWORDS });
const W = tl.W;
const VO_END = tr.segments.at(-1).end;
const END = +(VO_END + 2.3).toFixed(2);
const t0 = W('coba') + .04;
const transition = { t0, center: [540, 700], radius: 430 };
const SWITCH = t0 + .5;
// the sniff ElevenLabs put in the VO (6,23–6,48 s VO time): no subtitle, no SFX; Mpi's sniff follows its peak
const SNIFF = 6.30 + VO_OFFSET;

const svg = (body, extra = '') => `<svg width="1080" height="1920">${K.DEFS(H.HZ_DEFS + extra)}${body}</svg>`;
const TAG = (text, p, x, y, o = {}) => svgPill(x, y, text, { p, size: o.size || 34, fill: o.fill || P.orange, color: o.color || LINE, rot: o.rot || 0 });
const rv = (t, a, d = .35) => eout(prog(t, a, a + d));
const pulseK = (t, a, d = .7) => { const k = prog(t, a, a + d); return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };
const blinkAt = (t, list) => list.some(b => t > b && t < b + .14);
const ring = (x, y, r, k, col = P.orange) => k > 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * (1 + .08 * (1 - k)))}" fill="none" stroke="${col}" stroke-width="8" stroke-dasharray="18 12" opacity="${f3(k)}"/>` : '';
const mpiAt = (x, feetY, s, expr, o = {}) => `<g transform="${place(x, feetY, s)}">${M.mpi(expr, o)}</g>`;
// smoothed camera keys [t, [x, y, s]] (log-scale zoom), Gaussian-smoothed so there are no jerks between keys
function smoothKeys(keys, sigma = .35) {
  return t => { let a = 0, w = 0; for (let d = -3; d <= 3; d += .25) { const tt = t + d * sigma, q = Math.exp(-.5 * d * d); a += lin(keys, tt) * q; w += q; } return a / w; };
}
function lin(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], eio((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))); return keys.at(-1)[1]; }
function camKeys(keys, sigma = .3) {
  const xs = smoothKeys(keys.map(([t, v]) => [t, v[0]]), sigma), ys = smoothKeys(keys.map(([t, v]) => [t, v[1]]), sigma), ss = smoothKeys(keys.map(([t, v]) => [t, Math.log(v[2])]), sigma);
  return t => ({ x: xs(t), y: ys(t), s: Math.exp(ss(t)) });
}
const camT = (c, fy = 960) => `translate(540,${f1(fy)}) scale(${f3(c.s)}) translate(${f1(-c.x)},${f1(-c.y)})`;

// ---------- shared looks ----------
// micro world on the food surface: cold (fridge) or warm (table). Rice-grain "hills" along the bottom, drifting cold specks.
function microBG(t, o = {}) {
  const warm = clamp(o.warm || 0), y0 = o.ground ?? 1180;
  const top = FG.lerpHex('#16302E', '#3A2A1A', warm), bot = FG.lerpHex('#24474A', '#5A3A22', warm);
  let g = `<defs><linearGradient id="mbg${o.id || ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
    <rect x="-400" y="-400" width="1880" height="2720" fill="url(#mbg${o.id || ''})"/>`;
  for (let i = 0; i < 40; i++) {               // drifting specks: cold = slow pale-blue flakes, warm = faster amber motes
    const sp = (.4 + (i % 5) / 6) * (1 + 1.6 * warm), x = (i * 137 + 30 * Math.sin(t * .4 + i)) % 1180 - 50, y = ((i * 263) - t * 18 * sp) % 1900;
    g += `<circle cx="${f1(x)}" cy="${f1(y < -20 ? y + 1900 : y)}" r="${2 + i % 3}" fill="${warm > .5 ? '#F2C27A' : '#BFE6EE'}" opacity="${f3(.18 + .06 * (i % 3))}"/>`;
  }
  // rice grains as soft hills (food surface), back row lighter
  for (let r = 0; r < 2; r++) for (let i = -1; i < 7; i++) {
    const cx = i * 190 + (r ? 95 : 0) + (o.shift || 0) % 190, cy = y0 + r * 120, rx = 150, ry = 70;
    g += `<ellipse cx="${f1(cx)}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${FG.lerpHex(r ? '#EADFC8' : '#D9CCAF', FG.FR.spoil, clamp(o.spoil || 0) * .6)}" ${S(6)}/><path d="M${f1(cx - 90)},${cy - 30} Q${f1(cx - 40)},${cy - 52} ${f1(cx + 20)},${cy - 50}" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".45"/>`;
  }
  g += `<rect x="-400" y="${y0 + 160}" width="1880" height="900" fill="${FG.lerpHex('#CDBF9F', FG.FR.spoilD, clamp(o.spoil || 0) * .5)}"/>`;
  if (o.frost !== false && warm < .5) g += [[120, 260], [930, 380], [820, 1040], [200, 900]].map(([x, y], i) => FG.snow(x + 10 * Math.sin(t * .5 + i), y + 8 * Math.cos(t * .4 + i), .9, '#9FD8E6', .35 * (1 - warm * 2))).join('');
  return g;
}
// a round inset "lens" (magnifier view) at (x,y) radius r with inner svg; k = reveal 0..1
function lens(x, y, r, k, inner, id) {
  if (k <= 0) return '';
  const rr = r * eout(k);
  return `<defs><clipPath id="ln${id}"><circle cx="${x}" cy="${y}" r="${f1(rr)}"/></clipPath></defs><g clip-path="url(#ln${id})">${inner}</g>
    <circle cx="${x}" cy="${y}" r="${f1(rr)}" fill="none" stroke="${LINE}" stroke-width="16"/><circle cx="${x}" cy="${y}" r="${f1(rr)}" fill="none" stroke="${P.orange}" stroke-width="6"/>
    <path d="M${f1(x + rr * .7)},${f1(y + rr * .7)} L${f1(x + rr * .7 + 60 * k)},${f1(y + rr * .7 + 60 * k)}" stroke="${LINE}" stroke-width="30" stroke-linecap="round"/><path d="M${f1(x + rr * .7)},${f1(y + rr * .7)} L${f1(x + rr * .7 + 60 * k)},${f1(y + rr * .7 + 60 * k)}" stroke="${P.wood}" stroke-width="18" stroke-linecap="round"/>`;
}
// small icon cards (BAU / RASA / TEKSTUR …): a cream card with an icon + label
function card(x, y, k, label, icon, o = {}) {
  if (k <= 0) return '';
  return `<g opacity="${f3(clamp(k * 2))}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(.7 + .3 * K.back(k))}) rotate(${o.rot || 0})"><rect x="-130" y="-120" width="260" height="240" rx="28" fill="${LINE}" transform="translate(0,8)"/>
    <rect x="-130" y="-120" width="260" height="240" rx="28" fill="${o.fill || '#F6F3EB'}" ${S(6)}/><g transform="translate(0,-22)">${icon}</g>
    <text y="92" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="38" letter-spacing="2" fill="${LINE}">${label}</text></g>`;
}
const ICON = {
  nose: `<path d="M-10,-60 C-14,-20 -40,10 -34,30 C-30,44 -6,44 8,36" fill="none" ${S(9)}/><path d="M18,-30 q16,-14 0,-28 q-16,-14 0,-28" fill="none" stroke="${'#9DAA6E'}" stroke-width="8" stroke-linecap="round" transform="translate(20,40)"/><path d="M40,-20 q14,-12 0,-24 q-14,-12 0,-24" fill="none" stroke="${'#9DAA6E'}" stroke-width="8" stroke-linecap="round" transform="translate(16,40)"/>`,
  spoon: `<ellipse cx="-24" cy="-26" rx="30" ry="40" fill="#DCE6E4" ${S(6)} transform="rotate(-30 -24 -26)"/><path d="M-4,4 L44,60" ${S(14)}/><path d="M-4,4 L44,60" stroke="#DCE6E4" stroke-width="6" stroke-linecap="round"/><path d="M14,-50 q10,8 20,0 t20,0" fill="none" stroke="${'#E07A5F'}" stroke-width="7" stroke-linecap="round"/>`,
  texture: `<path d="M-70,30 C-50,-30 -20,-30 0,10 C20,50 50,40 70,-10" fill="none" ${S(9)}/><circle cx="-40" cy="-30" r="14" fill="#C9CFB0" ${S(4)}/><circle cx="34" cy="-36" r="18" fill="#C9CFB0" ${S(4)}/><path d="M-20,42 q4,16 0,30" stroke="#C9CFB0" stroke-width="10" stroke-linecap="round"/>`,
  shield: `<path d="M0,-66 L52,-46 C52,10 34,44 0,62 C-34,44 -52,10 -52,-46 Z" fill="${'#9FD8E6'}" ${S(7)}/><path d="M-20,0 L-4,16 L24,-18" fill="none" ${S(9)}/>`,
  germ: `<circle r="40" fill="none" stroke="${LINE}" stroke-width="6" stroke-dasharray="10 9"/><text y="20" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="56" fill="${LINE}">?</text>`,
};

module.exports = { K, M, H, FG, MB, P, LINE, pop, prog, eio, eout, lerp, clamp, fade, place, svgPill, S, f1, f3, hash,
  VO_OFFSET, tl, W, VO_END, END, t0, SWITCH, SNIFF, transition, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, microBG, lens, card, ICON };
