// MPI TURNAROUND + WALK (kit v1.2). Same identity as mpi.js (colours, line, proportions: 456 units tall, head ≈ 40 %).
// Views: 'front' (= mpi.js), 'back', 'sideR' (facing viewer's right), 'sideL', 'q34R', 'q34L'.
// Badge rule: the W badge sits on Mpi's LEFT chest (viewer-right in front view). It is never drawn mirrored:
//   sideR → visible near the chest front · sideL → hidden (we see his right side) · q34R → near the far edge · q34L → toward the centre · back → hidden.
const { mpi, C } = require('./mpi');
const S = `stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const flip = inner => `<g transform="translate(234,0) scale(-1,1)">${inner}</g>`;
const badge = (x, y, sx = 1) => `<g transform="translate(${x},${y}) scale(${sx},1)"><circle r="11" fill="${C.badge}" ${S} stroke-width="2.2"/></g><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${12 * Math.min(1, sx + .15)}" fill="${C.line}">W</text>`;
const tuft = (dx = 0) => `<g transform="translate(${dx},0)"><path d="M116,52 C112,40 104,33 108,23 C112,12 131,12 134,22 C136,31 128,35 122,31" fill="none" stroke="${C.line}" stroke-width="12.5" stroke-linecap="round"/>
  <path d="M116,52 C112,40 104,33 108,23 C112,12 131,12 134,22 C136,31 128,35 122,31" fill="none" stroke="${C.hair}" stroke-width="7.5" stroke-linecap="round"/></g>`;
const eye = (x, y, rx = 5.5, ry = 11) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.eye}"/>`;
const blinkLine = (x, y) => `<path d="M${x - 6},${y} L${x + 6},${y}" ${S} stroke-width="3.4"/>`;
const shoeSide = (x, y, a = 0, far) => `<g transform="translate(${x},${y}) rotate(${a})"><path d="M-22,-12 C-22,-20 -16,-22 -8,-22 L18,-22 C30,-22 40,-14 40,-4 L40,2 C40,6 37,8 32,8 L-18,8 C-21,8 -22,6 -22,2 Z" fill="${far ? '#173B39' : C.jacket}" ${S}/><path d="M-22,1 L40,1" stroke="${C.sole}" stroke-width="4"/></g>`;

