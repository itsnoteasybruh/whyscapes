// EP14 · A — HOOK in Mpi's kitchen: Mpi opens the fridge (light spills out) → POV from INSIDE the fridge: the box is pulled toward
// him → close-up on the counter: the lid clicks open, he leans in on the VO's sniff, recoils on "Lah" → "Padahal masuk kulkas lho":
// he looks at the fridge, a thought cloud (cold + box + ?) → "Coba kita ikuti jejaknya" (the portal lands on the food).
const L = require('./lib');
const { K, M, H, FG, MB, P, LINE, prog, eio, eout, lerp, clamp, f1, f3, hash, W, svg, TAG, rv, pulseK, blinkAt, ring, mpiAt, camKeys, camT, SNIFF } = L;

// v2 VO: "Bayangin... kulkas dibuka. Ada kotak makanan yang terlupa. Tutupnya diangkat... baunya bikin mundur. Padahal disimpan dingin. Kok masih bisa basi?"
// (old anchor names kept so the scene code reads the same; each maps to the v2 word that now triggers that action)
const A = { bayangin: W('bayangin'), buka: W('dibuka'), kulkas: W('kulkas'), nemu: W('ada'), kotak: W('kotak'), simpan: W('terlupa'), tutupnya: W('tutupnya'), dibuka: W('diangkat'),
  lah: W('mundur'), kok: W('mundur') + .2, aneh: W('mundur') + .35, padahal: W('padahal'), bukannya: W('disimpan'), awet: W('basi'), coba: W('coba') };
const MX = 470, MY = 1325, MS = 1.45;                    // Mpi in the kitchen (world = screen at cam 1)
const toRig = (sx, sy, x = MX, y = MY, s = MS) => [(sx - (x - 117 * s)) / s, (sy - (y - 456 * s)) / s];
const doorK = t => eio(prog(t, A.buka, A.buka + .55));

// ---------- 1. kitchen: Mpi reaches for the handle; the door opens with light (first scene / cover) ----------
const camHook = camKeys([[-1, [560, 930, 1]], [A.bayangin, [560, 930, 1]], [A.buka + .2, [640, 900, 1.1]], [A.nemu, [680, 880, 1.16]]], .35);
function kitchen(t) {
  const c = camHook(t), d = doorK(t);
  const reach = eio(prog(t, A.bayangin + .3, A.buka));           // hand to the handle, then it rides the door a little
  const [hx, hy] = toRig(684 + 40 * d, 880 - 10 * d);
  const right = reach > .02 ? { e: [lerp(196, 246, reach), lerp(318, 230, reach)], h: [lerp(150, hx, reach), lerp(344, hy, reach)] } : undefined;
  const lit = d * .9;
  const expr = t < A.buka + .3 ? 'penasaran' : 'netral';
  const mpi = mpiAt(MX, MY, MS, expr, { right, eye: [8 + 4 * d, -6], blink: blinkAt(t, [.6, 2.9]) });
  const glow = lit > 0 ? `<ellipse cx="${MX + 60}" cy="${MY - 420}" rx="260" ry="380" fill="${FG.FR.light}" opacity="${f3(.22 * lit)}"/>` : '';
  return svg(FG.kitchenView(t, { cam: c, door: d, over: mpi + glow, inside: { boxO: { lid: 0 } } }));
}
const firstScene = t => kitchen(Math.max(t, -1));

