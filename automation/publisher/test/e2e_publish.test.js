// End-to-end publisher tests for EP15+ against a STATEFUL fake Meta (no network, virtual clock). The harness runs the steps of
// .github/workflows/publish-episode.yml (action=run) in the same order with the same conditions; a separate test pins the YAML to it.
// Reference failure: EP14, 24 Nov 2026, run 45372023511 — Facebook read back 2 s after finish ("processing"), the step failed, and
// the wait + Instagram media_publish were skipped although Meta scheduled the Reel a minute later.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { runMode } = require('../publish'), C = require('../core'), W = require('../gha_wait');
const WF = path.resolve(__dirname, '../../../.github/workflows/publish-episode.yml');
const PUBLISH_AT = C.parseWIB('2026-11-25 21:00'), START = new Date('2026-11-25T10:10:00Z');   // dispatched 17.10 WIB

let VIDEO = null;
function fixture({ platforms = ['facebook', 'instagram'] } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'));
  if (!VIDEO) { VIDEO = path.join(os.tmpdir(), `e2e_v_${process.pid}.mp4`); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=108x192:rate=10:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', VIDEO]); }
  fs.copyFileSync(VIDEO, path.join(d, 'v.mp4'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', path.join(d, 't.png')]);
  fs.writeFileSync(path.join(d, 'POST.md'), '# Whyscape EP15 — uji\n\n**Judul:** Judul creator\n\n**Caption:**\n\nCaption creator.\n\n**Hashtag:** #whyscape\n');
  fs.writeFileSync(path.join(d, 'publish_config.json'), JSON.stringify({ episode: 'WS-EP15', root: '.', video: { path: 'v.mp4', qc: 'PASS' }, post_file: 'POST.md', thumbnail_file: 't.png',
    schedule: { publish_at_wib: '2026-11-25 21:00', creator_instruction: 'POST.md', platforms },
    platforms: { facebook: { page_id: 'P', declarations: { is_ai_generated: true } }, instagram: { ig_user_id: 'I', public_video_url: 'https://h/v.mp4', public_cover_url: 'https://h/c.jpg', share_to_feed: true, declarations: { is_ai_generated: true } } } }));
  return d;
}

// ---------- stateful fake Meta ----------
// knobs (time-based on the virtual clock, like Meta): fbLagS = seconds after finish while the Reel is "processing" (no publish_status),
// fbFinish ok|ambiguous|reject, igLagS = seconds after container create while IN_PROGRESS, igContainer ok|error, igPublish ok|ambiguous|reject, igCreate
function fakeMeta(clock, k = {}) {
  const m = { calls: [], posts: { fbStart: 0, fbFinish: 0, fbThumb: 0, fbUpload: 0, igMedia: 0, igPublish: 0 }, fb: { finished: false, thumb: false, uploaded: false }, ig: { created: false, published: false } };
  const ok = json => ({ ok: true, status: 200, json }), err = (status, msg) => ({ ok: false, status, json: { error: { message: msg } } });
  const ambiguous = () => { throw new C.TransportError('ambiguous', 'socket hang up after the request was sent'); };
  const body = o => String(o.body || '');
  m.http = async (method, url, o = {}) => {
    m.calls.push(`${method} ${url.replace(/access_token=[^&]+/, 'access_token=<t>')}`);
    if (method === 'GET' && /\/P\?fields=access_token$/.test(url)) return ok({ access_token: 'EAAPAGETOKENsimsimsimsimsimsimsim' });
    // Facebook
    if (method === 'POST' && url.endsWith('/P/video_reels') && body(o).includes('upload_phase=start')) { m.posts.fbStart++; return ok({ video_id: 'FV1' }); }
    if (method === 'POST' && url.includes('rupload.facebook.com')) { m.posts.fbUpload++; m.fb.uploaded = true; return ok({ success: true }); }
    if (method === 'POST' && url.includes('/FV1/thumbnails')) { m.posts.fbThumb++; m.fb.thumb = true; return ok({ success: true }); }
    if (method === 'GET' && url.includes('/FV1/thumbnails')) return ok({ data: m.fb.thumb ? [{ id: 'T1', is_preferred: true }] : [] });
    if (method === 'POST' && url.endsWith('/P/video_reels') && body(o).includes('upload_phase=finish')) {
      m.posts.fbFinish++;
      if (k.fbFinish === 'reject') return err(400, 'Invalid parameter');
      m.fb.finished = true; m.fb.finishedAt = clock.now.getTime(); m.fb.publishTime = +new URLSearchParams(body(o)).get('scheduled_publish_time');
      if (k.fbFinish === 'ambiguous') ambiguous();
      return ok({ success: true });
    }
    if (method === 'GET' && /\/FV1\?/.test(url)) {
      const up = { status: m.fb.uploaded ? 'complete' : 'not_started', bytes_transfered: m.fb.uploaded ? 1e9 : 0 };
      if (!m.fb.finished) return ok({ status: { video_status: 'upload_complete', uploading_phase: up, publishing_phase: { status: 'not_started' } } });
      if (clock.now.getTime() < m.fb.finishedAt + (k.fbLagS ?? 30) * 1000) return ok({ status: { video_status: 'processing', uploading_phase: up, publishing_phase: { status: 'not_started' } } });
      const pub = clock.now >= new Date(m.fb.publishTime * 1000);
      return ok({ status: { video_status: 'ready', uploading_phase: up, processing_phase: { status: 'complete' }, publishing_phase: { status: 'complete', publish_status: pub ? 'published' : 'scheduled', publish_time: String(m.fb.publishTime) } }, permalink_url: '/reel/FV1/' });
    }
    if (method === 'GET' && url.includes('/P/video_reels')) return ok({ data: m.fb.finished ? [{ id: 'FV1', description: 'Caption creator.\n\n#whyscape', created_time: START.toISOString() }] : [] });
    // Instagram
    if (method === 'POST' && url.endsWith('/I/media')) { m.posts.igMedia++; if (k.igCreate === 'reject') return err(400, 'bad video_url'); m.ig.created = true; m.ig.createdAt = clock.now.getTime(); if (k.igCreate === 'ambiguous') ambiguous(); return ok({ id: 'C1' }); }
    if (method === 'GET' && /\/C1\?fields=status_code/.test(url)) {
      if (m.ig.published) return ok({ id: 'C1', status_code: 'PUBLISHED' });
      if (k.igContainer === 'error') return ok({ id: 'C1', status_code: 'ERROR', status: 'Error: video processing failed' });
      return ok({ id: 'C1', status_code: clock.now.getTime() < m.ig.createdAt + (k.igLagS ?? 90) * 1000 ? 'IN_PROGRESS' : 'FINISHED' });
    }
    if (method === 'POST' && url.endsWith('/I/media_publish')) {
      m.posts.igPublish++;
      if (k.igPublish === 'reject') return err(400, 'Media ID is not available');
      m.ig.published = true; m.ig.publishedAt = new Date(clock.now);
      if (k.igPublish === 'ambiguous') ambiguous();
      return ok({ id: 'M1' });
    }
    if (method === 'GET' && /\/M1\?fields=/.test(url)) return m.ig.published ? ok({ id: 'M1', permalink: 'https://www.instagram.com/reel/SIM15/', timestamp: m.ig.publishedAt.toISOString(), media_product_type: 'REELS' }) : err(404, 'not found');
    if (method === 'GET' && url.includes('/I/media?')) return ok({ data: m.ig.published ? [{ id: 'M1', caption: 'Caption creator.\n\n#whyscape', timestamp: m.ig.publishedAt.toISOString(), permalink: 'https://www.instagram.com/reel/SIM15/', media_product_type: 'REELS' }] : [] });
    throw new Error('fake Meta: unexpected ' + method + ' ' + url);
  };
  return m;
}

// ---------- the workflow, step by step (mirror of publish-episode.yml, action=run; check-auth is covered in publisher.test.js) ----------
async function workflowRun(d, meta, clock) {
  const cfgFile = path.join(d, 'publish_config.json'), cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  const sleep = async ms => { clock.now = new Date(clock.now.getTime() + ms); };
  const step = (mode, only) => runMode({ cfgFile, mode, only, execute: true, now: new Date(clock.now), http: meta.http, sleep });
  const out = { steps: {} };
  const prep = W.plan(cfg, clock.now, 340, 30); out.steps.prep = prep.ok ? 'success' : 'failure';
  if (!prep.ok) return out;                                                                     // step 2 fails → job stops
  out.steps.ig = (await step('schedule', 'instagram')).code === 0 ? 'success' : 'failure';       // 3 (continue-on-error)
  out.steps.fb = (await step('schedule', 'facebook')).code === 0 ? 'success' : 'failure';        // 4 (continue-on-error)
  if (out.steps.ig !== 'success' && out.steps.fb !== 'success') { out.steps.wait = 'skipped'; return out; }
  const w = W.plan(cfg, clock.now, 340); out.steps.wait = w.ok ? 'success' : 'failure';          // 5
  if (!w.ok) return out;
  clock.now = new Date(clock.now.getTime() + w.wait_s * 1000);
  out.steps.igPublish = (await step('publish', 'instagram')).code === 0 ? 'success' : 'failure'; // 6 (continue-on-error)
  const rep = await step('report'); out.steps.report = rep.code === 0 ? 'success' : 'failure';   // 7 decides the job
  out.report = rep.report; out.result = JSON.parse(fs.readFileSync(path.join(d, 'publish_result.json'), 'utf8'));
  return out;
}
const adv = clock => async ms => { clock.now = new Date(clock.now.getTime() + ms); };
const state = d => JSON.parse(fs.readFileSync(path.join(d, 'publish_state.json'), 'utf8')).platforms;
const go = async (k, o) => { const d = fixture(o), clock = { now: new Date(START) }, meta = fakeMeta(clock, k); const r = await workflowRun(d, meta, clock); return { d, clock, meta, r }; };

test('happy path: one run schedules FB, prepares IG, waits, publishes IG once, and the FINAL report verifies both by GET with permalinks', async () => {
  const { d, meta, r } = await go({ fbLagS: 45, igLagS: 150 });
  assert.deepEqual(r.steps, { prep: 'success', ig: 'success', fb: 'success', wait: 'success', igPublish: 'success', report: 'success' });
  assert.deepEqual(meta.posts, { fbStart: 1, fbFinish: 1, fbThumb: 1, fbUpload: 1, igMedia: 1, igPublish: 1 });
  assert.equal(r.result.all_verified, true);
  assert.deepEqual([r.result.channels.facebook.permalink, r.result.channels.instagram.permalink], ['https://www.facebook.com/reel/FV1/', 'https://www.instagram.com/reel/SIM15/']);
  const s = state(d); assert.equal(s.facebook.state, 'PUBLISHED'); assert.equal(s.instagram.state, 'PUBLISHED');
  // IG media_publish happened at/after publish_at, never before
  assert.ok(meta.ig.publishedAt >= PUBLISH_AT);
});

test('EP14 replay: Meta still "processing" long after finish → FB step fails, but IG is still published and the final report finds FB PUBLISHED', async () => {
  const { d, meta, r } = await go({ fbLagS: 30 * 60 });          // 30 min: far longer than the ~5 min of read-backs in step 4
  assert.equal(r.steps.fb, 'failure'); assert.equal(r.steps.ig, 'success'); assert.equal(r.steps.wait, 'success'); assert.equal(r.steps.igPublish, 'success');
  assert.equal(meta.posts.fbFinish, 1, 'finish is never re-sent');
  assert.equal(r.steps.report, 'success'); assert.equal(r.result.channels.facebook.state, 'PUBLISHED'); assert.equal(r.result.channels.instagram.state, 'PUBLISHED');
  assert.ok(state(d).facebook.history.some(h => h.step === 'verify-wait'));
});

test('FB done, IG not started (earlier run stopped): a new run reads FB back only (no FB POST) and publishes IG exactly once', async () => {
  const d = fixture(), clock = { now: new Date(START) }, meta = fakeMeta(clock, {});
  // first run: only Facebook gets through (Instagram container create is rejected definitively)
  meta.http0 = meta.http; let igDown = true;
  meta.http = async (m, u, o) => (igDown && m === 'POST' && u.endsWith('/I/media')) ? { ok: false, status: 400, json: { error: { message: 'temporarily blocked' } } } : meta.http0(m, u, o);
  const cfgFile = path.join(d, 'publish_config.json');
  assert.equal((await runMode({ cfgFile, mode: 'schedule', only: 'instagram', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) })).code, 2);
  assert.equal((await runMode({ cfgFile, mode: 'schedule', only: 'facebook', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) })).code, 0);
  assert.equal(state(d).facebook.state, 'SCHEDULED'); assert.equal(state(d).instagram.state, 'FAILED_DEFINITE');
  const before = { ...meta.posts };
  igDown = false; clock.now = new Date(START.getTime() + 30 * 60e3);
  const r = await workflowRun(d, meta, clock);
  assert.equal(meta.posts.fbStart, before.fbStart); assert.equal(meta.posts.fbFinish, before.fbFinish); assert.equal(meta.posts.fbUpload, before.fbUpload); assert.equal(meta.posts.fbThumb, before.fbThumb);
  assert.equal(meta.posts.igPublish, 1); assert.equal(r.steps.report, 'success'); assert.equal(r.result.all_verified, true);
});

test('slow Instagram processing: container still IN_PROGRESS after the prepare polls → step 3 fails, step 6 re-reads it in the window and publishes once', async () => {
  const { d, meta, r } = await go({ igLagS: 26 * 60 });           // 26 min: longer than the 20 one-minute prepare polls
  assert.equal(r.steps.ig, 'failure'); assert.equal(r.steps.igPublish, 'success'); assert.equal(meta.posts.igMedia, 1); assert.equal(meta.posts.igPublish, 1);
  assert.equal(r.result.all_verified, true); assert.equal(state(d).instagram.container_status, 'FINISHED');
});

test('Instagram container never finishes → IG reported NOT published (job red), FB still verified; a FINISHED-less container is never called success', async () => {
  const { meta, r } = await go({ igLagS: 24 * 3600 });
  assert.equal(meta.posts.igPublish, 0); assert.equal(r.steps.report, 'failure');
  assert.equal(r.result.channels.facebook.verified, true); assert.equal(r.result.channels.instagram.verified, false);
  assert.match(r.result.channels.instagram.reason, /not published/);
});

test('container FINISHED but media_publish rejected → report red with the reason; FINISHED alone is not success', async () => {
  const { d, r } = await go({ igPublish: 'reject' });
  assert.equal(state(d).instagram.container_status, 'FINISHED'); assert.equal(r.steps.igPublish, 'failure');
  assert.equal(r.steps.report, 'failure'); assert.equal(r.result.all_verified, false); assert.equal(r.result.channels.instagram.verified, false);
});

test('ambiguous media_publish → IG AMBIGUOUS, no retry; reconcile (GET) adopts the one post; a later run never calls media_publish again', async () => {
  const { d, clock, meta, r } = await go({ igPublish: 'ambiguous' });
  assert.equal(state(d).instagram.state, 'AMBIGUOUS'); assert.equal(meta.posts.igPublish, 1);
  assert.equal(r.steps.report, 'failure'); assert.equal(r.result.channels.facebook.verified, true);
  const cfgFile = path.join(d, 'publish_config.json');
  // a second publish attempt (manual rerun of step 6 / a backup) is refused without any POST
  assert.equal((await runMode({ cfgFile, mode: 'publish', only: 'instagram', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) })).code, 2);
  assert.equal(meta.posts.igPublish, 1);
  // reconcile is GET only and adopts exactly one matching media
  const n = meta.calls.length, rc = await runMode({ cfgFile, mode: 'reconcile', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) });
  assert.ok(meta.calls.slice(n).every(c => c.startsWith('GET')), 'reconcile sent only GETs');
  assert.equal(rc.code, 0); assert.equal(state(d).instagram.state, 'PUBLISHED'); assert.equal(state(d).instagram.remote_id, 'M1');
  const rep = await runMode({ cfgFile, mode: 'report', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) });
  assert.equal(rep.code, 0); assert.equal(rep.report.final.channels.instagram.permalink, 'https://www.instagram.com/reel/SIM15/');
  assert.equal(meta.posts.fbStart, 1); assert.equal(meta.posts.fbFinish, 1);
});

