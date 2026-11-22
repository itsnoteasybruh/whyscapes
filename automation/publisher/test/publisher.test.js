// No-network tests: a fake transport plays the platform. Nothing is ever sent anywhere.
//   node --test automation/publisher/test/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const C = require('../core'), YT = require('../youtube'), FB = require('../facebook'), IG = require('../instagram');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
function fixture(dir) {
  const v = path.join(dir, 'v.mp4'); fs.writeFileSync(v, Buffer.alloc(1000, 7));
  const t = path.join(dir, 't.png'); fs.writeFileSync(t, Buffer.alloc(50, 1));
  return { v, t };
}
const POST = { title: 'Judul Creator?', caption: 'Caption creator.', hashtags: ['#a'], text: 'Caption creator.\n\n#a' };
function ctxFor(dir, http, cfg, o = {}) {
  const { v, t } = fixture(dir);
  return { cfg, http, post: POST, video: { path: v, size: 1000, duration: o.duration ?? 60, width: 1080, height: 1920 }, videoSha: 'x',
    publishAt: o.publishAt || new Date(Date.now() + 3 * 3600e3), now: o.now || new Date(), thumb: { path: t, ext: 'png', mime: 'image/png' },
    sleep: async () => {}, pollTries: 2, pollMs: 0 };
}
// fake transport: list of [matcher(method,url), responder] consumed in order of first match; records calls
function fake(routes) {
  const calls = [];
  const http = async (method, url, opt = {}) => {
    calls.push({ method, url, headers: opt.headers });
    for (const r of routes) if (r.m(method, url, opt) && (r.times === undefined || r.times-- > 0)) {
      const out = typeof r.res === 'function' ? r.res(method, url, opt) : r.res;
      if (out instanceof Error) throw out;
      return { ok: out.status < 300, status: out.status, json: out.json ?? null, headers: out.headers || {} };
    }
    throw new Error('unexpected call ' + method + ' ' + url);
  };
  return { http, calls };
}
const YCFG = { declarations: { made_for_kids: false, contains_synthetic_media: false, has_paid_product_placement: false } };

test('time: 21:00 WIB = 14:00Z, Asia/Jakarta, rejects invalid dates', () => {
  const d = C.parseWIB('2026-11-22 21:00');
  assert.equal(d.toISOString(), '2026-11-22T14:00:00.000Z');
  assert.equal(C.timeEvidence(d).asia_jakarta, '2026-11-22T21:00:00+07:00');
  assert.match(C.timeEvidence(d).human, /21\.00\.00 WIB/);
  assert.equal(C.parseWIB('2026-02-30 21:00'), null);
  assert.equal(C.parseWIB('2026-11-22 24:00'), null);
});

test('redaction: tokens never survive in logs/state', () => {
  const s = JSON.stringify(C.redact({ authorization: 'Bearer ya29.abc', url: 'https://x/?access_token=EAAB123&upload_id=zz', note: 'token EAABxxxxxxxxxxxxxxxxxxxxxxxx' }));
  assert.ok(!/ya29|EAAB123|zz|EAABxxxx/.test(s), s);
});

test('YouTube gate: missing creator declarations block; never guessed', () => {
  const d = tmp(), c = ctxFor(d, async () => {}, { declarations: {} });
  const g = YT.gate(c); assert.equal(g.length, 3); assert.match(g[0], /made_for_kids/);
});

