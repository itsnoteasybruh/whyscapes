// No-network tests: a fake transport plays the platform. Nothing is ever sent anywhere.
//   node --test automation/publisher/test/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const C = require('../core'), FB = require('../facebook'), IG = require('../instagram');

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

test('Facebook reconcile: exactly one Reel created after the intent with the same text is adopted; none/old stays ambiguous', async () => {
  const d = tmp(), intent = new Date().toISOString(), PT = 'EAAPAGETOKENrrrrrrrrrrrrrrrrrrrrrr';
  const mk = data => fake([
    { m: (m, u) => u.endsWith('/P?fields=access_token'), res: { status: 200, json: { access_token: PT } } },
    { m: (m, u) => u.includes('/P/video_reels?'), res: { status: 200, json: { data } } }]);
  const one = mk([{ id: 'R9', description: POST.text, created_time: new Date().toISOString() }, { id: 'R8', description: 'lain', created_time: new Date().toISOString() }]);
  assert.deepEqual((await FB.reconcile(ctxFor(d, one.http, { page_id: 'P' }), { intent_at: intent })).matches.map(m => m.id), ['R9']);
  const old = mk([{ id: 'OLD', description: POST.text, created_time: '2026-01-01T00:00:00Z' }]);
  assert.equal((await FB.reconcile(ctxFor(d, old.http, { page_id: 'P' }), { intent_at: intent })).matches.length, 0);
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
    { m: (m, u) => m === 'GET' && u.includes('/FV1/thumbnails'), res: { status: 200, json: { data: [{ id: 'T1', is_preferred: true }] } } },
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

test('readPost: creator bold-label format (**Judul:** / **Caption:** / **Hashtag:**) is read verbatim; schedule text is not taken as publish_at', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-')), f = path.join(d, 'POST.md');
  fs.writeFileSync(f, '# Whyscape EP14 — Judul kerja\n\n- Jadwal tayang target: Selasa, 24 Nov 2026, 21.00 WIB\n\n## Paket posting final\n\n**Judul:** Makanan Bisa Basi di Kulkas?\n\n**Caption:**\n\nParagraf satu. ❄️\n\nParagraf dua? 🔎\n\n**Hashtag:** #Whyscape #Kulkas\n\n## Thumbnail final\n- x\n');
  const r = C.readPost(f);
  assert.equal(r.title, 'Makanan Bisa Basi di Kulkas?'); assert.equal(r.caption, 'Paragraf satu. ❄️\n\nParagraf dua? 🔎');
  assert.deepEqual(r.hashtags, ['#Whyscape', '#Kulkas']); assert.equal(r.text, 'Paragraf satu. ❄️\n\nParagraf dua? 🔎\n\n#Whyscape #Kulkas');
  assert.equal(r.episode, 'WS-EP14'); assert.equal(r.publish_at, null);
});

test('gha_wait: waits until publish_at (WIB), refuses missing / long past / beyond the 6 h job limit', () => {
  const Wt = require('../gha_wait'), cfg = at => ({ schedule: { publish_at_wib: at } }), now = new Date('2026-11-23T10:30:00Z');   // 17:30 WIB
  const ok = Wt.plan(cfg('2026-11-23 21:00'), now); assert.equal(ok.ok, true); assert.equal(ok.wait_s, 3.5 * 3600 + 3); assert.equal(ok.at, '2026-11-23T21:00:00+07:00');
  assert.equal(Wt.plan(cfg(null), now).ok, false);
  assert.match(Wt.plan(cfg('2026-11-23 17:00'), now).reason, /passed 30 min ago/);
  assert.equal(Wt.plan(cfg('2026-11-23 17:20'), now).wait_s, 0);                       // inside the 15 min grace: publish now (gate allows ≤ 20 min)
  assert.match(Wt.plan(cfg('2026-11-24 21:00'), now).reason, /dispatch within 340 min/);
});

test('GitHub Actions auth: META_TOKEN becomes a Bearer header on graph.facebook.com only and never appears in the report', () => {
  const { execFileSync } = require('child_process');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gha-')), v = path.join(d, 'v.mp4'), post = path.join(d, 'POST.md'), cfgF = path.join(d, 'publish_config.json');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=108x192:rate=10:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', v]);
  fs.writeFileSync(post, '# Whyscape EP90 — x\n\n**Judul:** T\n\n**Caption:**\n\nC\n\n**Hashtag:** #W\n');
  fs.writeFileSync(cfgF, JSON.stringify({ episode: 'WS-EP90', root: '.', video: { path: 'v.mp4', qc: 'PASS' }, post_file: 'POST.md', schedule: { publish_at_wib: null, platforms: ['facebook', 'instagram'] }, platforms: { facebook: { page_id: 'P' }, instagram: { ig_user_id: 'I' } } }));
  const out = execFileSync(process.execPath, [path.resolve(__dirname, '../publish.js'), '--config', cfgF, 'plan'], { env: { ...process.env, META_TOKEN: 'EAAsecretTOKENvalue1234567890', HTTPS_PROXY: '', https_proxy: '' } }).toString();
  assert.ok(!out.includes('EAAsecretTOKENvalue1234567890')); assert.equal(JSON.parse(out).platforms.facebook.would_send.title, 'T');
  const S = require('../cloud/support'), seen = [];
  const h = S.withGraphAuth(async (m, u, o) => { seen.push([u, (o.headers || {}).Authorization]); return {}; }, 'EAAsecretTOKENvalue1234567890');
  return Promise.all([h('GET', 'https://graph.facebook.com/v27.0/me', {}), h('GET', 'https://raw.githubusercontent.com/x', {})]).then(() => {
    assert.equal(seen[0][1], 'Bearer EAAsecretTOKENvalue1234567890'); assert.equal(seen[1][1], undefined);
  });
});

