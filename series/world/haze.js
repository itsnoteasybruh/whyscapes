// LOCATION KIT v1.7 (EP06 "Asap") — city/window, forest–peat, combustion particles, air parcels, wind, atmosphere layers, region map.
// Series rules (STANDARDS §3): cream / teal / orange palette, #231E1A rounded outlines, flat fill + one shade, every motion deterministic in t.
// Smoke is ALWAYS many puffs from a deterministic emitter (`puffs`), never one sliding shape.
const { PALETTE: P, LINE, S, lerp, clamp, prog, eio, eout } = require('../engine/core');
const f1 = x => (+x).toFixed(1), f3 = x => (+x).toFixed(3);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise = (t, s = 0) => Math.sin(t * 1.3 + s * 1.7) * .5 + Math.sin(t * 2.9 + s * 3.1) * .3 + Math.sin(t * 5.3 + s * .7) * .2;   // smooth −1..1

const C = {
  sky: '#D6E7E5', skyLow: '#EADFCB', haze: '#C9BBA2', hazeD: '#A89A84', smoke: '#9A9186', smokeD: '#5E5850', soot: '#2B2622',
  flame: '#F2A53A', flameHi: '#FFD27A', flameD: '#E0702F', ember: '#FF6B2C', o2: '#5DB4D6', gas: '#C8BEDA', warm: '#F2A53A', cold: '#7FC1D0',
  leaf: '#3F8F7F', leafD: '#2A6B5E', leafL: '#6FB59A', trunk: '#8A5A2B', peat: '#6B4A33', peatD: '#4A3324', peatL: '#8E6A4C', soil: '#B08A62',
  wall: '#EFE3CE', wallD: '#E2D2B6', roof: '#2A5F5B', roofR: '#B5532A', glass: '#BFE3EC', water: '#8FD3E3', waterD: '#5FA9BD',
  land: '#E6DDC3', landG: '#CFDDB8', sea: '#BFE0E3', seaD: '#9FCFD6', paper: '#F3EAD6',
};

// ---------- shared defs (gradients) ----------
const HZ_DEFS = `
  <linearGradient id="hzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3E3"/><stop offset=".62" stop-color="#E4E2D2"/><stop offset="1" stop-color="#EBDDC4"/></linearGradient>
  <linearGradient id="hzSkyPM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D9B8"/><stop offset=".6" stop-color="#F0D7AA"/><stop offset="1" stop-color="#EDC995"/></linearGradient>
  <linearGradient id="hzHazeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.haze}" stop-opacity="0"/><stop offset=".55" stop-color="${C.haze}" stop-opacity=".55"/><stop offset="1" stop-color="${C.haze}" stop-opacity=".85"/></linearGradient>
  <linearGradient id="hzBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity="1"/><stop offset=".7" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="hzGlow"><stop offset="0" stop-color="#FFB547" stop-opacity=".75"/><stop offset=".5" stop-color="#F2843A" stop-opacity=".25"/><stop offset="1" stop-color="#F2843A" stop-opacity="0"/></radialGradient>
  <radialGradient id="hzEmber"><stop offset="0" stop-color="#FFD27A" stop-opacity=".95"/><stop offset=".45" stop-color="#FF6B2C" stop-opacity=".7"/><stop offset="1" stop-color="#B5532A" stop-opacity="0"/></radialGradient>
  <radialGradient id="hzSun"><stop offset="0" stop-color="#FFF4D6" stop-opacity=".95"/><stop offset=".35" stop-color="#FCE3B0" stop-opacity=".55"/><stop offset="1" stop-color="#FCE3B0" stop-opacity="0"/></radialGradient>
  <radialGradient id="hzPuff" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="hzSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="hzSoft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>`;

