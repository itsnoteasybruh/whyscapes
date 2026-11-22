// LOCATION KIT v1.12 (EP11 "Gedung Tinggi vs Angin") — tall building, wind and hidden structure.
// World grammar (same as underground.js): ground y = 0, building rises to y = -h, soil goes down (+y).
// Everything is a pure function of t (deterministic, no state). Generic only: no real building is drawn here
// except as a clearly labelled, simplified example chosen by the episode (steppedTower is a generic setback form).
// Sizes are illustrative: sway amplitudes are EXAGGERATED by the caller for teaching and must be labelled so on screen.
const { PALETTE: P, LINE, S, lerp, clamp, prog, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash, noise, smoothPath } = H;

const T = {
  glass: '#CFE0DE', glassD: '#A9C9C6', glassHi: '#E6F0EE', frame: '#2A5F5B', frameD: '#1F4D4A',
  concrete: '#C9C6BD', concreteD: '#A8A59C', concreteL: '#E3E0D6', steel: '#8E9A9C', steelD: '#5E6A6C', steelL: '#C3CDCF',
  slab: '#E9E3D6', wind: '#7FC1D0', windD: '#4E9AAE', windL: '#E8F6F8', load: P.orange, loadHi: '#FFD27A',
  soil: '#C9A57A', soilD: '#B0855C', raft: '#BDB8AC', tmd: '#E7C46A', tmdD: '#C99A3A', sky: '#D6E7E5', tunnel: '#E3E0D6',
};

// ---------- sway: lateral displacement of the structure at height z (0..h), first-mode-like curve ----------
const swayAt = (z, h, sway) => sway * Math.pow(clamp(z / h), 1.7);