test('YouTube happy path: one upload, private + publishAt, thumbnail after processing, SCHEDULED read back', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  let c; const pa = new Date(Date.now() + 3 * 3600e3);
  const f = fake([
    { m: (m, u) => m === 'POST' && u.includes('uploadType=resumable'), res: (m, u, o) => { const b = JSON.parse(o.body); assert.equal(b.status.privacyStatus, 'private'); assert.equal(b.status.publishAt, pa.toISOString()); assert.equal(b.snippet.title, POST.title); assert.equal(b.snippet.description, POST.text); assert.strictEqual(b.paidProductPlacementDetails.hasPaidProductPlacement, false); return { status: 200, headers: { location: 'https://up/session?upload_id=S1' } }; } },
    { m: (m, u) => m === 'PUT' && u.startsWith('https://up/session'), res: { status: 200, json: { id: 'VID1' } } },
    { m: (m, u) => m === 'GET' && u.includes('/videos?part=status'), res: { status: 200, json: { items: [{ status: { privacyStatus: 'private', publishAt: pa.toISOString().replace('.000Z', 'Z') }, snippet: { title: POST.title }, processingDetails: { processingStatus: 'succeeded' } }] } } },
    { m: (m, u) => u.includes('thumbnails/set'), res: { status: 200, json: { items: [] } } },
  ]);
  c = ctxFor(d, f.http, YCFG, { publishAt: pa });
  const r = await YT.schedule(c, st);
  assert.equal(r.state, 'SCHEDULED'); assert.equal(r.evidence.video_id, 'VID1'); assert.equal(st.p('youtube').thumbnail, 'set');
  assert.equal(f.calls.filter(x => x.method === 'POST' && x.url.includes('resumable')).length, 1);
  assert.ok(!fs.readFileSync(path.join(d, 's.json'), 'utf8').includes('upload_id=S1'), 'session URI must not be in the committed state');
  // second run: only read-back, no new upload
  const before = f.calls.length; const r2 = await YT.schedule(c, st);
  assert.equal(r2.state, 'SCHEDULED'); assert.ok(f.calls.slice(before).every(x => x.method === 'GET'));
});

test('YouTube: byte upload times out but the SAME session says complete → adopt, no duplicate', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  const f = fake([
    { m: (m, u) => m === 'POST' && u.includes('resumable'), res: { status: 200, headers: { location: 'https://up/s2' } } },
    { m: (m, u, o) => m === 'PUT' && o.headers['Content-Range'] === 'bytes */1000', res: { status: 201, json: { id: 'VID2' } } },
    { m: (m) => m === 'PUT', res: new C.TransportError('ambiguous', 'timeout') },
    { m: (m, u) => m === 'GET', res: { status: 200, json: { items: [{ status: { privacyStatus: 'private', publishAt: null }, snippet: {}, processingDetails: { processingStatus: 'processing' } }] } } },
  ]);
  const r = await YT.schedule(ctxFor(d, f.http, YCFG), st);
  assert.equal(st.p('youtube').remote_id, 'VID2');
  assert.equal(f.calls.filter(x => x.method === 'POST' && x.url.includes('resumable')).length, 1);
});

test('YouTube: unknown outcome and the session cannot be asked → AMBIGUOUS, stop, and the next run does NOT retry', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  const f = fake([
    { m: (m, u) => m === 'POST' && u.includes('resumable'), res: { status: 200, headers: { location: 'https://up/s3' } } },
    { m: (m) => m === 'PUT', res: new C.TransportError('ambiguous', 'connection reset') },
  ]);
  const c = ctxFor(d, f.http, YCFG);
  const r = await YT.schedule(c, st); assert.ok(r.stop); assert.equal(st.p('youtube').state, 'AMBIGUOUS');
  const n = f.calls.length, r2 = await YT.schedule(c, st);
  assert.ok(r2.stop); assert.equal(f.calls.length, n, 'no request at all on the second run');
});

test('YouTube reconcile: exactly one matching upload after the intent is found; none/many stays ambiguous', async () => {
  const d = tmp(), intent = new Date().toISOString();
  const mk = items => fake([
    { m: (m, u) => u.includes('/channels?'), res: { status: 200, json: { items: [{ id: 'CH', snippet: { title: 'Whyscape' }, contentDetails: { relatedPlaylists: { uploads: 'UU' } } }] } } },
    { m: (m, u) => u.includes('/playlistItems?'), res: { status: 200, json: { items } } }]);
  const one = mk([{ snippet: { title: POST.title, publishedAt: new Date().toISOString(), resourceId: { videoId: 'V9' } } }, { snippet: { title: 'lain', publishedAt: new Date().toISOString(), resourceId: { videoId: 'V8' } } }]);
  assert.deepEqual((await YT.reconcile(ctxFor(d, one.http, YCFG), { intent_at: intent })).matches.map(m => m.id), ['V9']);
  const old = mk([{ snippet: { title: POST.title, publishedAt: '2026-01-01T00:00:00Z', resourceId: { videoId: 'OLD' } } }]);
  assert.equal((await YT.reconcile(ctxFor(d, old.http, YCFG), { intent_at: intent })).matches.length, 0);
});

test('Facebook gate: EP14-like 112 s video is blocked on the Reels API (3–90 s); the video is not touched', () => {
  const d = tmp(), c = ctxFor(d, async () => {}, { page_id: 'P', declarations: { is_ai_generated: false } }, { duration: 112.467 });
  const g = FB.gate(c); assert.equal(g.length, 1); assert.match(g[0], /3–90 s/);
});

