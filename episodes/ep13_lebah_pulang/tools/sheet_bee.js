// QC sheet for series/creatures/bee.js — node tools/sheet_bee.js out.png
const { chromium } = require('playwright');
const K = require('../../../series/engine/core'), BEE = require('../../../series/creatures/bee');
const body = `<svg width="1600" height="700">${K.DEFS()}<rect width="1600" height="700" fill="#F3EEE4"/>
${BEE.side(250, 250, 2.2, { t: 1, mark: true })}${BEE.side(650, 250, 2.2, { t: 1, flap: 0, legs: 'stand', mark: true, pollen: 1 })}${BEE.top(1050, 280, 2.2, 30, { t: 1, mark: true })}${BEE.side(1400, 250, 1, { t: 1.2, flip: true })}${BEE.side(1450, 450, .5, { t: 2 })}
${[0, 1, 2, 3, 4, 5].map(i => BEE.side(150 + i * 200, 580, 1.1, { t: i * .033, mark: true })).join('')}</svg>`;
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1600, height: 700 } });
  await p.setContent(`<html><head><style>${K.FONT_CSS}body{margin:0}</style></head><body>${body}</body></html>`);
  await p.screenshot({ path: process.argv[2] }); await b.close(); })();