// ---------- duplicate safety after a runner stop, cover + publish_time verification, check-auth failures (audit 23 Nov 2026) ----------
const pageTok = { m: (m, u) => u.endsWith('fields=access_token'), res: { status: 200, json: { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' } } };
test('state: the intent is pushed (onSave) BEFORE the create request; an intent without an ID from a stopped run → AMBIGUOUS, nothing re-sent', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E'), saved = [];
  st.onSave = () => saved.push(JSON.parse(fs.readFileSync(path.join(d, 's.json'), 'utf8')).platforms.facebook.state);
  let stateAtRequest = null;
  const f = fake([pageTok, { m: (m, u, o) => m === 'POST' && u.endsWith('/P/video_reels'), res: () => { stateAtRequest = saved.at(-1); return new C.TransportError('ambiguous', 'runner stopped'); } }]);
  const c = ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: true } });
  await FB.schedule(c, st); assert.equal(stateAtRequest, 'CREATING'); assert.equal(st.p('facebook').state, 'AMBIGUOUS');
  // a fresh runner finds CREATING without video_id (the run died before the response was written): it must not start again
  const d2 = tmp(), st2 = new C.State(path.join(d2, 's.json'), 'E'); st2.set('facebook', { state: 'CREATING', intent_at: new Date().toISOString() }, {});
  const f2 = fake([pageTok]); const r = await FB.schedule(ctxFor(d2, f2.http, { page_id: 'P', declarations: { is_ai_generated: true } }), st2);
  assert.equal(r.stop, true); assert.equal(st2.p('facebook').state, 'AMBIGUOUS'); assert.ok(!f2.calls.some(x => x.method === 'POST'));
  // same for Instagram: intent without container_id → AMBIGUOUS, no new container
  const st3 = new C.State(path.join(d2, 'i.json'), 'E'); st3.set('instagram', { state: 'CREATING', intent_at: new Date().toISOString() }, {});
  const f3 = fake([]); const r3 = await IG.prepare(ctxFor(d2, f3.http, { ig_user_id: 'I', public_video_url: 'https://h/v', public_cover_url: 'https://h/c' }), st3);
  assert.equal(r3.stop, true); assert.equal(st3.p('instagram').state, 'AMBIGUOUS'); assert.equal(f3.calls.length, 0);
});