// ---------- 2. POV from inside the fridge: Mpi's lit face in the doorway, two arms reach in and pull the box ----------
function insideOut(t) {
  const k = eio(prog(t, A.kotak + .15, A.simpan + .1));          // box travels from the shelf to Mpi's chest
  const zoom = lerp(1.04, 1, prog(t, A.nemu, A.simpan + .6));
  let g = `<g transform="translate(540,960) scale(${f3(zoom)}) translate(-540,-960)">`;
  // beyond the doorway: the kitchen wall (tiles) in daylight
  g += `<rect x="0" y="0" width="1080" height="1920" fill="#F7F2E8"/>`;
  for (let y = 120; y < 1500; y += 90) g += `<path d="M0,${y} L1080,${y}" stroke="#E2D6C2" stroke-width="4"/>`;
  for (let x = 30; x < 1080; x += 90) g += `<path d="M${x},0 L${x},1500" stroke="#E2D6C2" stroke-width="4"/>`;
  // Mpi in the doorway (big), lit by the fridge lamp; looks down at the box, then at it in his hands
  const MS2 = 2.6, MX2 = 540, MY2 = 1720;
  g += `<g opacity=".97">${mpiAt(MX2, MY2, MS2, k > .6 ? 'penasaran' : 'netral', { eye: [0, lerp(10, 4, k)], blink: blinkAt(t, [4.4]) })}</g>`;
  g += `<rect x="0" y="0" width="1080" height="1920" fill="${FG.FR.light}" opacity=".16"/>`;
  // the box: from the shelf in the foreground toward Mpi (smaller = further from the camera)
  const bx = 540, by = lerp(1345, 1300, k), bs = lerp(1.6, .85, k);
  // arms: from Mpi's shoulders (screen) to the box sides
  const sh = (sx, sy) => [MX2 - 117 * MS2 + sx * MS2, MY2 - 456 * MS2 + sy * MS2];
  const reach = eio(prog(t, A.nemu - .1, A.kotak + .15));
  const armTo = (side, tx, ty) => { const [sx, sy] = sh(side === 'L' ? 62 : 172, 252), hx = lerp(sx + (side === 'L' ? -20 : 20), tx, reach), hy = lerp(sy + 140, ty, reach), ex = (sx + hx) / 2 + (side === 'L' ? -60 : 60), ey = (sy + hy) / 2 + 30;
    return `<path d="M${f1(sx)},${f1(sy)} Q${f1(ex)},${f1(ey)} ${f1(hx)},${f1(hy)}" fill="none" stroke="${LINE}" stroke-width="${f1(27 * MS2 * 1.1)}" stroke-linecap="round"/><path d="M${f1(sx)},${f1(sy)} Q${f1(ex)},${f1(ey)} ${f1(hx)},${f1(hy)}" fill="none" stroke="${M.C.jacket}" stroke-width="${f1(21.8 * MS2 * 1.1)}" stroke-linecap="round"/>
      <circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(11.5 * MS2 * 1.3)}" fill="${M.C.face}" stroke="${LINE}" stroke-width="5"/>`; };
  const hw = 150 * bs, hh = 100 * bs;
  // the fridge from inside: walls converge to the doorway frame (we are at the back of the fridge)
  const O = [150, 230, 930, 1420];  // doorway frame on screen
  const wall = (pts, fill) => `<path d="M${pts.map(p => p.join(',')).join(' L')} Z" fill="${fill}" ${L.S(6)}/>`;
  let fr = wall([[-20, -20], [1100, -20], [O[2], O[1]], [O[0], O[1]]], '#EDE7D6') + wall([[-20, -20], [O[0], O[1]], [O[0], O[3]], [-20, 1940]], '#E3DDCB') + wall([[1100, -20], [1100, 1940], [O[2], O[3]], [O[2], O[1]]], '#E3DDCB');
  fr += `<ellipse cx="540" cy="60" rx="420" ry="120" fill="${FG.FR.light}" opacity=".85"/><rect x="460" y="30" width="160" height="28" rx="14" fill="#FFF1B8" ${L.S(4)}/>`;
  for (const q of [.3, .62]) { const y = lerp(-20, O[1], 1) + (O[3] - O[1]) * q; fr += `<path d="M-20,${f1(y + 300 * (q - .5))} L${O[0]},${f1(y)} M1100,${f1(y + 300 * (q - .5))} L${O[2]},${f1(y)}" stroke="#CFC6AF" stroke-width="10" stroke-linecap="round"/>`; }
  // foreground shelf (glass slab) + items at the edges, then the box and the arms over everything
  const shelf = `<rect x="-20" y="1400" width="1120" height="560" fill="#DCE9E6" ${L.S(6)}/><rect x="60" y="1470" width="960" height="420" rx="30" fill="#EAF4F1" fill-opacity=".9" ${L.S(6)}/><path d="M-20,1350 L1100,1350 L1100,1420 L-20,1420 Z" fill="#DFF3F8" fill-opacity=".75" ${L.S(6)}/>
    <rect x="40" y="1110" width="120" height="240" rx="30" fill="#FBFBF7" ${L.S(6)}/><rect x="56" y="1076" width="88" height="44" rx="10" fill="${P.teal}" ${L.S(5)}/><rect x="40" y="1200" width="120" height="64" fill="#BFE3EC"/>
    <rect x="900" y="1170" width="170" height="180" rx="26" fill="#DFF3F8" fill-opacity=".85" ${L.S(6)}/><rect x="890" y="1140" width="190" height="40" rx="10" fill="${P.orange}" ${L.S(5)}/>`;
  g += fr + shelf + FG.box(bx, by, bs, { condense: 1 - k * .5, shadow: k < .5 }) + armTo('L', bx - hw, by - hh) + armTo('R', bx + hw, by - hh) + '</g>';
  return svg(g);
}

