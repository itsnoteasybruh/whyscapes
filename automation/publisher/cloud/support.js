// Cloud job support: structured logging (Cloud Logging reads JSON lines from stdout), YouTube access token from the refresh token,
// and Graph auth injection (what the Claude-cloud proxy did, done in-process on Cloud Run). Nothing here ever prints a secret.
const { redact } = require('../core');

// ---------- logging: one JSON object per line; severity drives Cloud Logging / alert policies ----------
function logger(base = {}) {
  const emit = (severity, message, fields = {}) => process.stdout.write(JSON.stringify(redact({ severity, message, ...base, ...fields, time: new Date().toISOString() })) + '\n');
  return { info: (m, f) => emit('INFO', m, f), warn: (m, f) => emit('WARNING', m, f), error: (m, f) => emit('ERROR', m, { ...f, 'logging.googleapis.com/labels': { whyscape_alert: 'true' } }), child: f => logger({ ...base, ...f }) };
}

// ---------- YouTube: refresh-token grant, in memory only ----------
// client = Web-application OAuth client JSON ({"web": {client_id, client_secret, token_uri}}), refresh = refresh token string
function youtubeTokenSource(http, client, refresh) {
  let tok = null, exp = 0;
  return async () => {
    if (tok && Date.now() < exp - 120e3) return tok;
    const c = client.web || client.installed;
    if (!c || !refresh) throw Object.assign(new Error('YouTube credentials not configured (Secret Manager: yt-oauth-client, yt-refresh-token)'), { kind: 'not_sent' });
    const r = await http('POST', c.token_uri || 'https://oauth2.googleapis.com/token', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh, client_id: c.client_id, client_secret: c.client_secret }).toString() });
    if (!r.ok || !r.json || !r.json.access_token) {
      const why = r.json && r.json.error === 'invalid_grant' ? 'refresh token expired or revoked (Testing-mode tokens expire after 7 days): run the OAuth service again' : `HTTP ${r.status}`;
      throw Object.assign(new Error(`YouTube token refresh failed: ${why}`), { kind: 'not_sent' });
    }
    tok = r.json.access_token; exp = Date.now() + r.json.expires_in * 1000; return tok;
  };
}

// ---------- Graph auth: add "Authorization: Bearer <token>" to graph.facebook.com calls that carry none ----------
// (adapters send the derived Page token as access_token / on rupload themselves; this only replaces the proxy's header injection)
function withGraphAuth(http, token) {
  return (method, url, opt = {}) => {
    if (token && /^https:\/\/graph\.facebook\.com\//.test(url) && !(opt.headers && opt.headers.Authorization)) opt = { ...opt, headers: { ...(opt.headers || {}), Authorization: `Bearer ${token}` } };
    return http(method, url, opt);
  };
}
module.exports = { logger, youtubeTokenSource, withGraphAuth };