test('Facebook: cover upload fails → stop BEFORE finish (not scheduled); verify fails on publish_time ≠ 21:00 WIB or no preferred cover', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E'), pa = C.parseWIB('2026-11-23 21:00');
  st.set('facebook', { state: 'CREATED', remote_id: 'FV', intent_at: new Date().toISOString() }, {});
  const f = fake([pageTok,
    { m: (m, u) => m === 'GET' && u.includes('/FV?'), res: { status: 200, json: { status: { uploading_phase: { status: 'complete' }, publishing_phase: { status: 'not_started' } } } } },
    { m: (m, u) => m === 'POST' && u.includes('/FV/thumbnails'), res: { status: 400, json: { error: { message: 'bad image' } } } },
    { m: (m, u, o) => m === 'POST' && String(o.body).includes('upload_phase=finish'), res: () => { throw new Error('finish must not be sent'); } }]);
  const c = ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: true } }, { publishAt: pa, now: new Date('2026-11-23T10:00:00Z') });
  const r = await FB.schedule(c, st); assert.equal(r.stop, true); assert.match(r.reason, /cover/); assert.equal(st.p('facebook').state, 'CREATED');
  const vf = (publish_time, preferred) => fake([pageTok,
    { m: (m, u) => m === 'GET' && u.includes('/FV?'), res: { status: 200, json: { status: { video_status: 'upcoming', publishing_phase: { publish_status: 'scheduled', publish_time } } } } },
    { m: (m, u) => m === 'GET' && u.includes('/FV/thumbnails'), res: { status: 200, json: { data: [{ id: 'T', is_preferred: preferred }] } } }]);
  st.set('facebook', { thumbnail: 'set' }, {});
  const ok = await FB.verify({ ...c, http: vf(Math.floor(pa / 1000), true).http }, st); assert.ok(!ok.stop, JSON.stringify(ok)); assert.equal(ok.evidence.publish_time_wib, '2026-11-23T21:00:00+07:00');
  const late = await FB.verify({ ...c, http: vf(Math.floor(pa / 1000) + 3600, true).http }, st); assert.equal(late.stop, true); assert.match(late.reason, /22:00:00\+07:00 ≠ 2026-11-23T21:00/);
  const nocover = await FB.verify({ ...c, http: vf(Math.floor(pa / 1000), false).http }, st); assert.equal(nocover.stop, true); assert.match(nocover.reason, /cover not confirmed/);
});

