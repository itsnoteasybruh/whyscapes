// EP13 · A — HOOK: the garden (first scene / cover background). Mpi on the garden path watches ONE marked bee leave the hive,
// come diagonally toward the camera (growing in perspective), pass near him and head for the tree and the flowers; low tracking
// between the flower beds; a short top view of the route; the phone joke (Mpi reaches for HIS phone — the bee has none);
// pull-back on "rumahnya di mana?" so the hive is small and far; the question.
const L = require('./lib');
const { K, M, H, GD, BEE, CM, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, noise, W, svg, TAG, camKeys, camT, rv, pulseK, blinkAt, ring, mpiAt, hero } = L;

const A = { bayangin: W('bayangin'), keluar: W('keluar'), sarangnya: W('sarangnya'), terbang: W('terbang'), pohon: W('pohon'), belok: W('belok'), kebun: W('kebun'),
  mampir: W('mampir'), bunga: W('bunga'), terus: W('terus'), pulang: W('pulang'), maps: W('maps'), lah: W('lah'), rumahnya: W('rumahnya'), gimana: W('gimana'), coba: W('coba') };

const GY = 1000;                                       // ground line on screen for the panorama
// main-layer map x → screen x for a given camera (panorama main layer = parallax 1)
const sx = (mx, camX, z = 1) => 540 + (mx - camX) * z;
// Mpi stands on the garden path (path band = parallax 1.25, y ≈ GY + 300): his map position MPI_X in that layer
const MPI_X = 470;
// Mpi walks along the path behind the bee (kebun → bunga), so he is beside the flower bed for the phone joke
const mpiX = t => lerp(470, 1150, eio(prog(t, W('kebun'), W('bunga') + 1.0)));
const mpiWalking = t => t > W('kebun') && t < W('bunga') + 1.0;
const mpiScreen = (camX, z = 1) => 540 + (MPI_X * z - camX * 1.25 * z) + (MPI_X * z * .25);   // path layer: x·z − camX·1.25·z  (+ layer origin)

// the camera through the hook
const camHook = camKeys([[-1, [380, 0, 1]], [A.keluar + .2, [380, 0, 1]], [A.pohon, [560, 0, 1]], [A.kebun, [980, 0, 1]], [A.bunga + .3, [1240, 0, 1]],
  [A.terus, [1280, 0, 1]], [A.lah, [1260, 0, 1]], [A.rumahnya + .2, [700, 0, .55]], [A.coba + .5, [700, 0, .55]]], .45);

// the hero bee's map path (main layer), from the hive entrance → toward the camera (we fake depth with scale) → tree → flower beds
const HIVE_DOOR = [55, GY - 98];
const beeHook = BEE.fly([[A.keluar, 60, GY - 100], [A.keluar + .9, 150, GY - 360], [A.pohon, 330, GY - 560], [A.belok + .2, 620, GY - 420], [A.kebun + .3, 900, GY - 260],
  [A.mampir + .3, 990, GY - 130], [A.bunga, 1130, GY - 110], [A.bunga + .9, 1265, GY - 150], [A.pulang, 1290, GY - 260], [A.maps + 2, 1300, GY - 280]], { wobble: 5 });
// perspective "toward the camera" bump: the bee grows as it passes near the lens, then shrinks back to garden scale
const beeScale = t => .42 + 1.4 * Math.exp(-((t - (A.keluar + 1.0)) ** 2) / (2 * .45 ** 2)) + .35 * prog(t, A.kebun, A.mampir + .3);

