// EP14 QC sheet: renders an SVG string (from a module function) to PNG without the episode pipeline.
//   node episodes/ep14_kulkas/tools/sheet.js <out.png> <js-expression returning svg body>   (K, FRG, MB, M in scope)
const path = require('path'), fs = require('fs'); const { chromium } = require('playwright');
const S = path.join(__dirname, '..', '..', '..', 'series');
const K = require(path.join(S, 'engine', 'core')), FRG = require(path.join(S, 'world', 'fridge')), MB = require(path.join(S, 'creatures', 'microbe')), M = require(path.join(S, 'character', 'mpi')), H = require(path.join(S, 'world', 'haze'));
M.setStyle({ hair: 'v2' });
(async () => {
  const body = eval(process.argv[3]);
  const html = `<!doctype html><html><head><style>${K.FONT_CSS} *{margin:0} body{width:1080px;height:1920px;background:${K.PALETTE.cream}} svg{position:absolute;left:0;top:0}</style></head><body><svg width="1080" height="1920">${K.DEFS(H.HZ_DEFS)}${body}</svg></body></html>`;
  const f = path.resolve(process.argv[2] + '.html'); fs.writeFileSync(f, html);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(require('url').pathToFileURL(f).href); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: process.argv[2] }); await b.close(); fs.rmSync(f);
})();
