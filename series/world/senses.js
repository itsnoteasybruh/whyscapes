// LOCATION KIT v1.13 (EP12 "Mabuk Perjalanan") — the senses that report motion: eye, inner-ear balance organ, brain, signals.
// Simplified but correct shapes:
//   • vestibular labyrinth = THREE semicircular canals (≈ perpendicular planes; fluid lags when the HEAD ROTATES) joined to the
//     vestibule, whose otolith organs (utricle/saccule) carry a gel layer with small crystals that shift with LINEAR acceleration and
//     with tilt relative to gravity. The cochlea (hearing) is drawn only as a faded spiral when the caller asks — it is NOT the balance organ.
//   • eye: lens + retina, gaze, optional "image on the retina" content.
//   • brain: side silhouette, one comparison area that can glow, mismatch flicker drawn as two out-of-step pulses (never a talking brain).
// Pure functions of their arguments (deterministic), series palette, #231E1A rounded line.
const { PALETTE: P, LINE, S, lerp, clamp, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash, smoothPath } = H;

const SN = {
  bone: '#EFE3CE', boneD: '#D9C6A6', canal: '#F3D9B0', canalD: '#C99A5A', fluid: '#8FD3E3', fluidD: '#2E7488',
  gel: '#F6EADB', crystal: '#FFFFFF', hair: '#E08A3C', cochlea: '#E8CFC0',
  eyeW: '#FBF8F2', iris: '#3F8F7F', pupil: '#1B1A18', retina: '#EFB7A6', nerve: '#FFC766',
  brain: '#F1C6C0', brainD: '#D99A94', brainHi: '#FBE1DC', eyeSig: '#3FB8A9', earSig: '#F2A53A', bodySig: '#9C7AC4',
};

// ---------- signal pulses travelling along a path (k = how much of the path is "on", phase offset for out-of-step streams) ----------
function pulses(pts, t, o = {}) {
  const k = clamp(o.k ?? 1), op = o.o ?? 1; if (k <= .005 || op <= .005) return '';
  const col = o.col || SN.eyeSig, w = o.w || 10, d = smoothPath(pts);
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = seg.at(-1), at = s => { let i = 1; while (i < seg.length - 1 && seg[i] < s) i++; const q = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; };
  let g = `<g opacity="${f3(op)}"><path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * k)} 2000" fill="none" stroke="${LINE}" stroke-width="${w + 6}" stroke-linecap="round" opacity=".55"/>`
    + `<path d="${d}" pathLength="1000" stroke-dasharray="${f1(1000 * k)} 2000" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity=".55"/>`;
  const sp = o.spacing || 90, v = o.speed || 260, n = Math.ceil(L / sp) + 1, jit = o.jitter || 0;
  for (let i = 0; i < n; i++) {
    let s = (i * sp + t * v + (o.phase || 0)) % (n * sp); if (jit) s += jit * Math.sin(t * 9 + i * 2.3) * sp * .4;
    if (s < 0 || s > L * k) continue;
    const [x, y] = at(s), e = clamp((L * k - s) / 50);
    g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((o.r || 11) * (.6 + .4 * e))}" fill="${col}" stroke="${LINE}" stroke-width="3" opacity="${f3(.95 * e)}"/>`;
  }
  return g + '</g>';
}

