// LOCATION: rumah Mpi (EP01) — one consistent vector set (cream / teal / orange) reused by every everyday shot.
// Draws in world coordinates; each shot passes its own layout so the same room reads from different camera positions.
const K = require('../engine/core');
const { lerp, prog, eio, eout, S, LINE } = K;

const WALL = '#F1E8D8', WALL_LOW = '#E8DCC6', BASE = '#2A5F5B', WOOD = '#B88A5A', FLOOR = '#E3CFAD', FLOOR_D = '#D6BE97';

const ROOM_DEFS = `
  <pattern id="wallpat" width="90" height="90" patternUnits="userSpaceOnUse">
    <rect width="45" height="90" fill="#000" opacity=".018"/>
    <path d="M67,40 l6,-8 l6,8 l-6,8 Z" fill="#3FB8A9" opacity=".16"/><path d="M22,85 l4,-5 l4,5 l-4,5 Z" fill="#F2A53A" opacity=".18"/></pattern>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFEDF1"/><stop offset="1" stop-color="#EAF6F2"/></linearGradient>
  <linearGradient id="floorg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C29C"/><stop offset=".35" stop-color="${FLOOR}"/><stop offset="1" stop-color="#EAD9BC"/></linearGradient>
  <radialGradient id="sun" cx="0" cy="0" r="1"><stop offset="0" stop-color="#FFF6DD" stop-opacity=".75"/><stop offset="1" stop-color="#FFF6DD" stop-opacity="0"/></radialGradient>
  <radialGradient id="vign" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3A2E22" stop-opacity=".16"/></radialGradient>`;

function windowEl([x, y, w, h], t) {
  const sway = 6 * Math.sin(t * .8);
  return `<g>
    <rect x="${x - 26}" y="${y - 26}" width="${w + 52}" height="${h + 52}" rx="14" fill="${BASE}" ${S(6)}/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>
    <ellipse cx="${x + w * .7}" cy="${y + h * .3}" rx="${w * .22}" ry="${h * .06}" fill="#fff" opacity=".7"/>
    <ellipse cx="${x + w * .35}" cy="${y + h * .2}" rx="${w * .16}" ry="${h * .045}" fill="#fff" opacity=".6"/>
    <path d="M${x - 10},${y + h} Q${x + w * .3},${y + h * .72} ${x + w * .55},${y + h * .8} T${x + w + 10},${y + h * .74} L${x + w + 10},${y + h} Z" fill="#9CCFB8" opacity=".75"/>
    <path d="M${x + w / 2},${y} L${x + w / 2},${y + h} M${x},${y + h / 2} L${x + w},${y + h / 2}" stroke="${BASE}" stroke-width="12"/>
    <rect x="${x - 44}" y="${y + h + 22}" width="${w + 88}" height="26" rx="8" fill="${WOOD}" ${S(5)}/>
    <path d="M${x - 30},${y - 36} C${x + 30 + sway},${y + h * .3} ${x - 10 - sway},${y + h * .7} ${x + 34 + sway},${y + h + 18} L${x - 34},${y + h + 18} Z" fill="#F6F3EB" ${S(5)}/>
    <path d="M${x - 14},${y + 20} L${x - 8 + sway * .5},${y + h - 20} M${x + 4},${y + 40} L${x + 14 + sway * .6},${y + h - 30}" stroke="#F2A53A" stroke-width="5" opacity=".7"/>
    <rect x="${x - 60}" y="${y - 50}" width="${w + 120}" height="14" rx="7" fill="${WOOD}" ${S(4)}/>
  </g>`;
}

