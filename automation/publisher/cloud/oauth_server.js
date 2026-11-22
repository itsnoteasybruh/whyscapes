#!/usr/bin/env node
// Whyscape YouTube OAuth service (production replacement for the Desktop-app pilot). Cloud Run SERVICE, deployed with
// --no-allow-unauthenticated + max-instances 1: nobody on the internet can reach it. The creator opens it through
//   gcloud run services proxy whyscape-oauth --region <R> --port 8080   →   http://localhost:8080/start
// so the OAuth client (type "Web application") only needs the redirect URI http://localhost:8080/callback.
// Flow (OAuth 2.0 for web server apps): /start → Google consent with access_type=offline, prompt=consent, include_granted_scopes,
// PKCE S256 and a one-time state (10 min) → /callback exchanges the code → checks the granted scope contains youtube.upload →
// (optional, if youtube.readonly was granted) checks the channel ID equals EXPECTED_CHANNEL_ID → stores the refresh token as a NEW
// version of the Secret Manager secret "yt-refresh-token". The page and the logs show only the version number and channel — never
// a token. Client JSON comes from the mounted secret "yt-oauth-client".
const http = require('http'), crypto = require('crypto'), url = require('url');
const G = require('./gcp'), C = require('../core'), S = require('./support');
const UPLOAD = 'https://www.googleapis.com/auth/youtube.upload', READONLY = 'https://www.googleapis.com/auth/youtube.readonly';

function makeApp({ client, redirectUri, scopes = [UPLOAD], expectedChannel = null, transport, storeRefresh, log = S.logger({ component: 'whyscape-oauth' }), now = () => Date.now() }) {
  const c = client.web; if (!c) throw new Error('yt-oauth-client must be a "Web application" OAuth client');
  const pending = new Map();                                                     // state → { verifier, exp }
  const page = (res, code, title, body) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(`<html><body style="font-family:sans-serif;max-width:640px;margin:40px auto"><h2>${title}</h2><p>${body}</p></body></html>`); };
  return async function handler(req, res) {
    const u = url.parse(req.url, true);
    if (u.pathname === '/start') {
      for (const [k, v] of pending) if (v.exp < now()) pending.delete(k);
      const state = crypto.randomBytes(24).toString('base64url'), verifier = crypto.randomBytes(48).toString('base64url');
      pending.set(state, { verifier, exp: now() + 10 * 60e3 });
      const q = new URLSearchParams({ client_id: c.client_id, redirect_uri: redirectUri, response_type: 'code', scope: scopes.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
        state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
      res.writeHead(302, { Location: `${c.auth_uri || 'https://accounts.google.com/o/oauth2/auth'}?${q}`, 'Cache-Control': 'no-store' }); return res.end();
    }
    if (u.pathname === '/callback') {
      const st = pending.get(u.query.state); pending.delete(u.query.state);
      if (!st || st.exp < now()) { log.warn('oauth callback with unknown/expired state'); return page(res, 400, 'Ditolak', 'State tidak dikenal atau kedaluwarsa. Mulai lagi dari /start.'); }
      if (u.query.error) return page(res, 400, 'Dibatalkan', `Google mengembalikan "${String(u.query.error).replace(/[<>&"]/g, '')}".`);
      const r = await transport('POST', c.token_uri || 'https://oauth2.googleapis.com/token', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: u.query.code, client_id: c.client_id, client_secret: c.client_secret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: st.verifier }).toString() });
      if (!r.ok || !r.json) { log.error('token exchange failed', { http: r.status }); return page(res, 502, 'Gagal', `Pertukaran kode gagal (HTTP ${r.status}).`); }
      const granted = (r.json.scope || '').split(' ');
      if (!granted.includes(UPLOAD)) return page(res, 400, 'Scope kurang', 'Izin youtube.upload tidak diberikan. Ulangi dan centang izin unggah video.');
      if (!r.json.refresh_token) return page(res, 400, 'Tanpa refresh token', 'Google tidak mengirim refresh token. Cabut akses aplikasi di myaccount.google.com/permissions lalu ulangi dari /start.');
      let channel = null;
      if (granted.includes(READONLY)) {
        const ch = await transport('GET', 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', { headers: { Authorization: `Bearer ${r.json.access_token}` } });
        const item = ch.ok && ch.json && (ch.json.items || [])[0]; channel = item ? { id: item.id, title: item.snippet.title } : null;
        if (expectedChannel && (!channel || channel.id !== expectedChannel)) return page(res, 400, 'Channel tidak cocok', `Akun ini bukan pemilik channel ${expectedChannel}. Token TIDAK disimpan.`);
      }
      const version = await storeRefresh(r.json.refresh_token);
      log.info('refresh token stored', { secret: 'yt-refresh-token', version, channel_id: channel && channel.id, scopes: granted.map(s => s.split('/').pop()) });
      return page(res, 200, 'Tersimpan', `Refresh token disimpan sebagai versi <b>${version}</b> dari secret <code>yt-refresh-token</code>.${channel ? ` Channel: <b>${channel.title}</b> (${channel.id}).` : ''} Token tidak ditampilkan. Tutup halaman ini.`);
    }
    if (u.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
    page(res, 404, 'Whyscape OAuth', 'Buka <a href="/start">/start</a> untuk menghubungkan channel YouTube.');
  };
}

if (require.main === module) {
  const transport = C.makeTransport(), auth = G.metadataAuth(transport);
  const client = JSON.parse(G.readSecret('yt-oauth-client') || '{}');
  const scopes = [UPLOAD, ...(process.env.YT_WITH_READONLY === '1' ? [READONLY] : [])];
  const app = makeApp({ client, redirectUri: process.env.REDIRECT_URI || 'http://localhost:8080/callback', scopes, expectedChannel: process.env.EXPECTED_CHANNEL_ID || null, transport,
    storeRefresh: v => G.addSecretVersion(transport, auth, process.env.GCP_PROJECT, 'yt-refresh-token', v) });
  http.createServer((q, s) => app(q, s).catch(e => { s.writeHead(500); s.end('error'); S.logger().error('oauth handler error', { error: C.redact(e.message) }); })).listen(process.env.PORT || 8080);
}
module.exports = { makeApp, UPLOAD, READONLY };
