// WHYSCAPE EP13 — "Gimana Lebah Menemukan Jalan Pulang ke Sarangnya?" (cover: LEBAH PULANG KE SARANG) · timeline, beats, helpers.
// Master = audio/vo.mp3 (113,24 s, md5 b334a0fd…), played 1,00x, uncut, starting at VO_OFFSET (behind the cover, STANDARDS §16).
// transcript.json is in VIDEO time (= aligned VO time + VO_OFFSET, tools/apply_offset.py), so every W() is already video time.
const path = require('path');
const SERIES = path.join(__dirname, '..', '..', 'series');
const K = require(path.join(SERIES, 'engine', 'core'));
const M = require(path.join(SERIES, 'character', 'mpi'));
const MT = require(path.join(SERIES, 'character', 'mpi_turn'));
const H = require(path.join(SERIES, 'world', 'haze'));
const GD = require(path.join(SERIES, 'world', 'garden'));
const BEE = require(path.join(SERIES, 'creatures', 'bee'));
const CM = require(path.join(SERIES, 'world', 'commerce'));
M.setStyle({ hair: 'v2' });
const { PALETTE: P, LINE, pop, prog, eio, eout, lerp, clamp, fade, place, svgPill, S } = K;
const { f1, f3, hash, noise } = H;

const VO_OFFSET = 1.0;
const tr = require('./transcript.json');
const KEYWORDS = ['sarangnya', 'maps', 'pulang', 'jejaknya', 'orientasi', 'pintu', 'pohon', 'kebun', 'langit', 'belajar', 'matahari', 'kompas', 'jam', 'kunci',
  'jaraknya', 'pemandangan', 'kilometer', 'bersama', 'peneliti', 'ingatannya', 'ajaib', 'tersembunyi', 'lebah'];
const tl = K.timeline(tr, { keywords: KEYWORDS });
const W = tl.W;
const VO_END = tr.segments.at(-1).end;
const END = +(VO_END + 2.4).toFixed(2);
const t0 = W('coba') + .04;
const transition = { t0, center: [540, 700], radius: 430 };
const SWITCH = t0 + .5;

const svg = (body, extra = '') => `<svg width="1080" height="1920">${K.DEFS(H.HZ_DEFS + extra)}${body}</svg>`;
const TAG = (text, p, x, y, o = {}) => svgPill(x, y, text, { p, size: o.size || 34, fill: o.fill || P.orange, color: o.color || LINE, rot: o.rot || 0 });
function smoothCurve(fn, tA, tB, dt = .05, sigma = .7) {
  const N = Math.ceil((tB - tA) / dt) + 1, raw = [];
  for (let k = 0; k < N; k++) raw.push(fn(tA + k * dt));
  const R = Math.ceil(3 * sigma / dt), sm = new Float64Array(N);
  for (let k = 0; k < N; k++) { let a = 0, w = 0; for (let j = -R; j <= R; j++) { const q = Math.min(N - 1, Math.max(0, k + j)), ww = Math.exp(-.5 * (j * dt / sigma) ** 2); a += raw[q] * ww; w += ww; } sm[k] = a / w; }
  return t => { const x = Math.min(N - 1.001, Math.max(0, (t - tA) / dt)), k = Math.floor(x); return sm[k] + (sm[k + 1] - sm[k]) * (x - k); };
}
function smoothKeys(keys, sigma = .45, dt = .02) {
  const lin = t => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return keys.at(-1)[1]; };
  return smoothCurve(lin, keys[0][0] - 2, keys.at(-1)[0] + 2, dt, sigma);
}
function camKeys(keys, sigma = .3) {
  const xs = smoothKeys(keys.map(([t, v]) => [t, v[0]]), sigma), ys = smoothKeys(keys.map(([t, v]) => [t, v[1]]), sigma), ss = smoothKeys(keys.map(([t, v]) => [t, Math.log(v[2])]), sigma);
  return t => ({ x: xs(t), y: ys(t), s: Math.exp(ss(t)) });
}
const camT = (x, y, s, fy = 960) => `translate(540,${f1(fy)}) scale(${f3(s)}) translate(${f1(-x)},${f1(-y)})`;
const rv = (t, a, d = .35) => eout(prog(t, a, a + d));
const pulseK = (t, a, d = .7) => { const k = prog(t, a, a + d); return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };
const blinkAt = (t, list) => list.some(b => t > b && t < b + .14);
const ring = (x, y, r, k, col = P.orange) => k > 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * (1 + .08 * (1 - k)))}" fill="none" stroke="${col}" stroke-width="8" stroke-dasharray="18 12" opacity="${f3(k)}"/>` : '';
const mpiAt = (x, feetY, s, expr, o = {}) => `<g transform="${place(x, feetY, s)}">${M.mpi(expr, o)}</g>`;
// the main bee is always drawn with the teal mark (BEE.BE.mark) — viewers follow THIS bee
const hero = (x, y, s, t, o = {}) => (o.top ? BEE.top(x, y, s, o.ang || 0, { t, mark: true, ...o }) : BEE.side(x, y, s, { t, mark: true, ...o }));

module.exports = { K, M, MT, H, GD, BEE, CM, P, LINE, pop, prog, eio, eout, lerp, clamp, fade, place, svgPill, S, f1, f3, hash, noise,
  VO_OFFSET, tl, W, VO_END, END, t0, SWITCH, transition, svg, TAG, smoothKeys, smoothCurve, camKeys, camT, rv, pulseK, blinkAt, ring, mpiAt, hero };
