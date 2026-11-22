// Kit v1.4 asset sheet for EP03 additions: ant (top / side / carry / walk phases), crumb, pheromone intensities + fading,
// kitchen front, floor-from-above with nest / stool leg / fork cap / crumb, lens ring, Mpi crouch poses.
// node series/tools/export_ant_sheet.js <out.png>
const { chromium } = require('playwright');
const K = require('../engine/core'), M = require('../character/mpi'), KT = require('../world/kitchen'), A = require('../creatures/ant'), PH = require('../creatures/pheromone');
const lab = (x, y, t) => `<text x="${x}" y="${y}" font-family="Nunito" font-weight="900" font-size="26" fill="#231E1A">${t}</text>`;
let g = `<rect width="2160" height="1920" fill="#F3EEE4"/><rect width="2160" height="1920" fill="url(#paper)"/>`;
g += lab(40, 60, 'SEMUT · tampak atas (fase langkah tripod, kaki menapak tidak meluncur)');
for (let i = 0; i < 6; i++) g += `<g transform="translate(${110 + i * 170},170) scale(2.2)">${A.antTop({ dist: i * 5, sweep: i })}</g>`;
g += lab(40, 300, 'membawa remah · berhenti (antena siaga) · tampak samping (antena menyentuh permukaan)');
g += `<g transform="translate(140,420) scale(3)">${A.antTop({ carry: 1, dist: 6, sweep: 1 })}</g><g transform="translate(440,420) scale(3)">${A.antTop({ still: 1, alert: 1, sweep: 2 })}</g>`;
g += `<g transform="translate(760,480) scale(4)">${A.antSide({ dist: 4, touch: 1 })}</g><path d="M600,480 L1040,480" stroke="#231E1A" stroke-width="4"/>`;
g += lab(40, 600, 'REMAH (utuh → habis) · FEROMON (intensitas 0,3 / 1 / 2 / memudar)');
[0, .35, .7, .95].forEach((b, i) => { g += A.crumbSvg(110 + i * 150, 700, 1, b); });
const r = A.route([[0, 0], [380, 0]], 0);
[.3, 1, 2, .12].forEach((I, i) => { g += `<g transform="translate(${620},${660 + i * 50})"><rect x="-10" y="-22" width="420" height="44" fill="${PH.TINT}" opacity=".36"/>${PH.trail(r, 0, 380, I)}</g>`; });
g += lab(40, 900, 'Mpi v1.4: menggigit biskuit · memegang biskuit · jongkok · jongkok menunjuk · jongkok + kaca pembesar');
[['netral', { right: 'bite' }], ['penasaran', { right: 'biscuit' }], ['penasaran', { legs: 'crouch', left: 'knee', right: 'knee', eye: [2, 8] }], ['menyadari', { legs: 'crouch', left: 'knee', right: 'pointdown', eye: [6, 9] }], ['penasaran', { legs: 'crouch', left: 'knee', right: 'magnify', ph: .3, eye: [6, 9] }]]
  .forEach(([e, o], i) => { g += `<g transform="${K.place(120 + i * 205, 1380, .9)}">${M.mpi(e, o)}</g>`; });
g += `<g transform="translate(1100,40) scale(.5)"><svg width="1080" height="1920" viewBox="0 0 1080 1920" overflow="hidden">${KT.front(0)}</svg></g>` + lab(1110, 1010, 'DAPUR (tampak depan) · celah sarang di kaki kabinet');
g += `<g transform="translate(1100,1040) scale(.44)"><svg width="1080" height="1920" viewBox="0 0 1080 1920" overflow="hidden">${KT.floorTop()}${PH.tint()}${PH.trail(A.route(KT.TOP.routeA), 0, 1599, 1.4)}${PH.trail(A.route([...KT.TOP.routeA.slice(0, 8), ...KT.TOP.routeB.slice(1)]), 1084, 1660, .5, { seed: 3 })}${A.crumbSvg(...KT.TOP.crumb, 1.3)}${PH.lensRing(540, 960, 520)}</svg></g>`;
g += lab(1620, 1100, 'LANTAI (tampak atas)'); g += lab(1620, 1140, 'sarang kiri atas'); g += lab(1620, 1180, 'kaki bangku = belokan'); g += lab(1620, 1220, 'tutup botol = cabang'); g += lab(1620, 1260, 'remah kanan bawah'); g += lab(1620, 1300, 'lensa = mode investigasi');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2160, height: 1920 } });
  await p.setContent(`<html><head><style>${K.FONT_CSS} body{margin:0} svg{position:absolute;left:0;top:0}</style></head><body><div style="font-family:Nunito;font-weight:900;position:absolute;opacity:0">a</div><svg width="2160" height="1920">${K.DEFS(PH.DEFS)}${g}</svg></body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: process.argv[2] || 'ant_sheet.png' }); await b.close(); })();
