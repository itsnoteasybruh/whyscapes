// QC sheet for series/world/garden.js — node tools/sheet_garden.js out.png
const { chromium } = require('playwright');
const K = require('../../../series/engine/core'), GD = require('../../../series/world/garden'), BEE = require('../../../series/creatures/bee'), H = require('../../../series/world/haze');
const t = 1.5;
const cell = (i, inner) => `<g transform="translate(${i * 1080},0)"><svg width="1080" height="1920" overflow="hidden">${inner}</svg></g>`;
const body = `<svg width="3240" height="1920">${K.DEFS(H.HZ_DEFS)}
${cell(0, GD.panorama(t, 200, { sunX: 820, hi: { hive: 1 } }) + BEE.side(600, 900, 1.2, { t, mark: true }))}
${cell(1, GD.panorama(t, 1100, { zoom: .8, hi: { edge: 1, sky: 1 } }))}
${cell(2, `<g transform="translate(540,960) scale(.6) translate(-600,0)">${GD.topMap(t, { hi: { tree: 1 } })}</g>` + BEE.top(540, 960, 1, 60, { t, mark: true }))}</svg>`;
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 3240, height: 1920 } });
  await p.setContent(`<html><head><style>${K.FONT_CSS}body{margin:0}</style></head><body>${body}</body></html>`);
  await p.screenshot({ path: process.argv[2] }); await b.close(); })();
