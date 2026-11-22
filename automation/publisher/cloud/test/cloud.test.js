// No-credential, no-network tests for the Cloud Run publisher. A fake GCS (generations + 412), fake metadata server and fake
// platforms stand in for Google/Meta. Nothing is sent anywhere.   node --test automation/publisher/cloud/test/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const C = require('../../core'), G = require('../gcp'), { CloudState, acquireLease, releaseLease } = require('../state'), { plan } = require('../planner');
const S = require('../support'), J = require('../job'), O = require('../oauth_server');

// ---------- fake GCS + metadata (+ IAM signBlob with a local RSA key) ----------
function fakeCloud() {
  const objs = new Map(); let gen = 100; const calls = [];
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const http = async (method, url, opt = {}) => {
    calls.push({ method, url });
    const ok = (json, status = 200) => ({ ok: status < 300, status, json, headers: {} });
    if (url.includes('metadata.google.internal')) return url.endsWith('/email') ? { ok: true, status: 200, text: 'publisher@proj.iam.gserviceaccount.com', headers: {} } : ok({ access_token: 'SA_TOKEN_SECRET_xxx', expires_in: 3600 });
    if (url.includes('iamcredentials')) { const b = Buffer.from(JSON.parse(opt.body).payload, 'base64'); return ok({ signedBlob: crypto.sign('sha256', b, privateKey).toString('base64') }); }
    const m = url.match(/storage\.googleapis\.com\/(upload\/)?storage\/v1\/b\/([^/]+)\/o(?:\/([^?]+))?(?:\?(.*))?$/);
    if (!m) return null;
    const q = new URLSearchParams(m[4] || ''), name = m[3] ? decodeURIComponent(m[3]) : q.get('name'), cur = objs.get(name), want = q.get('ifGenerationMatch');
    if (want !== null && String(cur ? cur.gen : 0) !== want) return ok({ error: 'precondition' }, 412);
    if (method === 'GET' && !m[3]) return ok({ items: [...objs.keys()].filter(k => k.startsWith(q.get('prefix') || '')).map(k => ({ name: k, generation: String(objs.get(k).gen) })) });
    if (method === 'GET' && q.get('alt') === 'media') { if (!cur) return ok(null, 404); if (opt.binary) return { ok: true, status: 200, buffer: cur.data, headers: {} }; return ok(JSON.parse(cur.data.toString())); }
    if (method === 'GET') return cur ? ok({ name, generation: String(cur.gen) }) : ok(null, 404);
    if (method === 'POST') { const g = ++gen; objs.set(name, { data: Buffer.isBuffer(opt.body) ? opt.body : Buffer.from(opt.body), gen: g }); return ok({ name, generation: String(g) }); }
    if (method === 'DELETE') { objs.delete(name); return ok({}, 204); }
    return ok(null, 400);
  };
  const auth = G.metadataAuth(http), store = G.storage(http, auth, 'bkt');
  return { objs, calls, http, auth, store, publicKey, put: (n, data) => objs.set(n, { data: Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)), gen: ++gen }) };
}
const quiet = { info() {}, warn() {}, error() {}, child() { return quiet; } };

test('GCS compare-and-swap: stale generation → Conflict (412)', async () => {
  const f = fakeCloud();
  const g1 = await f.store.putJSON('a.json', { v: 1 }, '0');
  await assert.rejects(f.store.putJSON('a.json', { v: 2 }, '0'), e => e.conflict);
  const g2 = await f.store.putJSON('a.json', { v: 2 }, g1);
  await assert.rejects(f.store.putJSON('a.json', { v: 3 }, g1), e => e.conflict);
  assert.equal((await f.store.getJSON('a.json')).json.v, 2); assert.notEqual(g1, g2);
});

test('lease: one live holder per episode; expired lease is taken over; release frees it', async () => {
  const f = fakeCloud(); let t = Date.now();
  const l1 = await acquireLease(f.store, 'E', 'run1', 60, () => t); assert.ok(l1);
  assert.equal(await acquireLease(f.store, 'E', 'run2', 60, () => t), null);
  t += 120e3; const l3 = await acquireLease(f.store, 'E', 'run3', 60, () => t); assert.ok(l3); assert.equal(l3.took_over, 'run1');
  await releaseLease(f.store, l3); assert.ok(await acquireLease(f.store, 'E', 'run4', 60, () => t));
});