// ---------- smoke: deterministic puff emitter ----------
// o: { t0 (emit start), t1 (emit end), rate (puffs/s), life (s), seed, path(age, k, h) → {x, y, r, o} | null, col, line }
// Each puff k is born at b = t0 + k / rate and follows path(age) — positions are pure functions of time, so nothing pops or teleports.
function puffs(t, o) {
  const { t0 = -50, t1 = 1e9, rate = 6, life = 6, seed = 1, col = C.smoke, line = .22, path, max = 400 } = o;
  const kA = Math.max(0, Math.floor((t - life - t0) * rate)), kB = Math.floor((Math.min(t, t1) - t0) * rate);
  let g = ''; let n = 0;
  for (let k = kA; k <= kB && n < max; k++) {
    const b = t0 + k / rate, age = t - b; if (age < 0 || age > life) continue;
    const h = hash(k * 7.13 + seed * 31.7), p = path(age, k, h); if (!p || p.o <= .004 || p.r <= .5) continue; n++;
    const c = p.col || col;
    g += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(p.r)}" fill="${c}" opacity="${f3(p.o)}"/>`;
    if (p.r > 14 && line) g += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(p.r)}" fill="url(#hzPuff)" stroke="${LINE}" stroke-width="${f1(Math.min(4, p.r * .06))}" stroke-opacity="${f3(line * p.o)}" opacity="${f3(Math.min(1, p.o * 1.2))}"/>`;
  }
  return g;
}
// generic deterministic emitter: draw(age, k, h) → svg string (molecules, drops, particles…)
function emit(t, o) {
  const { t0 = -50, t1 = 1e9, rate = 6, life = 6, seed = 1, draw, max = 500 } = o;
  const kA = Math.max(0, Math.floor((t - life - t0) * rate)), kB = Math.floor((Math.min(t, t1) - t0) * rate);
  let g = '', n = 0;
  for (let k = kA; k <= kB && n < max; k++) { const age = t - (t0 + k / rate); if (age < 0 || age > life) continue; const s = draw(age, k, hash(k * 7.13 + seed * 31.7)); if (s) { g += s; n++; } }
  return g;
}
// fade helper for puffs: in over the first 12 % of life, out over the last 35 %
const lifeO = (age, life, peak = 1) => peak * clamp(age / (life * .12)) * clamp((life - age) / (life * .35));

// ---------- fire ----------
function flame(x, y, s, t, k = 1, seed = 0) {        // base centre (x, y), height ≈ 230·s·k
  if (k <= .01) return '';
  const tongue = (dx, h, w, ph, col, sw) => {
    const sway = 10 * noise(t * 2.2, seed + ph) * s, top = y - h * s * k * (1 + .12 * noise(t * 3.1, seed + ph + 5));
    return `<path d="M${f1(x + dx * s - w * s)},${f1(y)} C${f1(x + dx * s - w * s)},${f1(y - h * s * k * .45)} ${f1(x + dx * s + sway - w * .3 * s)},${f1(top + h * s * k * .3)} ${f1(x + dx * s + sway)},${f1(top)} C${f1(x + dx * s + sway + w * .3 * s)},${f1(top + h * s * k * .35)} ${f1(x + dx * s + w * s)},${f1(y - h * s * k * .4)} ${f1(x + dx * s + w * s)},${f1(y)} Z" fill="${col}" ${sw ? S(sw * s) : ''}/>`;
  };
  return `<ellipse cx="${f1(x)}" cy="${f1(y - 60 * s * k)}" rx="${f1(190 * s * k)}" ry="${f1(170 * s * k)}" fill="url(#hzGlow)" opacity="${f3(.8 + .2 * noise(t * 4, seed))}"/>
    ${tongue(-40, 150, 46, 1, C.flameD, 5)}${tongue(42, 170, 44, 2, C.flameD, 5)}${tongue(0, 230, 62, 3, C.flame, 5.5)}${tongue(-14, 140, 34, 4, C.flameHi, 0)}${tongue(16, 110, 26, 5, '#FFF0C4', 0)}`;
}
function emberBed(x, y, w, t, k = 1, seed = 0) {     // glowing coals along a line
  let g = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w * .62)}" ry="${f1(w * .16)}" fill="url(#hzEmber)" opacity="${f3(k * (.75 + .25 * noise(t * 2, seed)))}"/>`;
  for (let i = 0; i < 9; i++) { const u = i / 8 - .5, o = k * (.55 + .45 * noise(t * 3 + i, seed + i)); g += `<circle cx="${f1(x + u * w)}" cy="${f1(y + 6 * Math.sin(i * 2.1))}" r="${f1(6 + 4 * hash(i + seed))}" fill="${C.ember}" opacity="${f3(o)}"/>`; }
  return g;
}

