// Regenerates the series reference images + standalone SVGs from the editable source.
//   node series/tools/export_refs.js
// Output: series/character/mpi_reference_sheet.png, series/character/svg/*.svg,
//         series/world/room_home_preview.png, series/world/room_home.svg, series/brand/palette.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const K = require('../engine/core');
const M = require('../character/mpi');
const R = require('../world/room_home');
const ROOT = path.resolve(__dirname, '..');

const EXPR = ['netral', 'penasaran', 'terkejut', 'bingung', 'berpikir', 'menyadari'];
const POSES = ['down', 'up', 'magnifier', 'chin'];
const html = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${K.FONT_CSS}*{margin:0}body{width:${w}px;height:${h}px;font-family:Nunito}</style></head><body>${body}</body></html>`;

function sheet() {
  const W = 2400, H = 2000; let g = '';
  const cell = (x, y, sc, inner, label, sub) => g += `<g transform="${K.place(x, y, sc)}">${inner}</g>
    <text x="${x}" y="${y + 52}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="26" fill="${K.PALETTE.teal}">${label}</text>
    ${sub ? `<text x="${x}" y="${y + 84}" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="20" fill="#8A7D6B">${sub}</text>` : ''}`;
  EXPR.forEach((e, i) => cell(200 + i * 330, 830, 1.25, M.mpi(e) + (e === 'terkejut' ? M.exclaim(117, 0, 1.2) : '') + (e === 'bingung' ? M.questionMark(205, 40, 1.1) : '') + (e === 'menyadari' ? M.bulb(22, -4, 1, true) : ''), e.toUpperCase(), 'ekspresi'));
  POSES.forEach((p, i) => cell(200 + i * 330, 1600, 1.25, M.mpi('netral', { pose: p }), `pose: ${p}`, p === 'down' ? 'default' : ''));
  cell(1520, 1600, 1.25, M.mpi('netral', { blink: true }), 'blink', 'kedip');
  cell(1850, 1600, 1.25, M.mpi('penasaran', { eye: [6, -6] }), 'eye: [6,-6]', 'arah pandang');
  g += `<rect x="2040" y="1150" width="330" height="560" rx="24" fill="${K.PALETTE.deep}"/><g transform="${K.place(2205, 1600, 1.1)}"><g filter="url(#sticker)">${M.mpi('menyadari', { shadow: null })}</g></g>
    <text x="2205" y="1652" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="24" fill="${K.PALETTE.creamLight}">di latar gelap</text><text x="2205" y="1682" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="19" fill="#9FB8B4">filter #sticker</text>`;
  const sw = [['#FFFEFB', 'wajah'], ['#3A2E22', 'rambut'], ['#1F4D4A', 'hoodie'], ['#2A5F5B', 'hoodie hi'], ['#F4ECE0', 'kaos'], ['#F2A53A', 'badge W'], ['#2B2F2E', 'celana'], ['#F3EEE4', 'sol'], ['#231E1A', 'garis']];
  sw.forEach(([c, n], i) => g += `<rect x="${60 + i * 150}" y="1790" width="120" height="80" rx="14" fill="${c}" stroke="#231E1A" stroke-width="4"/><text x="${120 + i * 150}" y="1905" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="20" fill="#231E1A">${n}</text><text x="${120 + i * 150}" y="1932" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="18" fill="#8A7D6B">${c}</text>`);
  return `<svg width="${W}" height="${H}">${K.DEFS()}<rect width="${W}" height="${H}" fill="${K.PALETTE.cream}"/>
    <text x="60" y="90" font-family="Nunito" font-weight="900" font-size="62" fill="${K.PALETTE.teal}">MPI — reference sheet (rig vektor seri)</text>
    <text x="62" y="138" font-family="Nunito" font-weight="700" font-size="28" fill="#8A7D6B">Sumber: series/character/mpi.js · proporsi: tinggi 456 unit (kepala ±40%), garis 2.6 unit #231E1A, wobble filter "wob"</text>
    <text x="60" y="205" font-family="Nunito" font-weight="900" font-size="34" fill="${K.PALETTE.line}">Ekspresi (pose bawaan)</text>
    <text x="60" y="1010" font-family="Nunito" font-weight="900" font-size="34" fill="${K.PALETTE.line}">Pose & varian</text>${g}</svg>`;
}

function roomPreview() {
  const fast = 0;
  return `<svg width="1080" height="1920">${K.DEFS()}${R.room(4, { floorY: 1040, win: [40, 150, 290, 400], clock: [470, 240, 68], shelf: [900, 790] })}${R.stool(400, 1338)}
    <g transform="translate(110,-110)"><path d="M40,1215 L92,1428 C97,1448 112,1454 132,1454 L448,1454 C468,1454 483,1448 488,1428 L540,1215 Z" fill="#3D8DA3" ${K.S()}/><ellipse cx="290" cy="1215" rx="252" ry="58" fill="#4A9FB5" ${K.S()}/><ellipse cx="290" cy="1219" rx="218" ry="42" fill="#8FD3E3" stroke="#2E7488" stroke-width="4"/></g>
    <g transform="${K.place(760, 1330, 1.6)}">${M.mpi('netral', { shadow: '#D3C3A6' })}</g></svg>`;
}

(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 2400, height: 1900 } });
  const tmp = path.join(ROOT, 'tools', '_tmp.html');
  const shot = async (w, h, body, out) => { await p.setViewportSize({ width: w, height: h }); fs.writeFileSync(tmp, html(w, h, body)); await p.goto(require('url').pathToFileURL(tmp).href); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: out }); };
  await shot(2400, 2000, sheet(), path.join(ROOT, 'character', 'mpi_reference_sheet.png'));
  await shot(1080, 1920, roomPreview(), path.join(ROOT, 'world', 'room_home_preview.png'));
  // standalone editable SVGs (open in Inkscape / Illustrator / Figma; badge "W" uses the Nunito font)
  // strict XML: the rig sometimes repeats an attribute (e.g. stroke-width from the shared stroke string). Browsers keep the FIRST one,
  // XML editors reject the file → keep the first occurrence, exactly what the renderer shows.
  const xmlClean = svg => svg.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g, (m, tag, attrs, sl) => {
    const seen = new Set(); const kept = (attrs.match(/\s+[\w:-]+="[^"]*"/g) || []).filter(a => { const k = a.trim().split('=')[0]; if (seen.has(k)) return false; seen.add(k); return true; });
    return `<${tag}${kept.join('')}${sl ? '/' : ''}>`;
  });
  const svgDoc = (w, h, vb, inner) => xmlClean(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}"><defs>${M.defs()}</defs>${inner}</svg>\n`);
  for (const e of EXPR) for (const po of (e === 'menyadari' ? ['up'] : e === 'berpikir' ? ['chin'] : ['down', 'magnifier']))
    fs.writeFileSync(path.join(ROOT, 'character', 'svg', `mpi_${e}_${po}.svg`), svgDoc(560, 1040, '-40 -60 330 540', M.mpi(e, { pose: po })));
  fs.writeFileSync(path.join(ROOT, 'world', 'room_home.svg'), xmlClean(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs>${R.ROOM_DEFS}</defs>${R.room(0, { floorY: 1040, win: [40, 150, 290, 400], clock: [470, 240, 68], shelf: [900, 790] })}${R.stool(400, 1338)}</svg>\n`));
  fs.rmSync(tmp); await b.close(); console.log('refs exported');
})();