test('CloudState: intent is durable in GCS BEFORE the platform create call', async () => {
  const f = fakeCloud(), st = await new CloudState(f.store, 'E').load(), YT = require('../../youtube');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'c-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png'); fs.writeFileSync(v, Buffer.alloc(500)); fs.writeFileSync(th, Buffer.alloc(10));
  let seenIntent = null;
  const plat = async (method, url, opt) => {
    if (url.includes('uploadType=resumable')) { seenIntent = JSON.parse(f.objs.get('state/E/publish_state.json').data).platforms.youtube.state; return { ok: false, status: 400, json: { error: { message: 'stop here' } }, headers: {} }; }
    return f.http(method, url, opt);
  };
  const ctx = { cfg: { declarations: { made_for_kids: false, contains_synthetic_media: false, has_paid_product_placement: false } }, http: plat, post: { title: 'T', text: 'X' }, video: { path: v, size: 500, duration: 80, width: 1080, height: 1920 }, videoSha: 's', publishAt: new Date(Date.now() + 864e5), now: new Date(), thumb: { path: th, ext: 'png', mime: 'image/png' }, sleep: async () => {} };
  await YT.schedule(ctx, st);
  assert.equal(seenIntent, 'CREATING'); assert.equal(st.p('youtube').state, 'FAILED_DEFINITE');
});

test('planner: windows for YouTube early upload, Facebook ≤ 28 d, Instagram prepare/publish, missed alerts, hold', () => {
  const at = new Date('2026-12-01T14:00:00Z'), ap = { publish_at_utc: at.toISOString(), platforms: ['youtube', 'facebook', 'instagram'] };
  const acts = (now, states = {}, mode = 'tick') => plan({ approval: ap, states, now: new Date(now), mode }).map(a => `${a.platform}:${a.action}`);
  assert.deepEqual(acts('2026-11-01T00:00:00Z'), ['youtube:schedule', 'facebook:wait']);                    // 30 d ahead: YT early, FB waits
  assert.deepEqual(acts('2026-11-30T14:00:00Z'), ['youtube:schedule', 'facebook:schedule']);                // 1 d ahead
  assert.ok(acts('2026-12-01T09:00:00Z').includes('instagram:prepare'));                                   // 5 h ahead
  const prepared = { instagram: { state: 'CREATED', container_id: 'C', container_status: 'FINISHED' } };
  assert.ok(acts('2026-12-01T14:02:00Z', prepared, 'publish-window').includes('instagram:publish'));
  assert.ok(!acts('2026-12-01T13:58:00Z', prepared, 'publish-window').includes('instagram:publish'));        // never early
  assert.ok(!acts('2026-12-01T14:02:00Z', prepared, 'tick').includes('instagram:publish'));                  // only the publish-window trigger
  assert.ok(acts('2026-12-01T15:00:00Z', { youtube: { state: 'CREATED', remote_id: 'V' } }).includes('youtube:alert'));
  assert.ok(acts('2026-11-30T14:00:00Z', { facebook: { state: 'AMBIGUOUS' } }).includes('facebook:alert'));
  assert.deepEqual(plan({ approval: { ...ap, hold: 'x' }, states: {}, now: new Date() }).map(a => a.action), ['skip']);
});