// ---------- particles & molecules ----------
const soot = (x, y, s = 1, rot = 0, o = 1, n = 6) => {      // small aggregate chain of black spheres
  let g = ''; for (let i = 0; i < n; i++) { const a = i * 1.7, r = 7 + 3 * hash(i * 3 + n); g += `<circle cx="${f1(i * 9 - n * 4.5)}" cy="${f1(6 * Math.sin(a))}" r="${f1(r)}" fill="${C.soot}" stroke="${LINE}" stroke-width="1.5"/><circle cx="${f1(i * 9 - n * 4.5 - 2)}" cy="${f1(6 * Math.sin(a) - 2.5)}" r="${f1(r * .3)}" fill="#6A625A"/>`; }
  return `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})">${g}</g>`;
};
const fine = (x, y, r = 4, o = 1, col = '#7D746A') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${col}" opacity="${f3(o)}"/>`;
const o2 = (x, y, s = 1, rot = 0, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><circle cx="-9" cy="0" r="11" fill="${C.o2}" ${S(2.6)}/><circle cx="9" cy="0" r="11" fill="${C.o2}" ${S(2.6)}/><circle cx="-12" cy="-4" r="3" fill="#fff" opacity=".7"/></g>`;
const co2 = (x, y, s = 1, rot = 0, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><circle cx="-20" r="9" fill="#DCE6E4" ${S(2.4)}/><circle cx="20" r="9" fill="#DCE6E4" ${S(2.4)}/><circle r="12" fill="#8B9694" ${S(2.4)}/></g>`;
const h2o = (x, y, s = 1, rot = 0, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})"><circle cx="-14" cy="10" r="7" fill="#F6F3EB" ${S(2.2)}/><circle cx="14" cy="10" r="7" fill="#F6F3EB" ${S(2.2)}/><circle r="12" fill="${C.water}" ${S(2.4)}/></g>`;
// THE marker particle (one orange particle followed through the whole story)
function marker(x, y, s = 1, t = 0, o = {}) {
  const ring = o.ring ?? 1, pulse = o.pulse ?? 0, op = o.o ?? 1;
  return `<g opacity="${f3(op)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">
    ${pulse > 0 ? `<circle r="${f1(16 + 40 * pulse)}" fill="none" stroke="${P.orange}" stroke-width="${f1(5 * (1 - pulse))}" opacity="${f3(1 - pulse)}"/>` : ''}
    ${ring > 0 ? `<circle r="${f1(20 + 1.5 * Math.sin(t * 4))}" fill="none" stroke="${P.orange}" stroke-width="3.5" stroke-dasharray="5 6" opacity="${f3(.85 * ring)}" transform="rotate(${f1(t * 40)})"/>` : ''}
    <circle r="10" fill="${P.orange}" ${S(3)}/><circle cx="-3" cy="-3.5" r="3" fill="#FFE2B0"/></g>`;
}
// air parcel: dashed circle holding n air dots; spread 0 = dense, 1 = expanded (dots far apart); warm tints it orange
function parcel(x, y, r, t, o = {}) {
  const n = o.n ?? 18, sp = o.spread ?? 0, warm = o.warm ?? 0, seed = o.seed ?? 1, op = o.o ?? 1;
  const R = r * (1 + .32 * sp), col = warm > 0 ? `rgb(${Math.round(lerp(127, 242, warm))},${Math.round(lerp(193, 165, warm))},${Math.round(lerp(208, 58, warm))})` : C.cold;
  let g = `<circle r="${f1(R)}" fill="${col}" fill-opacity="${f3(.16 + .08 * warm)}" stroke="${LINE}" stroke-width="3.5" stroke-dasharray="10 9" stroke-opacity=".55"/>`;
  for (let i = 0; i < n; i++) {
    const a = i * 2.399 + seed, rr = Math.sqrt((i + .5) / n) * R * lerp(.62, .9, sp);
    const j = (2 + 4 * warm) * Math.sin(t * (3 + warm * 4) + i);
    g += `<circle cx="${f1(rr * Math.cos(a) + j)}" cy="${f1(rr * Math.sin(a) + j * .6)}" r="${f1(5.5)}" fill="${warm > .3 ? '#C6702B' : '#2E6E78'}" opacity=".8"/>`;
  }
  return `<g opacity="${f3(op)}" transform="translate(${f1(x)},${f1(y)})">${g}</g>`;
}

