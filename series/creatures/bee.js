// CREATURE KIT v1.14 (EP13 "Lebah Pulang ke Sarang") — worker honeybee, simplified but anatomically readable:
// head + thorax + striped abdomen (3 segments), 6 legs, 2 antennae, 2 pairs of wings. No face, no costume.
// Wings: drawn as translucent motion-blur fans (no frame-to-frame flipping → no flicker on 30 fps video).
// o.mark: a small coloured dot on the thorax (like the paint marks researchers put on bees) so viewers can follow ONE bee.
// Views: side(x, y, s, o) facing right (o.flip for left) · top(x, y, s, ang, o) heading = ang (deg, 0 = up)
// Flight: path helpers that give position + heading with smooth acceleration (no teleport): fly(keys)(t) → {x, y, ang, v}
const { PALETTE: P, LINE, S, lerp, clamp, eio } = require('../engine/core');
const f1 = x => (+x).toFixed(1), f3 = x => (+x).toFixed(3);

const BE = { body: '#E7B84A', bodyD: '#C9952E', stripe: '#3A2E22', fuzz: '#F3D58A', wing: '#E8F6F8', wingLine: '#9CC9D3', leg: '#3A2E22', mark: '#3FB8A9' };

// wing fan: a soft wedge covering the stroke angle range (motion blur), plus one crisp wing at the mid position
function wingFan(cx, cy, len, a0, a1, o = 1) {
  const pts = []; const n = 10;
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * len, cy + Math.sin(a) * len]); }
  const fan = `<path d="M${f1(cx)},${f1(cy)} L${pts.map(p => p.map(f1).join(',')).join(' L')} Z" fill="${BE.wing}" opacity="${f3(.35 * o)}"/>`;
  const am = ((a0 + a1) / 2) * Math.PI / 180, ex = cx + Math.cos(am) * len, ey = cy + Math.sin(am) * len, nx = -Math.sin(am) * len * .22, ny = Math.cos(am) * len * .22;
  const wing = `<path d="M${f1(cx)},${f1(cy)} Q${f1((cx + ex) / 2 + nx)},${f1((cy + ey) / 2 + ny)} ${f1(ex)},${f1(ey)} Q${f1((cx + ex) / 2 - nx * .6)},${f1((cy + ey) / 2 - ny * .6)} ${f1(cx)},${f1(cy)} Z" fill="${BE.wing}" stroke="${BE.wingLine}" stroke-width="2.4" opacity="${f3(.85 * o)}"/>`;
  return fan + wing;
}