test('signed URL V4: GET, ≤ 7 days, signature verifies against the service-account key used by signBlob', async () => {
  const f = fakeCloud(), now = new Date('2026-12-01T10:00:00Z');
  const p = G.v4Parts({ bucket: 'bkt', object: 'episodes/WS-EP15/WS EP15.mp4', email: 'sa@p.iam.gserviceaccount.com', now, expiresS: 7200 });
  assert.match(p.canonical, /^GET\n\/bkt\/episodes\/WS-EP15\/WS%20EP15\.mp4\nX-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=sa%40p\.iam\.gserviceaccount\.com%2F20261201%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20261201T100000Z&X-Goog-Expires=7200&X-Goog-SignedHeaders=host\nhost:storage\.googleapis\.com\n\nhost\nUNSIGNED-PAYLOAD$/);
  assert.equal(p.toSign.split('\n')[0], 'GOOG4-RSA-SHA256');
  const r = await G.signedUrl({ bucket: 'bkt', object: 'a/b.mp4', email: 'sa@p.iam.gserviceaccount.com', now, expiresS: 7200 }, G.iamSigner(f.http, f.auth));
  const sig = Buffer.from(r.url.split('X-Goog-Signature=')[1], 'hex'), tbs = G.v4Parts({ bucket: 'bkt', object: 'a/b.mp4', email: 'sa@p.iam.gserviceaccount.com', now, expiresS: 7200 }).toSign;
  assert.ok(crypto.verify('sha256', Buffer.from(tbs), f.publicKey, sig));
  assert.throws(() => G.v4Parts({ bucket: 'b', object: 'o', email: 'e', expiresS: 604801 }), /7 days/);
});

test('graph auth injector: adds Bearer only on graph.facebook.com and never overrides an explicit header', async () => {
  const seen = []; const h = S.withGraphAuth(async (m, u, o) => { seen.push([u, o.headers && o.headers.Authorization]); return {}; }, 'META_TOKEN_SECRET');
  await h('GET', 'https://graph.facebook.com/v27.0/x', {}); await h('POST', 'https://rupload.facebook.com/x', { headers: { Authorization: 'OAuth PAGE' } }); await h('GET', 'https://www.googleapis.com/x', {});
  assert.equal(seen[0][1], 'Bearer META_TOKEN_SECRET'); assert.equal(seen[1][1], 'OAuth PAGE'); assert.equal(seen[2][1], undefined);
});

test('YouTube token source: refresh grant cached in memory; invalid_grant explains the 7-day Testing expiry; no token in errors', async () => {
  let n = 0; const http = async (m, u, o) => { n++; const p = new URLSearchParams(o.body); assert.equal(p.get('grant_type'), 'refresh_token'); return { ok: true, status: 200, json: { access_token: 'ya29.ACCESS_SECRET', expires_in: 3600 } }; };
  const ts = S.youtubeTokenSource(http, { web: { client_id: 'c', client_secret: 's', token_uri: 'https://oauth2.googleapis.com/token' } }, 'REFRESH_SECRET');
  assert.equal(await ts(), 'ya29.ACCESS_SECRET'); await ts(); assert.equal(n, 1);
  const bad = S.youtubeTokenSource(async () => ({ ok: false, status: 400, json: { error: 'invalid_grant' } }), { web: { client_id: 'c', client_secret: 's' } }, 'REFRESH_SECRET');
  await assert.rejects(bad(), e => /7 days/.test(e.message) && !/REFRESH_SECRET|client_secret/.test(e.message));
});

test('logger: secrets never reach Cloud Logging', () => {
  const orig = process.stdout.write.bind(process.stdout); let out = '';
  process.stdout.write = s => { out += s; return true; };
  try { S.logger({ c: 1 }).error('boom', { url: 'https://x/?access_token=EAAB1234567890&upload_id=zz', authorization: 'Bearer ya29.abc' }); } finally { process.stdout.write = orig; }
  const j = JSON.parse(out); assert.equal(j.severity, 'ERROR'); assert.ok(!/EAAB1234567890|ya29\.abc|upload_id=zz/.test(out), out);
});