// ---------- wind: flowing streamline arrows ----------
// pts: [[x,y],…] (smoothed with Catmull-Rom); o: { t, speed (px/s), col, w, o, head }
function smoothPath(pts) {
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d;
}
function flow(pts, t, o = {}) {
  const { speed = 120, col = P.teal, w = 10, op = 1, head = true, draw = 1, dash = [46, 34] } = o;
  if (op <= .003 || draw <= .003) return '';
  const d = smoothPath(pts), n = pts.length, [ax, ay] = pts[n - 2], [bx, by] = pts[n - 1], ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const hd = head && draw > .95 ? `<g transform="translate(${f1(bx)},${f1(by)}) rotate(${f1(ang)})"><path d="M${f1(-w * 2.6)},${f1(-w * 2)} L${f1(w * .8)},0 L${f1(-w * 2.6)},${f1(w * 2)}" fill="none" stroke="${LINE}" stroke-width="${f1(w * 1.25 + 5)}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${f1(-w * 2.6)},${f1(-w * 2)} L${f1(w * .8)},0 L${f1(-w * 2.6)},${f1(w * 2)}" fill="none" stroke="${col}" stroke-width="${f1(w * 1.25)}" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
  return `<g opacity="${f3(op)}"><path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * draw)} 2000" fill="none" stroke="${LINE}" stroke-width="${f1(w + 5)}" stroke-linecap="round" opacity=".9"/>
    <path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * draw)} 2000" fill="none" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-width="${f1(w * .35)}" stroke-linecap="round" stroke-dasharray="${dash[0] * .4} ${dash[0] * .6 + dash[1]}" stroke-dashoffset="${f1(-t * speed)}" opacity="${f3(.75 * draw)}"/>${hd}</g>`;
}
// eddy: small circular arrow (turbulence)
function eddy(x, y, r, t, o = {}) {
  const op = o.o ?? 1, dir = o.dir ?? 1, a0 = t * 90 * dir;
  return `<g opacity="${f3(op)}" transform="translate(${f1(x)},${f1(y)}) rotate(${f1(a0)})"><path d="M${f1(r)},0 A${r},${r} 0 1 1 ${f1(r * Math.cos(-1.1))},${f1(r * Math.sin(-1.1))}" fill="none" stroke="${o.col || P.tealMid}" stroke-width="${o.w || 7}" stroke-linecap="round" stroke-dasharray="14 12"/>
    <path d="M${f1(r * Math.cos(-1.1) - 10)},${f1(r * Math.sin(-1.1) - 14)} L${f1(r * Math.cos(-1.1) + 4)},${f1(r * Math.sin(-1.1) + 2)} L${f1(r * Math.cos(-1.1) - 16)},${f1(r * Math.sin(-1.1) + 8)}" fill="none" stroke="${o.col || P.tealMid}" stroke-width="${o.w || 7}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

// ---------- city / buildings ----------
function building(x, yb, w, h, col, seed, o = {}) {      // flat-front building, deterministic windows
  const lit = o.lit ?? .25, line = o.line ?? 4, roofC = o.roofC;
  let g = `<rect x="${f1(x)}" y="${f1(yb - h)}" width="${f1(w)}" height="${f1(h)}" fill="${col}" ${line ? S(line) : ''}/>`;
  if (roofC) g += `<rect x="${f1(x - 6)}" y="${f1(yb - h - 12)}" width="${f1(w + 12)}" height="14" rx="4" fill="${roofC}" ${line ? S(line) : ''}/>`;
  const cols = Math.max(1, Math.floor(w / (o.ww || 34))), rows = Math.max(1, Math.floor((h - 30) / (o.wh || 42)));
  const cw = w / cols;
  if (o.windows !== false) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const hv = hash(seed * 13 + r * 7 + c * 3), wx = x + c * cw + cw * .25, wy = yb - h + 24 + r * (o.wh || 42);
    g += `<rect x="${f1(wx)}" y="${f1(wy)}" width="${f1(cw * .5)}" height="${f1((o.wh || 42) * .52)}" rx="3" fill="${hv < lit ? '#F7E3A6' : (o.winC || '#9FC6CE')}" opacity="${hv < lit ? .95 : .8}"/>`;
  }
  return g;
}
function skyline(x0, x1, yb, seed, o = {}) {            // a row of buildings (silhouette when o.flat)
  let g = '', x = x0, i = 0;
  while (x < x1) {
    const w = (o.wMin || 70) + hash(seed + i * 5.1) * (o.wVar || 90), h = (o.hMin || 120) + hash(seed + i * 2.3) * (o.hVar || 260);
    g += o.flat ? `<rect x="${f1(x)}" y="${f1(yb - h)}" width="${f1(w + 1)}" height="${f1(h + 2)}" fill="${o.col}"/>` + (hash(seed + i) > .7 ? `<rect x="${f1(x + w * .4)}" y="${f1(yb - h - 30)}" width="6" height="32" fill="${o.col}"/>` : '')
      : building(x, yb, w, h, (o.cols || ['#E7DCC6', '#D9E3DE', '#EADBC3', '#CFDCD6'])[i % 4], seed + i, { line: o.line ?? 3, lit: 0, winC: o.winC, ww: o.ww, wh: o.wh });
    x += w + (o.gap ?? 6); i++;
  }
  return g;
}
const hill = (x0, x1, y, amp, col, seed = 1) => { let d = `M${x0},${y + 400}`; for (let x = x0; x <= x1; x += 40) d += ` L${x},${f1(y - amp * (.55 + .45 * Math.sin(x * .004 + seed) * Math.cos(x * .0021 + seed * 2)))}`; return `<path d="${d} L${x1},${y + 400} Z" fill="${col}"/>`; };
function sun(x, y, r, haze = 0) {
  return `<circle cx="${x}" cy="${y}" r="${f1(r * 3.2)}" fill="url(#hzSun)" opacity="${f3(1 - .5 * haze)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${haze > .3 ? '#F6C98A' : '#FFF1C9'}" opacity="${f3(lerp(.95, .7, haze))}"/>`;
}
function roofHouse(x, yb, w, h, wallC, roofC, seed) {    // small house with a pitched roof
  return `<rect x="${f1(x)}" y="${f1(yb - h)}" width="${f1(w)}" height="${f1(h)}" fill="${wallC}" ${S(4)}/>
    <path d="M${f1(x - 14)},${f1(yb - h + 4)} L${f1(x + w / 2)},${f1(yb - h - w * .34)} L${f1(x + w + 14)},${f1(yb - h + 4)} Z" fill="${roofC}" ${S(4)}/>
    <rect x="${f1(x + w * .2)}" y="${f1(yb - h * .62)}" width="${f1(w * .22)}" height="${f1(h * .3)}" rx="3" fill="#9FC6CE" ${S(3)}/>
    <rect x="${f1(x + w * .58)}" y="${f1(yb - h * .55)}" width="${f1(w * .2)}" height="${f1(h * .55)}" rx="3" fill="${hash(seed) > .5 ? P.tealMid : P.wood}" ${S(3)}/>`;
}

// ---------- trees / forest ----------
function tree(x, y, s, t, o = {}) {                     // rounded tropical canopy tree, base at (x, y)
  const sw = (o.sway ?? 1) * 4 * noise(t * .9, o.seed || 0) * s, c1 = o.col || C.leaf, c2 = o.colD || C.leafD, ln = o.line ?? 4;
  return `<path d="M${f1(x - 9 * s)},${f1(y)} L${f1(x - 6 * s)},${f1(y - 120 * s)} L${f1(x + 6 * s)},${f1(y - 120 * s)} L${f1(x + 9 * s)},${f1(y)} Z" fill="${o.trunk || C.trunk}" ${ln ? S(ln) : ''}/>
    <g transform="translate(${f1(sw)},0)"><circle cx="${f1(x - 42 * s)}" cy="${f1(y - 140 * s)}" r="${f1(52 * s)}" fill="${c2}" ${ln ? S(ln) : ''}/><circle cx="${f1(x + 44 * s)}" cy="${f1(y - 150 * s)}" r="${f1(50 * s)}" fill="${c2}" ${ln ? S(ln) : ''}/>
    <circle cx="${f1(x)}" cy="${f1(y - 186 * s)}" r="${f1(66 * s)}" fill="${c1}" ${ln ? S(ln) : ''}/><circle cx="${f1(x - 18 * s)}" cy="${f1(y - 206 * s)}" r="${f1(20 * s)}" fill="#fff" opacity=".14"/></g>`;
}
function forestRow(x0, x1, y, s, t, seed, o = {}) {
  let g = ''; for (let i = 0, x = x0; x < x1; i++) { const ss = s * (.8 + .4 * hash(seed + i)); g += tree(x, y + 10 * hash(seed + i * 3), ss, t, { ...o, seed: seed + i }); x += 120 * s * (.7 + .5 * hash(seed + i * 7)); }
  return g;
}
function shrub(x, y, s, col = C.leafL) {
  return `<path d="M${f1(x - 60 * s)},${f1(y)} C${f1(x - 64 * s)},${f1(y - 40 * s)} ${f1(x - 30 * s)},${f1(y - 60 * s)} ${f1(x - 10 * s)},${f1(y - 44 * s)} C${f1(x)},${f1(y - 74 * s)} ${f1(x + 46 * s)},${f1(y - 66 * s)} ${f1(x + 40 * s)},${f1(y - 34 * s)} C${f1(x + 66 * s)},${f1(y - 34 * s)} ${f1(x + 70 * s)},${f1(y)} ${f1(x + 60 * s)},${f1(y)} Z" fill="${col}" ${S(4)}/>`;
}
const leafShape = (x, y, s, rot, col = C.leafL) => `<path transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f3(s)})" d="M-30,0 C-14,-16 14,-16 30,0 C14,16 -14,16 -30,0 Z M-24,0 L26,0" fill="${col}" ${S(3)}/>`;