// ---------- 3. counter close-up: lid clicks open, sniff (VO), recoil ("Lah"), "kok baunya udah aneh?" ----------
function openBox(t) {
  const lid = eout(prog(t, A.dibuka - .05, A.dibuka + .3));                        // lid lifts on "diangkat"
  const smell = clamp(prog(t, SNIFF - .3, SNIFF + .25) * .55 + prog(t, A.lah - .1, A.lah + .3) * .45);
  const lean = eio(prog(t, SNIFF - .45, SNIFF)) * (1 - eio(prog(t, A.lah - .05, A.lah + .25)));
  const recoil = eio(prog(t, A.lah - .05, A.lah + .22)) * (1 - .5 * prog(t, A.aneh, A.aneh + 1.2));
  const camZ = lerp(1, 1.06, prog(t, A.tutupnya, A.padahal));
  let g = `<g transform="translate(540,900) scale(${f3(camZ)}) translate(-540,-900)">`;
  g += `<rect x="-200" y="-200" width="1480" height="2320" fill="${P.cream}"/>`;
  for (let y = 150; y < 1160; y += 96) g += `<path d="M-200,${y} L1280,${y}" stroke="#E2D6C2" stroke-width="4"/>`;
  for (let x = 10; x < 1280; x += 96) g += `<path d="M${x},150 L${x},1160" stroke="#E2D6C2" stroke-width="4"/>`;
  g += `<rect x="640" y="140" width="380" height="300" rx="16" fill="#BFE3EC" ${L.S(8)}/><path d="M830,140 L830,440 M640,290 L1020,290" ${L.S(8)}/><path d="M660,420 C720,380 780,400 820,360 C860,320 940,350 1000,320 L1000,420 Z" fill="${P.tealLeaf}" opacity=".5"/>`;
  g += FG.fridge(1040, 200, t, { magnets: false });                       // the fridge edge at the right (continuity)
  // Mpi behind the counter (legs hidden), right hand on the lid before the click
  const x = 290 + 40 * lean - 25 * recoil, feet = 1440 - 30 * lean;          // v2 QC r1: face stayed cut at the left edge on the recoil
  const [hx, hy] = toRig(380, 950, x, feet, 1.6);
  const onLid = 1 - prog(t, A.dibuka + .1, A.dibuka + .4);
  const nose = eio(prog(t, A.kok - .1, A.kok + .25));
  const right = onLid > 0 ? { e: [lerp(196, 240, onLid), lerp(318, 250, onLid)], h: [lerp(150, hx, onLid), lerp(344, hy, onLid)] } : nose > 0 ? { e: [lerp(196, 210, nose), lerp(318, 250, nose)], h: [lerp(150, 140, nose), lerp(344, 196, nose)] } : undefined;
  const expr = t < SNIFF - .5 ? 'penasaran' : t < A.lah - .05 ? 'menghirup' : t < A.kok ? 'terkejut' : t < A.padahal ? 'tidaknyaman' : 'bingung';
  g += mpiAt(x, feet, 1.6, expr, { right, tilt: 7 * lean - 9 * recoil, bodyDy: -6 * recoil, eye: [10, 6], blink: blinkAt(t, [9.3]) });
  if (t > A.lah && t < A.aneh + 1) { const k = rv(t, A.lah, .25) * (1 - prog(t, A.aneh + .6, A.aneh + 1)); g += `<g opacity="${f3(k)}">${M.exclaim(x + 20, feet - 760, 1.6)}</g>`; }
  // counter + box (in front of Mpi)
  g += `<rect x="-200" y="1150" width="1480" height="40" fill="${P.wood}" ${L.S(6)}/><path d="M-200,1162 L1280,1162" stroke="#D2A777" stroke-width="5"/><rect x="-200" y="1190" width="1480" height="800" fill="${P.teal}"/>
    <rect x="80" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="400" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/><rect x="720" y="1210" width="300" height="300" rx="10" fill="${P.tealMid}" ${L.S(5)}/>`;
  g += FG.box(600, 1150, 1.3, { lid, condense: .6 * (1 - lid), spoil: .25 });
  g += FG.odor(t, 590, 920, smell, { n: 5, w: 260, h: 380, sw: 11 });
  g += '</g>';
  return svg(g);
}