test('OAuth service: /start uses offline+consent+PKCE+state; bad state refused; success stores a new secret version and shows no token', async () => {
  const stored = []; const tr = async (m, u, o) => {
    if (u.includes('/token')) { const p = new URLSearchParams(o.body); assert.ok(p.get('code_verifier')); return { ok: true, status: 200, json: { access_token: 'ya29.A_SECRET', refresh_token: '1//R_SECRET', scope: `${O.UPLOAD} ${O.READONLY}`, expires_in: 3599 } }; }
    if (u.includes('/channels')) return { ok: true, status: 200, json: { items: [{ id: 'UCwhy', snippet: { title: 'Whyscape' } }] } };
  };
  const app = O.makeApp({ client: { web: { client_id: 'cid', client_secret: 'CS_SECRET' } }, redirectUri: 'http://localhost:8080/callback', scopes: [O.UPLOAD, O.READONLY], expectedChannel: 'UCwhy', transport: tr, storeRefresh: async v => { stored.push(v); return '3'; }, log: quiet });
  const call = async p => { let st, hd = {}, body = ''; await app({ url: p }, { writeHead: (s, h) => { st = s; hd = h || {}; }, end: b => { body = b || ''; } }); return { st, hd, body }; };
  const s = await call('/start'); assert.equal(s.st, 302);
  const loc = new URL(s.hd.Location); for (const [k, v] of [['access_type', 'offline'], ['prompt', 'consent'], ['code_challenge_method', 'S256']]) assert.equal(loc.searchParams.get(k), v);
  assert.equal((await call('/callback?state=nope&code=x')).st, 400);
  const ok = await call(`/callback?state=${loc.searchParams.get('state')}&code=abc`);
  assert.equal(ok.st, 200); assert.deepEqual(stored, ['1//R_SECRET']); assert.match(ok.body, /versi <b>3<\/b>/); assert.ok(!/R_SECRET|A_SECRET|CS_SECRET/.test(ok.body));
  assert.equal((await call(`/callback?state=${loc.searchParams.get('state')}&code=abc`)).st, 400);      // state is single-use
});

test('OAuth service: no youtube.upload scope → nothing stored', async () => {
  const stored = []; const app = O.makeApp({ client: { web: { client_id: 'c', client_secret: 's' } }, redirectUri: 'r', transport: async () => ({ ok: true, status: 200, json: { access_token: 'a', refresh_token: 'r', scope: O.READONLY } }), storeRefresh: async v => { stored.push(v); return '1'; }, log: quiet });
  let loc; await app({ url: '/start' }, { writeHead: (s, h) => { loc = new URL(h.Location); }, end() {} });
  let st; await app({ url: `/callback?state=${loc.searchParams.get('state')}&code=x` }, { writeHead: s => { st = s; }, end() {} });
  assert.equal(st, 400); assert.equal(stored.length, 0);
});