// ---------- side view (facing +x), body length ≈ 120 units at s = 1, origin = thorax centre ----------
// o: { t, flap (0 = resting wings, 1 = flying), legs: 'fly' | 'stand', mark, pollen 0..1, flip }
function side(x, y, s = 1, o = {}) {
  const t = o.t || 0, fl = o.flap ?? 1, flip = o.flip ? -1 : 1;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s * flip)},${f3(s)})">`;
  // far wings (behind body)
  if (fl > .05) g += wingFan(-4, -16, 66, -150 + 20 * Math.sin(t * 9), -60 + 20 * Math.sin(t * 9), fl * .8);
  // legs: three pairs; flying = tucked & trailing, standing = down to y = 34
  const stand = o.legs === 'stand';
  [[-10, 1], [4, 0], [16, -1]].forEach(([lx, k], i) => {
    const fx = stand ? lx + 6 * k : lx - 14 - 6 * i, fy = stand ? 36 : 26 + 4 * i;
    g += `<path d="M${lx},10 L${f1((lx + fx) / 2 + 4)},${f1(stand ? 24 : 22)} L${f1(fx)},${f1(fy)}" fill="none" stroke="${BE.leg}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  // abdomen (stripes) — slight bob
  const bob = 2 * Math.sin(t * 6);
  g += `<g transform="rotate(${f1(8 + bob)} -14 0)"><ellipse cx="-44" cy="6" rx="38" ry="24" fill="${BE.body}" ${S(4.5)}/>`
    + [-58, -44, -30].map(cx => `<path d="M${cx},-16 Q${cx - 6},6 ${cx},28" fill="none" stroke="${BE.stripe}" stroke-width="8" stroke-linecap="round"/>`).join('')
    + `<path d="M-82,6 L-90,8" stroke="${LINE}" stroke-width="3.5" stroke-linecap="round"/></g>`;
  // thorax (fuzzy) + mark + pollen basket
  g += `<circle cx="0" cy="0" r="22" fill="${BE.fuzz}" ${S(4.5)}/><circle cx="-4" cy="-6" r="10" fill="${BE.body}" opacity=".6"/>`;
  if (o.mark) g += `<circle cx="-8" cy="-16" r="6" fill="${o.mark === true ? BE.mark : o.mark}" ${S(2.5)}/>`;
  if ((o.pollen || 0) > 0) g += `<circle cx="10" cy="26" r="${f1(7 * o.pollen)}" fill="${P.orange}" ${S(2.5)}/>`;
  // head + eye + antennae
  g += `<ellipse cx="30" cy="2" rx="15" ry="17" fill="${BE.stripe}" ${S(4)}/><ellipse cx="33" cy="-2" rx="7" ry="10" fill="#5A4636"/>`;
  const aw = 4 * Math.sin(t * 3);
  g += `<path d="M36,-12 C44,-28 52,${f1(-34 + aw)} 60,${f1(-30 + aw)}" fill="none" stroke="${BE.leg}" stroke-width="3.2" stroke-linecap="round"/><path d="M32,-14 C36,-32 42,${f1(-40 - aw)} 50,${f1(-40 - aw)}" fill="none" stroke="${BE.leg}" stroke-width="3.2" stroke-linecap="round"/>`;
  // near wings (in front)
  if (fl > .05) g += wingFan(-2, -14, 72, -140 + 24 * Math.sin(t * 9 + .5), -50 + 24 * Math.sin(t * 9 + .5), fl);
  else g += `<path d="M-2,-14 Q-40,-36 -80,-16 Q-40,-14 -2,-14 Z" fill="${BE.wing}" stroke="${BE.wingLine}" stroke-width="2.4" opacity=".9"/>`;
  return g + '</g>';
}

// ---------- top view (heading ang, 0 = up), body length ≈ 120 units ----------
function top(x, y, s = 1, ang = 0, o = {}) {
  const t = o.t || 0, fl = o.flap ?? 1;
  let g = `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(ang)}) scale(${f3(s)})">`;
  if (fl > .05) for (const sd of [-1, 1]) g += `<g transform="scale(${sd},1)">${wingFan(4, -6, 70, -10 + 16 * Math.sin(t * 9), 60 + 16 * Math.sin(t * 9), fl)}</g>`;
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) g += `<path d="M${sd * 12},${-6 + i * 10} L${sd * (26 + 4 * i)},${f1(4 + i * 14)}" stroke="${BE.leg}" stroke-width="3.4" stroke-linecap="round"/>`;
  g += `<ellipse cx="0" cy="38" rx="20" ry="34" fill="${BE.body}" ${S(4.5)}/>` + [26, 40, 54].map(y0 => `<path d="M-19,${y0} Q0,${y0 + 6} 19,${y0}" fill="none" stroke="${BE.stripe}" stroke-width="7" stroke-linecap="round"/>`).join('');
  g += `<circle cx="0" cy="0" r="18" fill="${BE.fuzz}" ${S(4.5)}/>` + (o.mark ? `<circle cx="0" cy="-2" r="6.5" fill="${o.mark === true ? BE.mark : o.mark}" ${S(2.5)}/>` : '');
  g += `<ellipse cx="0" cy="-26" rx="13" ry="11" fill="${BE.stripe}" ${S(4)}/>`;
  for (const sd of [-1, 1]) g += `<path d="M${sd * 6},-34 C${sd * 10},-50 ${sd * 18},-56 ${sd * (24 + 2 * Math.sin(t * 3))},-58" fill="none" stroke="${BE.leg}" stroke-width="3" stroke-linecap="round"/>`;
  return g + '</g>';
}

// ---------- flight: smooth path through keys [[t, x, y], …] with eased speed; heading follows the velocity ----------
function fly(keys, o = {}) {
  const wob = o.wobble ?? 6;
  const pos = t => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const [ta, xa, ya] = keys[i - 1], [tb, xb, yb] = keys[i], k = eio((t - ta) / (tb - ta));
      const p0 = keys[Math.max(0, i - 2)], p3 = keys[Math.min(keys.length - 1, i + 1)];
      // Catmull-Rom between a and b (smooth through the keys)
      const cr = (q0, q1, q2, q3, u) => .5 * (2 * q1 + (-q0 + q2) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u * u + (-q0 + 3 * q1 - 3 * q2 + q3) * u * u * u);
      return [cr(p0[1], xa, xb, p3[1], k), cr(p0[2], ya, yb, p3[2], k)];
    }
    const z = keys.at(-1); return [z[1], z[2]];
  };
  return t => {
    const [x, y] = pos(t), [x2, y2] = pos(t + .04), dx = x2 - x, dy = y2 - y, v = Math.hypot(dx, dy) / .04;
    return { x: x + wob * Math.sin(t * 7.1), y: y + wob * .7 * Math.sin(t * 5.3 + 1), ang: Math.atan2(dx, -dy) * 180 / Math.PI, v, flip: dx < -0.01 };
  };
}

module.exports = { BE, side, top, fly, wingFan };