// ---------- tower (side / front view) ----------
// o: { x, w, h, t, sway(px at top), floors, col, lit, setbacks:[[zFrac, wFrac], …] (wFrac of w above zFrac),
//      cut 0..1 (facade opens to the structure), outriggers:[zFrac…], hi:{core, cols, out} 0..1, ghost 0..1, crown, spire }
function towerShape(o) {
  const { w, h } = o, tiers = [[0, 1], ...(o.setbacks || [])];
  return tiers.map(([z, k], i) => ({ z0: z * h, z1: (tiers[i + 1] ? tiers[i + 1][0] : 1) * h, w: w * k }));
}
function outline(o, sway, dx = 0) {     // closed polygon following the sway curve
  const { x, h } = o, tiers = towerShape(o), L = [], R = [];
  tiers.forEach(tr => {
    for (let k = 0; k <= 6; k++) { const z = lerp(tr.z0, tr.z1, k / 6), u = swayAt(z, h, sway) + dx; L.push([x - tr.w / 2 + u, -z]); R.push([x + tr.w / 2 + u, -z]); }
  });
  return 'M' + L.map(p => p.map(f1).join(',')).join(' L') + ' L' + R.reverse().map(p => p.map(f1).join(',')).join(' L') + ' Z';
}
function tower(t, o) {
  const { x, w, h, sway = 0, cut = 0, ghost = 0 } = o, fh = o.fh || 26, col = o.col || T.glass, hi = o.hi || {};
  const tiers = towerShape(o), seed = o.seed || 7;
  let g = '';
  // undisplaced reference (dashed) — the "posisi awal" guide
  if (ghost > 0) g += `<path d="${outline(o, 0)}" fill="none" stroke="${LINE}" stroke-width="5" stroke-dasharray="14 12" opacity="${f3(.55 * ghost)}"/>`;
  g += `<path d="${outline(o, sway)}" fill="${col}" ${S(6)}/>`;
  // facade: floor bands + windows (rows follow the sway so the glass never slides off the frame)
  const facade = 1 - eio(cut);
  if (facade > .01) {
    let rows = '';
    tiers.forEach((tr, ti) => {
      const n = Math.floor((tr.z1 - tr.z0) / fh), cols = Math.max(2, Math.round(tr.w / (o.ww || 30)));
      for (let r = 0; r < n; r++) {
        const z = tr.z0 + (r + .5) * fh; if (z > tr.z1 - fh * .5) continue;
        const u = swayAt(z, h, sway), x0 = x - tr.w / 2 + u, cw = tr.w / cols;
        for (let c = 0; c < cols; c++) {
          const hv = hash(seed * 31 + ti * 97 + r * 7.3 + c * 3.1), lit = hv < (o.lit ?? .12);
          rows += `<rect x="${f1(x0 + c * cw + cw * .14)}" y="${f1(-z - fh * .32)}" width="${f1(cw * .72)}" height="${f1(fh * .6)}" rx="2" fill="${lit ? '#F7E3A6' : (hv > .8 ? T.glassHi : T.glassD)}" opacity="${lit ? .95 : .85}"/>`;
        }
      }
    });
    g += `<g opacity="${f3(facade)}">${rows}</g>`;
    // vertical mullion highlight
    g += `<path d="M${f1(x - w * .3)},0 L${f1(x - w * .3 + swayAt(h * .9, h, sway))},${f1(-h * .9)}" stroke="#fff" stroke-width="${f1(w * .05)}" opacity="${f3(.25 * facade)}" stroke-linecap="round"/>`;
  }
  // structure (revealed by cut)
  if (cut > .01) g += structure(t, o, eio(cut), hi);
  // crown / spire
  const top = tiers.at(-1), ut = swayAt(h, h, sway);
  if (o.spire) g += `<path d="M${f1(x + ut - top.w * .08)},${f1(-h)} L${f1(x + ut + swayAt(h * 1.0, h, sway) * .02)},${f1(-h - o.spire)} L${f1(x + ut + top.w * .08)},${f1(-h)} Z" fill="${T.steelL}" ${S(4)}/>`;
  if (o.crown) g += `<rect x="${f1(x + ut - top.w * .36)}" y="${f1(-h - 20)}" width="${f1(top.w * .72)}" height="22" rx="5" fill="${T.frame}" ${S(4)}/>`;
  return g;
}
// inner structure: slabs, central core (lift/stairs), perimeter columns, optional outriggers + belt trusses
function structure(t, o, k, hi = {}) {
  const { x, w, h, sway = 0 } = o, fh = o.fh || 26, tiers = towerShape(o);
  const coreW = (o.coreW || .3) * w;
  let g = `<g opacity="${f3(k)}">`;
  // floor slabs (every 2 floors to keep it readable)
  let slabs = '';
  for (let z = fh * 2; z < h - 4; z += fh * 2) {
    const tr = tiers.find(q => z >= q.z0 && z < q.z1) || tiers.at(-1), u = swayAt(z, h, sway);
    slabs += `<path d="M${f1(x - tr.w / 2 + u + 6)},${f1(-z)} L${f1(x + tr.w / 2 + u - 6)},${f1(-z)}" stroke="${T.concreteD}" stroke-width="5" stroke-linecap="round"/>`;
  }
  g += `<path d="${outline(o, sway)}" fill="${T.slab}"/>${slabs}`;
  // core: a tall box following the sway (drawn as a strip polygon)
  const coreTop = o.coreTop ?? h * .98;
  const strip = (half, z0, z1) => { const L = [], R = []; for (let j = 0; j <= 10; j++) { const z = lerp(z0, z1, j / 10), u = swayAt(z, h, sway); L.push([x - half + u, -z]); R.push([x + half + u, -z]); } return 'M' + L.map(p => p.map(f1).join(',')).join(' L') + ' L' + R.reverse().map(p => p.map(f1).join(',')).join(' L') + ' Z'; };
  const cH = hi.core || 0;
  g += `<path d="${strip(coreW / 2, 0, coreTop)}" fill="${T.concrete}" ${S(5)}/>`;
  // core texture: lift shafts (two lanes) + stair zigzag hint
  for (let z = 30; z < coreTop - 30; z += 60) { const u = swayAt(z, h, sway); g += `<path d="M${f1(x - coreW * .32 + u)},${f1(-z)} l${f1(coreW * .2)},-24" stroke="${T.concreteD}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`; }
  if (cH > 0) g += `<path d="${strip(coreW / 2 + 8, 0, coreTop)}" fill="none" stroke="${P.orange}" stroke-width="9" opacity="${f3(cH)}"/><path d="${strip(coreW / 2, 0, coreTop)}" fill="#FFF4D6" opacity="${f3(.35 * cH)}"/>`;
  // perimeter columns (each tier's edges)
  const cK = hi.cols || 0;
  tiers.forEach(tr => [-1, 1].forEach(sd => {
    const pts = []; for (let j = 0; j <= 6; j++) { const z = lerp(tr.z0, tr.z1, j / 6); pts.push([x + sd * (tr.w / 2 - 14) + swayAt(z, h, sway), -z]); }
    g += `<path d="${smoothPath(pts)}" fill="none" stroke="${T.steelD}" stroke-width="16" stroke-linecap="round"/><path d="${smoothPath(pts)}" fill="none" stroke="${T.steel}" stroke-width="9" stroke-linecap="round"/>`;
    if (cK > 0) g += `<path d="${smoothPath(pts)}" fill="none" stroke="${P.orange}" stroke-width="8" stroke-linecap="round" opacity="${f3(cK)}"/>`;
  }));
  // outriggers (core ↔ columns) + belt truss, at chosen levels
  const oK = hi.out || 0, outK = o.outK ?? 1;            // outK: draw-in of the outriggers (0..1), for a reveal on the word
  if (outK > .01) (o.outriggers || []).forEach((zf, oi) => {
    const kk = clamp(outK * (o.outriggers.length) - oi); if (kk <= .01) return;
    const z = zf * h, tr = tiers.find(q => z >= q.z0 && z < q.z1) || tiers[0], u = swayAt(z, h, sway), d = fh * 1.6;
    [-1, 1].forEach(sd => {
      const xc = x + sd * coreW / 2 + u, xe = x + sd * (tr.w / 2 - 14) + u;
      g += `<g opacity="${f3(kk)}"><path d="M${f1(xc)},${f1(-z + d / 2)} L${f1(xe)},${f1(-z + d / 2)} M${f1(xc)},${f1(-z - d / 2)} L${f1(xe)},${f1(-z - d / 2)} M${f1(xc)},${f1(-z + d / 2)} L${f1((xc + xe) / 2)},${f1(-z - d / 2)} L${f1(xe)},${f1(-z + d / 2)}" fill="none" stroke="${T.frameD}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      if (oK > 0) g += `<path d="M${f1(xc)},${f1(-z)} L${f1(xe)},${f1(-z)}" stroke="${P.orange}" stroke-width="${f1(d + 14)}" opacity="${f3(.3 * oK)}" stroke-linecap="round"/>`;
    });
  });
  return g + '</g>';
}

// ---------- foundation: raft + piles into the soil (y > 0) ----------
function foundation(x, w, t, o = {}) {
  const depth = o.depth || 520, k = o.k ?? 1, hi = o.hi || 0, n = o.piles || 6;
  let g = `<rect x="${f1(x - w * .62)}" y="0" width="${f1(w * 1.24)}" height="54" rx="6" fill="${T.raft}" ${S(5)}/>`;
  for (let i = 0; i < n; i++) {
    const px = x - w * .5 + w * i / (n - 1), d = depth * k;
    g += `<rect x="${f1(px - 13)}" y="52" width="26" height="${f1(d)}" rx="10" fill="${T.concrete}" ${S(4)}/>`;
  }
  if (hi > 0) g += `<rect x="${f1(x - w * .62 - 8)}" y="-8" width="${f1(w * 1.24 + 16)}" height="${f1(depth * k + 70)}" rx="14" fill="none" stroke="${P.orange}" stroke-width="8" stroke-dasharray="20 12" opacity="${f3(hi)}"/>`;
  return g;
}

// ---------- load path: glowing "beban" dots travelling from the facade into the ground ----------
// pts: polyline (world). k: how far the path is revealed (0..1, tied to VO). Dots stream along the revealed part.
function loadFlow(pts, t, o = {}) {
  const k = clamp(o.k ?? 1), op = o.o ?? 1; if (k <= .005 || op <= .005) return '';
  const d = smoothPath(pts);
  // cumulative length (polyline approximation, good enough for dot spacing)
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const Ltot = seg.at(-1), at = s => { let i = 1; while (i < seg.length - 1 && seg[i] < s) i++; const q = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; };
  let g = `<g opacity="${f3(op)}"><path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * k)} 2000" fill="none" stroke="${T.load}" stroke-width="${o.w || 16}" stroke-linecap="round" opacity=".35"/>`;
  const sp = o.spacing || 70, v = o.speed || 220, n = Math.ceil(Ltot / sp) + 1;
  for (let i = 0; i < n; i++) {
    const s = ((i * sp + t * v) % (n * sp)); if (s > Ltot * k) continue;
    const [px, py] = at(s), fadeEnd = clamp((Ltot * k - s) / 60);
    g += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1((o.r || 11) * (.6 + .4 * fadeEnd))}" fill="${T.loadHi}" stroke="${LINE}" stroke-width="3" opacity="${f3(.95 * fadeEnd)}"/>`;
  }
  return g + '</g>';
}

// ---------- wind (side view) ----------
// streamlines arriving from the left at heights zs (world y < 0), bending around a block [bx0..bx1] × [-bh..0].
// profile(z): relative strength 0..1 (the caller decides; "cenderung" stronger higher, never a rule).
// gust: 0..1 how much the strength wobbles over time. k: reveal (draw-on) 0..1.
function windLines(t, o) {
  const { x0 = -200, x1 = 1400, bx0, bx1, bh, k = 1 } = o, zs = o.zs || [], prof = o.profile || (() => 1), gust = o.gust ?? .35, op = o.o ?? 1;
  if (k <= .005 || op <= .005) return '';
  let g = `<g opacity="${f3(op)}">`;
  zs.forEach((y, i) => {
    const z = -y, s = prof(z) * (1 + gust * noise(t * .9, i * 2.7) * .6), w = 6 + 7 * s;
    const pts = [];
    for (let j = 0; j <= 16; j++) {
      const x = lerp(x0, x1, j / 16); let yy = y;
      if (bx0 !== undefined) {
        const above = z > bh * .72;                     // high lines go over the top, low lines dive down the face (stagnation ~ 0.7 h)
        const dist = x < bx0 ? (bx0 - x) : x > bx1 ? (x - bx1) : 0, near = Math.exp(-dist / 160);
        if (z < bh + 140) yy = above ? Math.min(y, -bh - 30 - 40 * near) * near + y * (1 - near) : y + (x < bx1 ? 1 : -.4) * 40 * near;
        if (!above && x >= bx0 - 30 && x <= bx1 + 30 && z < bh) yy = y + 60 * near * (x < bx0 ? 1 : .2);
      }
      pts.push([x, yy + 6 * Math.sin(t * 2.1 + j * .8 + i)]);
    }
    const d = smoothPath(pts), dash = 70 + 40 * s;
    g += `<path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * k)} 2000" fill="none" stroke="${T.windD}" stroke-width="${f1(w + 5)}" stroke-linecap="round" opacity=".55"/>`
      + `<path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * k)} 2000" fill="none" stroke="${T.wind}" stroke-width="${f1(w)}" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="${T.windL}" stroke-width="${f1(w * .45)}" stroke-linecap="round" stroke-dasharray="${f1(dash * .45)} ${f1(dash)}" stroke-dashoffset="${f1(-t * (160 + 260 * s) - i * 37)}" opacity="${f3(.9 * k)}"/>`;
  });
  return g + '</g>';
}
// push arrows on a face (x = face, from z0 to z1 world-up), length ∝ profile, wobbling with gusts
function pushArrows(x, z0, z1, t, o = {}) {
  const n = o.n || 5, prof = o.profile || (() => 1), k = o.k ?? 1, sway = o.sway || 0, h = o.h || z1; if (k <= .005) return '';
  let g = `<g opacity="${f3(k)}">`;
  for (let i = 0; i < n; i++) {
    const z = lerp(z0, z1, (i + .5) / n), s = prof(z) * (1 + .25 * noise(t * 1.1, i * 3.3)), L = (o.len || 90) * s, xx = x + swayAt(z, h, sway) - 12;
    g += `<g transform="translate(${f1(xx)},${f1(-z)})"><path d="M${f1(-L - 30)},0 L-26,0" stroke="${LINE}" stroke-width="17" stroke-linecap="round"/><path d="M${f1(-L - 30)},0 L-26,0" stroke="${P.orange}" stroke-width="10" stroke-linecap="round"/>`
      + `<path d="M-46,-18 L-10,0 L-46,18 Z" fill="${P.orange}" ${S(5)}/></g>`;
  }
  return g + '</g>';
}

// ---------- plan view: wind passing a building section, vortices shed alternately behind it ----------
// o: { cx, cy, r, shape 'box' | 'round' | 'y', rot, k (reveal), lock 0..1 (1 = vortices all in step = organised; 0 = scattered) , phase }
function planSection(cx, cy, r, shape, rot = 0, col = T.glass) {
  if (shape === 'y') {             // three-wing plan (generic "Y")
    let d = ''; for (let i = 0; i < 3; i++) { const a = (rot + i * 120 - 90) * Math.PI / 180, b = a + Math.PI / 2; d += `<path transform="translate(${f1(cx)},${f1(cy)})" d="M${f1(Math.cos(b) * r * .28)},${f1(Math.sin(b) * r * .28)} L${f1(Math.cos(a) * r + Math.cos(b) * r * .22)},${f1(Math.sin(a) * r + Math.sin(b) * r * .22)} A${f1(r * .22)},${f1(r * .22)} 0 0 0 ${f1(Math.cos(a) * r - Math.cos(b) * r * .22)},${f1(Math.sin(a) * r - Math.sin(b) * r * .22)} L${f1(-Math.cos(b) * r * .28)},${f1(-Math.sin(b) * r * .28)} Z" fill="${col}" ${S(6)}/>`; }
    return d + `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * .3)}" fill="${col}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * .16)}" fill="${T.concrete}" ${S(4)}/>`;
  }
  if (shape === 'round') return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${col}" ${S(6)}/>`;
  return `<rect x="${f1(cx - r)}" y="${f1(cy - r)}" width="${f1(2 * r)}" height="${f1(2 * r)}" rx="10" fill="${col}" ${S(6)}/>`;
}
function vortexStreet(t, o) {
  const { cx, cy, r, k = 1, lock = 1, period = 1.6, len = 620 } = o; if (k <= .005) return '';
  let g = `<g opacity="${f3(k)}">`;
  // incoming flow lines (top view)
  for (let i = -2; i <= 2; i++) {
    const y = cy + i * r * .55, pts = [];
    for (let j = 0; j <= 12; j++) { const x = cx - 520 + j * 80, dx = x - cx, near = Math.exp(-(dx * dx) / (r * r * 3)); pts.push([x, y + Math.sign(i || .01) * near * r * .9 * (1 - Math.abs(i) * .2)]); }
    g += `<path d="${smoothPath(pts)}" fill="none" stroke="${T.wind}" stroke-width="8" stroke-linecap="round" stroke-dasharray="40 26" stroke-dashoffset="${f1(-t * 160 - i * 13)}" opacity=".85"/>`;
  }
  // shed eddies: born alternately at the two edges every period/2, drifting downstream; lock < 1 scatters size/phase
  const born = Math.floor(t / (period / 2));
  for (let b = born - 6; b <= born; b++) {
    const age = t - b * period / 2; if (age < 0) continue;
    const side = b % 2 ? 1 : -1, jitter = (1 - lock) * (hash(b * 7.7) - .5);
    const x = cx + r * 1.1 + age * len / 3.2, y = cy + side * r * (.6 + .5 * jitter) + Math.sin(age * 2) * 10 * (1 - lock);
    const rr = r * (.42 + .25 * clamp(age / 1.2)) * (1 + .6 * jitter), op = clamp(1 - age / 3.2) * clamp(age * 3);
    if (op <= .02) continue;
    g += H.eddy(x, y, rr, t + b, { o: op, dir: side, col: lock > .5 ? T.windD : T.wind, w: 7 });
  }
  return g + '</g>';
}

// ---------- tuned mass damper (pendulum type) ----------
// (x, y) = suspension point (top), L = cable length, ang = swing angle (deg), s = scale; o.dampers draws the pistons
function tmd(x, y, L, ang, s = 1, o = {}) {
  const a = ang * Math.PI / 180, bx = x + Math.sin(a) * L, by = y + Math.cos(a) * L, R = (o.R || 70) * s;
  let g = '';
  for (const dx of [-R * .5, 0, R * .5]) g += `<path d="M${f1(x + dx)},${f1(y)} L${f1(bx + dx * .6)},${f1(by - R * .7)}" stroke="${T.steelD}" stroke-width="${f1(6 * s)}" stroke-linecap="round"/>`;
  g += `<rect x="${f1(x - R * 1.2)}" y="${f1(y - 20 * s)}" width="${f1(R * 2.4)}" height="${f1(22 * s)}" rx="6" fill="${T.frameD}" ${S(4)}/>`;
  if (o.dampers !== false) for (const sd of [-1, 1]) {
    const ax = bx + sd * R * .95, ay = by + R * .35, fx = x + sd * R * 2.3, fy = by + R * 1.0;
    g += `<path d="M${f1(ax)},${f1(ay)} L${f1(fx)},${f1(fy)}" stroke="${LINE}" stroke-width="${f1(20 * s)}" stroke-linecap="round"/><path d="M${f1(ax)},${f1(ay)} L${f1(fx)},${f1(fy)}" stroke="${T.steel}" stroke-width="${f1(13 * s)}" stroke-linecap="round"/>`
      + `<path d="M${f1(lerp(ax, fx, .55))},${f1(lerp(ay, fy, .55))} L${f1(fx)},${f1(fy)}" stroke="${T.frame}" stroke-width="${f1(15 * s)}" stroke-linecap="round"/>`;
  }
  g += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(R)}" fill="${T.tmd}" ${S(6)}/><path d="M${f1(bx - R * .55)},${f1(by - R * .2)} A${f1(R * .7)},${f1(R * .7)} 0 0 1 ${f1(bx + R * .1)},${f1(by - R * .68)}" fill="none" stroke="#fff" stroke-width="${f1(9 * s)}" stroke-linecap="round" opacity=".6"/>`
    + `<path d="M${f1(bx - R)},${f1(by)} Q${f1(bx)},${f1(by + R * .38)} ${f1(bx + R)},${f1(by)}" fill="none" stroke="${T.tmdD}" stroke-width="${f1(6 * s)}" opacity=".7"/>`;
  return g;
}
// coupled 2-mass motion for the damper inset: building x_b(t) and damper x_d(t), integrated deterministically from a gust.
// Returns a function τ → { b, d } (relative units). Damper lags the building (≈ 90° phase near tuning) — never a perfect mirror.
function tmdSim({ dur = 12, dt = 1 / 240, mu = .05, zetaD = .12, zetaB = .01, f = .6, gust = (τ) => 0, withDamper = true } = {}) {
  const w = 2 * Math.PI * f, wd = w / (1 + mu), N = Math.ceil(dur / dt) + 1, B = new Float64Array(N), D = new Float64Array(N);
  let xb = 0, vb = 0, xd = 0, vd = 0;
  for (let i = 0; i < N; i++) {
    const τ = i * dt, F = gust(τ);
    const fd = withDamper ? mu * (wd * wd * (xd - xb) + 2 * zetaD * wd * (vd - vb)) : 0;
    const ab = -w * w * xb - 2 * zetaB * w * vb + F + fd;
    const ad = withDamper ? -(wd * wd * (xd - xb) + 2 * zetaD * wd * (vd - vb)) : 0;
    vb += ab * dt; xb += vb * dt; vd += ad * dt; xd += vd * dt; B[i] = xb; D[i] = xd;
  }
  return τ => { const q = clamp(τ / dt, 0, N - 1.001), i = Math.floor(q), r = q - i; return { b: lerp(B[i], B[i + 1], r), d: lerp(D[i], D[i + 1], r) }; };
}