test('Facebook gate: schedule must be > 10 min and ≤ 29 days ahead', () => {
  const d = tmp(), cfg = { page_id: 'P', declarations: { is_ai_generated: false } };
  assert.match(FB.gate(ctxFor(d, null, cfg, { publishAt: new Date(Date.now() + 5 * 60e3) })).join(), /> 10 min/);
  assert.match(FB.gate(ctxFor(d, null, cfg, { publishAt: new Date(Date.now() + 30 * 86400e3) })).join(), /29 days/);
});

test('Facebook: Page token derived in-process, sent only as access_token / rupload OAuth header, never stored or returned; resume by offset; finish once', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E'), pa = new Date(Date.now() + 3 * 3600e3), PT = 'EAAPAGETOKENxxxxxxxxxxxxxxxxxxxxxx';
  let finished = 0, statusCalls = 0;
  const f = fake([
    { m: (m, u) => m === 'GET' && u.endsWith('/P?fields=access_token'), res: { status: 200, json: { access_token: PT, id: 'P' } } },
    { m: (m, u, o) => m === 'POST' && u.endsWith('/P/video_reels') && String(o.body).includes('upload_phase=start'), res: (m, u, o) => { assert.equal(new URLSearchParams(o.body).get('access_token'), PT); return { status: 200, json: { video_id: 'FV1' } }; } },
    { m: (m, u) => m === 'GET' && u.includes('/FV1?'), res: (m, u) => { assert.ok(u.includes('access_token=')); statusCalls++; return statusCalls === 1 ? { status: 200, json: { status: { uploading_phase: { status: 'in_progress', bytes_transfered: 400 } } } } : statusCalls === 2 ? { status: 200, json: { status: { uploading_phase: { status: 'completed' }, publishing_phase: { status: 'not_started' } } } } : { status: 200, json: { permalink_url: 'https://fb/reel/FV1', status: { video_status: 'ready', publishing_phase: { status: 'completed', publish_status: 'scheduled', publish_time: String(Math.floor(pa / 1000)) } } } }; } },
    { m: (m, u) => m === 'POST' && u.includes('rupload'), res: (m, u, o) => { assert.equal(o.headers.Authorization, `OAuth ${PT}`); assert.equal(o.headers.offset, '400'); assert.equal(o.body.length, 600); return { status: 200, json: { success: true } }; } },
    { m: (m, u) => u.includes('/FV1/thumbnails'), res: (m, u, o) => { assert.equal(o.body.get('access_token'), PT); return { status: 200, json: { success: true } }; } },
    { m: (m, u, o) => m === 'POST' && String(o.body).includes('upload_phase=finish'), res: (m, u, o) => { finished++; const b = new URLSearchParams(o.body); assert.equal(b.get('video_state'), 'SCHEDULED'); assert.equal(b.get('scheduled_publish_time'), String(Math.floor(pa / 1000))); assert.equal(b.get('description'), POST.text); assert.equal(b.get('access_token'), PT); return { status: 200, json: { success: true } }; } },
  ]);
  const r = await FB.schedule(ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: false } }, { publishAt: pa }), st);
  assert.equal(r.state, 'SCHEDULED'); assert.equal(finished, 1); assert.equal(st.p('facebook').remote_id, 'FV1'); assert.equal(r.evidence.publish_time_matches, true);
  // graph.facebook.com never gets an Authorization header from us (the proxy owns it)
  assert.ok(f.calls.filter(c => c.url.includes('graph.facebook.com')).every(c => !(c.headers && c.headers.Authorization)));
  // the Page token is derived once and appears nowhere persistent or returned
  assert.equal(f.calls.filter(c => c.url.endsWith('fields=access_token')).length, 1);
  assert.ok(!fs.readFileSync(path.join(d, 's.json'), 'utf8').includes(PT));
  assert.ok(!JSON.stringify(r).includes(PT));
});