// CLI-level (publish.js) with a fake fetch preload: reconcile by GET, check-auth exit codes
function cliFixture() {
  const { execFileSync } = require('child_process'), d = tmp(), v = path.join(d, 'v.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=108x192:rate=10:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', v]);
  fs.writeFileSync(path.join(d, 'POST.md'), '# Whyscape EP90 — x\n\n**Judul:** T\n\n**Caption:**\n\nC\n\n**Hashtag:** #W\n');
  fs.writeFileSync(path.join(d, 'publish_config.json'), JSON.stringify({ episode: 'WS-EP90', root: '.', video: { path: 'v.mp4', qc: 'PASS' }, post_file: 'POST.md',
    schedule: { publish_at_wib: '2026-11-23 21:00', creator_instruction: 'test', platforms: ['facebook', 'instagram'] },
    platforms: { facebook: { page_id: 'P', declarations: { is_ai_generated: true } }, instagram: { ig_user_id: 'I', public_video_url: 'https://h/v', public_cover_url: 'https://h/c' } } }));
  return d;
}
function cli(d, args, routes, env = {}) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['--require', path.join(__dirname, 'fake_fetch.js'), path.resolve(__dirname, '../publish.js'), '--config', path.join(d, 'publish_config.json'), ...args, '--now', '2026-11-23T10:00:00Z'],
    { env: { ...process.env, HTTPS_PROXY: '', https_proxy: '', STATE_SYNC: '', GITHUB_ACTIONS: '', FAKE_ROUTES: JSON.stringify(routes), ...env } });
  const out = r.stdout.toString(); return { code: r.status, out, json: out.includes('{') ? JSON.parse(out.slice(out.indexOf('{'))) : null };
}
test('reconcile (GET only): FB nothing found → retry safe; FB one match → adopted; IG container FINISHED → may publish; IG container PUBLISHED + 1 media → adopted', () => {
  const d = cliFixture(), sf = path.join(d, 'publish_state.json'), intent = new Date('2026-11-23T09:55:00Z').toISOString();
  const seed = (p, x) => { const s = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf)) : { schema: 1, episode: 'WS-EP90', platforms: {} }; s.platforms[p] = { state: 'AMBIGUOUS', history: [], intent_at: intent, ...x }; fs.writeFileSync(sf, JSON.stringify(s)); };
  const PT = ['GET', 'fields=access_token', 200, { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' }];
  seed('facebook', {});
  let r = cli(d, ['reconcile', '--platform', 'facebook', '--execute'], [PT, ['GET', '/P/video_reels', 200, { data: [] }]]);
  assert.equal(JSON.parse(fs.readFileSync(sf)).platforms.facebook.state, 'NOT_STARTED', r.out);
  seed('facebook', {});
  r = cli(d, ['reconcile', '--platform', 'facebook', '--execute'], [PT, ['GET', '/P/video_reels', 200, { data: [{ id: 'FV9', created_time: '2026-11-23T09:56:00+0000' }] }]]);
  const fb = JSON.parse(fs.readFileSync(sf)).platforms.facebook; assert.equal(fb.state, 'CREATED'); assert.equal(fb.remote_id, 'FV9');
  seed('instagram', { container_id: 'C7' });
  cli(d, ['reconcile', '--platform', 'instagram', '--execute'], [['GET', '/C7?fields=status_code', 200, { status_code: 'FINISHED' }]]);
  let ig = JSON.parse(fs.readFileSync(sf)).platforms.instagram; assert.equal(ig.state, 'CREATED'); assert.equal(ig.container_status, 'FINISHED');
  seed('instagram', { container_id: 'C7' });
  cli(d, ['reconcile', '--platform', 'instagram', '--execute'], [['GET', '/C7?fields=status_code', 200, { status_code: 'PUBLISHED' }], ['GET', '/I/media?', 200, { data: [{ id: 'M9', caption: 'C\n\n#W', timestamp: '2026-11-23T14:00:05+0000', permalink: 'https://ig/p/M9' }] }]]);
  ig = JSON.parse(fs.readFileSync(sf)).platforms.instagram; assert.equal(ig.state, 'PUBLISHED'); assert.equal(ig.remote_id, 'M9');
});