// ---------- 4. "Padahal masuk kulkas, lho. Bukannya di situ makanan jadi awet?" — Mpi faces the fridge, thought cloud ----------
const camQ = camKeys([[A.padahal - .3, [600, 900, 1.08]], [A.bukannya, [620, 820, 1.12]], [A.awet, [600, 700, 1.22]], [A.coba + .6, [560, 680, 1.35]]], .3);
function question(t) {
  const c = camQ(t);
  const box = FG.box(MX, MY - 200, .5, { lid: 0, spoil: .25, shadow: false });
  const mpi = mpiAt(MX, MY, MS, t < A.bukannya ? 'bingung' : 'berpikir', { left: 'walletL', right: 'walletR', eye: [9, -8], blink: blinkAt(t, [10.9, 12.5]) });
  const bk = rv(t, A.bukannya, .4), aw = rv(t, A.awet, .3);
  let over = mpi + box + FG.odor(t, MX, MY - 300, .5, { n: 3, w: 90, h: 180, sw: 8 });
  if (bk > 0) {
    over += H.thought(420, 470, 440, 300, t, { o: bk, tail: [480, 700] });
    over += `<g opacity="${f3(bk)}" transform="translate(120,0)"><rect x="170" y="390" width="110" height="170" rx="16" fill="${FG.FR.body}" ${L.S(5)}/><path d="M170,440 L280,440" ${L.S(5)}/>${FG.snow(225, 500, .9, FG.FR.coldD)}
      <path d="M300,480 L340,480" ${L.S(7)}/><path d="M330,468 L344,480 L330,492" fill="none" ${L.S(7)}/>${FG.box(420, 530, .42, { shadow: false })}</g>`;
    if (aw > 0) over += `<g transform="translate(590,420) scale(${f3(1.2 * K.back(aw) + .2 * pulseK(t, A.awet + .5, .6))})">${M.questionMark(0, 0, 1.2, P.orange)}</g>`;
  }
  return svg(FG.kitchenView(t, { cam: c, door: 1 - eio(prog(t, A.padahal - .2, A.padahal + .5)), over }));
}

module.exports = { A, kitchen, firstScene, insideOut, openBox, question };