// ---------- full job runs against the fake cloud ----------
const mkVideo = (s, f) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc=size=108x192:rate=10:duration=${s}`, '-c:v', 'libx264', '-preset', 'ultrafast', f]);
const POST_FILE = path.resolve(__dirname, '../../../../episodes/ep14_kulkas/creator/POST.md');      // the creator's real POST.md, read-only
function seed(f, { seconds = 85, hold, approve = true, tamper = false } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png');
  mkVideo(seconds, v); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', th]);
  f.put('episodes/WS-EP90/v.mp4', fs.readFileSync(v)); f.put('episodes/WS-EP90/POST.md', fs.readFileSync(POST_FILE)); f.put('episodes/WS-EP90/t.png', fs.readFileSync(th));
  const sha = p => C.sha256(p);
  if (approve) f.put('episodes/WS-EP90/approval.json', { schema: 1, episode: 'WS-EP90', approved_by: 'test', approved_at: 'x', publish_at_wib: '2026-12-01 21:00', platforms: ['youtube'], hold,
    files: { video: { object: 'episodes/WS-EP90/v.mp4', sha256: tamper ? '0'.repeat(64) : sha(v) }, post: { object: 'episodes/WS-EP90/POST.md', sha256: sha(POST_FILE) }, thumbnail: { object: 'episodes/WS-EP90/t.png', sha256: sha(th) } },
    declarations: { youtube: { made_for_kids: false, contains_synthetic_media: false, has_paid_product_placement: false } }, youtube: {} });
}
function ytFake(f, calls) {
  const at = '2026-12-01T14:00:00Z';
  return async (method, url, opt) => {
    if (/youtube|googleapis\.com\/upload\/youtube/.test(url) && !url.includes('storage')) {
      calls.push(`${method} ${url.split('?')[0]}`);
      if (url.includes('uploadType=resumable')) return { ok: true, status: 200, json: null, headers: { location: 'https://up/s?upload_id=SESSION_SECRET' } };
      if (url.includes('thumbnails/set')) return { ok: true, status: 200, json: {}, headers: {} };
      if (method === 'GET') return { ok: true, status: 200, json: { items: [{ status: { privacyStatus: 'private', publishAt: at }, snippet: {}, processingDetails: { processingStatus: 'succeeded' } }] }, headers: {} };
    }
    if (url.startsWith('https://up/s')) { calls.push('PUT upload'); return { ok: true, status: 200, json: { id: 'VID90' }, headers: {} }; }
    return f.http(method, url, opt);
  };
}
const run = (f, http, mode = 'tick', now = '2026-11-30T14:00:00Z') => J.runJob({ mode, now: new Date(now), store: f.store, http, httpGraph: http, signer: G.iamSigner(f.http, f.auth), auth: { youtube: async () => 'ya29.X', email: f.auth.email }, log: quiet });

test('job: approved ≤ 90 s episode → YouTube uploaded private + publishAt, SCHEDULED evidence, report written, lease released; 2nd run creates nothing', async () => {
  const f = fakeCloud(), calls = []; seed(f); const http = ytFake(f, calls);
  const r = await run(f, http);
  const yt = r.reports[0].platforms.youtube;
  assert.equal(yt.state, 'SCHEDULED'); assert.equal(yt.evidence.video_id, 'VID90'); assert.equal(yt.evidence.publishAt, '2026-12-01T14:00:00Z');
  assert.ok(f.objs.has('reports/2026-11-30/WS-EP90_tick.json')); assert.ok(!f.objs.has('locks/WS-EP90.json'));
  assert.ok(![...f.objs.values()].some(o => /SESSION_SECRET|ya29/.test(o.data.toString('latin1'))), 'no token/session in any stored object except the private sidecar removed after upload');
  const n = calls.filter(c => c.includes('resumable') || c === 'PUT upload').length; await run(f, http);
  assert.equal(calls.filter(c => c.includes('resumable') || c === 'PUT upload').length, n);
});

test('job: no approval / hold / tampered file / video > 90 s → no platform call at all', async () => {
  for (const [opts, expect] of [[{ approve: false }, null], [{ hold: 'EP on hold' }, /hold/], [{ tamper: true }, /does not match the approved sha256/], [{ seconds: 92 }, /above the 90 s Whyscape format/]]) {
    const f = fakeCloud(), calls = []; seed(f, opts);
    const r = await run(f, ytFake(f, calls));
    assert.equal(calls.length, 0, JSON.stringify(opts));
    if (expect) assert.ok(JSON.stringify(r.reports).match(expect), JSON.stringify(r.reports));
  }
});

test('approve (creator tool): refuses > 90 s, missing declarations, time too close; accepts a complete package', () => {
  const A = require('../approve'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png'), long = path.join(d, 'l.mp4');
  mkVideo(84, v); mkVideo(91, long); fs.writeFileSync(th, Buffer.alloc(10));
  const argv = (extra, video = v) => { process.argv = ['n', 'approve.js', '--episode', 'WS-EP90', '--video', video, '--post', POST_FILE, '--thumbnail', th, '--publish-at', '2026-12-01 21:00', '--now', '2026-11-30T00:00:00Z', '--approved-by', 'Elang', ...extra]; delete require.cache[require.resolve('../approve')]; return require('../approve').build(); };
  assert.match(argv(['--platforms', 'youtube'], long).errs.join(), /above the 90 s/);
  assert.match(argv(['--platforms', 'youtube']).errs.join(), /YouTube declarations/);
  assert.match(argv(['--platforms', 'facebook']).errs.join(), /--fb-ai-generated/);
  const ok = argv(['--platforms', 'youtube,facebook', '--yt-made-for-kids', 'false', '--yt-synthetic', 'false', '--yt-paid-placement', 'false', '--fb-ai-generated', 'true']);
  assert.ok(!ok.errs); assert.equal(ok.approval.files.video.sha256, C.sha256(v)); assert.equal(ok.approval.declarations.facebook.is_ai_generated, true);
});

test('approve: Instagram at any publish time is accepted (no fixed daily window)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ap2-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png'); mkVideo(84, v); fs.writeFileSync(th, Buffer.alloc(10));
  process.argv = ['n', 'approve.js', '--episode', 'WS-EP90', '--video', v, '--post', POST_FILE, '--thumbnail', th, '--publish-at', '2026-12-01 09:00', '--now', '2026-11-30T00:00:00Z', '--approved-by', 'E', '--platforms', 'instagram', '--ig-share-to-feed', 'true'];
  delete require.cache[require.resolve('../approve')];
  const r = require('../approve').build(); assert.ok(!r.errs, JSON.stringify(r.errs)); assert.equal(r.approval.publish_at_wib, '2026-12-01 09:00');
});

test('Cloud Tasks: two one-shot triggers at publish_at and +5 min, task-level OAuth to run.googleapis.com, ALREADY_EXISTS = idempotent', async () => {
  const T = require('../tasks'), seen = [], ids = new Set();
  const http = async (m, u, o) => { const b = JSON.parse(o.body).task; seen.push(b); if (ids.has(b.name)) return { ok: false, status: 409, json: { error: { status: 'ALREADY_EXISTS' } } }; ids.add(b.name); return { ok: true, status: 200, json: b }; };
  const cfg = { http, auth: { header: async () => ({ Authorization: 'Bearer SA' }) }, project: 'p', region: 'asia-southeast2', queue: 'q', job: 'whyscape-publisher', triggerSa: 'trig@p.iam.gserviceaccount.com', episode: 'WS-EP90', publishAt: new Date('2026-12-01T02:00:00Z') };
  const a = await T.ensureIgPublishTasks(cfg), b = await T.ensureIgPublishTasks(cfg);
  assert.deepEqual(a.map(x => x.at), ['2026-12-01T02:00:00.000Z', '2026-12-01T02:05:00.000Z']); assert.ok(a.every(x => x.created)); assert.ok(b.every(x => !x.created));
  const t0 = seen[0]; assert.match(t0.httpRequest.url, /run\.googleapis\.com\/v2\/projects\/p\/locations\/asia-southeast2\/jobs\/whyscape-publisher:run$/);
  assert.equal(t0.httpRequest.oauthToken.serviceAccountEmail, 'trig@p.iam.gserviceaccount.com');
  assert.deepEqual(JSON.parse(Buffer.from(t0.httpRequest.body, 'base64')).overrides.containerOverrides[0].args, ['automation/publisher/cloud/job.js', 'publish-window', '--episode', 'WS-EP90']);
});

test('Secret Manager access: value decoded in memory; missing secret/version → null (not configured), never thrown with the value', async () => {
  const http = async (m, u) => u.includes('/secrets/meta-token/') ? { ok: true, status: 200, json: { payload: { data: Buffer.from('EAA_SECRET_VALUE\n').toString('base64') } } } : { ok: false, status: 404, json: { error: { status: 'NOT_FOUND' } } };
  const auth = { header: async () => ({ Authorization: 'Bearer SA' }) };
  assert.equal(await G.accessSecret(http, auth, 'p', 'meta-token'), 'EAA_SECRET_VALUE');
  assert.equal(await G.accessSecret(http, auth, 'p', 'yt-refresh-token'), null);
});

test('job: platform credentials missing in Secret Manager → alert, no platform call', async () => {
  const f = fakeCloud(), calls = []; seed(f); const http = ytFake(f, calls);
  const r = await J.runJob({ mode: 'tick', now: new Date('2026-11-30T14:00:00Z'), store: f.store, http, httpGraph: http, signer: G.iamSigner(f.http, f.auth), auth: { email: f.auth.email }, log: quiet, creds: { meta: true, youtube: false } });
  assert.equal(calls.length, 0); assert.match(JSON.stringify(r.reports[0].alerts), /credentials not configured/);
});