// ---------- region map (equirectangular, lon/lat) ----------
// Simplified coastlines (few points, plausible proportions) for the documented Sumatra → Strait of Malacca → Malaysia / Singapore haze.
const COAST = {
  sumatra: [[95.3, 5.6], [96.5, 5.3], [97.6, 4.9], [98.7, 3.8], [99.8, 2.9], [100.6, 2.2], [101.4, 1.75], [102.2, 1.45], [103.0, .85], [103.6, .1], [103.9, -.9], [104.6, -1.6], [105.2, -2.4], [105.9, -3.6], [105.8, -5.8], [105.2, -5.8], [104.4, -5.6], [103.4, -4.6], [102.3, -3.8], [101.2, -2.6], [100.35, -.95], [99.6, .2], [98.8, 1.7], [97.6, 2.9], [96.1, 4.1], [95.3, 5.2]],
  peninsula: [[99.6, 8.4], [100.3, 6.6], [100.3, 5.4], [100.6, 4.2], [101.0, 3.4], [101.4, 2.9], [101.85, 2.45], [102.25, 2.2], [102.9, 1.85], [103.4, 1.32], [103.7, 1.45], [104.3, 1.4], [103.9, 2.2], [103.5, 3.0], [103.4, 3.9], [103.2, 4.9], [102.7, 5.9], [102.2, 6.2], [101.4, 6.9], [100.9, 8.4]],
  singapore: [[103.62, 1.29], [103.72, 1.22], [103.86, 1.25], [104.0, 1.33], [103.94, 1.41], [103.75, 1.44], [103.65, 1.38]],
  bangka: [[105.1, -1.6], [105.8, -1.6], [106.5, -2.5], [106.3, -3.0], [105.6, -2.4]],
  riau: [[103.9, 1.1], [104.2, 1.0], [104.6, 1.15], [104.3, .8], [104.0, .7]],
  borneo: [[108.8, 2.1], [109.6, 1.6], [109.0, .4], [109.3, -.5], [110.1, -1.6], [111.0, -3.0], [113.0, -3.2], [113.5, 2.2], [111.2, 2.6], [110.3, 1.8]],
  java: [[105.2, -6.8], [106.0, -6.0], [107.0, -6.0], [108.3, -6.3], [109.5, -6.8], [111.0, -6.6], [112.6, -6.9], [112.8, -7.6], [111.0, -8.2], [108.5, -7.8], [106.5, -7.4]],
  thai: [[98.3, 8.4], [98.6, 7.8], [99.4, 7.0], [99.7, 6.5], [100.3, 6.6], [99.6, 8.4]],
};
const MAPBOX = { lon0: 94.2, lon1: 106.6, lat0: -6.4, lat1: 7.4 };
function mapProj(box) {   // box = {x, y, w, h} on screen
  const { lon0, lon1, lat0, lat1 } = MAPBOX;
  return ([lon, lat]) => [box.x + (lon - lon0) / (lon1 - lon0) * box.w, box.y + (lat1 - lat) / (lat1 - lat0) * box.h];
}
function coastPath(pts, pr) { return smoothPath(pts.concat([pts[0]]).map(pr)) + ' Z'; }