test('Facebook checkAuth: page readable, permissions, Page token recognised as the Page — booleans only, no token in the result', async () => {
  const d = tmp(), PT = 'EAAPAGETOKENyyyyyyyyyyyyyyyyyyyyyy';
  const f = fake([
    { m: (m, u) => u.endsWith('/P?fields=id,name'), res: { status: 200, json: { id: 'P', name: 'Whyscape.Id' } } },
    { m: (m, u) => u.endsWith('/me/permissions'), res: { status: 200, json: { data: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'].map(p => ({ permission: p, status: 'granted' })) } } },
    { m: (m, u) => u.endsWith('/P?fields=access_token'), res: { status: 200, json: { access_token: PT } } },
    { m: (m, u) => u.includes('/me?'), res: { status: 200, json: { id: 'P' } } },
  ]);
  const a = await FB.checkAuth(ctxFor(d, f.http, { page_id: 'P' }));
  assert.equal(a.ok, true); assert.equal(a.checks.page_token_is_page, true); assert.ok(!JSON.stringify(a).includes(PT));
});

test('Facebook: Page token cannot be derived → nothing is created', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  const f = fake([{ m: (m, u) => u.endsWith('fields=access_token'), res: { status: 403, json: { error: { message: 'no' } } } }]);
  await assert.rejects(FB.schedule(ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: false } }), st));
  assert.equal(st.p('facebook').state, 'NOT_STARTED'); assert.equal(f.calls.length, 1);
});

test('Instagram checkAuth: no Authorization header sent (proxy injects), permissions + quota read', async () => {
  const d = tmp();
  const f = fake([
    { m: (m, u) => u.endsWith('/I?fields=id,username'), res: { status: 200, json: { id: 'I', username: 'whyscape.id' } } },
    { m: (m, u) => u.endsWith('/me/permissions'), res: { status: 200, json: { data: [{ permission: 'instagram_basic', status: 'granted' }, { permission: 'instagram_content_publish', status: 'granted' }] } } },
    { m: (m, u) => u.includes('content_publishing_limit'), res: { status: 200, json: { data: [{ quota_usage: 0, config: { quota_total: 100, quota_duration: 86400 } }] } } },
  ]);
  const a = await IG.checkAuth(ctxFor(d, f.http, { ig_user_id: 'I' }));
  assert.equal(a.ok, true); assert.deepEqual(a.checks.quota, { used: 0, total: 100, window_s: 86400 });
  assert.ok(f.calls.every(c => !(c.headers && c.headers.Authorization)));
});

test('Facebook: start call outcome unknown → AMBIGUOUS, no retry on the next run', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  const f = fake([{ m: (m, u) => u.endsWith('fields=access_token'), res: { status: 200, json: { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' } } }, { m: () => true, res: new C.TransportError('ambiguous', 'timeout') }]);
  const c = ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: false } });
  await FB.schedule(c, st); assert.equal(st.p('facebook').state, 'AMBIGUOUS');
  const n = f.calls.length; await FB.schedule(c, st); assert.equal(f.calls.length, n);
});

test('Instagram: no public URLs → blocked; publish only inside the window', () => {
  const d = tmp();
  assert.ok(IG.gate(ctxFor(d, null, { ig_user_id: 'I' })).some(x => /PUBLIC URL/.test(x)));
  const pa = new Date(Date.now() + 3600e3), cfg = { ig_user_id: 'I', public_video_url: 'https://h/v.mp4', public_cover_url: 'https://h/c.jpg' };
  assert.match(IG.gate(ctxFor(d, null, cfg, { publishAt: pa }), 'publish').join(), /within 20 min/);
  assert.equal(IG.gate(ctxFor(d, null, cfg, { publishAt: pa, now: new Date(pa.getTime() + 60e3) }), 'publish').length, 0);
});

test('Instagram: media_publish outcome unknown, container then says PUBLISHED → adopt the one matching media, never publish twice', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  st.set('instagram', { state: 'CREATED', container_id: 'C1', container_status: 'FINISHED', intent_at: new Date().toISOString() }, {});
  let publishes = 0, cstat = 'FINISHED';
  const f = fake([
    { m: (m, u) => m === 'GET' && u.includes('/C1?fields=status_code'), res: () => ({ status: 200, json: { status_code: cstat } }) },
    { m: (m, u) => m === 'POST' && u.includes('media_publish'), res: () => { publishes++; cstat = 'PUBLISHED'; return new C.TransportError('ambiguous', 'timeout'); } },
    { m: (m, u) => m === 'GET' && u.includes('/I/media?'), res: { status: 200, json: { data: [{ id: 'M1', caption: POST.text, timestamp: new Date().toISOString(), permalink: 'https://ig/p/M1' }] } } },
    { m: (m, u) => m === 'GET' && u.includes('/M1?'), res: { status: 200, json: { id: 'M1', permalink: 'https://ig/p/M1', timestamp: new Date().toISOString(), media_product_type: 'REELS' } } },
  ]);
  const c = ctxFor(d, f.http, { ig_user_id: 'I' });
  await IG.publish(c, st); assert.equal(st.p('instagram').state, 'AMBIGUOUS'); assert.equal(publishes, 1);
  // a human/routine re-run: container now PUBLISHED → reconcile path, no second media_publish
  st.set('instagram', { state: 'CREATED' }, { note: 'test: operator re-run after checking' });
  const r = await IG.publish(c, st); assert.equal(publishes, 1); assert.equal(r.state, 'PUBLISHED'); assert.equal(st.p('instagram').remote_id, 'M1');
});

