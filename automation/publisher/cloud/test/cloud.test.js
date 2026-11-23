// No-credential, no-network tests for the Cloud Run publisher. A fake GCS (generations + 412), fake metadata server and fake
// platforms stand in for Google/Meta. Nothing is sent anywhere.   node --test automation/publisher/cloud/test/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const C = require('../../core'), G = require('../gcp'), { CloudState, acquireLease, releaseLease } = require('../state'), { plan } = require('../planner');
const S = require('../support'), J = require('../job');
// Pilot scope: Meta only (Facebook Reels + Instagram Reels). YouTube is managed manually in YouTube Studio.

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
  const f = fakeCloud(), st = await new CloudState(f.store, 'E').load(), FB = require('../../facebook');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'c-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png'); fs.writeFileSync(v, Buffer.alloc(500)); fs.writeFileSync(th, Buffer.alloc(10));
  let seenIntent = null;
  const plat = async (method, url, opt) => {
    if (url.includes('fields=access_token')) return { ok: true, status: 200, json: { access_token: 'PAGE_TOKEN_SECRET_0123456789' }, headers: {} };
    if (method === 'POST' && url.endsWith('/video_reels')) { seenIntent = JSON.parse(f.objs.get('state/E/publish_state.json').data).platforms.facebook.state; return { ok: false, status: 400, json: { error: { message: 'stop here' } }, headers: {} }; }
    return f.http(method, url, opt);
  };
  const ctx = { cfg: { page_id: 'PAGE', declarations: { is_ai_generated: true } }, http: plat, post: { title: 'T', text: 'X' }, video: { path: v, size: 500, duration: 80, width: 1080, height: 1920 }, videoSha: 's', publishAt: new Date(Date.now() + 864e5), now: new Date(), thumb: { path: th, ext: 'png', mime: 'image/png' }, sleep: async () => {} };
  await FB.schedule(ctx, st);
  assert.equal(seenIntent, 'CREATING'); assert.equal(st.p('facebook').state, 'FAILED_DEFINITE');
  assert.ok(!f.objs.get('state/E/publish_state.json').data.toString().includes('PAGE_TOKEN_SECRET'));
});

