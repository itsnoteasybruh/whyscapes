// LOCATION KIT v1.10 (EP09 "Ke Mana Sampah Pergi Setelah Diangkut Truk?") — household waste journey props, all generic (no agency logos).
// Flat fills, #231E1A outline, kit palette. Anchors: (x, y) = bottom-centre unless noted; s = scale.
// Content rules baked in: three readable items (food scraps, PET bottle, oily wrapper); no gore, no disaster imagery, no neon "toxic" liquids;
// landfill gas = small slow bubbles (never explosions); leachate = muted brown-amber drops, not glowing green.
const { PALETTE: P, LINE, S, lerp, clamp, eio, eout } = require('../engine/core');
const H = require('./haze');
const { f1, f3, hash } = H;

const WS = {
  bag: '#3B4A48', bagHi: '#5A6B68', food: '#B9824A', foodD: '#8C5A2E', peel: '#E7C46A', bottle: '#DFF3F8', cap: '#3FB8A9', wrap: '#E07A5F', oil: '#C99A3A',
  compost: '#6B4A2E', compostD: '#4E341F', soil: '#B08A5E', soilD: '#8E6A43', cover: '#C9A66B', clay: '#9C7A55', liner: '#2F3B3A', leach: '#A8823F', leachD: '#7E5F2B',
  waste: ['#8FA3A0', '#C9B48E', '#7FA7B5', '#D9A07A', '#A7B98A', '#BFA8C9', '#E3D3A6'], truck: '#E9893A', truckD: '#B9652A', body: '#F6F3EB', concrete: '#CFC8BA',
  grass: '#A7B98A', gas: '#CFE3DF', o2: '#BFE6EE', microbe: '#9DB87A',
};