test('ambiguous Facebook finish → read-back (GET) decides; finish is never re-sent by this or a later run', async () => {
  const { d, clock, meta, r } = await go({ fbFinish: 'ambiguous', fbLagS: 60 });
  assert.equal(r.steps.fb, 'success'); assert.equal(meta.posts.fbFinish, 1); assert.equal(r.result.all_verified, true);
  // a rerun before the slot with the Reel still processing reads only
  const d2 = fixture(), c2 = { now: new Date(START) }, m2 = fakeMeta(c2, { fbFinish: 'ambiguous', fbLagS: 24 * 3600 }), cfg2 = path.join(d2, 'publish_config.json');
  assert.equal((await runMode({ cfgFile: cfg2, mode: 'schedule', only: 'facebook', execute: true, now: c2.now, http: m2.http, sleep: async ms => { c2.now = new Date(c2.now.getTime() + ms); } })).code, 2);
  assert.equal((await runMode({ cfgFile: cfg2, mode: 'schedule', only: 'facebook', execute: true, now: c2.now, http: m2.http, sleep: async () => {} })).code, 2);
  assert.equal(m2.posts.fbFinish, 1); assert.equal(m2.posts.fbStart, 1); assert.ok(state(d2).facebook.finish_sent_at);
  void d; void clock;
});