// ---------- small UI-ish props (series pill/label style lives in core.svgPill) ----------
const check = (x, y, s = 1, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><circle r="26" fill="${P.tealGlow}" ${S(5)}/><path d="M-12,1 L-3,10 L13,-9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const pin = (x, y, s = 1, col = P.orange, o = 1) => `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M0,0 C-8,-14 -26,-30 -26,-50 C-26,-66 -14,-78 0,-78 C14,-78 26,-66 26,-50 C26,-30 8,-14 0,0 Z" fill="${col}" ${S(5)}/><circle cx="0" cy="-50" r="10" fill="#fff" ${S(3)}/></g>`;
function thought(x, y, w, h, t, o = {}) {                // dashed thought cloud (imagination), with trailing bubbles toward (tx, ty)
  const op = o.o ?? 1; let d = '', n = 10;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = 1 + .08 * Math.sin(i * 3 + t * 1.5); d += (i ? ' ' : 'M') + `${f1(x + Math.cos(a) * w / 2 * r)},${f1(y + Math.sin(a) * h / 2 * r)}`; if (i < n) { const a2 = (i + .5) / n * Math.PI * 2; d += ` Q${f1(x + Math.cos(a2) * w / 2 * 1.22)},${f1(y + Math.sin(a2) * h / 2 * 1.22)}`; } }
  let tail = ''; if (o.tail) { const [tx, ty] = o.tail; [.25, .5, .72].forEach((u, i) => { tail += `<circle cx="${f1(lerp(x, tx, u + .2))}" cy="${f1(lerp(y + h * .45, ty, u + .2))}" r="${f1(16 - i * 4)}" fill="#F6F3EB" ${S(4)} stroke-dasharray="6 6"/>`; }); }
  return `<g opacity="${f3(op)}">${tail}<path d="${d} Z" fill="#F6F3EB" fill-opacity=".9" ${S(5)} stroke-dasharray="14 10"/></g>`;
}

module.exports = { C, HZ_DEFS, f1, f3, hash, noise, puffs, emit, lifeO, flame, emberBed, soot, fine, o2, co2, h2o, marker, parcel, smoothPath, flow, eddy,
  building, skyline, hill, sun, roofHouse, tree, forestRow, shrub, leafShape, COAST, MAPBOX, mapProj, coastPath, check, pin, thought };
