// EP13 · D — distance: while the bee flies, the scenery moves past its eyes (near things fast, far things slow); that motion
// helps give a sense of how far it has flown — an accumulating, approximate sense (a jar filling with texture, NO numbers), not
// a kilometre readout; different scenery (dense flowers vs open lawn/fence) gives a different amount of motion → different estimate.
const L = require('./lib');
const A = require('./scenes_a');
const { K, M, H, GD, BEE, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, noise, W, svg, TAG, camKeys, camT, rv, pulseK, blinkAt, ring, hero } = L;

const D = { jarak: W('jaraknya'), saat: W('saat', 59), terbang: W('terbang', 60), pemandangan: W('pemandangan', 60), bergerak: W('bergerak', 61), melewati: W('melewati', 61.5),
  matanya: W('matanya'), gerakan: W('gerakan', 63), gambaran: W('gambaran'), jauh: W('jauh', 65), bukan: W('bukan', 67), kilometer: W('kilometer'), kepalanya: W('kepalanya'),
  pemandangan2: W('pemandangan', 70), berbeda: W('berbeda', 71), petunjuk: W('petunjuk', 72), saat2: W('saat', 73.5) };
const GY = A.GY;

// ---------- 1. tracking beside the flying bee: the five depth layers slide at different speeds (optic flow) ----------
// camera moves with the bee across the garden; at "matanya" a short insert of the stylised view through its eyes
function flight(t) {
  const camX = lerp(-200, 1500, prog(t, D.jarak - .4, D.gerakan + 1.6));
  let g = GD.panorama(t, camX, { gy: GY, zoom: 1.15, sunX: 820, sunY: 300 });
  // speed streaks on the NEAR layers only (far stays calm) — the difference is the point
  const sk = rv(t, D.bergerak, .5) * (1 - prog(t, D.matanya, D.matanya + .3));
  if (sk > 0) for (let i = 0; i < 9; i++) { const y = GY + 140 + i * 70, x = ((-t * 1600 + i * 290) % 1400 + 1400) % 1400 - 200; g += `<path d="M${f1(x)},${f1(y)} l${f1(140 + 60 * (i % 3))},0" stroke="#F6F3EB" stroke-width="${6 + i % 3 * 3}" stroke-linecap="round" opacity="${f3(.7 * sk)}"/>`; }
  g += hero(540, 640 + 24 * Math.sin(t * 2.2), .9, t, {});
  // layer speed cue on "bergerak melewati": a fast arrow at the bottom, a slow one at the skyline
  const ak = rv(t, D.melewati, .4) * (1 - prog(t, D.matanya, D.matanya + .3));
  if (ak > 0) g += `<g opacity="${f3(ak)}"><path d="M760,1290 L320,1290 M360,1262 L316,1290 L360,1318" fill="none" stroke="${P.orange}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M640,540 L560,540 M582,522 L556,540 L582,558" fill="none" stroke="${P.tealGlow}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`
    + TAG('DEKAT: CEPAT', { s: ak, o: ak }, 540, 1230, { size: 26 }) + TAG('JAUH: PELAN', { s: ak, o: ak }, 600, 480, { size: 24, fill: P.tealGlow });
  return svg(g);
}
// the bee's-eye insert: a round lens, ground texture streaming from the centre outward (simplified, not a literal compound-eye image)
function beeEye(t) {
  let g = `<rect width="1080" height="1920" fill="#DCE9C2"/>`;
  g += `<defs><clipPath id="e13eye"><circle cx="540" cy="760" r="430"/></clipPath></defs><g clip-path="url(#e13eye)"><rect x="0" y="300" width="1080" height="940" fill="#CFE0A8"/>`;
  for (let i = 0; i < 150; i++) {   // texture elements flowing past (flowers / grass tufts), positions advance with time → optic flow
    const a = hash(i * 3.1) * Math.PI * 2, u = ((t * .55 + hash(i * 7.7)) % 1), r = 40 + 520 * u * u, x = 540 + Math.cos(a) * r, y = 760 + Math.sin(a) * r * .8, s = .2 + 1.4 * u;
    g += hash(i) > .55 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(14 * s)}" fill="${GD.G.flowers[i % 5]}" ${L.S(2.5)}/>` : `<path d="M${f1(x)},${f1(y)} l${f1(-6 * s)},${f1(-22 * s)} m${f1(6 * s)},${f1(22 * s)} l0,${f1(-28 * s)}" stroke="${GD.G.groundD}" stroke-width="${f1(3 + 3 * s)}" stroke-linecap="round"/>`;
  }
  g += `</g><circle cx="540" cy="760" r="430" fill="none" stroke="${LINE}" stroke-width="14"/><circle cx="540" cy="760" r="430" fill="none" stroke="#F6F3EB" stroke-width="5" opacity=".6"/>`;
  // hexagon hint on the lens rim only (stylised eye, not a literal image)
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; g += `<path transform="translate(${f1(540 + Math.cos(a) * 452)},${f1(760 + Math.sin(a) * 452)}) rotate(${f1(a * 180 / Math.PI)})" d="M-14,-8 L0,-16 L14,-8 L14,8 L0,16 L-14,8 Z" fill="#E7B84A" ${L.S(3)}/>`; }
  g += TAG('DARI MATA LEBAH (DISEDERHANAKAN)', { s: 1, o: 1 }, 540, 1260, { size: 22, fill: '#F6F3EB' });
  return svg(g);
}

