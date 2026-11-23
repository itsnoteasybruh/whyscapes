// Test-only preload (node --require): replaces fetch with routes from FAKE_ROUTES = [[method, urlSubstring, status, json, times?], …]
// (first matching route with uses left wins; `times` limits how often a route answers). status 0 = the connection breaks after the
// request was sent (fetch throws ECONNRESET → the transport classifies it as AMBIGUOUS). Every call is logged to FAKE_LOG. No network.
const fs = require('fs');
const routes = JSON.parse(process.env.FAKE_ROUTES || '[]').map(r => ({ m: r[0], sub: r[1], status: r[2], json: r[3], left: r[4] ?? Infinity }));
globalThis.fetch = async (url, opt = {}) => {
  const m = (opt.method || 'GET').toUpperCase();
  if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, `${m} ${url}${typeof opt.body === 'string' ? ' ' + opt.body : ''}\n`);
  const r = routes.find(x => x.m === m && String(url).includes(x.sub) && x.left > 0);
  if (!r) return new Response(JSON.stringify({ error: { message: 'no fake route' } }), { status: 599 });
  r.left--;
  if (r.status === 0) throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }) });
  return new Response(r.status === 204 ? null : JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
};
