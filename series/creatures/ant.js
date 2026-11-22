// WHYSCAPE ANT (kit v1.4, EP03) — one reusable ant system in the series style. It is an animal, not a person:
// no face, no clothes. The silhouette is read as head–thorax–abdomen, with six legs and two elbowed antennae.
//   antTop(o)   top view. The body points along +x; place it with translate/rotate. Legs use a tripod gait whose feet are
//               PLANTED: during stance a foot moves backward relative to the body at exactly the body speed, so it never
//               slides on the floor. Pass o.dist (distance walked, in rig units).
//   antSide(o)  side view for close-ups (antenna sweep and touch on the surface).
//   Path helpers: polyline arc length, point/heading at s, wiggle paths for exploring ants.
// Palette (locked for the series): body #2E2420, highlight #5A4636, line #231E1A, crumb #D9A55B.
// Scale: rig length ≈ 64 units nose to tail (A_LEN). The episode chooses one scale per world and keeps it.
const LINE = '#231E1A', BODY = '#2E2420', HI = '#5A4636', CRUMB = '#D9A55B', CRUMB_D = '#B9853F';
const A_LEN = 64, STEP = 14;                      // body length, half stride (rig units)
const S = (w = 2.6) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const f1 = x => (+x).toFixed(1);

// tripod gait: group A = front-L, mid-R, rear-L; group B = the other three, half a cycle later
// [hip, knee, foot] in the body frame (y < 0 = left); front legs reach forward, hind legs trail back
const LEGS = [[[9, -4], [8, -15], [25, -21], 0], [[3, -5], [2, -16], [3, -26], 1], [[-2, -4], [-6, -15], [-22, -22], 0]];
const LEG6 = [...LEGS, ...LEGS.map(([h, k, f, g]) => [[h[0], -h[1]], [k[0], -k[1]], [f[0], -f[1]], 1 - g])];
function footRel(dist, group) {
  const p = (((dist / (2 * STEP)) + group * .5) % 1 + 1) % 1;
  // half a cycle = STEP of body travel, so the stance foot must move back exactly STEP relative to the body (±STEP/2)
  if (p < .5) return { dx: STEP / 2 - (p / .5) * STEP, lift: 0 };          // stance: foot moves back = stays put in the world
  const q = (p - .5) / .5; return { dx: -STEP / 2 + q * STEP, lift: Math.sin(q * Math.PI) };
}
// o: { dist, sweep (antenna phase), carry (crumb in the jaws), still (legs at rest), alert (antennae raised), glow }
function antTop(o = {}) {
  const dist = o.still ? 0 : (o.dist || 0), sw = o.sweep || 0;
  let legs = '';
  LEG6.forEach(([h, k, ft, grp]) => {
    const f = o.still ? { dx: 0, lift: 0 } : footRel(dist, grp), lf = 1 - .1 * f.lift;
    legs += `<path d="M${h[0]},${h[1]} L${f1(k[0] + f.dx * .45)},${f1(k[1] * lf)} L${f1(ft[0] + f.dx)},${f1(ft[1] * lf)}" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const ant = (side) => {                                     // elbowed antenna: short scape out-forward, funiculus bent forward & sweeping
    const m = side === 'L' ? -1 : 1, a = ((o.alert ? -10 : 0) + 18 * Math.sin(sw + (side === 'L' ? 0 : 1.9))) * Math.PI / 180;
    const ex = 27, ey = m * 8, L2 = 14, tx = ex + L2 * Math.cos(.35 * m + a * m), ty = ey + L2 * Math.sin(.35 * m + a * m);
    return `<path d="M22,${m * 2.5} L${ex},${f1(ey)} L${f1(tx)},${f1(ty)}" fill="none" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="1.9" fill="${LINE}"/>`;
  };
  const crumb = o.carry ? `<g transform="translate(31,0) rotate(${(o.carryRot || 12)})"><path d="M-7,-8 L6,-9 L10,1 L5,9 L-6,8 L-10,0 Z" fill="${CRUMB}" ${S(2.2)}/><circle cx="-1" cy="-2" r="1.6" fill="${CRUMB_D}"/><circle cx="3" cy="3" r="1.3" fill="${CRUMB_D}"/></g>` : '';
  const glow = o.glow ? `<ellipse cx="-2" cy="0" rx="46" ry="34" fill="${o.glow}" opacity="${o.glowO ?? .35}"/>` : '';
  return `${glow}<ellipse cx="0" cy="4" rx="32" ry="13" fill="#000" opacity=".10"/>${legs}${ant('L')}${ant('R')}
    <ellipse cx="-17" cy="0" rx="14" ry="10.5" fill="${BODY}" ${S()}/><path d="M-24,-4 Q-17,-8 -10,-5" fill="none" stroke="${HI}" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="-3" cy="0" rx="2.8" ry="2.6" fill="${BODY}" ${S(2)}/>
    <ellipse cx="5" cy="0" rx="7.5" ry="5.2" fill="${BODY}" ${S()}/>
    <ellipse cx="18" cy="0" rx="7" ry="6.6" fill="${BODY}" ${S()}/><path d="M15,-3 Q18,-5 21,-3" fill="none" stroke="${HI}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M24,-3 L28,-1.5 M24,3 L28,1.5" ${S(2)}/>${crumb}`;
}

// side view (faces +x, ground at y = 0). o: { dist, sweep, touch (0..1 antenna tip down on the surface), still }
function antSide(o = {}) {
  const dist = o.still ? 0 : (o.dist || 0);
  let legs = '';
  [[[9, -15], [16, -24], [24, 0], 0], [[3, -14], [4, -26], [4, 0], 1], [[-2, -14], [-12, -24], [-20, 0], 0]].forEach(([h, k, ft, grp]) => {
    const f = o.still ? { dx: 0, lift: 0 } : footRel(dist, grp);
    legs += `<path d="M${h[0]},${h[1]} L${f1(k[0] + f.dx * .5)},${f1(k[1] - 3 * f.lift)} L${f1(ft[0] + f.dx)},${f1(-6 * f.lift)}" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const tch = o.touch || 0, sw = Math.sin(o.sweep || 0);
  const sx = 29, sy = -36 + 1.5 * sw;                          // short scape up-forward to the elbow
  const tx = 40 + 4 * sw + 3 * tch, ty = -24 + 22 * tch;       // funiculus forward-down; touch = tip on the ground
  return `<ellipse cx="0" cy="1" rx="34" ry="3.5" fill="#000" opacity=".12"/>${legs}
    <path d="M24,-26 L${sx},${f1(sy)} L${f1(tx)},${f1(ty)}" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(tx)}" cy="${f1(ty)}" r="2" fill="${LINE}"/>
    <ellipse cx="-17" cy="-19" rx="14" ry="10.5" fill="${BODY}" ${S()} transform="rotate(-12 -17 -19)"/><path d="M-25,-25 Q-17,-29 -9,-25" fill="none" stroke="${HI}" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="-3" cy="-17" rx="2.8" ry="3.8" fill="${BODY}" ${S(2)}/>
    <ellipse cx="5" cy="-18" rx="8" ry="5.4" fill="${BODY}" ${S()} transform="rotate(-8 5 -18)"/>
    <ellipse cx="19" cy="-22" rx="6.8" ry="7.2" fill="${BODY}" ${S()}/><path d="M16,-26 Q19,-28 22,-26" fill="none" stroke="${HI}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M24,-18 L28,-15" ${S(2)}/>`;
}

// ---------- paths ----------
function measure(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
// smooth a polyline (Chaikin ×n) so corners read as gentle bends
function smooth(pts, n = 3) { let p = pts; for (let k = 0; k < n; k++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const [a, b] = [p[i], p[i + 1]]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } q.push(p.at(-1)); p = q; } return p; }
function route(pts, n = 3) { const P = smooth(pts, n), L = measure(P); return { P, L, len: L.at(-1) }; }
function at(r, s) {                                  // point + heading (deg) at arc length s
  s = Math.max(0, Math.min(r.len, s)); let i = 1; while (i < r.L.length - 1 && r.L[i] < s) i++;
  const [a, b] = [r.P[i - 1], r.P[i]], k = (s - r.L[i - 1]) / ((r.L[i] - r.L[i - 1]) || 1);
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}
function reverse(r) { return route(r.P.slice().reverse(), 0); }
function sub(r, s0, s1) { const pts = [at(r, s0)]; r.L.forEach((l, i) => { if (l > s0 && l < s1) pts.push({ x: r.P[i][0], y: r.P[i][1] }); }); pts.push(at(r, s1)); return pts.map(p => `${f1(p.x)},${f1(p.y)}`).join(' '); }
// exploring path: a seeded wiggle around a base polyline (looks searching, but is a pure function of the seed)
function wiggle(pts, amp = 40, seed = 1, n = 18) {
  const r = route(pts, 2), out = [];
  for (let i = 0; i <= n; i++) { const s = r.len * i / n, p = at(r, s), a = (p.ang + 90) * Math.PI / 180, w = (i === 0 || i === n) ? 0 : amp * Math.sin(i * 2.1 + seed * 1.7) * Math.cos(i * .7 + seed);
    out.push([p.x + Math.cos(a) * w, p.y + Math.sin(a) * w]); }
  return route(out, 3);
}
// one ant on a route: s(t) with soft start/stop. Returns {x,y,ang,dist,moving}
function walker(r, t, t0, speed, { from = 0, to = r.len, ease = .25 } = {}) {
  const T = (to - from) / speed, u = Math.max(0, Math.min(T, t - t0));
  // trapezoid speed profile → distance (so legs never move faster than the body)
  const e = Math.min(ease, T / 2), v = (to - from) / (T - e);
  const d = u < e ? .5 * v * u * u / e : u > T - e ? (to - from) - .5 * v * (T - u) ** 2 / e : .5 * v * e + v * (u - e);
  const p = at(r, from + d); return { ...p, dist: from + d, moving: t > t0 && t < t0 + T, done: t >= t0 + T, T };
}
const place = (p, scale, inner) => `<g transform="translate(${f1(p.x)},${f1(p.y)}) rotate(${f1(p.ang)}) scale(${scale})">${inner}</g>`;
const crumbSvg = (x, y, s = 1, bites = 0) => {
  const k = Math.max(0, 1 - bites);
  if (k <= .02) return '';
  return `<g transform="translate(${x},${y}) scale(${(s * (.35 + .65 * k)).toFixed(3)})"><ellipse cx="4" cy="10" rx="58" ry="20" fill="#000" opacity=".1"/>
    <path d="M-48,-6 L-30,-34 L4,-40 L38,-28 L52,2 L40,30 L6,38 L-30,30 L-50,12 Z" fill="${CRUMB}" ${S(4)}/>
    <path d="M-30,-20 L10,-26 M-20,10 L24,6" stroke="${CRUMB_D}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    <circle cx="-14" cy="-6" r="4.5" fill="${CRUMB_D}"/><circle cx="18" cy="-12" r="4" fill="${CRUMB_D}"/><circle cx="8" cy="18" r="4.2" fill="${CRUMB_D}"/><circle cx="-30" cy="10" r="3.5" fill="${CRUMB_D}"/></g>`;
};
module.exports = { antTop, antSide, route, at, sub, reverse, wiggle, walker, place, crumbSvg, smooth, A_LEN, COL: { LINE, BODY, HI, CRUMB, CRUMB_D } };
