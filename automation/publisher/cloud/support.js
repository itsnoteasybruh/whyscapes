// Cloud job support: structured logging (Cloud Logging reads JSON lines from stdout) and Graph auth injection (what the Claude-cloud proxy did, done in-process on Cloud Run). Nothing here ever prints a secret.
const { redact } = require('../core');

// ---------- logging: one JSON object per line; severity drives Cloud Logging / alert policies ----------
function logger(base = {}) {
  const emit = (severity, message, fields = {}) => process.stdout.write(JSON.stringify(redact({ severity, message, ...base, ...fields, time: new Date().toISOString() })) + '\n');
  return { info: (m, f) => emit('INFO', m, f), warn: (m, f) => emit('WARNING', m, f), error: (m, f) => emit('ERROR', m, { ...f, 'logging.googleapis.com/labels': { whyscape_alert: 'true' } }), child: f => logger({ ...base, ...f }) };
}

// ---------- Graph auth: add "Authorization: Bearer <token>" to graph.facebook.com calls that carry none ----------
// (adapters send the derived Page token as access_token / on rupload themselves; this only replaces the proxy's header injection)
function withGraphAuth(http, token) {
  return (method, url, opt = {}) => {
    if (token && /^https:\/\/graph\.facebook\.com\//.test(url) && !(opt.headers && opt.headers.Authorization)) opt = { ...opt, headers: { ...(opt.headers || {}), Authorization: `Bearer ${token}` } };
    return http(method, url, opt);
  };
}
module.exports = { logger, withGraphAuth };
