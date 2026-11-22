// WHYSCAPE SERIES ENGINE — core helpers shared by every episode.
// Episode-agnostic: no transcript or scene of any episode is baked in here.
const path = require('path');

// ---------- palette (locked) ----------
const PALETTE = {
  cream: '#F3EEE4', creamLight: '#F6F3EB', paperDot: '#D6C9B2',
  teal: '#1F4D4A', tealMid: '#2A5F5B', tealGlow: '#3FB8A9', tealLeaf: '#3F8F7F',
  orange: '#F2A53A', orangeDeep: '#E08A3C', rust: '#B5532A',
  line: '#231E1A', wood: '#B88A5A',
  deep: '#0C1615', deep2: '#1D3835', water: '#8FD3E3', waterDeep: '#2E7488',
  skinEpi: '#F6EADB', skinDerm: '#EFC4B0', blood: '#D9544A', nerve: '#FFC766', alert: '#E0483E',
};
const LINE = PALETTE.line;

// ---------- easing / timing ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eout = k => 1 - Math.pow(1 - k, 3);
const ein = k => k * k * k;
const back = k => { const c1 = 1.9, c3 = c1 + 1; return k <= 0 ? 0 : k >= 1 ? 1 : 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
function pop(t, a, b = 1e9, din = .3, dout = .18) {   // pop in at a, out at b → {s, o}
  const pi = prog(t, a, a + din), po = prog(t, b, b + dout);
  return { s: back(pi) * (1 - .3 * po), o: clamp(pi * 3) * (1 - po), on: pi > 0 && po < 1 };
}
const fade = (t, a, b, d = .25) => prog(t, a, a + d) * (1 - prog(t, b, b + d));

// ---------- SUBTITLE STANDARD (locked) ----------
const SUB = {
  font: 'Nunito', weight: 900, sizePx: 58, lineHeight: 1.18,          // 58 px on a 1080 px wide frame (≈5.4 % of width)
  color: '#FFFFFF', keyColor: PALETTE.orange, outline: '#1A1F1E',
  top: 1392, side: 96,                                                // top of block at 72.5 % height; clear of Reels/Shorts UI
  maxLines: 2, chunk: { soft: 26, punct: 14, hard: 34, max: 46 },     // characters per on-screen chunk
  reveal: { lead: .06, dur: .16, rise: 14 }, chunkIn: { scale: .94, dur: .12 },
  holdAfterSegment: .45, gapToHide: .9,
};
const SUB_CSS = `.sub{position:absolute;left:${SUB.side}px;right:${SUB.side}px;text-align:center;font-family:${SUB.font};font-weight:${SUB.weight};font-size:${SUB.sizePx}px;line-height:${SUB.lineHeight};color:${SUB.color};transform-origin:50% 0;
  text-shadow:0 0 2px ${SUB.outline},0 4px 0 ${SUB.outline},4px 0 0 ${SUB.outline},-4px 0 0 ${SUB.outline},0 -4px 0 ${SUB.outline},3px 3px 0 ${SUB.outline},-3px 3px 0 ${SUB.outline},3px -3px 0 ${SUB.outline},-3px -3px 0 ${SUB.outline},0 10px 18px rgba(0,0,0,.35)}
  .sub b{color:${SUB.keyColor}} .sub span{display:inline-block}`;

// ---------- transcript → word timing → subtitle chunks ----------
// transcript.json: { segments: [{start, end, text}] } — one segment per spoken phrase (see tools/transcribe.py)
function timeline(transcript, { keywords = [] } = {}) {
  const KEY = new Set(keywords.map(k => k.toLowerCase()));
  const WORDS = [];
  transcript.segments.forEach((s, si) => {
    const ws = s.text.split(/\s+/).filter(Boolean);
    const wt = ws.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1.5);
    const tot = wt.reduce((a, b) => a + b, 0), span = s.end - s.start; let acc = 0;
    // kit v1.9: measured word onsets (s.words = [[word, start, end], …], same split as the text) override the letter-weighted estimate
    const mw = Array.isArray(s.words) && s.words.length === ws.length ? s.words : null;
    ws.forEach((w, i) => { const a = s.start + span * acc / tot; acc += wt[i]; WORDS.push({ w, clean: w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''), start: mw ? mw[i][1] : a, end: mw ? mw[i][2] : s.start + span * acc / tot, seg: si }); });
  });
  // W('kata', after) → start time of the first occurrence of that word at/after `after`
  const W = (word, after = 0, which = 'start') => {
    const x = WORDS.find(o => o.clean === word.toLowerCase() && o.start >= after - .01);
    if (!x) throw new Error(`word not found: "${word}" after ${after}`); return x[which];
  };
  const chunks = [];
  transcript.segments.forEach((s, si) => {
    const ws = WORDS.filter(w => w.seg === si); let cur = [];
    const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
    ws.forEach((w, i) => {
      cur.push(w); const chars = cur.map(x => x.w).join(' ').length, punct = /[,.?!:]$/.test(w.w), left = ws.length - 1 - i, C = SUB.chunk;
      if ((chars >= C.soft && left >= 2) || (punct && chars >= C.punct && left >= 2) || (chars >= C.hard && left >= 2) || chars >= C.max) flush();
    });
    flush();
  });
  const CHUNKS = chunks.map((c, i) => {
    const next = chunks[i + 1], segEnd = transcript.segments[c[0].seg].end;
    let end = next ? next[0].start - .05 : segEnd + SUB.holdAfterSegment;
    if (next && next[0].seg !== c[0].seg && next[0].start - segEnd > SUB.gapToHide) end = segEnd + SUB.holdAfterSegment;
    return { words: c, start: c[0].start - .05, end };
  });
  function subtitle(t) {
    const c = CHUNKS.find(x => t >= x.start && t < x.end); if (!c) return '';
    const text = c.words.map(w => w.w).join(' '); let br = -1;
    if (text.length > 17) { let best = 1e9, acc = 0; c.words.forEach((w, i) => { acc += w.w.length + 1; const d = Math.abs(acc - text.length / 2); if (i < c.words.length - 1 && d < best) { best = d; br = i; } }); }
    const html = c.words.map((w, i) => {
      const k = eout(prog(t, w.start - SUB.reveal.lead, w.start + SUB.reveal.dur - SUB.reveal.lead));
      return `<span style="opacity:${k.toFixed(3)};transform:translateY(${((1 - k) * SUB.reveal.rise).toFixed(1)}px)">${KEY.has(w.clean) ? `<b>${w.w}</b>` : w.w}</span>${i === br ? '<br>' : ' '}`;
    }).join('');
    const inK = eout(prog(t, c.start, c.start + SUB.chunkIn.dur));
    return `<div class="sub" style="top:${SUB.top}px;transform:scale(${(SUB.chunkIn.scale + (1 - SUB.chunkIn.scale) * inK).toFixed(4)})">${html}</div>`;
  }
  return { WORDS, W, CHUNKS, subtitle };
}

