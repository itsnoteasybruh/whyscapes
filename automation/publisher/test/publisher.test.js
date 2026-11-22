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

test('Facebook: start returns video_id → stored; upload resumes by offset; finish SCHEDULED once; read back', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E'), pa = new Date(Date.now() + 3 * 3600e3);
  let finished = 0, statusCalls = 0;
  const f = fake([
    { m: (m, u, o) => m === 'POST' && u.endsWith('/P/video_reels') && String(o.body).includes('upload_phase=start'), res: { status: 200, json: { video_id: 'FV1' } } },
    { m: (m, u) => m === 'GET' && u.includes('/FV1?fields=status'), res: () => { statusCalls++; return statusCalls === 1 ? { status: 200, json: { status: { uploading_phase: { status: 'in_progress', bytes_transfered: 400 } } } } : statusCalls === 2 ? { status: 200, json: { status: { uploading_phase: { status: 'complete' }, publishing_phase: { status: 'not_started' } } } } : { status: 200, json: { permalink_url: 'https://fb/reel/FV1', status: { video_status: 'ready', publishing_phase: { status: 'complete', publish_status: 'scheduled', publish_time: pa.toISOString() } } } }; } },
    { m: (m, u, o) => m === 'POST' && u.includes('rupload') , res: (m, u, o) => { assert.equal(o.headers.offset, '400'); assert.equal(o.body.length, 600); return { status: 200, json: { success: true } }; } },
    { m: (m, u) => u.includes('/FV1/thumbnails'), res: { status: 200, json: { success: true } } },
    { m: (m, u, o) => m === 'POST' && String(o.body).includes('upload_phase=finish'), res: (m, u, o) => { finished++; const b = new URLSearchParams(o.body); assert.equal(b.get('video_state'), 'SCHEDULED'); assert.equal(b.get('scheduled_publish_time'), String(Math.floor(pa / 1000))); assert.equal(b.get('description'), POST.text); return { status: 200, json: { success: true } }; } },
  ]);
  const r = await FB.schedule(ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: false } }, { publishAt: pa }), st);
  assert.equal(r.state, 'SCHEDULED'); assert.equal(finished, 1); assert.equal(st.p('facebook').remote_id, 'FV1');
});

test('Facebook: start call outcome unknown → AMBIGUOUS, no retry on the next run', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E');
  const f = fake([{ m: () => true, res: new C.TransportError('ambiguous', 'timeout') }]);
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