// ---------- 2. an approximate sense of distance builds up (jar fills with streaming texture) — no kilometre counter ----------
function estimate(t) {
  const camX = lerp(300, 1300, prog(t, D.gerakan - .5, D.kepalanya + 1));
  let g = GD.panorama(t, camX, { gy: GY, zoom: .9, sunX: 820, sunY: 300 });
  g += hero(420, 660 + 22 * Math.sin(t * 2.2), .7, t, {});
  // the "jar": a soft rounded vessel; fill = accumulated motion (wobbly, approximate edge)
  const fill = clamp(prog(t, D.gerakan, D.jauh + 1.5)) * .85, jx = 800, jy = 760, jw = 220, jh = 360;
  const lvl = jy + jh / 2 - jh * fill, wav = 10 * Math.sin(t * 3);
  g += `<g opacity="${f3(rv(t, D.gerakan, .4))}"><defs><clipPath id="e13jar"><rect x="${jx - jw / 2}" y="${jy - jh / 2}" width="${jw}" height="${jh}" rx="50"/></clipPath></defs>`
    + `<rect x="${jx - jw / 2}" y="${jy - jh / 2}" width="${jw}" height="${jh}" rx="50" fill="#F6F3EB" fill-opacity=".7" ${L.S(7)}/>`
    + `<g clip-path="url(#e13jar)"><path d="M${jx - jw},${f1(lvl + wav)} Q${jx},${f1(lvl - wav)} ${jx + jw},${f1(lvl + wav)} L${jx + jw},${jy + jh} L${jx - jw},${jy + jh} Z" fill="${P.tealGlow}" opacity=".75"/>`
    + [...Array(14)].map((_, i) => { const y = lvl + 20 + ((i * 47 + t * 60) % Math.max(1, jy + jh / 2 - lvl)); return `<circle cx="${f1(jx - 80 + (i * 37) % 160)}" cy="${f1(y)}" r="9" fill="${GD.G.flowers[i % 5]}" opacity=".9"/>`; }).join('') + `</g>`
    // dashed, fuzzy band = "roughly", never a tick scale
    + `<path d="M${jx - jw / 2 - 20},${f1(lvl - 26)} L${jx + jw / 2 + 20},${f1(lvl - 26)} M${jx - jw / 2 - 20},${f1(lvl + 26)} L${jx + jw / 2 + 20},${f1(lvl + 26)}" stroke="${P.orange}" stroke-width="6" stroke-dasharray="10 10" opacity=".8"/></g>`;
  g += TAG('PERKIRAAN JARAK', { s: rv(t, D.gambaran, .3), o: rv(t, D.gambaran, .3) * (1 - prog(t, D.bukan, D.bukan + .3)) }, jx, 520, { size: 28, fill: '#F6F3EB' });
  // "bukan angka kilometer": a digital readout appears with dashes, then gets crossed out
  const kk = rv(t, D.kilometer, .3) * (1 - prog(t, D.pemandangan2 - .3, D.pemandangan2));
  if (kk > 0) { const x = 500, y = 330; g += `<g opacity="${f3(kk)}"><rect x="${x - 170}" y="${y - 60}" width="340" height="120" rx="20" fill="${LINE}"/><text x="${x}" y="${y + 22}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="64" fill="#7CFFB2">– – km</text>`
    + `<path d="M${x - 190},${y + 70} L${x + 190},${y - 70}" stroke="${P.alert}" stroke-width="16" stroke-linecap="round" opacity="${f3(rv(t, D.kilometer + .4, .3))}"/></g>`; }
  return svg(g);
}