test('transport: a proxy CONNECT refusal is not_sent (safe), a timeout is ambiguous', async () => {
  const proxyErr = () => { const e = new TypeError('fetch failed'); const c = new Error('Request was cancelled.'); c.cause = Object.assign(new Error('Proxy response (403) !== 200 when HTTP Tunneling'), { code: 'UND_ERR_ABORTED' }); e.cause = c; throw e; };
  const h1 = C.makeTransport({ fetchImpl: async () => proxyErr() });
  await assert.rejects(h1('POST', 'https://x'), e => e.kind === 'not_sent');
  const h2 = C.makeTransport({ timeoutMs: 20, fetchImpl: (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))) });
  await assert.rejects(h2('POST', 'https://x'), e => e.kind === 'ambiguous');
});

// ---------- FORMAT BAKU: final MP4 ≤ 90 s (target 80–85 s), checked on the file before any upload ----------
const F = require('../../format_rules');
test('format rules: 90 s hard limit, 80–85 s target, VO budget = 90 − 1.0 cover − 2.3 tail', () => {
  assert.equal(F.checkFinal(112.467).ok, false); assert.match(F.checkFinal(112.467).msg, /above the 90 s Whyscape format.*do not speed/);
  assert.equal(F.checkFinal(90.0).ok, true); assert.equal(F.checkFinal(90.04).ok, false);
  assert.equal(F.checkFinal(82).severity, null); assert.equal(F.checkFinal(88).severity, 'INFO');
  assert.equal(F.maxVO(), 86.7); assert.deepEqual(F.targetVO(), [76.7, 81.7]);
  assert.equal(F.checkVO(109.48).severity, 'FIX'); assert.equal(F.checkVO(79).severity, null); assert.equal(F.checkVO(84).severity, 'INFO');
});
test('publisher: a final MP4 over 90 s is rejected for every platform before any request; ≤ 90 s passes this gate', async () => {
  const d = tmp(), { execFileSync } = require('child_process'), P = require('../publish');
  const mk = (s, name) => { const f = path.join(d, name); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc=size=108x192:rate=10:duration=${s}`, '-c:v', 'libx264', '-preset', 'ultrafast', f]); return f; };
  const post = path.resolve(__dirname, '../../../episodes/ep14_kulkas/creator/POST.md');
  const cfg = v => { const f = path.join(d, `cfg_${path.basename(v)}.json`); fs.writeFileSync(f, JSON.stringify({ episode: 'WS-EP14', root: '/', video: { path: v, qc: 'PASS' }, post_file: post, schedule: { publish_at_wib: '2030-01-01 21:00', creator_instruction: 'test' }, platforms: {} })); return f; };
  const long = P.load(cfg(mk(92, 'long.mp4')));
  assert.ok(long.problems.some(p => /92\.\d+ s, above the 90 s Whyscape format: rejected before upload/.test(p)), long.problems.join(' | '));
  const ok = P.load(cfg(mk(85, 'ok.mp4')));
  assert.ok(!ok.problems.some(p => /Whyscape format/.test(p)), ok.problems.join(' | '));
});
test('publisher: the real WS-EP14 config is blocked (112.47 s > 90 s and creator hold)', () => {
  const P = require('../publish'), L = P.load(path.resolve(__dirname, '../../../outputs/WS-EP14/publish_config.json'));
  assert.ok(L.problems.some(p => /112\.47 s, above the 90 s/.test(p))); assert.ok(L.problems.some(p => /ON HOLD/.test(p)));
});
