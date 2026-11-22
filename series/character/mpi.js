// Mpi — vector rebuild of "Whyscape Character Concept" sheet (front view).
// Units: source-sheet pixels (char ~234 wide, feet at y=456). Scale with transform.
const C = {
  line: '#231E1A', face: '#FFFEFB', hair: '#3A2E22', hairHi: '#5A4636',
  jacket: '#1F4D4A', jacketHi: '#2A5F5B', shirt: '#F4ECE0', badge: '#F2A53A',
  pants: '#2B2F2E', sole: '#F3EEE4', mouth: '#B5532A', tongue: '#E8846A', eye: '#111111',
};
const S = `stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const mirror = (inner) => `<g transform="translate(234,0) scale(-1,1)">${inner}</g>`;

function defs(id = 'wob') {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/>
    <feDisplacementMap in="SourceGraphic" scale="1.3" xChannelSelector="R" yChannelSelector="G"/></filter>`;
}

function face(expr, blink, eye = [0, 0]) {
  const [ex, ey] = eye;
  const E = (rx, ry, dy = 0) => `<ellipse cx="${92 + ex}" cy="${160 + ey + dy}" rx="${rx}" ry="${ry}" fill="${C.eye}"/><ellipse cx="${142 + ex}" cy="${160 + ey + dy}" rx="${rx}" ry="${ry}" fill="${C.eye}"/>`;
  let eyes = E(5.5, 11), mouth = `<path d="M107,194 Q117,202 127,194" fill="none" ${S} stroke-width="2.8"/>`, brows = '';
  if (expr === 'bingung') {
    eyes = E(5, 10, 2);
    brows = `<path d="M81,143 L100,137 M134,137 L153,143" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M107,201 Q117,193 127,201" fill="none" ${S} stroke-width="2.8"/>`;
  } else if (expr === 'menyadari') {
    eyes = E(6, 12, -2);
    brows = `<path d="M81,135 Q90,129 100,133 M134,133 Q144,129 153,135" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M103,189 C110,192 124,192 131,189 C130,203 123,209 117,209 C111,209 104,203 103,189 Z" fill="${C.mouth}" ${S}/>
             <path d="M109,203 Q117,197 125,203 Q117,209 109,203 Z" fill="${C.tongue}"/>`;
  } else if (expr === 'terkejut') {
    eyes = E(6.5, 13, -3);
    brows = `<path d="M80,127 Q90,120 100,125 M134,125 Q144,120 154,127" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<ellipse cx="117" cy="201" rx="6.5" ry="8.5" fill="${C.mouth}" ${S}/>`;
  } else if (expr === 'penasaran') {
    brows = `<path d="M81,136 Q91,130 101,135 M134,140 L152,139" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<ellipse cx="117" cy="199" rx="4.5" ry="5.5" fill="${C.mouth}" ${S} stroke-width="2.4"/>`;
  } else if (expr === 'berpikir') {
    eyes = E(5, 10.5, -1);
    brows = `<path d="M81,134 Q91,128 101,133 M134,140 L152,142" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M107,199 L126,196" fill="none" ${S} stroke-width="2.8"/>`;
  }
  else if (expr === 'ngantuk') {          // sleepy: heavy half-closed lids, small mouth
    eyes = `<path d="M${86 + ex},${161 + ey} Q${92 + ex},${166 + ey} ${98 + ex},${161 + ey} M${136 + ex},${161 + ey} Q${142 + ex},${166 + ey} ${148 + ex},${161 + ey}" fill="none" ${S} stroke-width="3.6"/>
      <path d="M${85 + ex},${157 + ey} L${99 + ex},${157 + ey} M${135 + ex},${157 + ey} L${149 + ex},${157 + ey}" ${S} stroke-width="2.6" opacity=".7"/>`;
    brows = `<path d="M82,142 Q91,145 100,143 M134,143 Q143,145 152,142" fill="none" ${S} stroke-width="3"/>`;
    mouth = `<ellipse cx="117" cy="200" rx="5" ry="3.5" fill="${C.mouth}" ${S} stroke-width="2.2"/>`;
  } else if (expr === 'tegang') {         // stressed: tight brows, flat wavy mouth
    eyes = E(5, 9.5, 1);
    brows = `<path d="M81,140 L100,145 M134,145 L153,140" fill="none" ${S} stroke-width="3.4"/>`;
    mouth = `<path d="M105,199 Q109,195 113,199 T121,199 T129,199" fill="none" ${S} stroke-width="2.6"/>`;
  } else if (expr === 'tidaknyaman') {    // one eye uncomfortable (viewer-right eye squints)
    eyes = `<ellipse cx="${92 + ex}" cy="${160 + ey}" rx="5.5" ry="11" fill="${C.eye}"/><path d="M${135 + ex},${158 + ey} L${149 + ex},${163 + ey} M${135 + ex},${166 + ey} L${149 + ex},${163 + ey}" ${S} stroke-width="3.4"/>`;
    brows = `<path d="M81,137 Q91,132 101,136 M134,142 L152,138" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M108,200 Q117,195 126,201" fill="none" ${S} stroke-width="2.8"/>`;
  } else if (expr === 'lega') {           // relieved / resting: closed smiling eyes
    eyes = `<path d="M86,162 Q92,155 98,162 M136,162 Q142,155 148,162" fill="none" ${S} stroke-width="3.4"/>`;
    mouth = `<path d="M106,193 Q117,204 128,193" fill="none" ${S} stroke-width="2.8"/>`;
  }
  else if (expr === 'prihatin') {        // kit v1.7 (EP06): concerned — inner brow ends lifted, small downturned mouth
    eyes = E(5.2, 10.5, 1);
    brows = `<path d="M81,143 Q90,140 100,134 M134,134 Q144,140 153,143" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M108,201 Q117,195 126,201" fill="none" ${S} stroke-width="2.8"/>`;
  } else if (expr === 'menghirup') {      // kit v1.7: sniffing — eyes softly closed, small round inhale mouth
    eyes = `<path d="M86,161 Q92,166 98,161 M136,161 Q142,166 148,161" fill="none" ${S} stroke-width="3.4"/>`;
    brows = `<path d="M81,137 Q91,132 101,136 M134,136 Q144,132 153,137" fill="none" ${S} stroke-width="3"/>`;
    mouth = `<ellipse cx="117" cy="199" rx="3.5" ry="4" fill="${C.mouth}" ${S} stroke-width="2.2"/>`;
  } else if (expr === 'batuk') {          // kit v1.7: coughing — eyes squeezed (> <), mouth hidden by the fist pose
    eyes = `<path d="M86,154 L98,160 L86,166 M148,154 L136,160 L148,166" fill="none" ${S} stroke-width="3.4"/>`;
    brows = `<path d="M81,141 L100,145 M134,145 L153,141" fill="none" ${S} stroke-width="3.2"/>`;
    mouth = `<path d="M110,200 Q117,196 124,200" fill="none" ${S} stroke-width="2.6"/>`;
  }
  if (blink) eyes = `<path d="M${86 + ex},${160 + ey} L${98 + ex},${160 + ey} M${136 + ex},${160 + ey} L${148 + ex},${160 + ey}" ${S} stroke-width="3.4"/>`;
  return eyes + brows + mouth;
}