test('one channel fails, the other succeeds: IG container ERROR → IG FAILED_DEFINITE and reported; FB published once; report red', async () => {
  const { d, meta, r } = await go({ igContainer: 'error' });
  assert.equal(r.steps.ig, 'failure'); assert.equal(r.steps.fb, 'success'); assert.equal(meta.posts.igPublish, 0);
  assert.equal(state(d).instagram.state, 'FAILED_DEFINITE'); assert.equal(state(d).facebook.state, 'PUBLISHED');
  assert.equal(r.steps.report, 'failure'); assert.equal(r.result.channels.facebook.permalink, 'https://www.facebook.com/reel/FV1/'); assert.equal(r.result.channels.instagram.verified, false);
});

test('FB rejected at finish → FB FAILED_DEFINITE (not left CREATED), IG still published; report shows exactly which channel failed', async () => {
  const { d, meta, r } = await go({ fbFinish: 'reject' });
  assert.equal(state(d).facebook.state, 'FAILED_DEFINITE'); assert.equal(meta.posts.fbFinish, 1);
  assert.equal(state(d).instagram.state, 'PUBLISHED'); assert.equal(r.result.channels.instagram.verified, true); assert.equal(r.result.channels.facebook.verified, false);
});

test('next check after a completed run: a rerun (before or after the slot) creates nothing on either channel', async () => {
  const { d, clock, meta } = await go({});
  const before = { ...meta.posts };
  const r2 = await workflowRun(d, meta, clock);                    // after the slot: step 2 refuses, nothing runs
  assert.equal(r2.steps.prep, 'failure'); assert.deepEqual(meta.posts, before);
  // and a rerun of the schedule/publish modes reads back only
  const cfgFile = path.join(d, 'publish_config.json');
  for (const [mode, only] of [['schedule', 'facebook'], ['schedule', 'instagram'], ['publish', 'instagram']]) await runMode({ cfgFile, mode, only, execute: true, now: clock.now, http: meta.http, sleep: adv(clock) });
  assert.deepEqual(meta.posts, before);
});