function scene(t, o = {}) {
  const c = camHook(t), camX = c.x, z = c.s;
  let g = GD.panorama(t, camX, { gy: GY, zoom: z, sunX: 860, sunY: 300, hi: { hive: rv(t, A.rumahnya, .4) }, dip: { 0: 6 * pulseK(t, A.mampir + .3, .6), 1: 6 * pulseK(t, A.bunga, .6), 2: 6 * pulseK(t, A.bunga + .9, .6) } });
  // Mpi on the path (feet on the path band), watching; reaches for his phone on "maps" and realises the bee has none
  const phone = rv(t, A.maps, .3) * (1 - prog(t, A.rumahnya, A.rumahnya + .4));
  const expr = t < A.keluar ? 'penasaran' : t < A.maps ? 'penasaran' : t < A.lah + .2 ? 'terkejut' : t < A.gimana ? 'bingung' : 'berpikir';
  const mxs = 540 + (mpiX(t) - camX) * 1.25 * z, mys = GY + 262 * z;
  const bee = beeHook(t);
  const look = clamp((bee.x - camX) * z * .02 + (540 - mxs) * .0, -10, 10);
  if (mpiWalking(t)) { const pose = L.MT.walkPose((mpiX(t) - 470) * 1.6, 64); g += `<g transform="${L.place(mxs, mys, .72 * z)}">${L.MT.walkShadow(pose)}${L.MT.mpiSide({ ...pose, dir: 'R', expr: 'penasaran' })}</g>`; }
  else g += mpiAt(mxs, mys, .72 * z, expr, { right: phone > .01 ? 'phone' : undefined, left: phone > .5 && t > A.maps + .6 ? 'shrug' : undefined, eye: [look, -8], blink: blinkAt(t, [2.6, 7.4]) });
  if (phone > .5 && t > A.maps + .6) { const k = rv(t, A.maps + .6, .3); g += `<g transform="translate(${f1(mxs + 70 * z)},${f1(mys - 400 * z)}) scale(${f3(.9 * k * z)})">${M.questionMark(0, 0, 1)}</g>`; }
  // the hero bee (screen pos from map pos, depth bump while it passes near the camera)
  const bs = beeScale(t) * z, bx = sx(bee.x, camX, z), by = bee.y + (1 - z) * 0;
  if (t >= A.keluar - .05) g += hero(bx, GY - (GY - by) * z, bs, t, { flip: bee.flip, flap: 1, pollen: prog(t, A.bunga, A.bunga + 1) });
  // a few far bees around the hive (never confused with the hero: no mark, much smaller)
  for (let i = 0; i < 3; i++) { const a = t * (.9 + .3 * i) + i * 2; g += BEE.side(sx(60 + 160 * Math.cos(a), camX, z), GY - (180 + 60 * Math.sin(a * 1.2)) * z, .16 * z, { t: t + i, flip: Math.sin(a) > 0 }); }
  // "Lah, rumahnya di mana?" — the hive is small and far now; ring + question
  if (t > A.rumahnya) { const k = rv(t, A.rumahnya + .2, .4); g += `<g opacity="${f3(k)}" transform="translate(${f1(sx(60, camX, z))},${f1(GY - 360 * z)}) scale(${f3(1.2 * k)})">${M.questionMark(0, 0, 1, P.orange)}</g>`; }
  return g;
}
const hook = t => svg(scene(t));
const firstScene = t => svg(scene(Math.max(t, -1)));

// the phone joke insert: Mpi's phone with a map app (generic) vs the bee with nothing — short, on "gak bisa buka maps"
function mapsJoke(t) {
  let g = svg(scene(t));
  const k = rv(t, A.maps, .3) * (1 - prog(t, A.lah, A.lah + .3));
  if (k <= 0) return g;
  const card = `<g opacity="${f3(k)}"><rect x="90" y="220" width="420" height="560" rx="40" fill="#F6F3EB" ${L.S(7)}/>${CM.phone(300, 500, 1.2, t, { screen: 'home' })}
    <rect x="570" y="220" width="420" height="560" rx="40" fill="#F6F3EB" ${L.S(7)}/>${BEE.side(780, 500, 1.6, { t, mark: true })}
    <path d="M700,690 L860,690" stroke="${P.alert}" stroke-width="10" stroke-linecap="round" opacity="${f3(rv(t, A.maps + .5, .3))}"/><text x="780" y="740" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="40" fill="${P.alert}" opacity="${f3(rv(t, A.maps + .5, .3))}">×</text></g>`;
  return g.replace('</svg>', card + '</svg>');
}

module.exports = { A, GY, sx, MPI_X, scene, hook, firstScene, mapsJoke, beeHook, camHook };