function head(expr, blink, eye) {
  const faceShape = `<path d="M40,128 C40,96 70,84 117,84 C164,84 194,96 194,128 L194,190 C194,222 176,233 150,233 L84,233 C58,233 40,222 40,190 Z" fill="${C.face}" ${S}/>`;
  const hair = `<path d="M40,188 C24,184 17,162 17,136 C17,80 60,47 117,47 C174,47 217,80 217,136 C217,162 210,184 194,188 C190,172 190,142 188,124 C176,106 158,112 142,104 C128,98 116,108 100,104 C84,100 64,104 46,122 C44,142 44,172 40,188 Z" fill="${C.hair}" ${S}/>
    <path d="M62,72 Q84,58 108,57 M150,60 Q176,66 194,90 M28,156 Q24,124 34,100" fill="none" stroke="${C.hairHi}" stroke-width="2.4" stroke-linecap="round"/>`;
  const tuft = `<path d="M116,52 C112,40 104,33 108,23 C112,12 131,12 134,22 C136,31 128,35 122,31" fill="none" stroke="${C.line}" stroke-width="12.5" stroke-linecap="round"/>
    <path d="M116,52 C112,40 104,33 108,23 C112,12 131,12 134,22 C136,31 128,35 122,31" fill="none" stroke="${C.hair}" stroke-width="7.5" stroke-linecap="round"/>`;
  if (GEAR && GEAR.helmet) return faceShape + face(expr, blink, eye) + (STYLE.hair === 'v2' ? HAIR_V2.hair : hair) + HELMET(GEAR.helmetC) + `<g transform="translate(0,-24)">${STYLE.hair === 'v2' ? HAIR_V2.tuft : tuft}</g>`;
  if (STYLE.hair === 'v2') return HAIR_V2.tuft + faceShape + face(expr, blink, eye) + HAIR_V2.hair;
  return tuft + faceShape + face(expr, blink, eye) + hair;
}
// kit v1.8 (EP07): hair closer to the source sheet — fuller crown with soft bumps, wavy fringe line, side locks that end in a small flick,
// and a FILLED "?"-shaped tuft. Opt-in per episode (setStyle({ hair: 'v2' })) so EP01–EP06 re-render unchanged.
const STYLE = { hair: 'v1' };
// kit v1.8: work gear as removable layers — o.gear = { helmet, vest, boots, helmetC, vestC }. The tuft pokes out of the helmet vent (identity),
// the W badge is redrawn ON the vest so it stays readable. No real company logos.
let GEAR = null;
const HELMET = (col = '#F6F3EB') => `<path d="M16,104 C16,50 62,24 117,24 C172,24 218,50 218,104 Z" fill="${col}" ${S}/><path d="M117,26 C112,50 112,80 117,102" fill="none" stroke="#000" stroke-width="10" opacity=".07"/>
  <path d="M40,90 C46,60 76,40 106,36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/><path d="M20,96 L214,96" stroke="${'#F2A53A'}" stroke-width="9"/>
  <rect x="2" y="98" width="230" height="16" rx="8" fill="${col}" ${S}/><ellipse cx="117" cy="30" rx="14" ry="6" fill="#3A2E22" opacity=".55"/>`;