test('check-auth exits 2 on: missing secret in Actions, invalid/expiring token, missing scope, wrong linked IG account, auth not ok; exits 0 when all good', () => {
  const d = cliFixture(), exp = s => Math.floor(Date.parse(s) / 1000);
  const good = (o = {}) => [
    ['GET', 'debug_token', 200, { data: { type: 'USER', is_valid: o.valid ?? true, expires_at: o.exp ?? 0, data_access_expires_at: exp('2027-02-01T00:00:00Z'), scopes: o.scopes || ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'business_management'] } }],
    ['GET', '/P?fields=id,name', 200, { id: 'P', name: 'Page' }],
    ['GET', '/P?fields=access_token', 200, { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' }],
    ['GET', '/P?fields=instagram_business_account', 200, { instagram_business_account: { id: o.ig ?? 'I' } }],
    ['GET', '/me/permissions', 200, { data: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'].map(permission => ({ permission, status: 'granted' })) }],
    ['GET', '/me?', 200, { id: 'P' }],
    ['GET', '/I?fields=id,username', 200, { id: 'I', username: 'u' }],
    ['GET', '/I/content_publishing_limit', 200, { data: [{ quota_usage: 0, config: { quota_total: 100, quota_duration: 86400 } }] }]];
  const T = { META_TOKEN: 'EAAsecretTOKENvalue1234567890' };
  const ok = cli(d, ['check-auth', '--execute'], good(), T); assert.equal(ok.code, 0, ok.out); assert.deepEqual(ok.json.check_auth_failures, []); assert.ok(!ok.out.includes('EAAsecret'));
  assert.match(cli(d, ['check-auth', '--execute'], good(), { GITHUB_ACTIONS: 'true' }).json.check_auth_failures.join(), /META_TOKEN is not set/);
  const bad = [[{ valid: false }, /not valid/], [{ exp: exp('2026-11-23T14:30:00Z') }, /expires_at .* before/], [{ scopes: ['pages_show_list'] }, /lacks scopes/], [{ ig: 'OTHER' }, /account mismatch/]];
  for (const [o, re] of bad) { const r = cli(d, ['check-auth', '--execute'], good(o), T); assert.equal(r.code, 2, JSON.stringify(o)); assert.match(r.json.check_auth_failures.join(' | '), re); }
  const noIg = cli(d, ['check-auth', '--execute'], good().filter(x => x[1] !== '/I?fields=id,username'), T); assert.equal(noIg.code, 2); assert.match(noIg.json.check_auth_failures.join(), /instagram: auth not ok/);
});

test('gha_wait: the 20.30 preparation deadline (30 min before a 21.00 slot) is enforced at the start of a run', () => {
  const Wt = require('../gha_wait'), cfg = { schedule: { publish_at_wib: '2026-11-23 21:00' } };
  assert.equal(Wt.plan(cfg, new Date('2026-11-23T13:29:00Z'), 340, 30).ok, true);                  // 20.29 WIB
  assert.match(Wt.plan(cfg, new Date('2026-11-23T13:31:00Z'), 340, 30).reason, /preparation deadline/);   // 20.31 WIB
});

test('Facebook verify (EP14 run #4, 24 Nov 2026): Reel still "processing" right after finish → wait by GET until Meta reports scheduled; never re-sends; gives up after the limit', async () => {
  const d = tmp(), st = new C.State(path.join(d, 's.json'), 'E'), pa = C.parseWIB('2026-11-25 21:00');
  st.set('facebook', { state: 'CREATED', remote_id: 'FV', thumbnail: 'set', intent_at: new Date().toISOString() }, {});
  const pageTok = { m: (m, u) => u.endsWith('/P?fields=access_token'), res: { status: 200, json: { access_token: 'EAAPAGETOKENqqqqqqqqqqqqqqqqqqqqqq' } } };
  const processing = { status: 200, json: { status: { video_status: 'processing', publishing_phase: { status: 'not_started' } } } };
  const scheduled = { status: 200, json: { status: { video_status: 'ready', publishing_phase: { status: 'complete', publish_status: 'scheduled', publish_time: String(Math.floor(pa / 1000)) } }, permalink_url: '/reel/FV/' } };
  const mk = seq => { let n = 0; const f = fake([pageTok,
    { m: (m, u) => m === 'GET' && u.includes('/FV?'), res: () => seq[Math.min(n++, seq.length - 1)] },
    { m: (m, u) => m === 'GET' && u.includes('/FV/thumbnails'), res: { status: 200, json: { data: [{ id: 'T', is_preferred: true }] } } },
    { m: m => m === 'POST', res: () => { throw new Error('verify must never POST'); } }]); return f; };
  let slept = 0; const c = f => ({ ...ctxFor(d, f.http, { page_id: 'P', declarations: { is_ai_generated: true } }, { publishAt: pa }), sleep: async () => { slept++; }, fbVerifyTries: 5 });
  const f1 = mk([processing, processing, scheduled]);
  const ok = await FB.verify(c(f1), st);
  assert.ok(!ok.stop, JSON.stringify(ok)); assert.equal(ok.state, 'SCHEDULED'); assert.equal(ok.evidence.publish_time_wib, '2026-11-25T21:00:00+07:00'); assert.equal(slept, 2);
  assert.equal(st.p('facebook').history.filter(h => h.step === 'verify-wait').length, 2);
  st.set('facebook', { state: 'CREATED' }, {}); slept = 0;
  const never = await FB.verify(c(mk([processing])), st);
  assert.equal(never.stop, true); assert.match(never.reason, /not SCHEDULED/); assert.equal(slept, 4);
});