// ---------- drawing primitives ----------
const S = (w = 6, c = LINE) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
function wave(x0, x1, y, amp, per, phase = 0) {
  x0 -= (phase % 1) * per; let d = `M${x0},${y}`, up = true;
  for (let x = x0; x < x1; x += per / 2) { d += ` Q${x + per / 4},${y + (up ? -amp : amp)} ${x + per / 2},${y}`; up = !up; }
  return d;
}
const drop = (x, y, s = 1, fill = PALETTE.water, o = 1) => `<path opacity="${o}" transform="translate(${x},${y}) scale(${s})" d="M0,-16 C6,-6 11,0 11,6 C11,13 6,17 0,17 C-6,17 -11,13 -11,6 C-11,0 -6,-6 0,-16 Z" fill="${fill}" ${S(3)}/>`;
const place = (cx, feetY, sc) => `translate(${cx - 117 * sc},${feetY - 456 * sc}) scale(${sc})`;   // Mpi: feet centre → screen
const around = (x, y, s, inner, rot = 0) => `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s}) translate(${-x},${-y})">${inner}</g>`;
// label pill (locked look): rounded, dark outline, 7 px hard drop shadow
function svgPill(x, y, text, { fill = PALETTE.orange, color = LINE, size = 34, rot = 0, p = { s: 1, o: 1 }, pad = 26 } = {}) {
  if (p.o <= 0) return '';
  const w = text.length * size * .74 + pad * 2, h = size * 1.75;
  return `<g opacity="${p.o}" transform="translate(${x},${y}) rotate(${rot}) scale(${p.s})">
    <rect x="${-w / 2}" y="${-h / 2 + 6}" width="${w}" height="${h}" rx="${h / 2}" fill="${LINE}"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" ${S(5)}/>
    <text x="0" y="${size * .36}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${size}" letter-spacing="2" fill="${color}">${text}</text></g>`;
}
// camera: keys [{t,x,y,s,d}] — world point (x,y) brought to screen (540,FY) at scale s
function cam(t, keys, FY = 680) {
  let cur = { x: keys[0].x, y: keys[0].y, s: keys[0].s };
  for (const k of keys.slice(1)) { if (t < k.t) break; const b = eio(prog(t, k.t, k.t + (k.d || .6))); cur = { x: lerp(cur.x, k.x, b), y: lerp(cur.y, k.y, b), s: lerp(cur.s, k.s, b) }; }
  return { ...cur, tf: `translate(540,${FY}) scale(${cur.s}) translate(${-cur.x},${-cur.y})` };
}