const VEST = (col = '#F28C28') => { const P = `<path d="M58,236 C52,290 46,330 42,354 C42,358 46,360 52,360 L100,360 L100,250 C92,240 76,234 58,236 Z" fill="${col}" ${S}/>
  <path d="M46,312 L100,312 M44,336 L100,336" stroke="#EDE6D4" stroke-width="9"/><path d="M46,312 L100,312 M44,336 L100,336" stroke="#9AA3A2" stroke-width="1.6" stroke-dasharray="4 4"/>`;
  return P + mirror(P) + `<circle cx="155" cy="292" r="11.5" fill="${C.badge}" ${S} stroke-width="2.2"/><text x="155" y="296.5" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="12.5" fill="${C.line}">W</text>`; };
const BOOT = `<path d="M54,456 L54,430 C54,420 60,416 70,416 L100,416 C110,416 116,422 116,434 L116,456 Z" fill="#5B4636" ${S}/><path d="M54,446 L116,446" stroke="#2B231C" stroke-width="7"/><path d="M62,424 L106,424" stroke="#C9A66B" stroke-width="3" opacity=".8"/>`;
const setStyle = o => Object.assign(STYLE, o);
const HAIR_V2 = {
  hair: `<path d="M37,194 C21,188 13,166 14,140 C14,104 30,76 56,61 C70,52 88,47 106,47 C112,42 124,42 130,47 C152,47 172,52 188,63 C208,78 220,104 220,138 C220,164 212,186 197,194 C193,178 193,150 190,130 C184,118 170,108 152,104 C140,101 130,104 122,101 C112,98 100,102 88,105 C70,110 58,118 52,128 C46,142 46,160 45,176 C44,184 41,190 37,194 Z" fill="${C.hair}" ${S}/>
    <path d="M58,80 Q78,62 104,58 M140,57 Q170,62 192,86 M26,160 Q20,128 32,102 M206,158 Q212,132 204,110 M84,92 Q104,84 124,88" fill="none" stroke="${C.hairHi}" stroke-width="2.6" stroke-linecap="round"/>`,
  tuft: `<g transform="translate(116,52) scale(1.28) translate(-116,-52)"><path d="M107,52 C102,40 99,27 108,17 C117,7 137,9 141,22 C144,33 136,41 125,39 C131,33 131,24 124,21 C115,18 110,27 113,37 C114,43 117,48 121,52 Z" fill="${C.hair}" ${S} stroke-width="3.6" stroke-linejoin="round"/>
    <path d="M110,28 Q114,17 126,15" fill="none" stroke="${C.hairHi}" stroke-width="2.2" stroke-linecap="round"/></g>`,
};

function armDown(side) {
  const g = `<path d="M30,350 C24,352 22,362 26,369 C31,377 46,377 52,370 C56,364 54,354 48,350 Z" fill="${C.face}" ${S}/>
    <path d="M33,358 Q39,355 45,358" fill="none" ${S} stroke-width="2"/>
    <path d="M58,244 C36,252 24,290 20,338 C20,346 28,350 34,350 L56,350 C58,320 62,290 66,262 Z" fill="${C.jacket}" ${S}/>
    <path d="M24,336 L56,338" fill="none" ${S} stroke-width="2"/>`;
  return side === 'L' ? g : mirror(g);
}

