// Kit v1.2 reference: Mpi turnaround + walk cycle + magnifier grip + supporting-character example (doctor).
//   node series/tools/export_turnaround.js  → series/character/mpi_turnaround_sheet.png
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const K = require('../engine/core'), M = require('../character/mpi'), T = require('../character/mpi_turn'), P = require('../character/people');
const W = 2400, H = 1560; let g = '';
const t = (x, y, s, w = 900, size = 26, c = '#231E1A') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Nunito" font-weight="${w}" font-size="${size}" fill="${c}">${s}</text>`;
const views = [['DEPAN', M.mpi('netral')], ['¾ KIRI', T.mpiQ34('L')], ['SAMPING KIRI', T.mpiSide({ dir: 'L' })], ['BELAKANG', T.mpiBack()], ['SAMPING KANAN', T.mpiSide({ dir: 'R' })], ['¾ KANAN', T.mpiQ34('R')]];
views.forEach(([l, s], i) => { const x = 180 + i * 300; g += `<g transform="${K.place(x, 700, 1.15)}">${s}</g>${t(x, 750, l)}`; });
g += t(1050, 800, 'Badge W ada di dada kiri Mpi: terlihat di samping kanan & ¾, tersembunyi di samping kiri & belakang — huruf W tidak pernah dicerminkan.', 700, 22, '#8A7D6B');
for (let i = 0; i < 8; i++) { const p = T.walkPose(i * 16); const x = 150 + i * 190; g += `<g transform="${K.place(x, 1330, .95)}">${T.walkShadow(p)}${T.mpiSide({ dir: 'R', ...p })}</g>${t(x, 1372, (i + 1) + '/8', 800, 22)}`; }
g += `<path d="M40,1332 L1600,1332" stroke="#B9A88F" stroke-width="3"/>` + t(820, 1420, 'Siklus jalan (kanan): kaki tumpu diam di lantai, kaki ayun terangkat, bayangan di titik kontak. Langkah 64 unit rig.', 700, 22, '#8A7D6B');
[['LUP: 0', 0], ['LUP: ½', .5], ['LUP: 1', 1]].forEach(([l, k], i) => { const x = 1960 + (i - 1) * 0 + 0; });
['0', '.5', '1'].forEach((k, i) => { const x = 1980 + (i - 1) * 140; });
g += `<g transform="${K.place(1960, 700, 1.15)}">${M.mpi('penasaran', { right: 'magnify', ph: 1, eye: [4, -2] })}</g>${t(1960, 750, 'GENGGAM LUP')}`;
g += `<g transform="${K.place(2230, 700, 1.15)}">${M.mpi('ngantuk', { legs: 'sit', headDy: 6, tilt: -5 })}</g>${t(2230, 750, 'DUDUK · NGANTUK')}`;
g += `<rect x="1720" y="860" width="660" height="660" rx="30" fill="#E3F1EC" stroke="#231E1A" stroke-width="4"/>${t(2050, 910, 'KARAKTER PENDUKUNG · CONTOH: DOKTER', 900, 26, '#1F4D4A')}
  <g transform="${K.place(1900, 1360, 1.0)}">${P.doctor({ arm: 'wave' })}</g><g transform="${K.place(2200, 1360, 1.0)}">${P.doctor({ arm: 'clipboard', expr: 'bicara' })}</g>
  ${t(2050, 1410, 'Keluarga bentuk Mpi (chibi, mata titik, garis sama)', 700, 20, '#3A4A48')}${t(2050, 1440, 'tetapi beda: rambut belah samping, kulit sawo matang,', 700, 20, '#3A4A48')}${t(2050, 1470, 'jas putih, celana navy, stetoskop. Tanpa jambul & badge W.', 700, 20, '#3A4A48')}`;
const html = `<html><head><style>${K.FONT_CSS}body{margin:0}</style></head><body><svg width="${W}" height="${H}">${K.DEFS()}<rect width="${W}" height="${H}" fill="#F3EEE4"/>
  ${t(60, 80, '', 900)}<text x="60" y="84" font-family="Nunito" font-weight="900" font-size="58" fill="#1F4D4A">MPI — turnaround & gerak (rig kit v1.2)</text>
  <text x="62" y="128" font-family="Nunito" font-weight="700" font-size="26" fill="#8A7D6B">Sumber: series/character/mpi.js · mpi_turn.js · people.js — wajah, jambul, hoodie teal, badge W, celana, sepatu, proporsi 456 unit, garis 2,6 unit dikunci</text>${g}</svg></body></html>`;
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } }); const tmp = path.join(__dirname, '_t.html'); fs.writeFileSync(tmp, html); await p.goto(require('url').pathToFileURL(tmp).href); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, '..', 'character', 'mpi_turnaround_sheet.png') }); fs.rmSync(tmp); await b.close(); console.log('ok'); })();