// ---------- world backgrounds (series look) ----------
let NOW = 0; const setNow = t => { NOW = t; };
// 'ripple' = everyday paper + faint water ripples · 'trail' = investigation: ripples give way to dotted guide lines
function grid(kind = 'ripple', focus = [540, 640]) {
  let g = `<rect x="-600" y="-600" width="2280" height="3400" fill="url(#paper)"/>`;
  const rings = (cx, cy, o) => { let r = ''; for (let k = 0; k < 5; k++) { const rad = 70 + k * 95 + (NOW * 14 % 95), op = Math.max(0, 1 - rad / 560) * o; r += `<ellipse cx="${cx}" cy="${cy}" rx="${rad}" ry="${rad * .42}" fill="none" stroke="#E0D4C0" stroke-width="3.5" opacity="${op.toFixed(3)}"/>`; } return r; };
  const o = kind === 'trail' ? .45 : .9;
  g += rings(170, 330, o) + rings(930, 980, o) + rings(260, 1620, o * .8);
  if (kind === 'trail') {
    const [fx, fy] = focus;
    [`M-200,1900 C100,1400 300,900 ${fx},${fy}`, `M1300,250 C1000,430 800,560 ${fx},${fy}`, `M-220,180 C150,330 350,520 ${fx},${fy}`, `M1300,1500 C1050,1100 800,820 ${fx},${fy}`]
      .forEach((d, i) => { g += `<path d="${d}" fill="none" stroke="#DACAAE" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 26" stroke-dashoffset="${(-NOW * 32 - i * 9).toFixed(1)}" opacity=".75"/>`; });
  }
  return g;
}
// 'inside' worlds (under the skin, inside a pipe, underground…): drifting fine particles + soft light depth
function deep(op = 1) {
  let g = `<ellipse cx="300" cy="420" rx="520" ry="380" fill="url(#deeplight)" opacity="${.55 * op}"/><ellipse cx="860" cy="1300" rx="460" ry="360" fill="url(#deeplight)" opacity="${.4 * op}"/>`;
  for (let i = 0; i < 46; i++) {
    const sp = .5 + (i % 5) / 5, x = (i * 137 + 40 * Math.sin(NOW * .3 + i)) % 1180 - 50, y = ((i * 251) - NOW * 14 * sp) % 2000;
    g += `<circle cx="${x.toFixed(1)}" cy="${(y < -40 ? y + 2000 : y).toFixed(1)}" r="${2 + i % 3}" fill="#6FD3C4" opacity="${((.10 + .07 * (i % 3)) * op).toFixed(3)}"/>`;
  }
  return g;
}

// ---------- shared <defs> (filters, gradients, patterns) ----------
const DEFS = (extra = '') => `<defs>${require('../character/mpi').defs()}
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="sticker" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/>
    <feFlood flood-color="${PALETTE.creamLight}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="darkbg" gradientUnits="userSpaceOnUse" cx="540" cy="760" r="1300"><stop offset="0" stop-color="${PALETTE.deep2}"/><stop offset="1" stop-color="${PALETTE.deep}"/></radialGradient>
  <radialGradient id="deeplight"><stop offset="0" stop-color="${PALETTE.tealGlow}" stop-opacity=".22"/><stop offset="1" stop-color="${PALETTE.tealGlow}" stop-opacity="0"/></radialGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DFCC" stop-opacity="0"/><stop offset=".18" stop-color="#E9DFCC" stop-opacity=".75"/><stop offset="1" stop-color="#E3D6C0" stop-opacity=".95"/></linearGradient>
  <pattern id="paper" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="4" cy="6" r="1.4" fill="${PALETTE.paperDot}" opacity=".32"/><circle cx="15" cy="17" r="1.1" fill="${PALETTE.paperDot}" opacity=".24"/></pattern>
  ${require('../world/room_home').ROOM_DEFS}
  ${extra}</defs>`;

// ---------- fonts (bundled, OFL) ----------
const FONT_DIR = path.resolve(__dirname, '../fonts');
const FONT_CSS = [700, 800, 900].map(w => `@font-face{font-family:Nunito;font-weight:${w};src:url(${require('url').pathToFileURL(path.join(FONT_DIR, `nunito-latin-${w}-normal.woff2`)).href}) format('woff2')}`).join('');

module.exports = { PALETTE, LINE, clamp, lerp, prog, eio, eout, ein, back, pop, fade, SUB, SUB_CSS, timeline,
  S, wave, drop, place, around, svgPill, cam, setNow, grid, deep, DEFS, FONT_CSS };