test('single-channel episodes: Facebook-only never touches Instagram (and vice versa); the report covers only the chosen channel', async () => {
  const fb = await go({}, { platforms: ['facebook'] });
  assert.equal(fb.r.steps.ig, 'success'); assert.equal(fb.meta.calls.filter(c => /\/I\/|\/C1|\/M1/.test(c)).length, 0);
  assert.deepEqual(Object.keys(fb.r.result.channels), ['facebook']); assert.equal(fb.r.result.all_verified, true);
  assert.equal(state(fb.d).instagram, undefined);
  const ig = await go({}, { platforms: ['instagram'] });
  assert.equal(ig.meta.calls.filter(c => /FV1|video_reels|rupload/.test(c)).length, 0);
  assert.deepEqual(Object.keys(ig.r.result.channels), ['instagram']); assert.equal(ig.r.result.all_verified, true);
});

test('report before publish_at is preparation only: FB SCHEDULED + IG FINISHED = prepared, never "verified"', async () => {
  const d = fixture(), clock = { now: new Date(START) }, meta = fakeMeta(clock, {}), cfgFile = path.join(d, 'publish_config.json');
  for (const only of ['instagram', 'facebook']) await runMode({ cfgFile, mode: 'schedule', only, execute: true, now: clock.now, http: meta.http, sleep: adv(clock) });
  const r = await runMode({ cfgFile, mode: 'report', execute: true, now: clock.now, http: meta.http, sleep: adv(clock) });
  assert.equal(r.code, 0); assert.equal(r.report.final.all_verified, false); assert.equal(r.report.final.all_prepared, true);
  assert.ok(Object.values(r.report.final.channels).every(c => c.verified === false && c.prepared === true));
});

