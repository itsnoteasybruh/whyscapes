// WHYSCAPE SUPPORTING CHARACTERS (kit v1.2) — the "people of Mpi's world".
// RULES (first example: the doctor in EP02):
//  1. Same family as Mpi: 456-unit chibi body, head ≈ 40 % of height, rounded-square face, dot eyes (rx 5.5 / ry 11),
//     simple curved mouth, 2.6-unit #231E1A line, wobble filter, flat fill + one shadow tone.
//  2. Never look like Mpi: different hair silhouette (no spiral tuft), different skin tone, different outfit colours
//     (no teal hoodie, no W badge). Add one role prop (stethoscope, apron, backpack…).
//  3. Contrast against the set: outfit colours must separate from the background (e.g. dark trousers on a light clinic floor).
//  4. Supporting people are guests: no fixed names or arcs unless the series decides so later.
const { C } = require('./mpi');
const S = `stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const SKINS = { warm: '#E7B892', tan: '#C98F66', light: '#F6DCC6', deep: '#8D5A3C' };
// spec: { skin, hair, hairStyle:'sidepart'|'bun'|'short', top:'coat'|'shirt', topColor, pants, expr:'senyum'|'netral'|'bicara', prop:'stethoscope', arm:'wave'|'down'|'clipboard' }
function person(spec = {}) {
  const skin = SKINS[spec.skin] || spec.skin || SKINS.warm, hairC = spec.hair || '#2B2420', pants = spec.pants || '#2E3A56';
  const face = `<path d="M40,128 C40,96 70,84 117,84 C164,84 194,96 194,128 L194,190 C194,222 176,233 150,233 L84,233 C58,233 40,222 40,190 Z" fill="${skin}" ${S}/>`;
  const eyes = `<ellipse cx="92" cy="162" rx="5.5" ry="11" fill="${C.eye}"/><ellipse cx="142" cy="162" rx="5.5" ry="11" fill="${C.eye}"/>`;
  const mouth = spec.expr === 'prihatin' ? `<path d="M108,200 Q117,194 126,200" fill="none" ${S} stroke-width="2.8"/>` : spec.expr === 'lelah' ? `<path d="M108,199 Q117,196 126,199" fill="none" ${S} stroke-width="2.6"/>` : spec.expr === 'bicara' ? `<path d="M106,196 C110,206 124,206 128,196 Z" fill="${C.mouth}" ${S}/>` : spec.expr === 'netral' ? `<path d="M108,198 L126,198" ${S} stroke-width="2.8"/>` : `<path d="M104,194 Q117,206 130,194" fill="none" ${S} stroke-width="2.8"/>`;
  const cheeks = `<ellipse cx="74" cy="190" rx="10" ry="6" fill="#E07A5F" opacity=".25"/><ellipse cx="160" cy="190" rx="10" ry="6" fill="#E07A5F" opacity=".25"/>`;
  const brows = ['prihatin', 'lelah'].includes(spec.expr) ? `<path d="M82,142 Q91,140 100,135 M134,135 Q143,140 152,142" fill="none" ${S} stroke-width="3"/>`
    : `<path d="M82,140 Q91,135 100,139 M134,139 Q143,135 152,140" fill="none" ${S} stroke-width="3"/>`;
  const hairs = {   // side part: volume to one side, clean parting line, short at the back — no tuft
    sidepart: `<path d="M34,176 C22,150 24,96 52,72 C80,48 150,46 184,70 C208,88 214,124 206,170 C200,150 196,132 188,118 C164,112 120,108 92,96 C78,110 60,122 46,134 C42,150 40,164 34,176 Z" fill="${hairC}" ${S}/>
      <path d="M92,96 C110,74 140,64 170,66" fill="none" stroke="#4A3D34" stroke-width="3" stroke-linecap="round"/>`,
    short: `<path d="M38,150 C30,96 66,58 117,58 C168,58 204,96 196,150 C188,124 170,108 117,104 C64,108 46,124 38,150 Z" fill="${hairC}" ${S}/>`,
    // kit v1.7 (EP06): grey short hair with a receding line (elder), two pigtails (child), curly crop
    elder: `<path d="M38,150 C30,104 60,72 82,70 C78,86 74,96 72,108 C64,116 50,128 38,150 Z M196,150 C204,104 174,72 152,70 C156,86 160,96 162,108 C170,116 184,128 196,150 Z" fill="${hairC}" ${S}/><path d="M84,70 Q117,62 150,70" fill="none" stroke="${hairC}" stroke-width="6" stroke-linecap="round"/>`,
    pigtails: `<circle cx="22" cy="150" r="22" fill="${hairC}" ${S}/><circle cx="212" cy="150" r="22" fill="${hairC}" ${S}/><path d="M36,156 C28,96 66,60 117,60 C168,60 206,96 198,156 C190,122 166,104 117,102 C68,104 44,122 36,156 Z" fill="${hairC}" ${S}/>`,
    curly: `<path d="M36,150 C22,140 24,112 40,104 C36,80 60,62 80,66 C90,48 120,46 134,58 C156,48 184,64 184,86 C204,92 214,120 198,150 C190,124 168,106 117,104 C66,106 44,124 36,150 Z" fill="${hairC}" ${S}/>`,
    bun: `<circle cx="117" cy="44" r="24" fill="${hairC}" ${S}/><path d="M36,160 C28,96 66,62 117,62 C168,62 206,96 198,160 C190,124 170,104 117,102 C64,104 44,124 36,160 Z" fill="${hairC}" ${S}/>`,
  };
  const topC = spec.top === 'coat' ? '#FFFFFF' : (spec.topColor || '#E7C46A');
  let legs = `<path d="M64,356 L62,428 C62,434 66,436 72,436 L108,436 C113,436 115,433 115,428 L117,384 L119,428 C119,433 121,436 126,436 L162,436 C168,436 172,434 172,428 L170,356 Z" fill="${pants}" ${S}/>`;
  const shoeC = spec.boots || '#3A2E22';
  const shoe = x => spec.boots ? `<path d="M${x - 26},446 L${x - 26},404 L${x + 20},404 L${x + 20},430 C${x + 28},432 ${x + 32},438 ${x + 32},446 L${x + 32},452 C${x + 32},455 ${x + 28},457 ${x + 24},457 L${x - 22},457 C${x - 26},457 ${x - 26},455 ${x - 26},452 Z" fill="${shoeC}" ${S}/>`
    : `<path d="M${x - 30},446 C${x - 30},436 ${x - 24},432 ${x - 16},432 L${x + 16},432 C${x + 24},432 ${x + 30},436 ${x + 30},446 L${x + 30},452 C${x + 30},455 ${x + 27},457 ${x + 22},457 L${x - 22},457 C${x - 27},457 ${x - 30},455 ${x - 30},452 Z" fill="${shoeC}" ${S}/>`;
  // kit v1.10 (EP09): walk cycle (spec.walk = phase in radians, front view: legs lift alternately, the body bobs). Feet stay on the floor line at contact.
  let feetSvg = null;
  if (spec.walk != null) {
    const ph = spec.walk, lift = k => Math.max(0, Math.sin(ph + k)) * 22;
    const leg = (x0, k) => { const L = lift(k); return `<g transform="translate(0,${(-L).toFixed(1)})"><path d="M${x0},356 L${x0 - 2},428 C${x0 - 2},434 ${x0 + 2},436 ${x0 + 8},436 L${x0 + 44},436 C${x0 + 49},436 ${x0 + 51},433 ${x0 + 51},428 L${x0 + 53},356 Z" fill="${pants}" ${S}/>${shoe(x0 + 24)}</g>`; };
    legs = ''; feetSvg = leg(64, 0) + leg(117, Math.PI);
  }
  const torso = `<path d="M56,238 C50,290 44,330 40,352 C40,358 46,360 52,360 L182,360 C188,360 194,358 194,352 C190,330 184,290 178,238 C160,228 74,228 56,238 Z" fill="${topC}" ${S}/>`;
  const inner = spec.top === 'coat' ? `<path d="M96,236 L117,276 L138,236 Z" fill="${spec.topColor || '#7FC8B8'}" ${S}/><path d="M117,276 L117,360" ${S} stroke-width="2.2"/>
      <path d="M48,330 L44,352 L78,354 Z M186,330 L190,352 L156,354 Z" fill="#E4E9E7"/><rect x="130" y="290" width="30" height="20" rx="4" fill="#E4E9E7" ${S} stroke-width="2"/>` : '';
  // kit v1.5 (EP04): security guard — peaked cap with badge, shoulder epaulettes, chest badge, belt with whistle cord
  const guard = spec.prop === 'guard' ? {
    cap: `<path d="M44,112 C44,70 76,52 117,52 C158,52 190,70 190,112 Z" fill="${spec.capColor || '#26324F'}" ${S}/><path d="M40,112 L194,112 C196,120 190,126 182,126 L52,126 C44,126 38,120 40,112 Z" fill="#1A2238" ${S}/>
      <path d="M100,62 L134,62 L130,92 L117,100 L104,92 Z" fill="#E7C46A" ${S} stroke-width="2"/><path d="M58,124 C90,140 144,140 176,124 L172,130 C140,146 94,146 62,130 Z" fill="#11172A" opacity=".5"/>`,
    body: `<rect x="56" y="240" width="34" height="12" rx="4" fill="#E7C46A" ${S} stroke-width="2"/><rect x="144" y="240" width="34" height="12" rx="4" fill="#E7C46A" ${S} stroke-width="2"/>
      <path d="M142,282 L162,282 L164,300 L152,308 L140,300 Z" fill="#E7C46A" ${S} stroke-width="2"/><rect x="44" y="340" width="146" height="14" rx="3" fill="#1A2238" ${S} stroke-width="2"/><rect x="108" y="338" width="18" height="18" rx="3" fill="#C9CED6" ${S} stroke-width="2"/>
      <path d="M96,250 C100,280 104,300 112,322" fill="none" stroke="#C9CED6" stroke-width="3"/>` } : null;
  const steth = spec.prop === 'stethoscope' ? `<path d="M88,240 C80,286 96,312 117,312 C138,312 154,286 146,240" fill="none" stroke="#3B4A48" stroke-width="5" stroke-linecap="round"/><path d="M117,312 L117,330" stroke="#3B4A48" stroke-width="5"/><circle cx="117" cy="336" r="9" fill="#B9C9C6" ${S}/>` : '';
  const hand = spec.gloves || skin;
  const armLdown = `<path d="M58,244 C36,252 24,290 20,338 C20,346 28,350 34,350 L56,350 C58,320 62,290 66,262 Z" fill="${topC}" ${S}/><path d="M30,350 C24,352 22,362 26,369 C31,377 46,377 52,370 C56,364 54,354 48,350 Z" fill="${hand}" ${S}/>`;
  // kit v1.10: left-arm poses for two-handed work (front view). Hands: LHAND[pose] (rig units)
  const limb = (d, hx, hy) => `<path d="${d}" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="12" fill="${hand}" ${S}/>`;
  const LP = { sortL: ['M58,258 C36,300 50,326 80,338', 84, 340], liftL: ['M58,258 C30,240 30,210 48,186', 50, 176], chestL: ['M58,258 C34,300 54,310 84,292', 88, 288], reachL: ['M58,258 C40,290 30,320 26,350', 26, 360] };
  const armL = spec.armL && LP[spec.armL] ? limb(...LP[spec.armL]) : armLdown;
  const armR = spec.arm === 'wave' ? `<path d="M176,258 C204,276 216,268 214,226" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C204,276 216,268 214,226" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="214" cy="214" r="13" fill="${hand}" ${S}/>`
    : spec.arm === 'clipboard' ? `<path d="M176,258 C200,286 190,300 160,300" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C200,286 190,300 160,300" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><rect x="128" y="262" width="54" height="70" rx="6" fill="#C9A47A" ${S}/><rect x="136" y="272" width="38" height="54" rx="3" fill="#fff"/><path d="M142,284 L168,284 M142,296 L168,296 M142,308 L160,308" stroke="#9AA" stroke-width="3"/><circle cx="156" cy="302" r="11" fill="${hand}" ${S}/>`
    : `<g transform="translate(234,0) scale(-1,1)">${armLdown}</g>`;
  const glasses = spec.glasses ? `<circle cx="92" cy="162" r="17" fill="#FFFFFF" fill-opacity=".25" ${S} stroke-width="3"/><circle cx="142" cy="162" r="17" fill="#FFFFFF" fill-opacity=".25" ${S} stroke-width="3"/><path d="M109,160 Q117,155 125,160" fill="none" ${S} stroke-width="3"/>` : '';
  const mask = spec.mask ? `<path d="M72,182 C72,176 162,176 162,182 L158,214 C150,228 84,228 76,214 Z" fill="${spec.mask === true ? '#DCEFF0' : spec.mask}" ${S}/><path d="M80,194 L154,194 M82,206 L152,206" stroke="${C.line}" stroke-width="1.6" opacity=".45"/><path d="M72,184 L44,170 M162,184 L190,170" ${S} stroke-width="2"/>` : '';
  const armX = spec.arm === 'cane' ? `<path d="M176,258 C200,290 204,320 196,346" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C200,290 204,320 196,346" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/>
      <path d="M206,346 L214,456" stroke="${C.line}" stroke-width="11" stroke-linecap="round"/><path d="M206,346 L214,456" stroke="#8A5A2B" stroke-width="6.5" stroke-linecap="round"/><path d="M186,346 Q196,334 208,346" fill="none" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round"/><circle cx="198" cy="348" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'inhaler' ? `<path d="M176,258 C206,276 186,240 150,214" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C206,276 186,240 150,214" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/>
      <rect x="112" y="190" width="22" height="30" rx="6" fill="#7FC8B8" ${S} transform="rotate(-70 123 205)"/><rect x="104" y="196" width="14" height="14" rx="3" fill="#E7E2D6" ${S}/><circle cx="146" cy="212" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'hold' ? `<path d="M176,258 C206,290 222,320 230,346" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C206,290 222,320 230,346" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="232" cy="356" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'sortR' ? `<path d="M176,258 C198,300 184,326 154,338" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C198,300 184,326 154,338" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="150" cy="340" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'lift' ? `<path d="M176,258 C204,240 204,210 186,186" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C204,240 204,210 186,186" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="184" cy="176" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'reach' ? `<path d="M176,258 C194,290 204,320 208,350" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C194,290 204,320 208,350" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="208" cy="360" r="12" fill="${hand}" ${S}/>`
    : spec.arm === 'chest' ? `<path d="M176,258 C200,300 180,310 150,292" fill="none" stroke="${C.line}" stroke-width="27" stroke-linecap="round"/><path d="M176,258 C200,300 180,310 150,292" fill="none" stroke="${topC}" stroke-width="21.8" stroke-linecap="round"/><circle cx="146" cy="288" r="12" fill="${hand}" ${S}/>`
    : null;
  const bob = spec.walk != null ? -Math.abs(Math.sin(spec.walk)) * 6 : 0, gOpen = spec.walk != null ? `<g transform="translate(0,${bob.toFixed(1)})">` : '', gClose = spec.walk != null ? '</g>' : '';
  return `<ellipse cx="117" cy="457" rx="90" ry="9" fill="${spec.shadow || '#00000022'}"/><g filter="url(#wob)">${feetSvg ?? legs + shoe(88) + shoe(146)}${gOpen}${armL}${torso}${inner}${guard ? guard.body : ''}${spec.vest ? WORK.vest(spec.vest) : ''}${steth}
    <g>${face}${cheeks}${eyes}${brows}${mouth}${hairs[spec.hairStyle || 'sidepart']}${guard ? guard.cap : ''}${glasses}${mask}${spec.helmet ? WORK.helmet(spec.helmet) : ''}${spec.cap ? WORK.cap(spec.cap) : ''}</g>${spec.extraBody || ''}${armX ?? armR}${spec.extra || ''}${gClose}</g>`;
}
const doctor = (o = {}) => person({ skin: 'tan', hair: '#2B2420', hairStyle: 'sidepart', top: 'coat', topColor: '#7FC8B8', pants: '#2E3A56', prop: 'stethoscope', expr: o.expr || 'senyum', arm: o.arm || 'clipboard' });
// satpam (EP04): only appears inside Mpi's imagination in EP04
const guard = (o = {}) => person({ skin: o.skin || 'deep', hair: '#1E1A17', hairStyle: 'short', top: 'shirt', topColor: '#3D5A8A', pants: '#26324F', prop: 'guard', expr: o.expr || 'senyum', arm: o.arm || 'clipboard' });
// kit v1.8 (EP07): construction crew = same people rig + removable work layers (helmet colour, high-vis vest colour). No real company logos.
const WORK = {
  // kit v1.10 (EP09): work cap with a short brim (sanitation crew), no logo
  cap: col => `<path d="M38,112 C38,66 74,46 117,46 C160,46 196,66 196,112 Z" fill="${col}" ${S}/><path d="M150,104 C180,100 214,104 226,114 C214,122 180,120 150,116 Z" fill="${col}" ${S}/><path d="M60,84 C70,66 90,56 110,54" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".35"/>`,
  helmet: col => `<path d="M16,102 C16,48 62,22 117,22 C172,22 218,48 218,102 Z" fill="${col}" ${S}/><path d="M40,88 C46,58 76,38 106,34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".45"/><rect x="2" y="96" width="230" height="16" rx="8" fill="${col}" ${S}/>`,
  vest: col => { const P = `<path d="M58,236 C52,290 46,330 42,354 C42,358 46,360 52,360 L100,360 L100,250 C92,240 76,234 58,236 Z" fill="${col}" ${S}/><path d="M46,312 L100,312 M44,336 L100,336" stroke="#EDE6D4" stroke-width="9"/>`;
    return P + `<g transform="translate(234,0) scale(-1,1)">${P}</g>`; },
};
// kit v1.7 (EP06): affected residents — same anatomy as the rest of the universe, own outfits. arm: 'cane' | 'inhaler' | 'hold' | 'chest'; glasses; mask
// hands of the work poses (rig units) so scenes can attach held objects: right arm / left arm
const HANDS = { sortR: [150, 340], lift: [184, 176], reach: [208, 360], chest: [146, 288], hold: [232, 356], sortL: [84, 340], liftL: [50, 176], chestL: [88, 288], reachL: [26, 360], down: [212, 362], downL: [40, 362] };
module.exports = { person, doctor, guard, SKINS, HANDS };
