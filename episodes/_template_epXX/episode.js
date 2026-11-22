// WHYSCAPE — TEMPLATE EPISODE (copy this folder to episodes/epNN_<judul>/ and replace the CONTOH parts).
// Render:  node series/engine/render.js episodes/epNN_<judul> stills 0.5 4.6 6.5
//          node series/engine/render.js episodes/epNN_<judul> video epNN_preview.mp4
//
// What the SERIES gives you (do not re-implement): subtitle (core.timeline), opening/closing logo + blur + loop,
// signature transition "Coba kita ikuti jejaknya" (transition/jejak), palette, Mpi rig, home room, backgrounds.
// What the EPISODE owns: transcript.json (from its own VO), the scenes, the destination behind the portal, cues.json.
const path = require('path');
const SERIES = path.join(__dirname, '..', '..', 'series');
const K = require(path.join(SERIES, 'engine', 'core'));
const M = require(path.join(SERIES, 'character', 'mpi'));
const R = require(path.join(SERIES, 'world', 'room_home'));
const J = require(path.join(SERIES, 'transition', 'jejak'));
const { PALETTE: P, pop, prog, eio, lerp, place, svgPill } = K;

// 1) timeline from THIS episode's VO transcript. Keywords → orange in the subtitle.
const transcript = require('./transcript.json');
const tl = K.timeline(transcript, { keywords: ['jejaknya', 'portal', 'kok'] });
const W = tl.W;

// 2) episode length = end of the VO + closing tail (logo needs ≈1.7 s; never cut or speed up the VO)
const END = +(transcript.segments.at(-1).end + 1.7).toFixed(2);

// 3) signature transition: t0 = start of "Coba" + 0.04 s (rule). Destination lens centre/radius are the episode's choice.
const t0 = W('coba') + .04;
const transition = { t0, center: [540, 700], radius: 430 };
const SWITCH = t0 + .5;                      // inside J.hiddenWindow(t0): the screen is fully covered here

// beats (always derived from words, never typed as fixed seconds)
const B = { kok: W('kok'), tujuan: W('tujuan'), penutup: W('penutup') };

// ---------- scenes ----------
const ROOM = { floorY: 1040, win: [40, 150, 290, 400], clock: [470, 240, 68], shelf: [900, 790] };

// A — the episode's FIRST scene. Also used blurred behind the opening logo and as the closing loop target,
// so it must be a pure function of t that also works for slightly negative t.
function firstScene(t) {
  const q = pop(t, B.kok - .1, 1e9);
  const expr = t < B.kok - .1 ? 'netral' : 'penasaran';
  return `<svg width="1080" height="1920">${K.DEFS()}${R.room(t, ROOM)}${R.stool(330, 1338)}
    <g transform="${place(600, 1370, 1.75)}">${M.mpi(expr, { pose: 'down', eye: t < B.kok ? [0, 0] : [-4, -6] })}
      ${q.o > 0 ? `<g opacity="${q.o}" transform="translate(205,40) scale(${q.s})">${M.questionMark(0, 0, 1.1)}</g>` : ''}</g></svg>`;
}

// B — CONTOH destination behind the portal (replace: skin layers, pipe, soil, machine…).
// Inside-world look: deep teal + particles, content inside a lens circle matching transition.center/radius.
function destination(t) {
  const [cx, cy] = transition.center, r = transition.radius, k = t - SWITCH;
  let bands = '';
  [P.water, '#5FB3C6', P.waterDeep, P.tealMid].forEach((c, i) => {
    const y0 = cy - r + i * (2 * r / 4);
    bands += `<path d="${K.wave(cx - r - 40, cx + r + 40, y0 + 18, 10, 180, k * 2 + i)} L${cx + r + 40},${y0 + 2 * r / 4 + 30} L${cx - r - 40},${y0 + 2 * r / 4 + 30} Z" fill="${c}"/>`;
  });
  let dots = '';
  for (let i = 0; i < 18; i++) { const x = cx - r + ((i * 97 + k * 120) % (2 * r)), y = cy - r * .6 + (i * 53) % (r * 1.2); dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${7 + i % 3 * 3}" fill="${P.creamLight}" opacity=".55"/>`; }
  const lab = pop(t, B.tujuan, 1e9);
  return `<svg width="1080" height="1920">${K.DEFS(`<clipPath id="tp-lens"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`)}
    <rect width="1080" height="1920" fill="url(#darkbg)"/>${K.deep(1)}
    <g clip-path="url(#tp-lens)">${bands}${dots}</g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${P.line}" stroke-width="10"/>
    ${svgPill(540, 1230, 'CONTOH TUJUAN', { p: lab })}
    <g transform="${place(860, 1330, .9)}"><g filter="url(#sticker)">${M.mpi('penasaran', { pose: 'magnifier', shadow: null, eye: [-6, -4] })}</g></g></svg>`;
}

// C — closing beat (any scene). The series crossfades it back into firstScene() for the loop.
function closing(t) {
  const b = pop(t, B.penutup - .1, 1e9);
  return `<svg width="1080" height="1920">${K.DEFS()}${R.room(t, ROOM)}${R.stool(330, 1338)}
    <g transform="${place(600, 1370, 1.75)}">${M.mpi('menyadari', { pose: 'up' })}
      ${b.o > 0 ? `<g opacity="${b.o}" transform="translate(22,-4) scale(${b.s})">${M.bulb(0, 0, 1, true)}</g>` : ''}</g></svg>`;
}

function scene(t) {
  if (t < SWITCH) return firstScene(t);
  if (t < B.penutup - .45) return destination(t);
  return closing(t);
}

// cover (STANDARDS §16): logo + WHYSCAPE + three dots + title over the blurred first scene — no segment label, no badge
const Cover = require(path.join(SERIES, 'brand', 'cover_bokeh'));
const brand = Cover.brand({ title: 'JUDUL|EPISODE', timing: { hold: .85, gone: 1.4, sharp: [1.35, 1.9] } });

module.exports = {
  END, tl, scene, firstScene, transition, brand,
  audio: 'audio/mix_final.wav',          // final mix (audio/mix.py). Before mixing you may point this to 'audio/vo.mp3'.
  beats: { ...B, t0, SWITCH },
};
