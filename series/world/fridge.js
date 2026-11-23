// LOCATION KIT v1.15 (EP14 "Kok Basi di Kulkas?") — Mpi's kitchen with the FRIDGE, and the props of food storage.
// New file, opt-in: no existing module changes. Same series look: cream/teal/orange, #231E1A outline, flat fills + 1 highlight.
//   kitchenView(t, o)   front view of the kitchen (kitchen.js front, shifted) with the fridge on the right; o.door 0..1 opens it
//                       (light spills onto the floor), o.freezer 0..1, o.items, o.cam {x,y,s} (world → screen), o.under/o.over = extra svg
//   fridge(x, y, t, o)  the fridge itself (x,y = top-left of the body, W×H = FR.w×FR.h); interior drawn when the door opens
//   interior(x, y, w, h, t, o)  inside: back wall, glass shelves, lamp glow, generic items (no brands); o.box = where the box sits
//   box(x, y, s, o)     food container (x,y = bottom-centre): o.lid 0..1 (open), o.spoil 0..1, o.label text, o.kind 'box'|'big'|'shallow'|'small'
//   pot(), remote(), thermoDial(), odor(), snow(), heatSection(), dateLabel(), calendar(), freezerFrost()
// Content rules: numbers (°C, jam, hari) are drawn ONLY by the scene when the VO says them; no brand names; odor = soft wavy
// lines (never cartoon "stink" skulls); spoiled food = colour/texture change, not gore.
const { PALETTE: P, LINE, S, lerp, clamp, prog, eio, eout } = require('../engine/core');
const KI = require('./kitchen');
const H = require('./haze');
const { f1, f3, hash } = H;

const FR = { w: 360, h: 980, body: '#EEF3EF', bodyD: '#D3DDD8', bodyHi: '#FFFFFF', trim: '#2A5F5B', inside: '#FFF9EA', insideD: '#E8E3D2', light: '#FFF4CC',
  lid: '#3F8F7F', lidD: '#2F6F60', boxBody: '#F6F3EB', rice: '#F4EBD6', riceD: '#DCCFB2', stew: '#E0A65A', veg: '#7DBF8A', spoil: '#A9B27A', spoilD: '#7E8A58',
  cold: '#9FD8E6', coldD: '#4E9CB8', warm: '#F2A53A', warmD: '#E07A5F', odor: '#9DAA6E', frost: '#E6F6FA' };