// ---------- eye (side view, looking to +x). gaze: angle in deg (+ = down). img: optional svg drawn on the retina patch ----------
function eye(x, y, r, o = {}) {
  const g0 = (o.gaze || 0) * Math.PI / 180, lid = clamp(o.lid ?? 0);
  const cx = Math.cos(g0), cy = Math.sin(g0);
  let g = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${SN.eyeW}" ${S(6)}/>`;
  // retina on the back wall (opposite to gaze), optic nerve leaving backwards
  const rx = x - cx * r * .92, ry = y - cy * r * .92;
  g += `<path d="M${f1(x - cx * r * .85 - cy * r * .5)},${f1(y - cy * r * .85 + cx * r * .5)} A${f1(r * .95)},${f1(r * .95)} 0 0 1 ${f1(x - cx * r * .85 + cy * r * .5)},${f1(y - cy * r * .85 - cx * r * .5)}" fill="none" stroke="${SN.retina}" stroke-width="${f1(r * .12)}" stroke-linecap="round"/>`;
  if (o.img) g += `<g transform="translate(${f1(rx)},${f1(ry)})">${o.img}</g>`;
  // lens + iris + pupil (front)
  const fx = x + cx * r * .78, fy = y + cy * r * .78;
  g += `<g transform="translate(${f1(fx)},${f1(fy)}) rotate(${f1(g0 * 180 / Math.PI)})"><ellipse rx="${f1(r * .14)}" ry="${f1(r * .42)}" fill="${SN.iris}" ${S(4)}/><ellipse rx="${f1(r * .07)}" ry="${f1(r * .2)}" fill="${SN.pupil}"/>`
    + `<ellipse cx="${f1(-r * .2)}" rx="${f1(r * .1)}" ry="${f1(r * .3)}" fill="#fff" opacity=".55" ${S(3)}/></g>`;
  if (lid > 0) g += `<path d="M${f1(x - r)},${f1(y)} A${f1(r)},${f1(r)} 0 0 1 ${f1(x + r)},${f1(y)} L${f1(x + r)},${f1(y - r + 2 * r * lid)} Q${f1(x)},${f1(y - r + 2.2 * r * lid)} ${f1(x - r)},${f1(y - r + 2 * r * lid)} Z" fill="#F4D9C6" ${S(5)}/>`;
  g += `<path d="M${f1(x - cx * r)},${f1(y - cy * r)} Q${f1(x - cx * r * 1.6)},${f1(y - cy * r * 1.1 + r * .3)} ${f1(x - cx * r * 2.2)},${f1(y + r * .25)}" fill="none" stroke="${SN.nerve}" stroke-width="${f1(r * .22)}" stroke-linecap="round"/>`;
  return g;
}

// ---------- inner-ear balance organ (vestibular labyrinth), front-ish view ----------
// o: { rot (fluid lag, −1..1, from head rotation), acc ([ax, ay] crystals shift, px), cochlea 0..1 (faded), hi: {canals, otolith} 0..1, t }
function innerEar(x, y, s, o = {}) {
  const t = o.t || 0, rot = o.rot || 0, [ax, ay] = o.acc || [0, 0], hi = o.hi || {};
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  // cochlea (hearing) — faded, off to the lower right, only when asked
  if ((o.cochlea || 0) > 0) { let d = 'M150,90'; for (let i = 0; i <= 60; i++) { const a = i * .3, r = 70 - i * .95; d += ` L${f1(170 + Math.cos(a) * r)},${f1(140 + Math.sin(a) * r * .9)}`; } g += `<g opacity="${f3(.35 * o.cochlea)}"><path d="${d}" fill="none" stroke="${SN.cochlea}" stroke-width="22" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="8 8"/></g>`; }
  // three canals: superior (vertical arc up), posterior (arc back-left), lateral (flat ellipse) — ≈ three planes
  const canals = [
    { d: 'M-40,-20 C-60,-170 80,-200 70,-40', name: 'sup' },
    { d: 'M-50,-10 C-210,-40 -200,150 -50,60', name: 'post' },
    { d: 'M-20,10 C60,-60 210,-20 160,40 C120,90 20,70 10,30', name: 'lat' },
  ];
  const ch = hi.canals || 0;
  canals.forEach((c, i) => {
    g += `<path d="${c.d}" fill="none" stroke="${LINE}" stroke-width="40" stroke-linecap="round"/><path d="${c.d}" fill="none" stroke="${SN.canal}" stroke-width="32" stroke-linecap="round"/>`
      + `<path d="${c.d}" fill="none" stroke="${SN.fluid}" stroke-width="14" stroke-linecap="round"/>`
      + `<path d="${c.d}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 22" stroke-dashoffset="${f1(-rot * 220 * (i % 2 ? -1 : 1) - t * 4)}" opacity="${f3(.4 + .6 * Math.min(1, Math.abs(rot)))}"/>`;
    if (ch > 0) g += `<path d="${c.d}" fill="none" stroke="${P.orange}" stroke-width="48" stroke-linecap="round" opacity="${f3(.28 * ch)}"/>`;
  });
  // ampulla bulges with a hair-cell tuft (cupula) that bends with the fluid
  [[-40, -20], [-50, 60], [10, 30]].forEach(([px, py], i) => {
    g += `<ellipse cx="${px}" cy="${py}" rx="26" ry="22" fill="${SN.canal}" ${S(5)}/>`
      + `<path d="M${px},${py + 14} Q${f1(px + 14 * rot * (i % 2 ? -1 : 1))},${py} ${f1(px + 20 * rot * (i % 2 ? -1 : 1))},${py - 16}" fill="none" stroke="${SN.hair}" stroke-width="7" stroke-linecap="round"/>`;
  });
  // vestibule with the otolith organ: gel layer + crystals; crystals shift with acceleration / tilt
  const oh = hi.otolith || 0;
  g += `<path d="M-60,-10 C-70,-60 40,-70 50,-20 C70,30 40,110 -10,110 C-60,110 -60,40 -60,-10 Z" fill="${SN.bone}" ${S(6)}/>`;
  g += `<rect x="-42" y="30" width="78" height="50" rx="14" fill="${SN.gel}" ${S(4)}/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M${-34 + i * 13},80 L${f1(-34 + i * 13 + ax * .5)},${f1(52 + ay * .3)}" stroke="${SN.hair}" stroke-width="4" stroke-linecap="round"/>`;
  for (let i = 0; i < 10; i++) { const cx = -34 + (i % 5) * 16 + ax + 2 * Math.sin(i * 2.1), cy = 34 + Math.floor(i / 5) * 12 + ay; g += `<rect x="${f1(cx - 5)}" y="${f1(cy - 4)}" width="10" height="8" rx="2" fill="${SN.crystal}" stroke="${LINE}" stroke-width="2.5" transform="rotate(${f1(20 * hash(i))} ${f1(cx)} ${f1(cy)})"/>`; }
  if (oh > 0) g += `<rect x="-52" y="20" width="98" height="70" rx="20" fill="none" stroke="${P.orange}" stroke-width="8" opacity="${f3(oh)}"/>`;
  // nerve leaving toward the brain
  g += `<path d="M20,100 C60,150 120,170 200,170" fill="none" stroke="${SN.nerve}" stroke-width="16" stroke-linecap="round"/>`;
  return g + '</g>';
}