// minutes shown on the clock (fast spin when the story says time passes)
function clockEl([x, y, r], minutes, secDeg) {
  let ticks = '';
  for (let i = 0; i < 12; i++) ticks += `<path d="M0,${-r * .78} L0,${-r * (i % 3 ? .7 : .62)}" stroke="${LINE}" stroke-width="${i % 3 ? 3 : 5}" stroke-linecap="round" transform="rotate(${i * 30})"/>`;
  return `<g transform="translate(${x},${y})">
    <ellipse cx="6" cy="${r + 24}" rx="${r * .8}" ry="10" fill="#000" opacity=".06"/>
    <circle cx="5" cy="7" r="${r + 10}" fill="#000" opacity=".1"/>
    <circle r="${r + 10}" fill="${BASE}" ${S(6)}/><circle r="${r - 2}" fill="#FBF8F2" ${S(4)}/>${ticks}
    <path d="M0,0 L0,${-r * .45}" stroke="${LINE}" stroke-width="9" stroke-linecap="round" transform="rotate(${(minutes / 60) * 30 + 60})"/>
    <path d="M0,0 L0,${-r * .7}" stroke="${LINE}" stroke-width="6" stroke-linecap="round" transform="rotate(${minutes * 6})"/>
    <path d="M0,${r * .15} L0,${-r * .74}" stroke="#F2A53A" stroke-width="3.5" stroke-linecap="round" transform="rotate(${secDeg})"/>
    <circle r="7" fill="#F2A53A" ${S(3)}/></g>`;
}

function shelfEl([x, y], t) {
  const leaf = a => `<path d="M0,0 C${-14 + a},-40 ${10 + a},-70 ${4 + a},-96 C${24 + a},-70 ${22 + a},-36 0,0 Z" fill="#3F8F7F" ${S(4)}/>`;
  const sw = 3 * Math.sin(t * 1.3);
  return `<g transform="translate(${x},${y})">
    <rect x="0" y="0" width="300" height="20" rx="6" fill="${WOOD}" ${S(5)}/>
    <path d="M30,20 L30,52 L70,20 M270,20 L270,52 L230,20" fill="none" stroke="${WOOD}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="22" y="-88" width="26" height="88" rx="4" fill="${BASE}" ${S(4)}/><rect x="50" y="-74" width="22" height="74" rx="4" fill="#F2A53A" ${S(4)}/>
    <rect x="74" y="-96" width="24" height="96" rx="4" fill="#F6F3EB" ${S(4)}/><rect x="100" y="-62" width="20" height="62" rx="4" fill="#B5532A" transform="rotate(-12 110 0)" ${S(4)}/>
    <g transform="translate(220,0) rotate(${sw})">${leaf(-26)}${leaf(0)}${leaf(24)}</g>
    <path d="M186,-64 L254,-64 L246,0 L194,0 Z" fill="#E08A3C" ${S(5)}/><rect x="180" y="-72" width="80" height="16" rx="5" fill="#F2A53A" ${S(4)}/>
    <rect x="148" y="-40" width="30" height="40" rx="8" fill="#CFEFF5" fill-opacity=".8" ${S(4)}/></g>`;
}

// low wooden stool the basin sits on (front-facing, drawn by the shot under the basin)
function stool(cx, top, w = 520) {
  return `<ellipse cx="${cx}" cy="${top + 128}" rx="${w * .55}" ry="22" fill="#3A2E22" opacity=".12"/>
    <rect x="${cx - w / 2 + 40}" y="${top + 20}" width="26" height="104" rx="8" fill="#9C7046" ${S(5)}/><rect x="${cx + w / 2 - 66}" y="${top + 20}" width="26" height="104" rx="8" fill="#9C7046" ${S(5)}/>
    <rect x="${cx - w / 2}" y="${top}" width="${w}" height="34" rx="12" fill="${WOOD}" ${S(6)}/>
    <path d="M${cx - w / 2 + 20},${top + 12} L${cx + w / 2 - 20},${top + 12}" stroke="#D2A777" stroke-width="5" stroke-linecap="round"/>`;
}