function armUp() {
  // raised right arm (viewer's right), index finger up — "menyadari"
  const P = 'M176,258 C204,276 216,268 214,226';
  return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/>
    <path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>
    <path d="M203,232 Q214,237 225,232" fill="none" ${S} stroke-width="2"/>
    <path d="M208,206 L208,184 C208,177 219,177 219,184 L219,206 Z" fill="${C.face}" ${S}/>
    <path d="M201,214 C200,203 207,198 215,198 C225,199 229,206 228,215 C227,223 220,227 213,226 C206,225 202,221 201,214 Z" fill="${C.face}" ${S}/>
    <path d="M205,210 Q211,206 217,209" fill="none" ${S} stroke-width="2"/>`;
}

function armMagnifier() {
  // right arm (viewer's right) holding a magnifying glass beside the head
  const P = 'M176,258 C204,272 218,262 214,236';
  return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/>
    <path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>
    <path d="M214,226 L236,186" stroke="${C.line}" stroke-width="11" stroke-linecap="round"/>
    <path d="M214,226 L236,186" stroke="#8A5A2B" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="246" cy="160" r="30" fill="#CFEFF5" fill-opacity=".55" ${S} stroke-width="7"/>
    <circle cx="246" cy="160" r="30" fill="none" stroke="#F2A53A" stroke-width="3.2"/>
    <path d="M232,150 Q236,140 246,138" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M203,232 C202,221 209,216 217,217 C226,218 230,225 228,233 C226,241 219,244 212,243 C206,242 203,238 203,232 Z" fill="${C.face}" ${S}/>`;
}
function armChin() {
  // right hand under the chin — "berpikir"
  const P = 'M178,262 C204,286 196,262 166,250';
  return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/>
    <path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>
    <path d="M140,236 C139,225 147,220 156,221 C166,222 170,230 168,238 C166,246 158,249 150,248 C144,247 141,242 140,236 Z" fill="${C.face}" ${S}/>
    <path d="M146,226 L136,214 C133,210 138,206 142,210 L152,222" fill="${C.face}" ${S}/>`;
}

// generic arm: shoulder → elbow → hand (rig coords); used by the extended poses (v1.1)
const SHOULDER = { L: [62, 252], R: [172, 252] };
const M_ARM = (...a) => arm(...a);
function arm(side, elbow, hand, extra = '') {
  const [sx, sy] = SHOULDER[side], P = `M${sx},${sy} Q${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`;
  return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/>
    <path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>
    <circle cx="${hand[0]}" cy="${hand[1]}" r="11.5" fill="${C.face}" ${S}/>${extra}`;
}
const MUG = (x, y) => `<path d="M${x - 15},${y - 26} L${x - 13},${y + 4} C${x - 13},${y + 8} ${x - 10},${y + 10} ${x - 6},${y + 10} L${x + 8},${y + 10} C${x + 12},${y + 10} ${x + 15},${y + 8} ${x + 15},${y + 4} L${x + 17},${y - 26} Z" fill="#F6F3EB" ${S}/><path d="M${x - 15},${y - 16} L${x + 17},${y - 16}" stroke="${C.jacket}" stroke-width="5"/><path d="M${x + 16},${y - 20} C${x + 28},${y - 20} ${x + 28},${y - 4} ${x + 15},${y - 4}" fill="none" ${S} stroke-width="3"/>`;
const COOKIE = (x, y, r = 17, bite = false) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#D9A55B" ${S}/>${bite ? `<circle cx="${x - r * .8}" cy="${y - r * .5}" r="${r * .45}" fill="${C.face}" stroke="none"/>` : ''}<circle cx="${x - 5}" cy="${y - 4}" r="2.4" fill="#B9853F"/><circle cx="${x + 6}" cy="${y + 2}" r="2.4" fill="#B9853F"/><circle cx="${x - 1}" cy="${y + 8}" r="2.2" fill="#B9853F"/>`;
// named arm poses for each side. ph = small animation phase (rub, swing)
const V19 = ['tap', 'hover', 'pocket', 'plug', 'walletL', 'bottle', 'bag', 'shade'];   // kit v1.9 poses: the left arm takes ph as given (no swing offset)
const FINGER = (x, y, a) => `<g transform="translate(${x},${y}) rotate(${a})"><rect x="-5" y="-26" width="10" height="24" rx="5" fill="${C.face}" ${S}/></g><circle cx="${x}" cy="${y}" r="11.5" fill="${C.face}" ${S}/>`;
function armPose(name, side, ph = 0) {
  const m = side === 'L' ? -1 : 1, X = x => side === 'L' ? 234 - x : x, lerp = (a, b, k) => a + (b - a) * k, f = v => v.toFixed(1);
  switch (name) {
    case 'eye': return arm(side, [X(210), 240], [X(162), 199]);                       // fingertip under the (viewer-right) eye
    case 'rub': return arm(side, [X(204), 230], [X(150 + 3 * Math.sin(ph)), 168 + 3 * Math.cos(ph)]);
    case 'mug': return arm(side, [X(196), 318], [X(150), 290], side === 'R' ? MUG(160, 284) : '');
    case 'desk': return arm(side, [X(198), 330], [X(150), 344]);
    case 'stretch': return arm(side, [X(250), 176], [X(222), 74]);
    case 'head': return arm(side, [X(222), 196], [X(196), 118]);                       // hand on the head (stressed)
    case 'shrug': return arm(side, [X(222), 300], [X(232), 252]);
    case 'swing': return arm(side, [X(186 + 10 * Math.sin(ph)), 306], [X(184 + 26 * Math.sin(ph)), 352]);
    case 'phone': return arm(side, [X(192), 316], [X(146), 270], side === 'R' ? `<rect x="134" y="226" width="32" height="54" rx="6" fill="#2B3A38" ${S}/><rect x="138" y="232" width="24" height="40" rx="3" fill="#BFE6EE"/>` : '');
    case 'point': return arm(side, [X(206), 236], [X(232), 196]);
    case 'push': return arm(side, [X(214), 318], [X(262), 336]);
    case 'glass': return arm(side, [X(196), 318], [X(150), 290], side === 'R' ? `<path d="M144,248 L147,300 L173,300 L176,248 Z" fill="#DFF3F8" fill-opacity=".9" ${S}/><path d="M145,266 L175,266 L173,300 L147,300 Z" fill="#A9DCEA" opacity=".85"/>` : '');
    case 'sip': return arm(side, [X(206), 284], [X(146), 214], side === 'R' ? `<path d="M140,172 L143,224 L169,224 L172,172 Z" fill="#DFF3F8" fill-opacity=".9" ${S} transform="rotate(-18 156 198)"/>` : '');                        // hand reaching along the desk (pushes cups away)
    case 'bite': return arm(side, [X(210), 268], [X(150), 214], side === 'R' ? COOKIE(138, 206, 17, true) : '');          // kit v1.4 (EP03): biscuit at the mouth
    case 'biscuit': return arm(side, [X(200), 318], [X(152), 292], side === 'R' ? COOKIE(152, 280, 17, true) : '');       // biscuit held at the chest
    case 'knee': { const [sx, sy] = SHOULDER[side], hx = X(214), hy = 312, ex = X(234), ey = 276, P = `M${sx},${sy} Q${ex},${ey} ${hx},${hy - 8}`;   // forearm on the knee, palm over the kneecap
      return `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>${PALM(hx, hy, side === 'L' ? -1 : 1)}`; }
    case 'pointdown': return arm(side, [X(214), 300], [X(226), 362]);                                                     // pointing at the floor
    case 'magnify': return magnify(side, ph);                                              // ph = lift 0..1 (from chest to the eye)
    case 'wheel': return arm(side, [X(222), 312 + 4 * Math.sin(ph)], [X(184), 326 + 3 * Math.sin(ph)]);                 // kit v1.6 (EP05): hands on a steering wheel in front of the chest (rim drawn by the scene)
    case 'wheelTurn': return arm(side, [X(220), 292], [X(170 + 18 * Math.sin(ph)), 300 - 14 * Math.cos(ph)]);           // kit v1.6: hand sliding on the rim (small steering)
    // kit v1.7 (EP06)
    case 'cough': return arm(side, [X(214), 262], [X(130), 206]);                                                       // fist in front of the mouth
    case 'sill': return arm(side, [X(206), 318], [X(196 + 4 * Math.sin(ph)), 352]);                                     // hand resting on a window sill
    case 'slide': return arm(side, [X(226 + 22 * ph), 290], [X(208 + 64 * ph), 300 - 6 * ph]);                          // ph 0..1: palm pushes a sliding pane outward
    case 'latch': return arm(side, [X(206), 270], [X(160 + 6 * Math.sin(ph * 6)), 268]);                                // fingers on the window latch (ph wiggles)
    case 'map': return arm(side, [X(206), 330], [X(170), 314]);                                                         // holding a map at chest height (sheet drawn by the scene)
    // kit v1.9 (EP08)
    case 'tap': return arm('L', [lerp(78, 84, ph), 318], [lerp(128, 140, ph), lerp(262, 254, ph)], FINGER(lerp(128, 140, ph), lerp(262, 254, ph), -50));   // L only: index finger toward the phone held by 'phone' (ph 0 hover → 1 touch)
    case 'hover': return arm('L', [80, 316], [124, 272], FINGER(124, 272, -40));                                          // L only: finger held back above the screen ("tunggu")
    case 'pocket': return arm(side, [X(216), 296], [X(194), 330 + 4 * Math.sin(ph * 9)], ph > 0 ? `<path d="M${X(178)},326 q${m * 16},${f(20 * ph)} ${m * 4},${f(40 * ph)} q${-m * 18},${f(4 * ph)} ${-m * 24},${f(-10 * ph)} Z" fill="#F6F3EB" stroke="#231E1A" stroke-width="2.4" opacity="${Math.min(1, ph * 2)}"/>` : '');   // patting / turning out a hoodie pocket (ph 0..1 lining)
    case 'plug': return arm(side, [X(226), 322], [X(262 + 6 * Math.sin(ph * 7)), 352]);                                  // reaching down to a router port (cable drawn by the scene)
    case 'walletR': return arm('R', [196, 316], [150, 300]);
    case 'walletL': return arm('L', [38, 316], [84, 300]);                                                              // both hands hold an open wallet at the chest (wallet drawn by the scene at 117,300)
    // kit v1.10 (EP09)
    case 'bag': return arm(side, [X(206), 312], [X(222 + 4 * Math.sin(ph)), 356]);                                    // carrying a bag at the side (bag drawn by the scene from MPI_HANDS.bag)
    case 'shade': return arm(side, [X(214), 214], [X(160), 132], `<path d="M${X(140)},124 L${X(186)},120" stroke="${C.face}" stroke-width="16" stroke-linecap="round"/>`);   // hand shading the eyes, peeking far away
    case 'bottle': return arm(side, [X(200), 318], [X(156), 300], `<g transform="translate(${X(156)},${330}) scale(.52)"><path d="M-22,0 L-22,-92 C-22,-104 -12,-110 -10,-122 L-10,-132 L10,-132 L10,-122 C12,-110 22,-104 22,-92 L22,0 Z" fill="#DFF3F8" fill-opacity=".95" stroke="#231E1A" stroke-width="4"/><path d="M-20,-70 L20,-70 L20,-36 L-20,-36 Z" fill="#3FB8A9" opacity=".85"/><rect x="-12" y="-146" width="24" height="16" rx="4" fill="#1F4D4A" stroke="#231E1A" stroke-width="3"/></g><circle cx="${X(156)}" cy="300" r="11.5" fill="${C.face}" ${S}/>`);   // holding a water bottle at the chest
    // kit v1.11 (EP10)
    case 'umbrella': return arm(side, [X(228), 300], [X(214), 262]);                                                   // grip in front of the shoulder; the scene draws the umbrella from hand (X(214), 262)
    case 'fan': { const a = Math.sin(ph * 14), hx = X(212 + 4 * a), hy = 186 + 6 * a;                                  // fanning the face with a small paper fan (ph = time)
      return arm(side, [X(236), 276], [hx, hy], `<g transform="translate(${f(hx)},${f(hy)}) rotate(${f(-20 * m + 18 * a)})"><path d="M0,0 L-30,-56 A64,64 0 0,1 30,-56 Z" fill="#F6E2A0" ${S}/><path d="M0,0 L-14,-60 M0,0 L0,-64 M0,0 L14,-60" stroke="#C9A66B" stroke-width="2.5"/></g><circle cx="${f(hx)}" cy="${f(hy)}" r="11.5" fill="${C.face}" ${S}/>`); }
    default: return null;
  }
}
// magnifying glass held in a real grip: sleeve → wrist → fist wrapped around the handle → handle joins the lens frame.
// Layer order: sleeve, handle, fist (over the handle), lens frame (handle meets the frame's rim). k = lift 0..1.
function magnify(side, k = 1) {
  const lerp = (a, b) => a + (b - a) * k;
  const hand = [lerp(196, 214), lerp(312, 214)], elbow = [lerp(214, 236), lerp(318, 290)];
  const ang = lerp(-20, -38) * Math.PI / 180;                      // handle direction (up-right, toward the eye)
  const hx = hand[0], hy = hand[1], tx = hx + 50 * Math.sin(-ang) * -1, ty = hy - 50 * Math.cos(-ang);
  const lens = [tx + 30 * Math.sin(-ang) * -1, ty - 30 * Math.cos(-ang)];
  const P = `M${SHOULDER.R[0]},${SHOULDER.R[1]} Q${elbow[0]},${elbow[1]} ${hand[0]},${hand[1] + 6}`;
  const g = `<path d="${P}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="${P}" fill="none" stroke="${C.jacket}" stroke-width="21.8" stroke-linecap="round"/>
    <path d="M${hx},${hy + 14} L${tx.toFixed(1)},${ty.toFixed(1)}" stroke="${C.line}" stroke-width="12" stroke-linecap="round"/><path d="M${hx},${hy + 14} L${tx.toFixed(1)},${ty.toFixed(1)}" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round"/>
    <g transform="translate(${hx},${hy}) rotate(${(-ang * 180 / Math.PI).toFixed(1)})"><rect x="-13" y="-10" width="26" height="26" rx="10" fill="${C.face}" ${S}/>
      <path d="M-13,-2 L13,-2 M-13,6 L13,6" ${S} stroke-width="1.8"/><path d="M-13,-8 C-20,-6 -20,6 -13,8" fill="${C.face}" ${S}/></g>
    <circle cx="${lens[0].toFixed(1)}" cy="${lens[1].toFixed(1)}" r="34" fill="#CFEFF5" fill-opacity=".55" ${S} stroke-width="7"/>
    <circle cx="${lens[0].toFixed(1)}" cy="${lens[1].toFixed(1)}" r="34" fill="none" stroke="#F2A53A" stroke-width="3.2"/>
    <path d="M${(lens[0] - 16).toFixed(1)},${(lens[1] - 8).toFixed(1)} Q${(lens[0] - 12).toFixed(1)},${(lens[1] - 20).toFixed(1)} ${(lens[0]).toFixed(1)},${(lens[1] - 22).toFixed(1)}" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`;
  magnify.last = { lens, hand };
  return side === 'L' ? `<g transform="translate(234,0) scale(-1,1)">${g}</g>` : g;
}
// legs: 'stand' (default rig), 'sit' (front view on a bed / chair edge), 'walk' (ph = stride phase)
function legsSit() {
  const shoe = x => `<path d="${'M' + (x - 30)},456 C${x - 30},446 ${x - 24},442 ${x - 16},442 L${x + 18},442 C${x + 26},442 ${x + 30},446 ${x + 30},454 L${x + 30},460 L${x - 30},460 Z" fill="${C.jacket}" ${S}/><path d="M${x - 29},455 L${x + 29},455" ${S} stroke-width="2"/>`;
  return `<path d="M58,352 L176,352 C182,352 186,358 186,366 L186,390 C186,398 180,402 172,402 L62,402 C54,402 48,398 48,390 L48,366 C48,358 52,352 58,352 Z" fill="${C.pants}" ${S}/>
    <path d="M117,356 L117,398" ${S} stroke-width="2"/><path d="M68,398 L70,444 L110,444 L112,398 Z M122,398 L124,444 L164,444 L166,398 Z" fill="${C.pants}" ${S}/>${shoe(90)}${shoe(144)}`;
}
function legsWalk(ph) {
  const leg = (hx, a) => `<g transform="rotate(${a.toFixed(2)} ${hx} 360)"><path d="M${hx - 24},356 L${hx - 22},432 L${hx + 22},432 L${hx + 24},356 Z" fill="${C.pants}" ${S}/>
    <path d="M${hx - 32},446 C${hx - 32},436 ${hx - 26},432 ${hx - 18},432 L${hx + 16},432 C${hx + 26},432 ${hx + 30},438 ${hx + 30},446 L${hx + 30},452 C${hx + 30},455 ${hx + 27},457 ${hx + 22},457 L${hx - 28},457 C${hx - 31},457 ${hx - 32},455 ${hx - 32},452 Z" fill="${GEAR && GEAR.boots ? '#5B4636' : C.jacket}" ${S}/><path d="M${hx - 31},450 L${hx + 29},450" fill="none" stroke="${C.sole}" stroke-width="4"/></g>`;
  return leg(92, 16 * Math.sin(ph)) + leg(142, -16 * Math.sin(ph));
}

// kit v1.4 (EP03, rev 2): crouch — a natural squat seen from the front. Shoes stay planted at y 456, the torso drops
// CROUCH_DY·k, thighs go out from the hips to knees that sit OUTSIDE the torso, shins come down to the shoes.
// k (0..1) animates standing → squatting. Hands resting on the knees use the 'knee' arm pose (palms, not dots).
const CROUCH_DY = 64;
function crouchLegs(k = 1) {
  const L = (a, b) => a + (b - a) * k;
  const hipL = [98, 356 + CROUCH_DY * k], hipR = [136, 356 + CROUCH_DY * k];
  const kneeL = [L(90, 16), L(400, 380)], kneeR = [L(144, 218), L(400, 380)];
  const ankL = [80, 438], ankR = [154, 438];
  const seg = (p, q, w) => `<path d="M${p[0]},${p[1]} L${q[0]},${q[1]}" stroke="${C.line}" stroke-width="${w + 5.2}" stroke-linecap="round"/><path d="M${p[0]},${p[1]} L${q[0]},${q[1]}" stroke="${C.pants}" stroke-width="${w}" stroke-linecap="round"/>`;
  const shoe = x => `<path d="M${x - 32},446 C${x - 32},436 ${x - 26},432 ${x - 18},432 L${x + 18},432 C${x + 26},432 ${x + 32},436 ${x + 32},446 L${x + 32},452 C${x + 32},455 ${x + 29},457 ${x + 24},457 L${x - 24},457 C${x - 29},457 ${x - 32},455 ${x - 32},452 Z" fill="${C.jacket}" ${S}/><path d="M${x - 31},450 L${x + 31},450" ${S} stroke-width="2"/>`;
  const cap = ([x, y]) => `<path d="M${x - 12},${y - 14} Q${x},${y - 22} ${x + 12},${y - 14}" fill="none" stroke="#5E6664" stroke-width="3.4" stroke-linecap="round" opacity="${k.toFixed(2)}"/>`;
  return { back: seg(ankL, kneeL, 36) + seg(ankR, kneeR, 36) + shoe(80) + shoe(154) + seg(hipL, kneeL, 42) + seg(hipR, kneeR, 42) + cap(kneeL) + cap(kneeR) };
}
// palm resting on a knee (seen from the front): a mitten with the thumb toward the body
const PALM = (x, y, m) => `<path d="M${x - 15},${y - 4} C${x - 15},${y - 16} ${x + 15},${y - 16} ${x + 15},${y - 4} L${x + 14},${y + 8} C${x + 12},${y + 16} ${x - 12},${y + 16} ${x - 14},${y + 8} Z" fill="${C.face}" ${S}/>
  <path d="M${x - 8},${y + 2} L${x - 8},${y + 12} M${x},${y + 3} L${x},${y + 13} M${x + 8},${y + 2} L${x + 8},${y + 12}" stroke="${C.line}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
  <path d="M${x - m * 14},${y - 6} C${x - m * 24},${y - 4} ${x - m * 24},${y + 6} ${x - m * 14},${y + 6}" fill="${C.face}" ${S}/>`;
function body(pose) {
  const legs = `<path d="M64,356 L62,428 C62,434 66,436 72,436 L108,436 C113,436 115,433 115,428 L117,384 L119,428 C119,433 121,436 126,436 L162,436 C168,436 172,434 172,428 L170,356 Z" fill="${C.pants}" ${S}/>`;
  const shoe = `<path d="M54,442 C54,432 62,430 70,430 L104,430 C112,430 116,434 116,442 L116,449 C116,453 112,456 106,456 L60,456 C56,456 54,453 54,449 Z" fill="${C.jacket}" ${S}/>
    <path d="M55,447 L115,447" fill="none" ${S} stroke-width="2"/><path d="M56,448 L114,448 L114,450 C114,453 111,455 106,455 L60,455 C57,455 56,453 56,450 Z" fill="${C.sole}"/>`;
  const hoodBack = `<ellipse cx="117" cy="238" rx="70" ry="22" fill="${C.jacket}" ${S}/>`;
  const jacket = `<path d="M56,238 C50,290 44,330 40,352 C40,358 46,360 52,360 L182,360 C188,360 194,358 194,352 C190,330 184,290 178,238 C160,228 74,228 56,238 Z" fill="${C.jacket}" ${S}/>
    <path d="M46,330 C44,342 42,350 42,354 L70,356 C64,344 60,320 58,300 Z" fill="#000" opacity=".14"/>
    <path d="M188,330 C190,342 192,350 192,354 L164,356 C170,344 174,320 176,300 Z" fill="#000" opacity=".14"/>`;
  const shirt = `<path d="M98,238 C110,234 124,234 136,238 L140,360 L94,360 Z" fill="${C.shirt}" ${S}/>
    <path d="M100,243 C108,253 126,253 134,243" fill="none" ${S} stroke-width="2.2"/>
    <path d="M100,250 Q117,262 134,250 L134,262 Q117,272 100,262 Z" fill="#000" opacity=".06"/>`;
  const flap = `<path d="M52,242 C50,226 72,218 94,226 C106,231 107,248 101,260 C94,269 78,267 67,260 C58,255 53,250 52,242 Z" fill="${C.jacketHi}" ${S}/><path d="M64,240 Q78,234 92,242" fill="none" ${S} stroke-width="2"/>`;
  const badge = `<circle cx="155" cy="292" r="11.5" fill="${C.badge}" ${S} stroke-width="2.2"/>
    <text x="155" y="296.5" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="12.5" fill="${C.line}">W</text>`;
    return { pre: legs + shoe + mirror(shoe) + hoodBack + armDown('L') + (pose === 'down' ? armDown('R') : ''),
           mid: jacket + shirt + flap + mirror(flap) + badge + (GEAR && GEAR.vest ? VEST(GEAR.vestC) : ''), post: { up: armUp, magnifier: armMagnifier, chin: armChin }[pose]?.() || '' };
}

// expr: netral | bingung | menyadari | terkejut | penasaran | berpikir
// pose: down | up | magnifier | chin   eye: [dx,dy] gaze offset   tilt: head tilt (deg)
// v1.1 options (all optional; defaults = v1 output):
//   left / right: arm pose name ('down','eye','rub','mug','desk','stretch','head','shrug','swing','phone','point') — overrides `pose`
//   legs: 'stand' | 'sit' | 'walk' | 'crouch' (v1.4)   arm poses v1.4: bite, biscuit, knee, pointdown   ph: animation phase (walk stride, rub, swing)   headDy: head drop (sleepy nod), rig units
//   new expressions: ngantuk, tegang, tidaknyaman, lega · v1.7: prihatin, menghirup, batuk · arm poses v1.7: cough, sill, slide, latch, map
function mpi(expr = 'netral', o = {}) {
  let { shadow = '#E2D7C6', filter = 'wob', blink = false, pose, eye = [0, 0], tilt, left, right, legs = 'stand', ph = 0, headDy = 0, crouch = 1 } = o;
  GEAR = o.gear || null;
  pose = pose || (expr === 'menyadari' ? 'up' : expr === 'berpikir' ? 'chin' : 'down');
  if (tilt === undefined) tilt = expr === 'bingung' ? -7 : expr === 'menyadari' ? 3 : expr === 'berpikir' ? -4 : 0;
  const ext = left || right || legs !== 'stand' || headDy || o.bodyDy || o.gear;
  if (!ext) {
    const b = body(pose);
    const sh = shadow ? `<ellipse cx="117" cy="457" rx="90" ry="9" fill="${shadow}"/>` : '';
    return `${sh}<g filter="url(#${filter})">${b.pre}${b.mid}
    <g transform="rotate(${tilt} 117 232)">${head(expr, blink, eye)}</g>${b.post}</g>`;
  }
  // extended build: same parts, arms/legs chosen per side
  const b = body('down');
  const free = (sd, a) => M_ARM(sd, a.e, a.h, a.extra || '');                    // kit v1.7: { e:[x,y], h:[x,y] } = free arm (rig coords)
  const rightArm = right && typeof right === 'object' ? free('R', right) : right ? (right === 'down' ? mirror(armDown('L')) : armPose(right, 'R', ph)) : ({ up: armUp, magnifier: armMagnifier, chin: armChin }[pose]?.() || mirror(armDown('L')));
  const leftArm = left && typeof left === 'object' ? free('L', left) : left && left !== 'down' ? armPose(left, 'L', o.phL ?? (V19.includes(left) ? ph : ph + Math.PI)) : armDown('L');
  const CR = legs === 'crouch' ? crouchLegs(crouch) : null;
  const legsSvg = CR ? CR.back : legs === 'sit' ? legsSit() : legs === 'walk' ? legsWalk(ph) : b.pre.split('<ellipse cx="117" cy="238"')[0].replace(armDown('L'), '');
  const hoodBack = `<ellipse cx="117" cy="238" rx="70" ry="22" fill="${C.jacket}" ${S}/>`;
  const bob = (legs === 'walk' ? -2.5 * Math.abs(Math.sin(ph)) : 0) + (legs === 'crouch' ? CROUCH_DY * crouch : 0);
  const sh = shadow ? `<ellipse cx="117" cy="${legs === 'sit' ? 461 : 457}" rx="90" ry="9" fill="${shadow}"/>` : '';
  const armBehind = a => typeof a !== 'object' && ['down', 'swing', 'shrug'].includes(a || 'down');
  const lift = o.bodyDy || 0;                                                     // kit v1.7: torso + head shift (sniff / cough jerk), legs stay planted
  const boots = GEAR && GEAR.boots && legs === 'stand' ? BOOT + mirror(BOOT) : '';
  return `${sh}<g filter="url(#${filter})">${legsSvg}${boots}<g transform="translate(0,${bob + lift})">${hoodBack}
    ${armBehind(left) ? leftArm : ''}${armBehind(right) ? rightArm : ''}${b.mid}
    <g transform="translate(0,${headDy}) rotate(${tilt} 117 232)">${head(expr, blink, eye)}</g>
    ${armBehind(left) ? '' : leftArm}${armBehind(right) ? '' : rightArm}</g></g>`;
}

function exclaim(x, y, s = 1, color = '#231E1A') {
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="M-14,-18 L-22,-40 M0,-24 L0,-48 M14,-18 L22,-40" stroke="${color}" stroke-width="6" stroke-linecap="round"/></g>`;
}

function questionMark(x, y, s = 1, color = '#231E1A') {
  return `<g transform="translate(${x},${y}) scale(${s}) rotate(10)"><text x="0" y="0" font-family="Nunito" font-weight="900" font-size="70" fill="${color}" text-anchor="middle">?</text></g>`;
}

function bulb(x, y, s = 1, glow = false) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    ${glow ? '<circle cx="0" cy="0" r="46" fill="#F2A53A" opacity=".28"/>' : ''}
    <path d="M-14,14 C-26,4 -24,-24 0,-25 C24,-24 26,4 14,14 L12,22 L-12,22 Z" fill="#FFD27A" ${S}/>
    <path d="M-10,26 L10,26 M-8,31 L8,31" ${S}/>
    <path d="M-6,8 Q0,-4 6,8" fill="none" stroke="#C97A1E" stroke-width="2.2"/>
    <path d="M0,-36 L0,-46 M24,-26 L32,-34 M-24,-26 L-32,-34 M34,-4 L44,-4 M-34,-4 L-44,-4" stroke="#F2A53A" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

module.exports = { setStyle, STYLE, HAIR_V2, HELMET, VEST, mpi, defs, questionMark, bulb, exclaim, C, armPose, arm, MUG, magnify };