// ---------- brain (side view facing +x), with one comparison area ----------
// o: { glow 0..1 (comparison area), mismatch 0..1 (two out-of-step rings), match 0..1 (one calm ring), t }
function brain(x, y, s, o = {}) {
  const t = o.t || 0;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">`;
  g += `<path d="M-180,40 C-200,-60 -120,-150 -10,-150 C110,-150 190,-80 185,10 C182,70 140,110 80,112 C40,140 -20,136 -40,112 C-110,118 -170,96 -180,40 Z" fill="${SN.brain}" ${S(7)}/>`;
  // gentle folds (fixed)
  ['M-130,-40 C-100,-70 -60,-50 -40,-80', 'M-20,-110 C0,-80 40,-100 60,-70', 'M80,-90 C100,-60 140,-60 150,-20', 'M-150,40 C-110,20 -80,50 -50,30', 'M-20,20 C10,-10 50,10 70,-10', 'M90,40 C120,20 150,50 170,30', 'M-90,-110 C-80,-90 -60,-100 -50,-120'].forEach(d => { g += `<path d="${d}" fill="none" stroke="${SN.brainD}" stroke-width="7" stroke-linecap="round"/>`; });
  // cerebellum + stem
  g += `<path d="M40,100 C70,150 150,140 160,90 C130,110 90,112 40,100 Z" fill="${SN.brainD}" ${S(5)}/><path d="M10,110 C10,150 20,190 30,230" fill="none" stroke="${SN.brainD}" stroke-width="34" stroke-linecap="round"/>`;
  const gl = clamp(o.glow || 0);
  if (gl > 0) g += `<circle cx="20" cy="-20" r="${f1(60 + 6 * Math.sin(t * 5))}" fill="${SN.brainHi}" opacity="${f3(.85 * gl)}" ${S(4)}/>`;
  const mm = clamp(o.mismatch || 0);
  if (mm > 0) [0, 1].forEach(i => { const ph = (t * (i ? 1.7 : 1.1)) % 1; g += `<circle cx="${i ? 40 : 0}" cy="${i ? -10 : -30}" r="${f1(30 + 70 * ph)}" fill="none" stroke="${i ? SN.earSig : SN.eyeSig}" stroke-width="7" opacity="${f3(mm * (1 - ph))}"/>`; });
  const ma = clamp(o.match || 0);
  if (ma > 0) { const ph = (t * 1.0) % 1; g += `<circle cx="20" cy="-20" r="${f1(30 + 70 * ph)}" fill="none" stroke="${P.tealGlow}" stroke-width="8" opacity="${f3(ma * (1 - ph))}"/>`; }
  return g + '</g>';
}

module.exports = { SN, pulses, eye, innerEar, brain };