// ---------- 3. different scenery, different clue: dense flowers (lots of motion) vs open lawn by the fence (little) ----------
function differ(t) {
  let g = `<rect width="1080" height="1920" fill="#F3EEE4"/>`;
  const panel = (y0, dense, k) => {
    let p = `<g opacity="${f3(k)}"><defs><clipPath id="e13p${dense ? 'a' : 'b'}"><rect x="40" y="${y0}" width="1000" height="560" rx="36"/></clipPath></defs><g clip-path="url(#e13p${dense ? 'a' : 'b'})"><rect x="40" y="${y0}" width="1000" height="560" fill="${GD.G.ground}"/>`;
    const n = dense ? 40 : 7, v = 520;
    for (let i = 0; i < n; i++) { const x = ((i * 1000 / n + 30 * hash(i) - t * v) % 1100 + 1100) % 1100 - 30, y = y0 + 120 + 380 * hash(i * 3.3);
      p += dense ? GD.flowerClump(x, y + 60, .7, t, i) : `<path d="M${f1(x)},${f1(y + 60)} l-8,-30 m8,30 l0,-38 m0,38 l10,-28" stroke="${GD.G.groundD}" stroke-width="6" stroke-linecap="round"/>`; }
    if (!dense) p += GD.fence(-200, 1300, y0 + 220, .9).replace(/<rect x="([\d.-]+)"/g, (m, x) => `<rect x="${f1(((+x - t * 120) % 1500 + 1500) % 1500 - 200)}"`);
    p += `</g><rect x="40" y="${y0}" width="1000" height="560" rx="36" fill="none" ${L.S(7)}/>`;
    p += hero(300, y0 + 230, .6, t, {});
    // small jar per panel filling at a different rate
    const f = clamp(prog(t, D.berbeda, D.saat2 + .3)) * (dense ? .8 : .3), jx = 900, jy = y0 + 280;
    p += `<rect x="${jx - 60}" y="${jy - 110}" width="120" height="220" rx="30" fill="#F6F3EB" ${L.S(6)}/><rect x="${jx - 54}" y="${f1(jy + 104 - 208 * f)}" width="108" height="${f1(208 * f)}" rx="24" fill="${P.tealGlow}" opacity=".8"/></g>`;
    return p;
  };
  g += panel(170, true, rv(t, D.pemandangan2, .4)) + panel(780, false, rv(t, D.berbeda, .4));
  g += TAG('PADANG BUNGA', { s: rv(t, D.pemandangan2, .3), o: rv(t, D.pemandangan2, .3) }, 270, 150, { size: 26 }) + TAG('RUMPUT & PAGAR', { s: rv(t, D.berbeda, .3), o: rv(t, D.berbeda, .3) }, 270, 760, { size: 26, fill: '#F6F3EB' });
  return svg(g);
}

const list = [[flight, D.jarak - .1, 'xf', .35], [beeEye, D.matanya - .05, 'xf', .3], [estimate, D.gerakan - .1, 'xf', .35], [differ, D.pemandangan2 - .1, 'xf', .35]];
module.exports = { list, D, flight, beeEye, estimate, differ };
