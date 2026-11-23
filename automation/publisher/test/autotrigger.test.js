// ep14_autotrigger: date guard, WIB↔UTC cron mapping, anti-duplication, failure paths. No network (fake fetch preload).
//   node --test automation/publisher/test/autotrigger.test.js
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const AT = require('../ep14_autotrigger'), C = require('../core');
const WF = path.resolve(__dirname, '../../../.github/workflows/ep14-autotrigger.yml');
const CAPTION = 'C\n\n#W';

test('cron (UTC) → 15.45 / 16.15 / 16.45 WIB on 24 Nov 2026, all inside the allowed window 15.20–20.30', () => {
  const crons = [...fs.readFileSync(WF, 'utf8').matchAll(/cron: '(\d+) (\d+) (\d+) (\d+) \*'/g)].map(m => m.slice(1).map(Number));
  assert.equal(crons.length, 3);
  const at = crons.map(([mi, h, d, mo]) => new Date(Date.UTC(2026, mo - 1, d, h, mi)));
  assert.deepEqual(at.map(d => C.wibISO(d).slice(0, 16)), ['2026-11-24T15:45', '2026-11-24T16:15', '2026-11-24T16:45']);
  const cfg = { episode: 'WS-EP14', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-24 21:00' } };
  for (const d of at) assert.deepEqual(AT.gates({ now: d, cfg, runs: [], stage: 'cheap' }), [], C.wibISO(d));
});

test('date guard: the WIB calendar day decides (UTC 17:00 = next WIB day); other days / years refused', () => {
  assert.equal(AT.wibDate(new Date('2026-11-23T16:59:59Z')), '2026-11-23');
  assert.equal(AT.wibDate(new Date('2026-11-23T17:00:00Z')), '2026-11-24');
  assert.equal(AT.wibDate(new Date('2026-11-24T16:59:59Z')), '2026-11-24');
  const cfg = { episode: 'WS-EP14', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-24 21:00' } };
  for (const t of ['2026-11-23T08:45:00Z', '2027-11-24T08:45:00Z', '2026-11-25T08:45:00Z']) assert.match(AT.gates({ now: new Date(t), cfg, runs: [], stage: 'cheap' }).join(), /date: today is/, t);
  // window: before 15.20 and after 20.30 WIB refused; config time must be exactly 2026-11-24 21:00
  assert.match(AT.gates({ now: new Date('2026-11-24T08:19:00Z'), cfg, runs: [], stage: 'cheap' }).join(), /window: .*dispatch within 340 min/);
  assert.match(AT.gates({ now: new Date('2026-11-24T13:31:00Z'), cfg, runs: [], stage: 'cheap' }).join(), /window: preparation deadline passed/);
  assert.match(AT.gates({ now: new Date('2026-11-24T08:45:00Z'), cfg: { ...cfg, schedule: { publish_at_wib: '2026-11-24 21:05' } }, runs: [], stage: 'cheap' }).join(), /config: publish_at_wib is "2026-11-24 21:05"/);
});

test('gates: hold, no QC PASS, state not NOT_STARTED, marker, any non-read-only run on 24 Nov (any status), plan/auth/conflict failures', () => {
  const now = new Date('2026-11-24T08:45:00Z'), cfg = { episode: 'WS-EP14', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-24 21:00' } };
  const ok = { now, cfg, state: null, marker: null, runs: [], plan: { code: 0, json: { episode_problems: [], platforms: { facebook: { blockers: [] }, instagram: { blockers: [] } } } }, auth: { code: 0, json: { check_auth_failures: [] } }, conflict: { ok: true, reasons: [] } };
  assert.deepEqual(AT.gates(ok), []);
  const run = (title, status, conclusion, at = '2026-11-24T08:40:00Z') => ({ run_number: 7, display_title: title, status, conclusion, created_at: at });
  const cases = [
    [{ cfg: { ...cfg, hold: 'x' } }, /on hold/], [{ cfg: { ...cfg, video: { qc: 'FAIL' } } }, /QC PASS/],
    [{ state: { platforms: { facebook: { state: 'CREATING' } } } }, /state: facebook is CREATING/], [{ state: { platforms: { instagram: { state: 'AMBIGUOUS' } } } }, /state: instagram is AMBIGUOUS/],
    [{ marker: { status: 'ambiguous', at: 'x' } }, /once: auto-trigger already attempted \(ambiguous/],
    [{ runs: [run('publish-ep14 · run', 'queued', null)] }, /runs: .* queued/], [{ runs: [run('publish-ep14 · run', 'in_progress', null)] }, /in_progress/],
    [{ runs: [run('publish-ep14 · run', 'completed', 'success')] }, /completed\/success/], [{ runs: [run('publish-ep14 · run', 'completed', 'failure')] }, /completed\/failure/],
    [{ runs: [run('publish-ep14 (Meta pilot)', 'completed', 'success')] }, /runs: /],          // unknown title on the day counts as a trigger
    [{ runs: null }, /runs-unknown/],
    [{ plan: { code: 0, json: { episode_problems: ['x'], platforms: {} } } }, /plan: x/], [{ plan: { code: 0, json: { episode_problems: [], platforms: { instagram: { blockers: ['no PUBLIC URL'] } } } } }, /plan: instagram blocked/],
    [{ auth: { code: 2, json: { check_auth_failures: ['token lacks scopes: instagram_content_publish'] } } }, /check-auth: token lacks scopes/], [{ auth: { code: 1, json: null } }, /check-auth: no report/],
    [{ conflict: { ok: false, reasons: ['Instagram media M posted at …'] } }, /conflict: Instagram media/]];
  for (const [patch, re] of cases) assert.match(AT.gates({ ...ok, ...patch }).join(' | '), re, JSON.stringify(patch));
  // read-only runs on the day (check-auth / plan / verify) and runs on other days do not block
  assert.deepEqual(AT.gates({ ...ok, runs: [run('publish-ep14 · check-auth', 'completed', 'success'), run('publish-ep14 · plan', 'completed', 'success'), run('publish-ep14 · run', 'completed', 'failure', '2026-11-23T10:00:00Z')] }), []);
});

// ---------- CLI with fake fetch: the full gate → dispatch path, ambiguity, backups, no write to Meta ----------
function fixture(o = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'at-')), v = path.join(d, 'v.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=108x192:rate=10:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', v]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', path.join(d, 't.png')]);
  fs.writeFileSync(path.join(d, 'POST.md'), '# Whyscape EP14 — x\n\n**Judul:** T\n\n**Caption:**\n\nC\n\n**Hashtag:** #W\n');
  fs.writeFileSync(path.join(d, 'publish_config.json'), JSON.stringify({ episode: 'WS-EP14', root: '.', video: { path: 'v.mp4', qc: 'PASS' }, post_file: 'POST.md', thumbnail_file: 't.png',
    schedule: { publish_at_wib: o.at || '2026-11-24 21:00', creator_instruction: 'test', platforms: ['facebook', 'instagram'] },
    platforms: { facebook: { page_id: 'P', declarations: { is_ai_generated: true } }, instagram: { ig_user_id: 'I', public_video_url: 'https://h/v', public_cover_url: 'https://h/c', declarations: { is_ai_generated: true } } } }));
  if (o.state) fs.writeFileSync(path.join(d, 'publish_state.json'), JSON.stringify(o.state));
  return d;
}
const META_OK = (o = {}) => [
  ['GET', 'debug_token', 200, { data: { type: 'SYSTEM_USER', is_valid: true, expires_at: 0, data_access_expires_at: 0, scopes: o.scopes || ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'] } }],
  ['GET', '/P?fields=id,name', 200, { id: 'P', name: 'Page' }], ['GET', '/P?fields=access_token', 200, { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' }],
  ['GET', '/P?fields=instagram_business_account', 200, { instagram_business_account: { id: 'I' } }],
  ['GET', '/me/permissions', 200, { data: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'].map(permission => ({ permission, status: 'granted' })) }],
  ['GET', '/me?', 200, { id: 'P' }], ['GET', '/I?fields=id,username', 200, { id: 'I', username: 'u' }],
  ['GET', '/I/content_publishing_limit', 200, { data: [{ quota_usage: 0, config: { quota_total: 100, quota_duration: 86400 } }] }],
  ['GET', '/P/scheduled_posts', 200, { data: o.scheduled || [] }], ['GET', '/P/video_reels', 200, { data: o.reels || [] }], ['GET', '/I/media?', 200, { data: o.media || [] }]];
const RUNS = '/actions/workflows/publish-ep14.yml/runs';
function cli(d, now, routes, mode = 'live-dispatch') {
  const log = path.join(d, `fetch_${Date.now()}_${Math.random()}.log`);
  const r = spawnSync(process.execPath, [path.resolve(__dirname, '../ep14_autotrigger.js'), '--mode', mode, '--now', now], { encoding: 'utf8', env: { ...process.env,
    NODE_OPTIONS: `--require ${path.join(__dirname, 'fake_fetch.js')}`, FAKE_ROUTES: JSON.stringify(routes), FAKE_LOG: log, HTTPS_PROXY: '', https_proxy: '', GITHUB_ACTIONS: 'true',
    CONFIG: path.join(d, 'publish_config.json'), DATA_DIR: d, MARKER: 'marker.json', MARKER_SYNC: '', GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 'ghs_x', META_TOKEN: 'EAAsecretTOKENvalue1234567890', FIND_TRIES: '2', FIND_WAIT_MS: '0' } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : [];
  const out = r.stdout; let json = null; try { json = JSON.parse(out.slice(out.indexOf('{'))); } catch { /* none */ }
  const marker = fs.existsSync(path.join(d, 'marker.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'marker.json'), 'utf8')) : null;
  return { code: r.status, json, calls, marker, out: out + r.stderr };
}
const T1545 = '2026-11-24T08:45:00Z', T1615 = '2026-11-24T09:15:00Z';
const dispatches = calls => calls.filter(c => c.startsWith('POST') && c.includes('/dispatches'));
const metaWrites = calls => calls.filter(c => c.startsWith('POST') && c.includes('graph.facebook.com'));

test('15.45: all gates pass → marker BEFORE dispatch → exactly one dispatch (action=run, confirm=EP14-LIVE) → run recorded; no write to Meta', () => {
  const d = fixture(), newRun = { id: 99, run_number: 3, display_title: 'publish-ep14 · run', status: 'queued', html_url: 'https://gh/run/99', created_at: new Date(Date.now() + 60e3).toISOString() };
  const r = cli(d, T1545, [['GET', RUNS, 200, { workflow_runs: [] }, 1], ['POST', '/dispatches', 204, null], ['GET', RUNS, 200, { workflow_runs: [newRun] }], ...META_OK()]);
  assert.equal(r.code, 0, r.out); assert.equal(r.json.result, 'dispatched');
  const dp = dispatches(r.calls); assert.equal(dp.length, 1);
  assert.deepEqual(JSON.parse(dp[0].slice(dp[0].indexOf('{'))), { ref: 'main', inputs: { action: 'run', confirm: 'EP14-LIVE' } });
  assert.equal(r.marker.status, 'dispatched'); assert.equal(r.marker.run_id, 99);
  assert.equal(metaWrites(r.calls).length, 0); assert.ok(!r.out.includes('EAAsecret'));
  // 16.15 backup: the marker exists → quiet skip, no Meta call, no dispatch
  const b = cli(d, T1615, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK()]);
  assert.equal(b.code, 0); assert.match(b.json.result, /skip: already triggered/); assert.equal(dispatches(b.calls).length, 0); assert.ok(!b.calls.some(c => c.includes('graph.facebook.com')));
});

test('ambiguous dispatch (connection breaks after sending) → marker "ambiguous", exit 3, no retry; the backups never dispatch again', () => {
  const d = fixture();
  const r = cli(d, T1545, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 0, null], ...META_OK()]);
  assert.equal(r.code, 3, r.out); assert.match(r.json.result, /ambiguous: stop; reconcile by GET/); assert.equal(r.marker.status, 'ambiguous'); assert.equal(dispatches(r.calls).length, 1);
  for (const t of [T1615, '2026-11-24T09:45:00Z']) { const b = cli(d, t, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK()]); assert.equal(dispatches(b.calls).length, 0, t); assert.match(b.json.result, /skip/); }
  // 204 but the run never shows up → "dispatch_unconfirmed", exit 3, also no retry
  const d2 = fixture(), u = cli(d2, T1545, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK()]);
  assert.equal(u.code, 3); assert.equal(u.marker.status, 'dispatch_unconfirmed');
  // a definite rejection (HTTP 422) is recorded and not retried either
  const d3 = fixture(), x = cli(d3, T1545, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 422, { message: 'bad' }], ...META_OK()]);
  assert.equal(x.code, 3); assert.equal(x.marker.status, 'rejected');
});

test('a publish-ep14 run already on 24 Nov (manual, any status) → backup does not trigger; a run list that cannot be read blocks (red)', () => {
  for (const [status, conclusion] of [['queued', null], ['in_progress', null], ['completed', 'success'], ['completed', 'failure']]) {
    const d = fixture(), r = cli(d, T1615, [['GET', RUNS, 200, { workflow_runs: [{ run_number: 5, display_title: 'publish-ep14 · run', status, conclusion, created_at: '2026-11-24T08:50:00Z' }] }], ['POST', '/dispatches', 204, null], ...META_OK()]);
    assert.equal(r.code, 0, status); assert.match(r.json.result, /skip: already triggered/); assert.equal(dispatches(r.calls).length, 0); assert.equal(r.marker, null);
  }
  const d = fixture(), e = cli(d, T1545, [['GET', RUNS, 500, { message: 'oops' }], ['POST', '/dispatches', 204, null], ...META_OK()]);
  assert.equal(e.code, 2); assert.match(e.json.reasons.join(), /runs-unknown/); assert.equal(dispatches(e.calls).length, 0);
});

test('failure paths stop before any dispatch: after 20.30, wrong year, check-auth fails, new conflict, EP14 already posted, unsafe state', () => {
  const none = [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null]];
  const cases = [
    ['2026-11-24T13:31:00Z', {}, {}, /preparation deadline passed/], ['2027-11-24T08:45:00Z', {}, {}, /date: today is 2027-11-24/],
    [T1545, { scopes: ['pages_show_list'] }, {}, /check-auth: .*lacks scopes/],
    [T1545, { media: [{ id: 'M5', caption: 'other', timestamp: '2026-11-24T13:30:00+0000' }] }, {}, /conflict: Instagram media M5 posted at 2026-11-24T20:30/],
    [T1545, { scheduled: [{ id: 'S1', scheduled_publish_time: Math.floor(Date.parse('2026-11-24T14:30:00Z') / 1000) }] }, {}, /conflict: Facebook post S1 scheduled at 2026-11-24T21:30/],
    [T1545, { reels: [{ id: 'R1', description: CAPTION, status: { publishing_phase: { publish_status: 'published' } } }] }, {}, /EP14 already on Facebook: Reel R1/],
    [T1545, {}, { state: { schema: 1, episode: 'WS-EP14', platforms: { facebook: { state: 'AMBIGUOUS', history: [] } } } }, /state: facebook is AMBIGUOUS/]];
  for (const [now, metaOpt, fx, re] of cases) {
    const d = fixture(fx), r = cli(d, now, [...none, ...META_OK(metaOpt)]);
    assert.equal(r.code, 2, `${now} ${re}\n${r.out}`); assert.match(r.json.reasons.join(' | '), re); assert.equal(dispatches(r.calls).length, 0); assert.equal(r.marker, null); assert.equal(metaWrites(r.calls).length, 0);
  }
});

test('dry-run: all gates evaluated, nothing dispatched, no marker; manual modes cannot reach a live dispatch', () => {
  const d = fixture(), r = cli(d, T1545, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK()], 'dry-run');
  assert.equal(r.code, 0, r.out); assert.match(r.json.result, /dry-run: all gates pass; nothing dispatched/); assert.equal(dispatches(r.calls).length, 0); assert.equal(r.marker, null);
  const wf = fs.readFileSync(WF, 'utf8');
  assert.match(wf, /options: \[dry-run, selftest-dispatch-plan\]/);                                   // no live option for a manual start
  assert.match(wf, /MODE: \$\{\{ github\.event_name == 'schedule' && 'live-dispatch' \|\| inputs\.mode \}\}/);
  // selftest dispatches only the read-only action plan
  const s = cli(fixture(), T1545, [['POST', '/dispatches', 204, null], ['GET', RUNS, 200, { workflow_runs: [{ id: 5, run_number: 4, display_title: 'publish-ep14 · plan', status: 'queued', created_at: new Date(Date.now() + 60e3).toISOString() }] }]], 'selftest-dispatch-plan');
  const dp = dispatches(s.calls); assert.equal(dp.length, 1); assert.deepEqual(JSON.parse(dp[0].slice(dp[0].indexOf('{'))).inputs, { action: 'plan', confirm: '' }); assert.equal(s.code, 0);
});