// a cat strolls once along the baseboard (life detail, only in a non-critical moment)
function cat(t, t0, dur, y, x0 = 1300, x1 = -300) {
  const k = (t - t0) / dur;
  if (k <= 0 || k >= 1) return '';
  const x = lerp(x0, x1, k), step = Math.sin((t - t0) * 14), tail = Math.sin((t - t0) * 5) * 10;
  const leg = (lx, ph) => `<path d="M${lx},-18 L${lx + 8 * Math.sin((t - t0) * 14 + ph)},16" stroke="#2B3A38" stroke-width="13" stroke-linecap="round"/>`;
  return `<g transform="translate(${x},${y})">
    <ellipse cx="0" cy="22" rx="70" ry="8" fill="#000" opacity=".1"/>
    <path d="M58,-34 C96,-46 ${108 + tail},-86 ${92 + tail},-104" fill="none" stroke="#2B3A38" stroke-width="13" stroke-linecap="round"/>
    ${leg(-38, 0)}${leg(-20, Math.PI)}${leg(30, Math.PI)}${leg(46, 0)}
    <ellipse cx="4" cy="-34" rx="62" ry="28" fill="#2B3A38"/>
    <g transform="translate(-62,${-56 + step * 2})"><circle r="26" fill="#2B3A38"/><path d="M-20,-12 L-24,-40 L-6,-22 Z M6,-22 L20,-40 L20,-10 Z" fill="#2B3A38"/>
      <circle cx="-9" cy="-4" r="4" fill="#F2A53A"/><circle cx="6" cy="-4" r="4" fill="#F2A53A"/></g>
    <path d="M-56,-30 Q-44,-22 -34,-30" stroke="#F2A53A" stroke-width="6" fill="none"/></g>`;
}

// o: { floorY, win:[x,y,w,h], clock:[x,y,r], shelf:[x,y], minutes, sec, catT0 }
function room(t, o = {}) {
  const F = o.floorY ?? 1040, VPX = 540, VPY = F - 1100, BOT = F + 1600;
  let planks = '';
  for (let i = -8; i <= 16; i++) {
    const xi = -600 + i * 120, xb = VPX + (xi - VPX) * (BOT - VPY) / (F - VPY);
    planks += `<path d="M${xi},${F} L${xb.toFixed(1)},${BOT}" stroke="${FLOOR_D}" stroke-width="3"/>`;
  }
  for (let k = 0, y = F + 34; y < BOT; k++, y += 34 * Math.pow(1.38, k)) planks += `<path d="M-600,${y.toFixed(1)} L1680,${y.toFixed(1)}" stroke="${FLOOR_D}" stroke-width="2.5" opacity=".7"/>`;
  const rail = F - 330;
  const win = o.win, clk = o.clock;
  const beam = win ? `<path d="M${win[0]},${win[1] + win[3]} L${win[0] + win[2]},${win[1] + win[3]} L${win[0] + win[2] + 520},${F + 380} L${win[0] + 180},${F + 380} Z" fill="#FFF6DD" opacity="${(.26 + .03 * Math.sin(t * .7)).toFixed(3)}"/>` : '';
  return `<rect x="-600" y="-600" width="2280" height="${F + 600}" fill="${WALL}"/>
    <rect x="-600" y="-600" width="2280" height="${F + 600}" fill="url(#wallpat)"/>
    <rect x="-600" y="${rail}" width="2280" height="${F - rail}" fill="${WALL_LOW}"/>
    <rect x="-600" y="${rail - 8}" width="2280" height="14" fill="${WOOD}" opacity=".85"/>
    ${win ? `<ellipse cx="${win[0] + win[2] / 2}" cy="${win[1] + win[3] / 2}" rx="${win[2] * 1.6}" ry="${win[3] * 1.3}" fill="url(#sun)"/>${windowEl(win, t)}` : ''}
    ${o.shelf ? shelfEl(o.shelf, t) : ''}
    ${clk ? clockEl(clk, o.minutes ?? (10 + t / 60), o.sec ?? (t * 6)) : ''}
    <rect x="-600" y="${F}" width="2280" height="${BOT - F + 400}" fill="url(#floorg)"/>${planks}
    ${beam}
    <rect x="-600" y="${F - 30}" width="2280" height="34" fill="${BASE}"/><rect x="-600" y="${F - 30}" width="2280" height="6" fill="#3F8F7F" opacity=".7"/>
    <rect x="-600" y="${F + 4}" width="2280" height="26" fill="#000" opacity=".07"/>
    ${o.catT0 !== undefined ? cat(t, o.catT0, o.catDur || 2.4, F + 10) : ''}
    <rect x="-600" y="-600" width="2280" height="3400" fill="url(#vign)"/>`;
}
const vignette = () => `<rect x="-600" y="-600" width="2280" height="3400" fill="url(#vign)"/>`;

module.exports = { room, ROOM_DEFS, stool, vignette, clockEl };