// ---------- side view (facing right). pose: { legs:[{hip,foot,lift}], arms, blink, expr, bob, lean } ----------
function ik(hx, hy, fx, fy, L1 = 52, L2 = 50, bendDir = 1) {          // 2-bone IK → knee point
  const dx = fx - hx, dy = fy - hy, d = Math.min(L1 + L2 - .01, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx), b = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  return [hx + L1 * Math.cos(a - bendDir * b), hy + L1 * Math.sin(a - bendDir * b)];
}
function legSide(hip, foot, far) {
  const [kx, ky] = ik(hip[0], hip[1], foot[0], foot[1] - 10, 52, 50, 1);
  const col = far ? '#1E2221' : C.pants;
  return `<path d="M${hip[0]},${hip[1]} L${kx.toFixed(1)},${ky.toFixed(1)} L${foot[0]},${foot[1] - 10}" fill="none" stroke="${C.line}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${hip[0]},${hip[1]} L${kx.toFixed(1)},${ky.toFixed(1)} L${foot[0]},${foot[1] - 10}" fill="none" stroke="${col}" stroke-width="36.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${shoeSide(foot[0], foot[1], foot[2] || 0, far)}`;
}
function armSide(sh, swing, far) {        // swing: forward (+) / back (−) angle, elbow follows with a slight bend
  const a = Math.PI / 2 - swing, ex = sh[0] + 46 * Math.cos(a), ey = sh[1] + 46 * Math.sin(a);
  const a2 = a - .25 - Math.max(0, swing) * .5, hx = ex + 42 * Math.cos(a2), hy = ey + 42 * Math.sin(a2);
  const P = `M${sh[0]},${sh[1]} L${ex.toFixed(1)},${ey.toFixed(1)} L${hx.toFixed(1)},${hy.toFixed(1)}`;
  return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${P}" fill="none" stroke="${far ? '#17403D' : C.jacket}" stroke-width="21.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="11" fill="${C.face}" ${S}/>`;
}
function headSide(o = {}) {
  const ey = 160, ex = 182;
  const face = `<path d="M110,122 L194,118 C206,118 210,128 210,140 L210,196 C210,222 197,233 177,233 L122,233 C112,233 108,226 108,216 Z" fill="${C.face}" ${S}/>`;
  const feat = (o.blink ? blinkLine(ex, ey) : eye(ex, ey, 5, 11)) +
    (o.expr === 'lega' ? `<path d="M176,162 Q182,155 188,162" fill="none" ${S} stroke-width="3.4"/>` : '') +
    `<path d="M${o.expr === 'lega' ? '192,195 Q200,200 205,193' : '193,197 Q200,201 206,196'}" fill="none" ${S} stroke-width="2.8"/>`;
  const hair = `<path d="M38,196 C22,190 18,162 20,132 C22,80 62,48 118,47 C172,47 212,80 214,122 C214,129 209,133 203,132 C190,124 170,118 150,120 C134,122 122,130 116,144 C112,162 112,192 110,216 C90,216 60,210 38,196 Z" fill="${C.hair}" ${S}/>
    <path d="M60,74 Q84,58 110,57 M30,154 Q24,124 36,100 M150,62 Q180,70 200,96" fill="none" stroke="${C.hairHi}" stroke-width="2.4" stroke-linecap="round"/>`;
  return tuft(-4) + face + (o.expr === 'lega' ? feat.replace(eye(ex, ey, 5, 11), '') : feat) + hair;
}
function bodySide() {
  const hood = `<path d="M58,232 C50,214 70,204 92,210 C108,214 112,232 106,248 C98,262 80,262 68,254 C60,248 58,240 58,232 Z" fill="${C.jacketHi}" ${S}/>`;
  const jacket = `<path d="M72,236 C62,290 58,330 60,356 C60,360 64,362 68,362 L172,362 C176,362 180,360 180,356 C180,330 176,290 168,236 C146,226 96,226 72,236 Z" fill="${C.jacket}" ${S}/>
    <path d="M150,238 L166,238 L174,360 L158,360 Z" fill="${C.shirt}" ${S}/><path d="M64,330 C62,342 62,352 62,356 L86,358 C80,346 76,322 74,302 Z" fill="#000" opacity=".14"/>`;
  return { hood, jacket };
}
// pose for the side view; t-driven walk below fills these
function mpiSide(o = {}) {
  const dir = o.dir || 'R', bob = o.bob || 0, lean = o.lean || 0;
  const legs = o.legs || [{ hip: [112, 352], foot: [104, 458] }, { hip: [124, 352], foot: [128, 458] }];
  const arms = o.arms || [0, 0];
  const b = bodySide();
  const inner = `<g transform="translate(0,${bob}) rotate(${lean} 117 360)">
      ${armSide([116, 254], arms[1], true)}${legSide(legs[1].hip, legs[1].foot, true)}
      ${legSide(legs[0].hip, legs[0].foot, false)}
      ${b.jacket}${dir === 'R' ? badge(140, 292, .8) : ''}${b.hood}
      <g transform="rotate(${o.tilt || 0} 120 232)">${headSide(o)}</g>
      ${armSide([118, 254], arms[0], false)}</g>`;
  // mirrored geometry for 'L'; the badge is simply not drawn (it is on the far side), so no mirrored W ever appears
  return `<g filter="url(#${o.filter || 'wob'})">${dir === 'R' ? inner : flip(inner)}</g>`;
}

// ---------- walk cycle (side view) ----------
// Body moves at constant speed v (rig units / s). Each foot alternates STANCE (fixed on the floor) and SWING (arc forward),
// so a planted foot never slides. phase 0..1 per stride pair; legs half a cycle apart.
function walkPose(dist, stride = 64) {
  const ph = dist / (2 * stride);                       // cycles completed
  const leg = (off) => {
    const p = ((ph + off) % 1 + 1) % 1;
    let rel, lift = 0;
    if (p < .5) rel = stride / 2 - (p / .5) * stride;  // stance: moves backward relative to the body = still on the floor
    else { const q = (p - .5) / .5; rel = -stride / 2 + q * stride; lift = Math.sin(q * Math.PI) * 16; }
    return { rel, lift, stance: p < .5 };
  };
  const A = leg(0), B = leg(.5);
  const bob = -3 * Math.abs(Math.cos(ph * 2 * Math.PI));   // body highest at passing position
  return {
    legs: [{ hip: [114, 352], foot: [117 + A.rel, 458 - A.lift, A.lift ? -8 * Math.sin(A.lift / 16 * Math.PI / 2) : 0] },
           { hip: [122, 352], foot: [117 + B.rel, 458 - B.lift, B.lift ? -8 * Math.sin(B.lift / 16 * Math.PI / 2) : 0] }],
    arms: [-.7 * (A.rel / (stride / 2)), -.7 * (B.rel / (stride / 2))],   // each arm swings opposite its own-side leg
    bob, contact: [A.stance ? 117 + A.rel : null, B.stance ? 117 + B.rel : null],
  };
}
// shadow that follows the planted foot (or both)
function walkShadow(pose, shadow = '#D3C3A6') {
  const xs = pose.contact.filter(x => x !== null), cx = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 117;
  return `<ellipse cx="${cx + 10}" cy="460" rx="${xs.length === 2 ? 70 : 52}" ry="8" fill="${shadow}"/>`;
}

// ---------- back view ----------
function mpiBack(o = {}) {
  const legs = `<path d="M64,356 L62,428 C62,434 66,436 72,436 L108,436 C113,436 115,433 115,428 L117,384 L119,428 C119,433 121,436 126,436 L162,436 C168,436 172,434 172,428 L170,356 Z" fill="${C.pants}" ${S}/>`;
  const heel = x => `<path d="M${x - 30},440 C${x - 30},432 ${x - 24},430 ${x - 16},430 L${x + 16},430 C${x + 24},430 ${x + 30},432 ${x + 30},440 L${x + 30},452 C${x + 30},455 ${x + 27},457 ${x + 22},457 L${x - 22},457 C${x - 27},457 ${x - 30},455 ${x - 30},452 Z" fill="${C.jacket}" ${S}/><path d="M${x - 29},450 L${x + 29},450" stroke="${C.sole}" stroke-width="4"/>`;
  const arm = side => { const g = `<path d="M58,244 C36,252 24,290 20,338 C20,346 28,350 34,350 L56,350 C58,320 62,290 66,262 Z" fill="${C.jacket}" ${S}/><path d="M30,350 C24,352 22,362 26,369 C31,377 46,377 52,370 C56,364 54,354 48,350 Z" fill="${C.face}" ${S}/>`; return side ? flip(g) : g; };
  const jacket = `<path d="M56,238 C50,290 44,330 40,352 C40,358 46,360 52,360 L182,360 C188,360 194,358 194,352 C190,330 184,290 178,238 C160,228 74,228 56,238 Z" fill="${C.jacket}" ${S}/>`;
  const hood = `<path d="M70,232 C70,214 164,214 164,232 L150,300 C140,318 94,318 84,300 Z" fill="${C.jacketHi}" ${S}/><path d="M92,248 Q117,262 142,248" fill="none" ${S} stroke-width="2"/>`;
  const head = `<path d="M30,180 C18,160 17,136 17,128 C17,76 60,47 117,47 C174,47 217,76 217,128 C217,150 214,168 204,184 C196,214 170,226 117,226 C64,226 38,214 30,180 Z" fill="${C.hair}" ${S}/>
    <path d="M60,74 Q84,58 108,57 M150,60 Q176,66 194,90 M62,190 Q117,206 172,190" fill="none" stroke="${C.hairHi}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `${o.shadow === null ? '' : `<ellipse cx="117" cy="457" rx="90" ry="9" fill="${o.shadow || '#E2D7C6'}"/>`}<g filter="url(#wob)">${legs}${heel(88)}${heel(146)}${arm(0)}${arm(1)}${jacket}${hood}${tuft()}${head}</g>`;
}

// ---------- three-quarter views ----------
function mpiQ34(dir = 'R', o = {}) {
  // built from the front rig: features + shirt opening slide toward the facing side, far half narrows
  const base = mpi(o.expr || 'netral', { shadow: o.shadow, blink: o.blink, eye: [0, 0] });
  const strip = s => s.replace(/<ellipse cx="92"[^>]*\/><ellipse cx="142"[^>]*\/>/, '').replace(/<path d="M107,194 Q117,202 127,194"[^>]*\/>/, '')
    .replace(/<circle cx="155" cy="292"[^>]*\/>\s*<text[^>]*>W<\/text>/, '');
  let g = strip(base);
  // shift the shirt opening & face features to the facing side (for R; L mirrors geometry only)
  g = g.replace(/<path d="M98,238 C110,234 124,234 136,238 L140,360 L94,360 Z"/, '<path d="M110,238 C120,234 132,234 144,238 L148,360 L106,360 Z"');
  const feats = (o.blink ? blinkLine(122, 160) + blinkLine(168, 160) : eye(122, 160, 5.5, 11) + eye(168, 160, 4.4, 10.2)) + `<path d="M138,195 Q147,202 156,195" fill="none" ${S} stroke-width="2.8"/>`;
  const shade = `<path d="M40,128 C40,100 56,88 80,86 C72,120 70,180 76,232 C56,232 40,222 40,190 Z" fill="${C.hair}" ${S}/><path d="M50,120 Q56,150 54,186" fill="none" stroke="${C.hairHi}" stroke-width="2.2"/>`;
  const inner = g.replace('</g>\n    <g transform="rotate(0 117 232)">', '</g>\n    <g transform="rotate(0 117 232)">') + `<g filter="url(#${o.filter || 'wob'})">${feats}${shade}</g>`;
  const bx = dir === 'R' ? 172 : 136;                    // badge: near the far edge (R) or toward the centre (L)
  return (dir === 'R' ? inner : flip(inner)) + badge(bx, 292, dir === 'R' ? .7 : .92);
}

module.exports = { mpiSide, mpiBack, mpiQ34, walkPose, walkShadow, legSide, armSide, ik };