// ---------- small props ----------
function snow(x, y, s = 1, col = FR.coldD, o = 1) {
  const arm = a => `<path transform="rotate(${a})" d="M0,0 L0,-30 M0,-18 L-9,-26 M0,-18 L9,-26" stroke="${col}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  return `<g opacity="${f3(o)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">${[0, 60, 120, 180, 240, 300].map(arm).join('')}<circle r="5" fill="${col}"/></g>`;
}
// soft wavy odor lines rising from (x,y); k = strength 0..1 (lines are born continuously, so it never "pops")
function odor(t, x, y, k = 1, o = {}) {
  if (k <= 0) return '';
  const n = o.n || 4, w = o.w || 120, hgt = o.h || 260, col = o.col || FR.odor; let g = '';
  for (let i = 0; i < n; i++) {
    const ph = (t * (o.speed || .32) + i / n) % 1, xx = x + (i - (n - 1) / 2) * (w / n) + 18 * Math.sin(t * 1.3 + i * 2), yy = y - hgt * ph;
    g += `<path d="M${f1(xx)},${f1(yy)} q${f1(16 + 6 * Math.sin(i))},-24 0,-48 q-16,-24 0,-48" fill="none" stroke="${col}" stroke-width="${f1(o.sw || 9)}" stroke-linecap="round" opacity="${f3(k * .8 * Math.sin(Math.PI * ph))}"/>`;
  }
  return g;
}
// food container. kinds: 'box' (the episode's lunch box), 'big' (deep pot-like tub), 'shallow' (flat), 'small' (little square)
const KIND = { box: [300, 170], big: [320, 300], shallow: [260, 90], small: [170, 120] };
function box(x, y, s = 1, o = {}) {
  const [w, h] = o.size || KIND[o.kind || 'box'], lid = clamp(o.lid || 0), sp = clamp(o.spoil || 0), hw = w / 2;
  const food = o.food === false ? '' : (() => {
    const top = -h + 34; let g = `<path d="M${-hw + 18},${top + 30} C${-hw + 40},${top - 8} ${hw - 40},${top - 8} ${hw - 18},${top + 30} L${hw - 18},-14 L${-hw + 18},-14 Z" fill="${lerpHex(FR.rice, FR.spoil, sp * .55)}"/>`;
    for (let i = 0; i < 9; i++) { const gx = -hw + 40 + (i * 37) % (w - 80), gy = top + 14 + (i * 23) % 26; g += `<ellipse cx="${gx}" cy="${gy}" rx="10" ry="5" fill="${lerpHex(FR.riceD, FR.spoilD, sp * .6)}" opacity=".8"/>`; }
    g += `<ellipse cx="${hw * .32}" cy="${top + 18}" rx="${hw * .36}" ry="18" fill="${lerpHex(FR.stew, '#B98A4E', sp)}" ${S(3)}/><circle cx="${hw * .22}" cy="${top + 12}" r="8" fill="${FR.veg}" ${S(2.5)}/><circle cx="${hw * .48}" cy="${top + 20}" r="7" fill="${P.orange}" ${S(2.5)}/>`;
    if (sp > .3) for (let i = 0; i < 5; i++) g += `<circle cx="${-hw * .5 + i * 26}" cy="${top + 10 + (i % 2) * 10}" r="${f1(5 + 6 * (sp - .3))}" fill="#C9CFB0" opacity="${f3((sp - .3) * 1.2)}"/>`;
    return g;
  })();
  const body = `<path d="M${-hw},${-h} L${hw},${-h} L${hw - 12},-6 C${hw - 13},0 ${hw - 18},2 ${hw - 24},2 L${-hw + 24},2 C${-hw + 18},2 ${-hw + 13},0 ${-hw + 12},-6 Z" fill="${FR.boxBody}" fill-opacity="${o.clear ? .55 : 1}" ${S(6)}/>`;
  const side = `<path d="M${-hw + 16},${-h + 20} L${-hw + 26},-12" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".7"/>`;
  const drops = o.condense ? [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${-hw + 30 + i * (w - 60) / 5}" cy="${-h + 22 + (i % 3) * 10}" r="${3 + i % 2}" fill="#DFF3F8" opacity="${f3(.8 * o.condense)}"/>`).join('') : '';
  // lid: pivots at the back edge (viewer's right) and lifts/tilts away
  const lidAng = lerp(0, 72, eio(lid)), lidY = -h - 4;
  const lidSvg = `<g transform="translate(${hw},${lidY}) rotate(${f1(lidAng)}) translate(${-hw},${-lidY})"><rect x="${-hw - 10}" y="${lidY - 26}" width="${w + 20}" height="30" rx="12" fill="${o.lidCol || FR.lid}" ${S(6)}/>
    <rect x="${-hw - 18}" y="${lidY - 10}" width="22" height="20" rx="6" fill="${FR.lidD}" ${S(4)}/><rect x="${hw - 4}" y="${lidY - 10}" width="22" height="20" rx="6" fill="${FR.lidD}" ${S(4)}/>
    <path d="M${-hw + 14},${lidY - 18} L${hw - 60},${lidY - 18}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/></g>`;
  const label = o.label ? `<g transform="translate(${-hw * .2},${-h * .45}) rotate(-3)"><rect x="-62" y="-24" width="124" height="48" rx="6" fill="#FFF6D8" ${S(4)}/><text y="11" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="28" fill="${LINE}">${o.label}</text></g>` : '';
  const shadow = o.shadow === false ? '' : `<ellipse cx="0" cy="6" rx="${hw + 20}" ry="14" fill="#000" opacity=".12"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">${shadow}${lid > .02 ? lidSvg : ''}${body}${food}${side}${drops}${label}${lid <= .02 ? lidSvg : ''}${o.fuzz ? fuzz(0, -h - 30, w, o.fuzz) : ''}</g>`;
}
// grey-green fuzz on a forgotten lid (the "mysterious" box): small soft tufts, k 0..1
function fuzz(x, y, w, k) { let g = ''; for (let i = 0; i < 9; i++) { const xx = x - w * .42 + i * w * .105, r = (10 + (i * 7) % 9) * k; g += `<circle cx="${f1(xx)}" cy="${f1(y + (i % 2) * 6)}" r="${f1(r)}" fill="#B9C4A2" ${S(2.5)} opacity=".95"/><circle cx="${f1(xx - 3)}" cy="${f1(y - 3)}" r="${f1(r * .35)}" fill="#E3E8D6"/>`; } return g; }
function lerpHex(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }

function pot(x, y, s = 1, t = 0, o = {}) {              // cooking pot with leftovers (x,y = bottom-centre), o.steam 0..1
  const st = o.steam ? [0, 1, 2].map(i => { const k = ((t * .4 + i / 3) % 1); return `<path d="M${-60 + i * 60 + 8 * Math.sin(t * 2 + i)},${-190 - 140 * k} q14,-16 0,-32 q-14,-16 0,-32" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="${f3(o.steam * .8 * (1 - k))}"/>`; }).join('') : '';
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><ellipse cx="0" cy="6" rx="190" ry="16" fill="#000" opacity=".12"/>
    <path d="M-170,-170 L170,-170 L160,-14 C158,-2 150,4 136,4 L-136,4 C-150,4 -158,-2 -160,-14 Z" fill="#9FB2AE" ${S(6)}/><path d="M-150,-150 L-142,-24" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".45"/>
    <path d="M-170,-120 L-214,-126 M170,-120 L214,-126" stroke="${LINE}" stroke-width="22" stroke-linecap="round"/><path d="M-170,-120 L-210,-126 M170,-120 L210,-126" stroke="#5B6564" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="0" cy="-170" rx="170" ry="26" fill="#7E8E8A" ${S(6)}/><ellipse cx="0" cy="-166" rx="150" ry="18" fill="${o.fill || FR.stew}"/>
    <circle cx="-50" cy="-168" r="10" fill="${FR.veg}" ${S(2.5)}/><circle cx="40" cy="-164" r="9" fill="${P.orange}" ${S(2.5)}/><circle cx="90" cy="-170" r="8" fill="${FR.veg}" ${S(2.5)}/>${st}</g>`;
}
// TV-style remote; o.press = 'slow' | 'pause' | 'rew' | null, o.k = press amount 0..1 (button glows + sinks)
function remote(x, y, s = 1, o = {}) {
  const btn = (id, bx, by, icon) => { const on = o.press === id ? clamp(o.k ?? 1) : 0;
    return `<g transform="translate(${bx},${by + 3 * on})"><circle r="30" fill="${on > 0 ? lerpHex('#F6F3EB', P.orange, on) : '#F6F3EB'}" ${S(5)}/>${icon}</g>`; };
  const slow = `<path d="M-14,-12 L4,0 L-14,12 Z" fill="${LINE}"/><path d="M8,-12 L8,12" ${S(5)}/><path d="M-20,20 Q0,30 20,20" fill="none" ${S(3)}/>`;   // play + "slow" bar
  const pause = `<rect x="-12" y="-14" width="8" height="28" rx="3" fill="${LINE}"/><rect x="4" y="-14" width="8" height="28" rx="3" fill="${LINE}"/>`;
  const rew = `<path d="M2,-12 L-14,0 L2,12 Z M18,-12 L2,0 L18,12 Z" fill="${LINE}"/>`;
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${o.rot || 0})"><rect x="-58" y="-170" width="116" height="320" rx="44" fill="#2E3D3B" ${S(6)}/><rect x="-40" y="-150" width="80" height="30" rx="12" fill="#3F8F7F" opacity=".8"/>
    ${btn('slow', 0, -70, slow)}${btn('pause', 0, 4, pause)}${btn('rew', 0, 78, rew)}<path d="M-40,-140 L-40,120" stroke="#fff" stroke-width="5" opacity=".12" stroke-linecap="round"/></g>`;
}
// round fridge thermometer; level 0 cold … 1 warm (needle). o.num = text drawn ONLY when the VO says the number (scene decides)
function thermoDial(x, y, s = 1, level = .2, o = {}) {
  const a = lerp(-120, 120, clamp(level)), arc = (a0, a1, col) => { const p = q => [Math.sin(q * Math.PI / 180) * 70, -Math.cos(q * Math.PI / 180) * 70]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path d="M${f1(x0)},${f1(y0)} A70,70 0 0 1 ${f1(x1)},${f1(y1)}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round"/>`; };
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><circle r="100" fill="#FBF6EC" ${S(7)}/>${arc(-120, -30, FR.coldD)}${arc(-30, 40, FR.cold)}${arc(40, 120, FR.warmD)}
    <path transform="rotate(${f1(a)})" d="M0,10 L0,-66" stroke="${LINE}" stroke-width="9" stroke-linecap="round"/><circle r="12" fill="${P.orange}" ${S(4)}/>
    ${o.num ? `<text y="64" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="40" fill="${LINE}" opacity="${f3(o.numK ?? 1)}">${o.num}</text>` : ''}
    <path d="M-12,-100 L-12,-130 C-12,-140 12,-140 12,-130 L12,-100" fill="#FBF6EC" ${S(6)}/></g>`;
}
// container cross-section cooling map: k = time since it went in the cold (0..1 of the shown span). Edges cool first, the
// centre stays warm longer; depth = how far the centre is from any cold wall (deep tub = slow, shallow = fast).
function heatSection(x, y, w, h, k, o = {}) {        // x,y = top-left of the food block (inside the container walls)
  const N = o.n || 9, M = Math.max(3, Math.round(N * h / w)), cw = w / N, ch = h / M, depth = Math.min(w, h) / 2; let g = '';
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const cx = (i + .5) * cw, cy = (j + .5) * ch, d = Math.min(cx, w - cx, cy, h - cy) / depth;     // 0 at a wall … 1 at the centre
    const front = clamp(k * (o.speed || 1) * 1.15);                                                    // cooling front moves inward
    const warm = clamp((d - front) / .35 + .5);
    g += `<rect x="${f1(x + i * cw)}" y="${f1(y + j * ch)}" width="${f1(cw + .5)}" height="${f1(ch + .5)}" fill="${lerpHex(FR.cold, FR.warm, warm)}"/>`;
  }
  return `<g>${g}<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" ${S(6)}/></g>`;
}
function dateLabel(x, y, s, text, o = {}) { return `<g opacity="${f3(o.o ?? 1)}" transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)}) rotate(${o.rot || -4})"><rect x="-80" y="-30" width="160" height="60" rx="8" fill="#FFF6D8" ${S(5)}/><path d="M-60,-10 L60,-10" stroke="#E2D6C2" stroke-width="3"/><text y="16" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="32" fill="${LINE}">${text}</text></g>`; }
function calendar(x, y, s, o = {}) {          // small generic calendar; o.mark = [index…] days circled (0..6), o.k fill progress
  let g = `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})"><rect x="-150" y="-110" width="300" height="220" rx="18" fill="#FBF6EC" ${S(6)}/><rect x="-150" y="-110" width="300" height="50" rx="18" fill="${P.teal}" ${S(6)}/>`;
  for (let i = 0; i < 7; i++) { const cx = -120 + i * 40, on = (o.mark || []).includes(i); const k = on ? clamp(((o.k ?? 1) * (o.mark.length) - o.mark.indexOf(i))) : 0;
    g += `<circle cx="${cx}" cy="10" r="15" fill="${on ? lerpHex('#FBF6EC', P.orange, k) : '#EDE5D5'}" ${S(3)}/>`; }
  return g + `<path d="M-110,60 L110,60" stroke="#E2D6C2" stroke-width="6" stroke-linecap="round"/></g>`;
}
// ---------- the fridge ----------
function interior(x, y, w, h, t, o = {}) {
  const glow = o.light ?? 1; let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${FR.inside}" ${S(6)}/>`;
  g += `<path d="M${x + 18},${y + 18} L${x + 60},${y + 60} L${x + w - 60},${y + 60} L${x + w - 18},${y + 18}" fill="${FR.insideD}" opacity=".7"/>`;
  g += `<ellipse cx="${x + w / 2}" cy="${y + 50}" rx="${w * .45}" ry="70" fill="${FR.light}" opacity="${f3(.75 * glow)}"/><rect x="${x + w / 2 - 40}" y="${y + 12}" width="80" height="18" rx="9" fill="#FFF1B8" ${S(3)}/>`;
  const shelves = o.shelves || [.33, .62, .86];
  shelves.forEach(q => { const sy = y + h * q; g += `<rect x="${x + 10}" y="${sy}" width="${w - 20}" height="12" rx="5" fill="#DFF3F8" fill-opacity=".85" ${S(4)}/>`; });
  const items = o.items !== false;
  if (items) {   // generic items, no brands: milk bottle, egg tray, greens, jar, water jug
    const s1 = y + h * shelves[0], s2 = y + h * shelves[1], s3 = y + h * shelves[2];
    g += `<rect x="${x + 30}" y="${s1 - 120}" width="56" height="120" rx="16" fill="#FBFBF7" ${S(5)}/><rect x="${x + 38}" y="${s1 - 138}" width="40" height="22" rx="6" fill="${P.teal}" ${S(4)}/><rect x="${x + 30}" y="${s1 - 80}" width="56" height="34" fill="#BFE3EC"/>`;
    g += `<rect x="${x + w - 150}" y="${s1 - 44}" width="124" height="44" rx="8" fill="#E7D6B8" ${S(4)}/>${[0, 1, 2].map(i => `<ellipse cx="${x + w - 128 + i * 40}" cy="${s1 - 46}" rx="16" ry="20" fill="#FBF3E4" ${S(3)}/>`).join('')}`;
    g += `<path d="M${x + 40},${s3} C${x + 30},${s3 - 70} ${x + 90},${s3 - 90} ${x + 110},${s3 - 40} C${x + 130},${s3 - 90} ${x + 170},${s3 - 60} ${x + 150},${s3} Z" fill="${FR.veg}" ${S(4)}/>`;
    g += `<rect x="${x + w - 110}" y="${s3 - 96}" width="72" height="96" rx="14" fill="#DFF3F8" fill-opacity=".85" ${S(4)}/><rect x="${x + w - 116}" y="${s3 - 110}" width="84" height="20" rx="6" fill="${P.orange}" ${S(4)}/>`;
    if (o.back) g += o.back;   // e.g. the forgotten box at the back
    if (o.box !== false) g += box(x + w * (o.boxX ?? .52), s2, (o.boxS || .62), { ...(o.boxO || {}) });
  }
  return g + (o.extra || '');
}
function fridge(x, y, t, o = {}) {
  const w = FR.w, h = FR.h, fh = 250, door = clamp(o.door || 0), frz = clamp(o.freezer || 0);
  let g = `<ellipse cx="${x + w / 2}" cy="${y + h + 8}" rx="${w * .6}" ry="20" fill="#000" opacity=".14"/>`;
  g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${FR.bodyD}" ${S(7)}/>`;
  // freezer (top) + fridge (bottom) compartments: interiors under the doors
  if (frz > 0) g += `<rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${fh - 24}" rx="16" fill="#EAF7FB" ${S(5)}/>${freezerFrost(x + 14, y + 14, w - 28, fh - 24)}${o.freezerItems || ''}`;
  if (door > 0) g += interior(x + 14, y + fh + 4, w - 28, h - fh - 18, t, { light: door, ...(o.inside || {}) });
  // doors: hinged on the RIGHT edge; seen from the front they narrow and swing out to the right (inner face visible)
  const drawDoor = (y0, hh, k, inner) => {
    if (k < .5) { const ww = w * Math.cos(k * Math.PI); return `<g><rect x="${f1(x + w - ww)}" y="${y0}" width="${f1(ww)}" height="${hh}" rx="24" fill="${FR.body}" ${S(7)}/><rect x="${f1(x + w - ww + 26)}" y="${y0 + 40}" width="16" height="${Math.min(330, hh - 80)}" rx="8" fill="${FR.trim}" ${S(4)}/><path d="M${f1(x + w - ww + 60)},${y0 + 30} L${f1(x + w - ww + 60)},${y0 + hh - 30}" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".55"/>${k < .05 ? (o.magnets && y0 > y + 10 ? magnets(x, y0, w) : '') : ''}</g>`; }
    const ww = w * .42 * Math.sin((k - .5) * Math.PI) + 18;       // inner face, beyond the hinge
    return `<g><path d="M${x + w},${y0} L${f1(x + w + ww)},${y0 + 30} L${f1(x + w + ww)},${y0 + hh - 30} L${x + w},${y0 + hh} Z" fill="#E4ECE8" ${S(7)}/>${inner ? [.25, .5, .75].map(q => `<path d="M${x + w + 6},${f1(y0 + hh * q)} L${f1(x + w + ww - 6)},${f1(y0 + hh * q + 8)}" stroke="${FR.trim}" stroke-width="8" stroke-linecap="round" opacity=".7"/>`).join('') : ''}</g>`;
  };
  g += drawDoor(y + fh, h - fh, door, true) + drawDoor(y, fh - 10, frz, false);
  if (door > 0 && door < .5 || door <= 0) { /* closed parts drawn */ }
  return g + (door > 0 ? `<rect x="${x - 40}" y="${y + fh}" width="${w + 80}" height="${h - fh}" fill="${FR.light}" opacity="${f3(.12 * door)}"/>` : '');
}
function freezerFrost(x, y, w, h) { return `<path d="M${x + 6},${y + 18} q20,-12 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>${snow(x + w - 40, y + 50, .7, FR.cold)}${snow(x + 50, y + h - 40, .5, FR.cold)}`; }
function magnets(x, y0, w) {   // living details on the door: a child's drawing, a round magnet, a note
  return `<g transform="translate(${x + 110},${y0 + 110}) rotate(-6)"><rect x="-70" y="-60" width="140" height="120" rx="6" fill="#FFFDF6" ${S(4)}/><circle cx="-24" cy="-6" r="22" fill="none" stroke="${P.orange}" stroke-width="6"/><path d="M-50,40 Q0,10 50,40" fill="none" stroke="${P.tealLeaf}" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="-60" r="10" fill="${P.alert}" ${S(3)}/></g>
    <circle cx="${x + 260}" cy="${y0 + 90}" r="20" fill="${P.orange}" ${S(4)}/><g transform="translate(${x + 250},${y0 + 300}) rotate(5)"><rect x="-50" y="-36" width="100" height="72" rx="4" fill="#FFF1B8" ${S(4)}/><path d="M-34,-12 L30,-12 M-34,8 L18,8" stroke="#C9B98E" stroke-width="5" stroke-linecap="round"/><rect x="-14" y="-44" width="28" height="16" rx="4" fill="${P.tealLeaf}" ${S(3)}/></g>`;
}
// ---------- the whole kitchen (front) with the fridge ----------
const KX = -330;                                      // kitchen.front shifted so the window sits left of the fridge
const FX = 650, FY = 312;                             // fridge body top-left (screen units at cam scale 1)
function kitchenView(t, o = {}) {
  const c = o.cam || { x: 540, y: 960, s: 1 }, fy = o.fy || 960;
  let w = `<g transform="translate(${KX},0)">${KI.front(t, { stool: false })}</g>`;
  w += `<g>${clockWall(390, 520, 52, o.clockMin ?? (600 + t * 2))}</g>`;
  w += o.under || '';
  w += fridge(FX, FY, t, { door: o.door, freezer: o.freezer, magnets: true, inside: o.inside, freezerItems: o.freezerItems });
  const d = clamp(o.door || 0);
  if (d > 0) w += `<path d="M${FX},${FY + FR.h} L${FX + FR.w},${FY + FR.h} L${FX + FR.w + 160},2100 L${FX - 420},2100 Z" fill="${FR.light}" opacity="${f3(.28 * d)}"/>`;
  w += o.over || '';
  return `<rect x="-200" y="-200" width="1480" height="2320" fill="${P.cream}"/><g transform="translate(540,${fy}) scale(${f3(c.s)}) translate(${f1(-c.x)},${f1(-c.y)})">${w}</g>`;
}
function clockWall(x, y, r, minutes) { const C = require('./canopy'); return C.clockFace(x, y, r, minutes); }

module.exports = { FR, KIND, KX, FX, FY, snow, odor, box, fuzz, pot, remote, thermoDial, heatSection, dateLabel, calendar, interior, fridge, freezerFrost, magnets, kitchenView, lerpHex };