test('planner: windows for Facebook ≤ 28 d, Instagram prepare/publish, missed alerts, hold', () => {
  const at = new Date('2026-12-01T14:00:00Z'), ap = { publish_at_utc: at.toISOString(), platforms: ['facebook', 'instagram'] };
  const acts = (now, states = {}, mode = 'tick') => plan({ approval: ap, states, now: new Date(now), mode }).map(a => `${a.platform}:${a.action}`);
  assert.deepEqual(acts('2026-11-01T00:00:00Z'), ['facebook:wait']);                                        // 30 d ahead: FB waits
  assert.deepEqual(acts('2026-11-30T14:00:00Z'), ['facebook:schedule']);                                    // 1 d ahead
  assert.ok(acts('2026-12-01T09:00:00Z').includes('instagram:prepare'));                                   // 5 h ahead
  const prepared = { instagram: { state: 'CREATED', container_id: 'C', container_status: 'FINISHED' } };
  assert.ok(acts('2026-12-01T14:02:00Z', prepared, 'publish-window').includes('instagram:publish'));
  assert.ok(!acts('2026-12-01T13:58:00Z', prepared, 'publish-window').includes('instagram:publish'));        // never early
  assert.ok(!acts('2026-12-01T14:02:00Z', prepared, 'tick').includes('instagram:publish'));                  // only the publish-window trigger
  assert.ok(acts('2026-12-01T15:00:00Z', { facebook: { state: 'CREATED', remote_id: 'V' } }).includes('facebook:alert'));
  assert.ok(!plan({ approval: { ...ap, platforms: ['youtube'] }, states: {}, now: new Date('2026-11-30T14:00:00Z') }).length);   // not a pilot platform: nothing planned
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

test('logger: secrets never reach Cloud Logging', () => {
  const orig = process.stdout.write.bind(process.stdout); let out = '';
  process.stdout.write = s => { out += s; return true; };
  try { S.logger({ c: 1 }).error('boom', { url: 'https://x/?access_token=EAAB1234567890&upload_id=zz', authorization: 'Bearer ya29.abc' }); } finally { process.stdout.write = orig; }
  const j = JSON.parse(out); assert.equal(j.severity, 'ERROR'); assert.ok(!/EAAB1234567890|ya29\.abc|upload_id=zz/.test(out), out);
});

// ---------- full job runs against the fake cloud ----------
const mkVideo = (s, f) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc=size=108x192:rate=10:duration=${s}`, '-c:v', 'libx264', '-preset', 'ultrafast', f]);
const POST_FILE = path.resolve(__dirname, '../../../../episodes/ep14_kulkas/creator/POST.md');      // the creator's real POST.md, read-only
function seed(f, { seconds = 85, hold, approve = true, tamper = false } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png');
  mkVideo(seconds, v); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', th]);
  f.put('episodes/WS-EP90/v.mp4', fs.readFileSync(v)); f.put('episodes/WS-EP90/POST.md', fs.readFileSync(POST_FILE)); f.put('episodes/WS-EP90/t.png', fs.readFileSync(th));
  const sha = p => C.sha256(p);
  if (approve) f.put('episodes/WS-EP90/approval.json', { schema: 1, episode: 'WS-EP90', approved_by: 'test', approved_at: 'x', publish_at_wib: '2026-12-01 21:00', platforms: ['facebook'], hold,
    files: { video: { object: 'episodes/WS-EP90/v.mp4', sha256: tamper ? '0'.repeat(64) : sha(v) }, post: { object: 'episodes/WS-EP90/POST.md', sha256: sha(POST_FILE) }, thumbnail: { object: 'episodes/WS-EP90/t.png', sha256: sha(th) } },
    declarations: { facebook: { is_ai_generated: true } }, facebook: { page_id: '1421016024432912' } });
}
// fake Graph + rupload: derive Page token → video_reels start → status → rupload bytes → thumbnails → finish SCHEDULED → status
function fbFake(f, calls) {
  const at = Math.floor(Date.parse('2026-12-01T14:00:00Z') / 1000); let uploaded = false, finished = false;
  const ok = json => ({ ok: true, status: 200, json, headers: {} });
  return async (method, url, opt = {}) => {
    if (/^https:\/\/(graph|rupload)\.facebook\.com\//.test(url)) {
      const u = url.split('?')[0]; calls.push(`${method} ${u}`);
      if (url.includes('fields=access_token')) return ok({ access_token: 'PAGE_TOKEN_SECRET_0123456789' });
      if (method === 'POST' && u.endsWith('/video_reels')) {
        const b = new URLSearchParams(opt.body);
        if (b.get('upload_phase') === 'start') return ok({ video_id: 'FBV90' });
        finished = b.get('video_state') === 'SCHEDULED' && +b.get('scheduled_publish_time') === at; return ok({ success: true });
      }
      if (u.startsWith('https://rupload.facebook.com/')) { uploaded = /^OAuth /.test((opt.headers || {}).Authorization || ''); return ok({ success: true }); }
      if (u.endsWith('/thumbnails')) return method === 'GET' ? ok({ data: [{ id: 'T1', is_preferred: true }] }) : ok({ success: true });
      if (method === 'GET' && u.endsWith('/FBV90')) return ok({ permalink_url: 'https://www.facebook.com/reel/FBV90', status: { video_status: finished ? 'upcoming' : 'processing',
        uploading_phase: { status: uploaded ? 'complete' : 'not_started', bytes_transfered: 0 }, publishing_phase: finished ? { publish_status: 'scheduled', publish_time: at } : { status: 'not_started' } } });
      return { ok: false, status: 400, json: { error: { message: 'unexpected ' + u } }, headers: {} };
    }
    return f.http(method, url, opt);
  };
}
const run = (f, http, mode = 'tick', now = '2026-11-30T14:00:00Z') => J.runJob({ mode, now: new Date(now), store: f.store, http, httpGraph: http, signer: G.iamSigner(f.http, f.auth), auth: { email: f.auth.email }, log: quiet });

test('job: approved ≤ 90 s episode → Facebook Reel uploaded + SCHEDULED at publish_at, evidence, report written, lease released; 2nd run creates nothing', async () => {
  const f = fakeCloud(), calls = []; seed(f); const http = fbFake(f, calls);
  const r = await run(f, http);
  const fb = r.reports[0].platforms.facebook;
  assert.equal(fb.state, 'SCHEDULED', JSON.stringify(r.reports)); assert.equal(fb.evidence.video_id, 'FBV90'); assert.equal(fb.evidence.publish_status, 'scheduled'); assert.equal(fb.evidence.publish_time_matches, true); assert.equal(fb.evidence.cover_preferred, true);
  assert.ok(calls.includes('POST https://rupload.facebook.com/video-upload/v27.0/FBV90') && calls.some(c => c.endsWith('/FBV90/thumbnails')));
  assert.ok(f.objs.has('reports/2026-11-30/WS-EP90_tick.json')); assert.ok(!f.objs.has('locks/WS-EP90.json'));
  assert.ok(![...f.objs.values()].some(o => /PAGE_TOKEN_SECRET|SA_TOKEN_SECRET/.test(o.data.toString('latin1'))), 'no token in any stored object');
  const creates = () => calls.filter(c => c.startsWith('POST') && c.endsWith('/video_reels')).length, n = creates();
  await run(f, http);
  assert.equal(creates(), n); assert.ok(!calls.slice(-5).some(c => c.includes('rupload')));
});

test('job: no approval / hold / tampered file / video > 90 s → no platform call at all', async () => {
  for (const [opts, expect] of [[{ approve: false }, null], [{ hold: 'EP on hold' }, /hold/], [{ tamper: true }, /does not match the approved sha256/], [{ seconds: 92 }, /above the 90 s Whyscape format/]]) {
    const f = fakeCloud(), calls = []; seed(f, opts);
    const r = await run(f, fbFake(f, calls));
    assert.equal(calls.length, 0, JSON.stringify(opts));
    if (expect) assert.ok(JSON.stringify(r.reports).match(expect), JSON.stringify(r.reports));
  }
});

test('approve (creator tool): refuses > 90 s, missing declarations, non-pilot platform; accepts a complete Meta package', () => {
  const A = require('../approve'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-')), v = path.join(d, 'v.mp4'), th = path.join(d, 't.png'), long = path.join(d, 'l.mp4');
  mkVideo(84, v); mkVideo(91, long); fs.writeFileSync(th, Buffer.alloc(10));
  const argv = (extra, video = v) => { process.argv = ['n', 'approve.js', '--episode', 'WS-EP90', '--video', video, '--post', POST_FILE, '--thumbnail', th, '--publish-at', '2026-12-01 21:00', '--now', '2026-11-30T00:00:00Z', '--approved-by', 'Elang', ...extra]; delete require.cache[require.resolve('../approve')]; return require('../approve').build(); };
  assert.match(argv(['--platforms', 'facebook', '--fb-ai-generated', 'true'], long).errs.join(), /above the 90 s/);
  assert.match(argv(['--platforms', 'facebook']).errs.join(), /--fb-ai-generated/);
  assert.match(argv(['--platforms', 'youtube']).errs.join(), /pilot scope is Meta only/);
  const ok = argv(['--platforms', 'facebook,instagram', '--fb-ai-generated', 'true', '--ig-share-to-feed', 'true']);
  assert.ok(!ok.errs, JSON.stringify(ok.errs)); assert.equal(ok.approval.files.video.sha256, C.sha256(v)); assert.equal(ok.approval.declarations.facebook.is_ai_generated, true);
  assert.equal(ok.approval.youtube, undefined); assert.deepEqual(ok.approval.platforms, ['facebook', 'instagram']);
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
  assert.equal(await G.accessSecret(http, auth, 'p', 'other-secret'), null);
});

test('job: platform credentials missing in Secret Manager → alert, no platform call', async () => {
  const f = fakeCloud(), calls = []; seed(f); const http = fbFake(f, calls);
  const r = await J.runJob({ mode: 'tick', now: new Date('2026-11-30T14:00:00Z'), store: f.store, http, httpGraph: http, signer: G.iamSigner(f.http, f.auth), auth: { email: f.auth.email }, log: quiet, creds: { meta: false } });
  assert.equal(calls.length, 0); assert.match(JSON.stringify(r.reports[0].alerts), /credentials not configured/);
});
