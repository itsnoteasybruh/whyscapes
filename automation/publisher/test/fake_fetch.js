// Test-only preload (node --require): replaces fetch with routes from FAKE_ROUTES = [[method, urlSubstring, status, json], …]
// (first match wins) and logs every call to FAKE_LOG. No network.
const fs = require('fs');
const routes = JSON.parse(process.env.FAKE_ROUTES || '[]');
globalThis.fetch = async (url, opt = {}) => {
  const m = (opt.method || 'GET').toUpperCase();
  if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, `${m} ${url}\n`);
  const r = routes.find(([mm, sub]) => mm === m && String(url).includes(sub));
  if (!r) return new Response(JSON.stringify({ error: { message: 'no fake route' } }), { status: 599 });
  return new Response(JSON.stringify(r[3]), { status: r[2], headers: { 'content-type': 'application/json' } });
};