// ---------- wind tunnel (side view, cut open) ----------
// o: { x, y (floor), w, hgt, fan 0..1 speed, model(fn → svg at turntable), turn (deg, shown as turntable mark), flowK, sensors 0..1, data 0..1 }
function windTunnel(t, o) {
  const { x, y, w = 900, hgt = 520 } = o, fan = o.fan ?? 1, fx = x + 70, fy = y - hgt / 2;
  let g = `<rect x="${f1(x)}" y="${f1(y - hgt)}" width="${f1(w)}" height="${f1(hgt)}" rx="18" fill="${T.tunnel}" ${S(6)}/>`
    + `<rect x="${f1(x + 14)}" y="${f1(y - hgt + 14)}" width="${f1(w - 28)}" height="${f1(hgt - 28)}" rx="12" fill="#F2EEE4"/>`;
  // fan (rotating blades) + honeycomb screen
  const ang = (o.fanAngle ?? t * 540 * fan);
  g += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="${f1(hgt * .36)}" fill="${T.steelL}" ${S(5)}/>`;
  for (let i = 0; i < 5; i++) g += `<path transform="translate(${f1(fx)},${f1(fy)}) rotate(${f1(ang + i * 72)})" d="M0,0 C${f1(hgt * .1)},-${f1(hgt * .06)} ${f1(hgt * .26)},-${f1(hgt * .08)} ${f1(hgt * .32)},0 C${f1(hgt * .24)},${f1(hgt * .05)} ${f1(hgt * .1)},${f1(hgt * .04)} 0,0 Z" fill="${T.steel}" ${S(4)}/>`;
  g += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="16" fill="${T.frameD}" ${S(4)}/>`;
  const sx = x + 170; for (let j = 0; j < 9; j++) g += `<rect x="${f1(sx)}" y="${f1(y - hgt + 30 + j * (hgt - 60) / 9)}" width="26" height="${f1((hgt - 60) / 9 - 4)}" rx="3" fill="#fff" ${S(3)}/>`;
  // flow inside the tunnel
  const fk = o.flowK ?? fan;
  if (fk > .01) for (let i = 0; i < 6; i++) {
    const yy = y - hgt + 70 + i * (hgt - 140) / 5;
    g += `<path d="M${f1(sx + 40)},${f1(yy)} L${f1(x + w - 30)},${f1(yy + 8 * Math.sin(t * 3 + i))}" stroke="${T.wind}" stroke-width="7" stroke-linecap="round" stroke-dasharray="36 30" stroke-dashoffset="${f1(-t * 420 * fan - i * 20)}" opacity="${f3(.85 * fk)}"/>`;
  }
  // turntable
  const tx = x + w * .62, turn = o.turn || 0;
  g += `<ellipse cx="${f1(tx)}" cy="${f1(y - 22)}" rx="150" ry="22" fill="${T.concreteL}" ${S(5)}/><circle cx="${f1(tx + 130 * Math.cos(turn * Math.PI / 180))}" cy="${f1(y - 22 + 18 * Math.sin(turn * Math.PI / 180))}" r="8" fill="${P.orange}" ${S(3)}/>`;
  if (o.model) g += o.model(tx, y - 30);
  return g;
}
// sensor dots on a model face + data traces rising to a panel (no numbers)
function sensors(pts, t, k = 1) {
  if (k <= .005) return '';
  return pts.map(([x, y], i) => { const on = clamp(k * pts.length - i); const blink = .6 + .4 * Math.sin(t * 7 + i * 1.7); return on > 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(9 * on)}" fill="${P.alert}" stroke="${LINE}" stroke-width="3" opacity="${f3(on * blink)}"/>` : ''; }).join('');
}
function dataPanel(x, y, w, hgt, t, k = 1, o = {}) {
  if (k <= .005) return '';
  let g = `<g opacity="${f3(clamp(k * 3))}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(hgt)}" rx="14" fill="${T.frameD}" ${S(5)}/>`;
  for (let i = 0; i < 3; i++) {
    const pts = []; const yy = y + hgt * (.28 + .24 * i);
    for (let j = 0; j <= 24; j++) { const u = j / 24; if (u > k) break; pts.push([x + 20 + u * (w - 40), yy + (hgt * .08) * (Math.sin(u * 9 + i * 2 + t * 2.4) * .6 + noise(u * 4 + t, i) * .4) * (o.calm ? lerp(1, .35, o.calm) : 1)]); }
    if (pts.length > 1) g += `<path d="${smoothPath(pts)}" fill="none" stroke="${[P.orange, T.wind, '#F6F3EB'][i]}" stroke-width="6" stroke-linecap="round"/>`;
  }
  return g + '</g>';
}

// ---------- generic setback ("stepped") tower: tiers shrink with height. The episode labels any real example. ----------
const STEPPED = [[.22, .82], [.40, .66], [.56, .52], [.70, .40], [.82, .28], [.91, .18]];

module.exports = { T, swayAt, towerShape, tower, structure, foundation, loadFlow, windLines, pushArrows, planSection, vortexStreet, tmd, tmdSim, windTunnel, sensors, dataPanel, STEPPED };