test('publish-episode.yml run steps mirror the harness: order, per-channel continue-on-error, wait/publish/report conditions', () => {
  const y = fs.readFileSync(WF, 'utf8'), steps = [...y.matchAll(/- name: (\d[b]?) ([^\n]*)\n((?: {8}[^\n]*\n)*)/g)].map(m => ({ n: m[1], name: m[2], body: m[3] }));
  assert.deepEqual(steps.map(s => s.n), ['1', '2', '3', '4', '5', '6', '7']);
  const by = n => steps.find(s => s.n === n).body;
  assert.match(by('3'), /id: ig/); assert.match(by('3'), /continue-on-error: true/); assert.match(by('3'), /schedule --platform instagram/);
  assert.match(by('4'), /id: fb/); assert.match(by('4'), /continue-on-error: true/); assert.match(by('4'), /schedule --platform facebook/);
  assert.match(by('5'), /if: inputs.action == 'run' && \(steps.ig.outcome == 'success' \|\| steps.fb.outcome == 'success'\)/);
  assert.match(by('6'), /if: inputs.action == 'run' && steps.wait.outcome == 'success'\n/); assert.match(by('6'), /publish --platform instagram/);
  assert.match(by('7'), /always\(\)/); assert.match(by('7'), /report --execute/); assert.ok(!/continue-on-error/.test(by('7')), 'the final report decides the job');
  assert.match(by('2'), /--prep-deadline-min 30 --dry/);
  assert.match(y, /publish_result\.json/);                       // result is committed with the state
});