// ---------- the three items ----------
function food(x, y, s = 1, o = {}) {                       // food scraps: banana peel + rice clump + a bone-free veggie end (no meat gore)
  return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})">
    <path d="M-34,0 C-40,-18 -30,-30 -14,-28 C-4,-40 14,-40 22,-26 C36,-28 42,-12 34,0 Z" fill="#F4EFE4" ${S(3)}/>${[[-16, -14], [-4, -20], [10, -16], [20, -8]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="5" ry="3" fill="#E3DACB"/>`).join('')}
    <path d="M-30,-6 C-46,-30 -40,-56 -26,-62 C-24,-48 -20,-34 -10,-20 C-2,-40 6,-50 14,-50 C10,-36 2,-20 -6,-6 Z" fill="${WS.peel}" ${S(3)}/><path d="M-26,-62 L-24,-68" ${S(4)}/>
    <path d="M26,-6 C36,-20 48,-22 52,-12 C50,-2 40,4 26,-6 Z" fill="#9DB87A" ${S(3)}/></g>`;
}
function petBottle(x, y, s = 1, o = {}) {                  // empty PET bottle lying or standing (o.lie), o.dirty 0..1 smears
  const g = `<path d="M-20,0 L-20,-86 C-20,-98 -10,-104 -8,-116 L-8,-126 L8,-126 L8,-116 C10,-104 20,-98 20,-86 L20,0 Z" fill="${WS.bottle}" fill-opacity=".9" ${S(3)}/>
    <rect x="-20" y="-66" width="40" height="28" fill="${P.tealGlow}" opacity=".7"/><rect x="-10" y="-140" width="20" height="16" rx="4" fill="${WS.cap}" ${S(3)}/><path d="M-12,-84 Q-10,-50 -12,-10" stroke="#fff" stroke-width="4" opacity=".7" fill="none"/>
    ${o.dirty ? `<path d="M-18,-30 C-8,-40 6,-24 18,-34 L18,-10 C4,-4 -8,-16 -18,-8 Z" fill="${WS.foodD}" opacity="${f3(.55 * o.dirty)}"/><circle cx="-6" cy="-52" r="6" fill="${WS.oil}" opacity="${f3(.5 * o.dirty)}"/>` : ''}`;
  return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot ?? (o.lie ? -90 : 0))})">${g}</g>`;
}
function oilyWrap(x, y, s = 1, o = {}) {                   // crumpled oily food wrapper (paper/plastic laminate)
  return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})">
    <path d="M-34,0 L-40,-24 L-22,-44 L2,-38 L18,-52 L38,-30 L34,-6 L14,2 Z" fill="${WS.wrap}" ${S(3)}/><path d="M-22,-44 L-8,-20 L18,-52 M-8,-20 L14,2 M-8,-20 L-40,-24" fill="none" stroke="#B5532A" stroke-width="2.5"/>
    <ellipse cx="10" cy="-24" rx="12" ry="8" fill="${WS.oil}" opacity=".55"/><ellipse cx="-18" cy="-14" rx="7" ry="5" fill="${WS.oil}" opacity=".45"/></g>`;
}
const ITEM = { food, bottle: petBottle, wrap: oilyWrap };

// ---------- the bag ----------
// open 0..1: bag turns translucent (x-ray) and shows the 3 items; o.tied knot; o.sway
function bag(x, y, s = 1, t = 0, o = {}) {
  const open = clamp(o.open || 0), sw = o.sway ? 3 * Math.sin(t * 4) : 0;
  let inside = '';
  if (open > 0) inside = `<g opacity="${f3(open)}">${food(-26, -24, .62)}${petBottle(18, -14, .5, { rot: -70, dirty: o.dirty })}${oilyWrap(4, -62, .6, { rot: 12 })}</g>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(sw)})"><ellipse cx="0" cy="2" rx="64" ry="9" fill="#000" opacity=".14"/>
    <path d="M-60,0 C-70,-40 -62,-96 -36,-118 L-18,-122 L18,-122 L36,-118 C62,-96 70,-40 60,0 Z" fill="${o.col || WS.bag}" fill-opacity="${f3(1 - .72 * open)}" ${S(5)}/>
    ${inside}<path d="M-34,-60 C-30,-90 -20,-108 -10,-116" fill="none" stroke="${WS.bagHi}" stroke-width="6" stroke-linecap="round" opacity="${f3(.7 * (1 - open))}"/>
    <path d="M-18,-122 C-30,-150 -6,-158 0,-136 C6,-158 30,-150 18,-122 Z" fill="${o.col || WS.bag}" ${S(4)}/></g>`;
}

// ---------- vehicles (side view, facing +x unless o.flip) ----------
const wheel = (wx, wy, r, spin) => `<g transform="translate(${f1(wx)},${f1(wy)})"><circle r="${r}" fill="#2B2F2E" ${S(5)}/><circle r="${f1(r * .4)}" fill="#C9D3D2" ${S(3)}/><g transform="rotate(${f1(spin)})"><path d="M${f1(-r * .35)},0 L${f1(r * .35)},0 M0,${f1(-r * .35)} L0,${f1(r * .35)}" stroke="#7D8786" stroke-width="4"/></g></g>`;
// small neighbourhood collector (pickup with a tall cargo box). load 0..1 visible bags; dump 0..1 tilts the box
function pickup(x, y, s, t, o = {}) {
  const spin = (o.dist || 0) / 36 * 57.3, dump = eio(clamp(o.dump || 0)), col = o.col || '#5E8F6E';
  let bags = '';
  const n = Math.round((o.load ?? 1) * 5);
  for (let i = 0; i < n; i++) bags += bag(-200 + (i % 3) * 64, -150 - Math.floor(i / 3) * 40, .5, 0, { col: ['#3B4A48', '#4F5E3E', '#3B4A48', '#5A4E3E', '#3B4A48'][i] });
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><ellipse cx="0" cy="3" rx="260" ry="14" fill="#000" opacity=".14"/>
    <g transform="rotate(${f1(-22 * dump)} -250 -70)"><rect x="-270" y="-230" width="250" height="160" rx="8" fill="${col}" ${S(5)}/><path d="M-260,-200 L-30,-200" stroke="#fff" stroke-width="6" opacity=".35"/>
    <clipPath id="pkbox${o.id || 0}"><rect x="-266" y="-300" width="242" height="226"/></clipPath><g clip-path="url(#pkbox${o.id || 0})">${bags}</g>
    ${[-240, -190, -140, -90].map(xx => `<path d="M${xx},-230 L${xx},-72" stroke="#000" stroke-width="3" opacity=".15"/>`).join('')}</g>
    <rect x="-280" y="-80" width="470" height="40" rx="8" fill="#5B6463" ${S(5)}/>
    <path d="M0,-80 L0,-200 C0,-214 10,-222 24,-222 L110,-222 C130,-222 140,-212 150,-196 L188,-132 L190,-80 Z" fill="${o.cab || '#F6F3EB'}" ${S(5)}/><path d="M24,-206 L100,-206 L134,-148 L24,-148 Z" fill="#BFE3EC" ${S(4)}/>
    <rect x="160" y="-112" width="30" height="16" rx="5" fill="#FFF3C4" ${S(3)}/>${wheel(-200, -40, 40, spin)}${wheel(110, -40, 40, spin)}</g>`;
}
// larger transfer truck (arm-roll style container). hook 0..1 lowers the container to the ground (TPS swap); dump 0..1 tilts
function bigTruck(x, y, s, t, o = {}) {
  const spin = (o.dist || 0) / 46 * 57.3, dump = eio(clamp(o.dump || 0)), col = o.col || WS.truck;
  const load = o.load ?? 1, top = -330 - 60 * load;
  let heap = '';
  if (load > 0) for (let i = 0; i < 9; i++) heap += `<ellipse cx="${-470 + (i % 5) * 80 + (i > 4 ? 40 : 0)}" cy="${f1(-330 - 34 * (i > 4) - 26 * load)}" rx="46" ry="${f1(22 + 10 * load)}" fill="${WS.waste[i % 7]}" ${S(3)}/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><ellipse cx="-60" cy="4" rx="420" ry="18" fill="#000" opacity=".14"/>
    <g transform="rotate(${f1(-26 * dump)} -540 -90)">${heap}<path d="M-540,-90 L-540,-330 L-120,-330 L-100,-90 Z" fill="${col}" ${S(6)}/><path d="M-520,-300 L-130,-300" stroke="#fff" stroke-width="8" opacity=".3"/>
    ${[-470, -390, -310, -230, -160].map(xx => `<path d="M${xx},-322 L${xx + 4},-98" stroke="#000" stroke-width="4" opacity=".14"/>`).join('')}</g>
    <rect x="-560" y="-96" width="760" height="44" rx="8" fill="#4A5453" ${S(5)}/>
    <path d="M60,-96 L60,-280 C60,-296 72,-306 90,-306 L190,-306 C214,-306 228,-292 236,-270 L270,-170 L272,-96 Z" fill="#F6F3EB" ${S(6)}/><path d="M92,-286 L184,-286 L222,-200 L92,-200 Z" fill="#BFE3EC" ${S(4)}/>
    <rect x="236" y="-140" width="36" height="20" rx="6" fill="#FFF3C4" ${S(3)}/>${wheel(-440, -46, 52, spin)}${wheel(-320, -46, 52, spin)}${wheel(150, -46, 52, spin)}
    ${dump > 0 ? `<path d="M-60,-100 L${f1(-60 - 160 * dump)},${f1(-120 - 80 * dump)}" stroke="${LINE}" stroke-width="22" stroke-linecap="round"/><path d="M-60,-100 L${f1(-60 - 160 * dump)},${f1(-120 - 80 * dump)}" stroke="#AEB8B9" stroke-width="12" stroke-linecap="round"/>` : ''}</g>`;
}
// bulldozer / landfill compactor (side), blade at front; k = blade push phase; dist = travelled for treads
function dozer(x, y, s, t, o = {}) {
  const tr = ((o.dist || 0) % 40), col = o.col || '#E7C46A';
  let treads = '';
  for (let i = 0; i < 12; i++) { const xx = -170 + ((i * 34 + tr) % 360); treads += `<rect x="${f1(xx)}" y="-24" width="14" height="14" fill="#5B6463"/>`; }
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${o.flip ? -s : s},${s})"><ellipse cx="0" cy="4" rx="230" ry="14" fill="#000" opacity=".14"/>
    <rect x="-190" y="-64" width="380" height="64" rx="32" fill="#3A3F3E" ${S(5)}/>${treads}${[-150, -70, 10, 90, 150].map(xx => `<circle cx="${xx}" cy="-32" r="20" fill="#7D8786" ${S(3)}/>`).join('')}
    <path d="M-170,-64 L-170,-150 L60,-150 L120,-64 Z" fill="${col}" ${S(5)}/><path d="M-120,-150 L-120,-280 L40,-280 L60,-150 Z" fill="${col}" ${S(5)}/><path d="M-96,-260 L24,-260 L38,-170 L-96,-170 Z" fill="#BFE3EC" ${S(4)}/>
    <path d="M110,-120 L210,-110 L230,-20 L200,0 L190,-20 L180,-100" fill="#7D8786" ${S(5)}/><path d="M60,-110 L180,-100" stroke="${LINE}" stroke-width="16"/><path d="M60,-110 L180,-100" stroke="#AEB8B9" stroke-width="8"/>
    <rect x="-180" y="-170" width="30" height="40" rx="4" fill="#5B6463" ${S(3)}/>${o.smoke ? `<circle cx="-165" cy="-200" r="${f1(10 + 6 * Math.sin(t * 6))}" fill="#C9C2B4" opacity=".5"/>` : ''}</g>`;
}

// ---------- places ----------
// Mpi's house front (morning): wall, door, window, low fence + gate, a bag spot by the gate; x,y = ground centre
function houseFront(x, y, s = 1, t = 0, o = {}) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-420" y="-560" width="840" height="560" fill="#F3E3C7" ${S(6)}/><path d="M-470,-560 L0,-780 L470,-560 Z" fill="#C96F5A" ${S(6)}/>
    <rect x="-330" y="-420" width="220" height="190" rx="10" fill="#BFE3EC" ${S(5)}/><path d="M-220,-420 L-220,-230 M-330,-325 L-110,-325" stroke="${P.teal}" stroke-width="10"/><rect x="-350" y="-236" width="260" height="22" rx="6" fill="${P.wood}" ${S(4)}/>
    <rect x="60" y="-380" width="170" height="380" rx="10" fill="${P.teal}" ${S(5)}/><circle cx="200" cy="-190" r="10" fill="#E7C46A" ${S(3)}/>
    ${[[-380, -40], [-300, -40]].map(([a, b]) => H.tree ? '' : '').join('')}
    <rect x="-540" y="-120" width="1080" height="120" fill="none"/>${Array.from({ length: 19 }, (_, i) => `<rect x="${-540 + i * 60}" y="-150" width="22" height="150" rx="6" fill="#F6F3EB" ${S(3)}/>`).join('')}
    <rect x="-560" y="-120" width="1120" height="16" fill="#F6F3EB" ${S(3)}/><rect x="-560" y="-50" width="1120" height="16" fill="#F6F3EB" ${S(3)}/>
    <ellipse cx="-470" cy="-30" rx="70" ry="40" fill="#9DB87A" ${S(4)}/><ellipse cx="470" cy="-30" rx="70" ry="40" fill="#9DB87A" ${S(4)}/></g>`;
}
// TPS: low concrete enclosure with a roof, a container bay, a few bags waiting; x,y = ground centre. Sign text optional (generic "TPS")
function tps(x, y, s = 1, t = 0, o = {}) {
  let piles = '';
  const n = Math.round((o.fill ?? .7) * 10);
  for (let i = 0; i < n; i++) piles += bag(-260 + (i % 5) * 70 + (i > 4 ? 30 : 0), -40 - (i > 4 ? 60 : 0), .55, t, { col: ['#3B4A48', '#4F5E3E', '#5A4E3E', '#3B4A48', '#6B5A3A'][i % 5] });
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-340" y="-260" width="680" height="260" fill="#E3DCCB" ${S(6)}/><path d="M-380,-260 L0,-340 L380,-260 Z" fill="#9AA6A4" ${S(6)}/>
    <rect x="-310" y="-230" width="620" height="230" fill="#CFC8BA"/>${piles}<rect x="-360" y="-60" width="40" height="60" fill="#CFC8BA" ${S(4)}/><rect x="320" y="-60" width="40" height="60" fill="#CFC8BA" ${S(4)}/>
    ${o.sign !== false ? `<rect x="-90" y="-320" width="180" height="56" rx="10" fill="${P.teal}" ${S(4)}/><text y="-280" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="38" letter-spacing="6" fill="#FBF6EC">TPS</text>` : ''}</g>`;
}
// sorting line (TPS 3R-like): conveyor x0..x1 at height y (belt top), with a roof frame; items move by o.items(t) the scene supplies
function sortLine(x0, x1, y, t, o = {}) {
  let g = `<rect x="${f1(x0)}" y="${f1(y)}" width="${f1(x1 - x0)}" height="34" rx="17" fill="#5B6463" ${S(5)}/>`;
  for (let x = x0 + 20; x < x1 - 10; x += 44) g += `<circle cx="${f1(x + ((t * 60) % 44))}" cy="${f1(y + 17)}" r="7" fill="#AEB8B9"/>`;
  for (let x = x0 + 40; x < x1; x += 260) g += `<rect x="${f1(x)}" y="${f1(y + 34)}" width="18" height="${o.legs || 160}" fill="#7D8786" ${S(3)}/>`;
  return g;
}
// three collection points after sorting: compost bin, recyclables sack, residue bin; labels optional (≤ 1 word)
function compostBin(x, y, s = 1, t = 0, o = {}) {            // ventilated wooden box (aerobic composting), heap darkens with o.age 0..1, gentle warm vapour
  const age = clamp(o.age || 0), col = `rgb(${f1(lerp(185, 107, age))},${f1(lerp(130, 74, age))},${f1(lerp(74, 46, age))})`;
  let slats = '';
  for (let i = 0; i < 5; i++) slats += `<rect x="-150" y="${-40 - i * 44}" width="300" height="30" rx="4" fill="${P.wood}" ${S(4)}/>`;
  const steam = o.steam ? [0, 1, 2].map(i => { const a = (t * .5 + i / 3) % 1; return `<circle cx="${f1(-40 + i * 40 + 10 * Math.sin(t + i))}" cy="${f1(-250 - 70 * a)}" r="${f1(10 + 14 * a)}" fill="#fff" opacity="${f3(.35 * (1 - a))}"/>`; }).join('') : '';
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-130,-200 C-90,-260 90,-260 130,-200 Z" fill="${col}" ${S(4)}/>${slats}${steam}</g>`;
}
function sack(x, y, s = 1, n = 3, o = {}) {                   // woven sack collecting clean bottles
  let b = ''; for (let i = 0; i < Math.floor(n); i++) b += petBottle(-40 + (i % 3) * 40, -150 - Math.floor(i / 3) * 24, .5, { rot: -20 + 20 * (i % 3) });
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">${b}<path d="M-90,-170 C-100,-100 -96,-30 -80,0 L80,0 C96,-30 100,-100 90,-170 Z" fill="#F4EFE4" ${S(5)}/>${Array.from({ length: 6 }, (_, i) => `<path d="M-86,${-150 + i * 26} L86,${-150 + i * 26}" stroke="#D8CFBC" stroke-width="3"/>`).join('')}</g>`;
}
function residueBin(x, y, s = 1, o = {}) {
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><path d="M-110,-220 L110,-220 L90,0 L-90,0 Z" fill="#7D8786" ${S(5)}/><rect x="-124" y="-240" width="248" height="28" rx="8" fill="#5B6463" ${S(4)}/>
    <path d="M-60,-180 L-50,-30 M0,-180 L0,-30 M60,-180 L50,-30" stroke="#5B6463" stroke-width="6" stroke-linecap="round"/></g>`;
}

// ---------- the landfill ----------
// managed cell cross-section. x0..x1, base y (bottom of waste), height h. o.cells 0..N layers built, o.coverK per layer, o.liner, o.pipes (leachate collection),
// o.vents (gas vents), o.pond (leachate pond at the side). Returns { g, layerY(i) } — drawn bottom-up.
function landfillSection(x0, x1, base, t, o = {}) {
  const N = o.N || 5, lh = o.lh || 90, cells = clamp(o.cells ?? N, 0, N);
  let g = '';
  // excavated basin + clay + liner
  g += `<path d="M${x0 - 160},${base - N * lh - 40} L${x0},${base} L${x1},${base} L${x1 + 160},${base - N * lh - 40} L${x1 + 260},${base - N * lh - 40} L${x1 + 260},${base + 220} L${x0 - 260},${base + 220} L${x0 - 260},${base - N * lh - 40} Z" fill="${WS.clay}" ${S(5)}/>`;
  if (o.liner !== false) g += `<path d="M${x0 - 160},${base - N * lh - 40} L${x0},${base} L${x1},${base} L${x1 + 160},${base - N * lh - 40}" fill="none" stroke="${WS.liner}" stroke-width="14"/>`;
  if (o.pipes) for (let x = x0 + 60; x < x1; x += 160) g += `<circle cx="${x}" cy="${base - 18}" r="14" fill="#AEB8B9" ${S(3)}/>`;
  for (let i = 0; i < N; i++) {
    const k = clamp(cells - i); if (k <= 0) break;
    const yb = base - i * lh, yt = yb - lh * .82 * eout(k), wB = lerp(x0, x0 - 160 * (i * lh) / (N * lh + 40), 1), wE = lerp(x1, x1 + 160 * (i * lh) / (N * lh + 40), 1);
    let blobs = '';
    for (let j = 0; j < 22; j++) { const bx = wB + 30 + (j / 22) * (wE - wB - 60), by = yb - 20 - (lh * .62) * hash(j * 3.1 + i * 7) * eout(k); blobs += `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="${f1(26 + 14 * hash(j + i))}" ry="${f1(14 + 8 * hash(j * 2 + i))}" fill="${WS.waste[(j + i) % 7]}" ${S(2.5)}/>`; }
    g += `<path d="M${f1(wB)},${f1(yb)} L${f1(wE)},${f1(yb)} L${f1(wE + 16)},${f1(yt)} L${f1(wB - 16)},${f1(yt)} Z" fill="#9C9C88" ${S(3)}/>${blobs}`;
    const ck = clamp(o.coverK ? o.coverK(i) : (cells - i - .6) / .4);
    if (ck > 0) g += `<path d="M${f1(wB - 16)},${f1(yt)} L${f1(lerp(wB - 16, wE + 16, ck))},${f1(yt)} L${f1(lerp(wB - 16, wE + 16, ck))},${f1(yt - lh * .18)} L${f1(wB - 16)},${f1(yt - lh * .18)} Z" fill="${WS.cover}" ${S(3)}/>`;
  }
  if (o.vents) for (const vx of o.vents) g += `<rect x="${vx - 10}" y="${base - N * lh - 120}" width="20" height="${N * lh + 100}" fill="#7D8786" opacity=".9" ${S(3)}/><path d="M${vx - 20},${base - N * lh - 120} L${vx + 20},${base - N * lh - 120}" ${S(6)}/>`;
  if (o.pond) g += `<path d="M${x1 + 300},${base - N * lh - 40} C${x1 + 320},${base - N * lh + 40} ${x1 + 560},${base - N * lh + 40} ${x1 + 580},${base - N * lh - 40} Z" fill="${WS.leach}" opacity=".85" ${S(4)}/><rect x="${x1 + 600}" y="${base - N * lh - 160}" width="200" height="120" rx="12" fill="#E3DCCB" ${S(4)}/><rect x="${x1 + 630}" y="${base - N * lh - 130}" width="60" height="60" rx="30" fill="#BFE3EC" ${S(3)}/><rect x="${x1 + 710}" y="${base - N * lh - 130}" width="60" height="60" rx="30" fill="#BFE3EC" ${S(3)}/>`;
  return g;
}
// open dump (uncontrolled pile, no cover, no liner) — calm, not apocalyptic
function openDump(cx, base, w, h, t, o = {}) {
  let g = `<path d="M${cx - w / 2},${base} C${cx - w * .3},${base - h * .8} ${cx - w * .1},${base - h} ${cx},${base - h * .96} C${cx + w * .2},${base - h * 1.02} ${cx + w * .36},${base - h * .6} ${cx + w / 2},${base} Z" fill="#A79F86" ${S(5)}/>`;
  for (let j = 0; j < 40; j++) { const a = hash(j * 1.7), b = hash(j * 2.9 + 3), x = cx + (a - .5) * w * .85, top = base - h * (1 - Math.abs(a - .5) * 1.6) * .95, y = lerp(base - 20, top + 20, b); g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(18 + 18 * hash(j))}" ry="${f1(10 + 8 * hash(j * 3))}" fill="${WS.waste[j % 7]}" ${S(2.5)}/>`; }
  return g;
}
// rain over an area (x0..x1, from y0 to y1); k intensity 0..1
function rain(x0, x1, y0, y1, t, k = 1) {
  let g = '';
  const n = Math.round(60 * k);
  for (let i = 0; i < n; i++) { const x = x0 + hash(i * 3.3) * (x1 - x0), sp = 900 + 300 * hash(i), y = y0 + ((t * sp + hash(i * 7) * (y1 - y0)) % (y1 - y0)); g += `<path d="M${f1(x)},${f1(y)} l-8,30" stroke="#7FA7B5" stroke-width="5" stroke-linecap="round" opacity="${f3(.7 * k)}"/>`; }
  return g;
}
// small labelled markers
const microbe = (x, y, s = 1, t = 0) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(20 * Math.sin(t * 2 + x))})"><ellipse rx="16" ry="10" fill="${WS.microbe}" ${S(3)}/><circle cx="-5" cy="-1" r="2.5" fill="${LINE}"/><circle cx="5" cy="-1" r="2.5" fill="${LINE}"/><path d="M14,0 q10,${f1(6 * Math.sin(t * 8))} 18,0" fill="none" ${S(2.5)}/></g>`;
const bubble = (x, y, r, col, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${col}" opacity="${f3(o)}" ${S(2.5)}/>`;
// the imaginary "delete" key: rounded key with a bin + ✕ glyph; struck 0..1 draws a strike line through it
function deleteKey(x, y, s = 1, o = {}) {
  const st = clamp(o.struck || 0);
  return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${f1(o.rot || 0)})"><rect x="-96" y="-66" width="192" height="132" rx="26" fill="#3B4A48" transform="translate(6,10)"/>
    <rect x="-96" y="-66" width="192" height="132" rx="26" fill="#FBF6EC" ${S(5)}/><rect x="-80" y="-52" width="160" height="104" rx="18" fill="#EFE7D8"/>
    <path d="M-30,-20 L30,-20 L24,36 L-24,36 Z" fill="none" ${S(5)}/><path d="M-38,-22 L38,-22 M-12,-22 L-10,-32 L10,-32 L12,-22" fill="none" ${S(5)}/><path d="M-12,-6 L12,20 M12,-6 L-12,20" ${S(5)}/>
    ${st > 0 ? `<path d="M-110,-80 L${f1(-110 + 220 * st)},${f1(-80 + 160 * st)}" stroke="${P.orange}" stroke-width="16" stroke-linecap="round"/>` : ''}</g>`;
}
// a stretch of city street seen from the side (sidewalk at y=0), for house fronts and the route
function streetSide(x0, x1, o = {}) {
  let g = `<rect x="${f1(x0)}" y="0" width="${f1(x1 - x0)}" height="60" fill="#E3DACB" ${S(4)}/><rect x="${f1(x0)}" y="60" width="${f1(x1 - x0)}" height="240" fill="#4A5453"/>`;
  for (let x = x0; x < x1; x += 200) g += `<rect x="${f1(x)}" y="170" width="100" height="12" fill="#EDE6D4" opacity=".85"/>`;
  return g + `<rect x="${f1(x0)}" y="300" width="${f1(x1 - x0)}" height="600" fill="#E3DACB"/>`;
}

module.exports = { WS, food, petBottle, oilyWrap, ITEM, bag, pickup, bigTruck, dozer, houseFront, tps, sortLine, compostBin, sack, residueBin, landfillSection, openDump, rain, microbe, bubble, deleteKey, streetSide, wheel };
