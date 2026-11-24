// episode_autotrigger (EP15+): cron coverage, READY/waiting/deadline, EP14 isolation, single dispatch, ambiguity. No network.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ET = require('../episode_autotrigger'), C = require('../core'), Wt = require('../gha_wait');
const WF = path.resolve(__dirname, '../../../.github/workflows/episode-autotrigger.yml'), PWF = path.resolve(__dirname, '../../../.github/workflows/publish-episode.yml');

test('cron covers 16.30–20.15 WIB every 15 min, every slot inside the publish window of a 21.00 slot', () => {
  const y = fs.readFileSync(WF, 'utf8'), times = [];
  for (const m of y.matchAll(/cron: '([\d,]+) ([\d,-]+) \* \* \*'/g)) {
    const mins = m[1].split(',').map(Number), hrs = m[2].includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(m[2].split('-').map(Number)) : m[2].split(',').map(Number);
    for (const h of hrs) for (const mi of mins) times.push(new Date(Date.UTC(2026, 10, 25, h, mi)));
  }
  const wib = times.map(d => C.wibISO(d).slice(11, 16)).sort();
  assert.equal(wib.length, 16); assert.equal(wib[0], '16:30'); assert.equal(wib.at(-1), '20:15');
  for (const d of times) assert.equal(Wt.plan({ schedule: { publish_at_wib: '2026-11-25 21:00' } }, d, 340, 30).ok, true, C.wibISO(d));
});

test('publish-episode.yml: episode must be WS-EPnn with nn ≥ 15 and confirm must be "<episode>-LIVE"; EP14 workflow untouched', () => {
  const y = fs.readFileSync(PWF, 'utf8');
  assert.match(y, /\(\( 10#\$\{BASH_REMATCH\[1\]\} >= 15 \)\)/); assert.match(y, /"\$CONFIRM" != "\$EPISODE-LIVE"/); assert.match(y, /DATA_REF: data\/episodes/); assert.ok(!/EP14-LIVE|input\/ep14/.test(y));
  for (const [ep, ok] of [['WS-EP15', true], ['WS-EP24', true], ['WS-EP14', false], ['WS-EP9', false], ['ep15', false]]) {
    const r = spawnSync('bash', ['-c', `[[ "${ep}" =~ ^WS-EP([0-9]{2,3})$ ]] && (( 10#\${BASH_REMATCH[1]} >= 15 ))`]); assert.equal(r.status === 0, ok, ep);
  }
});

function data(o = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'et-')), od = path.join(d, 'outputs', 'WS-EP15');
  fs.mkdirSync(od, { recursive: true }); fs.mkdirSync(path.join(d, 'queue'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=108x192:rate=10:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', path.join(od, 'v.mp4')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', path.join(od, 't.png')]);
  fs.writeFileSync(path.join(od, 'POST.md'), '# Whyscape EP15 — x\n\n**Judul:** T\n\n**Caption:**\n\nC\n\n**Hashtag:** #W\n');
  fs.writeFileSync(path.join(od, 'publish_config.json'), JSON.stringify({ episode: 'WS-EP15', root: '.', video: { path: 'v.mp4', qc: 'PASS' }, post_file: 'POST.md', thumbnail_file: 't.png',
    schedule: { publish_at_wib: '2026-11-25 21:00', creator_instruction: 'POST.md', platforms: ['facebook', 'instagram'] },
    platforms: { facebook: { page_id: 'P', declarations: { is_ai_generated: true } }, instagram: { ig_user_id: 'I', public_video_url: 'https://h/v', public_cover_url: 'https://h/c', declarations: { is_ai_generated: true } } } }));
  fs.writeFileSync(path.join(d, 'queue', 'queue.json'), JSON.stringify({ schema: 2, episodes: [
    { id: 'WS-EP14', status: 'READY', publish_at: '2026-11-25T21:00+07:00' },               // must never be picked up here
    { id: 'WS-EP15', status: o.status || 'READY', publish_at: '2026-11-25T21:00+07:00' }].filter(e => o.withEp14 || e.id !== 'WS-EP14') }));
  return d;
}
const META_OK = [
  ['GET', 'debug_token', 200, { data: { type: 'SYSTEM_USER', is_valid: true, expires_at: 0, data_access_expires_at: 0, scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'] } }],
  ['GET', '/P?fields=id,name', 200, { id: 'P', name: 'Page' }], ['GET', '/P?fields=access_token', 200, { access_token: 'EAAPAGETOKENzzzzzzzzzzzzzzzzzzzzzz' }],
  ['GET', '/P?fields=instagram_business_account', 200, { instagram_business_account: { id: 'I' } }],
  ['GET', '/me/permissions', 200, { data: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'].map(permission => ({ permission, status: 'granted' })) }],
  ['GET', '/me?', 200, { id: 'P' }], ['GET', '/I?fields=id,username', 200, { id: 'I', username: 'u' }],
  ['GET', '/I/content_publishing_limit', 200, { data: [{ quota_usage: 0, config: { quota_total: 100, quota_duration: 86400 } }] }],
  ['GET', '/P/scheduled_posts', 200, { data: [] }], ['GET', '/P/video_reels', 200, { data: [] }], ['GET', '/I/media?', 200, { data: [] }]];
const RUNS = '/actions/workflows/publish-episode.yml/runs';
function cli(d, now, routes, mode = 'live-dispatch', extra = {}) {
  const log = path.join(d, `f_${Math.random()}.log`);
  const r = spawnSync(process.execPath, [path.resolve(__dirname, '../episode_autotrigger.js'), '--mode', mode, '--now', now], { encoding: 'utf8', env: { ...process.env,
    NODE_OPTIONS: `--require ${path.join(__dirname, 'fake_fetch.js')}`, FAKE_ROUTES: JSON.stringify(routes), FAKE_LOG: log, HTTPS_PROXY: '', https_proxy: '', GITHUB_ACTIONS: 'true',
    DATA_DIR: d, QUEUE: 'queue/queue.json', MARKER_SYNC: '', GITHUB_REPOSITORY: 'o/r', GH_TOKEN: 'ghs_x', META_TOKEN: 'EAAsecretTOKENvalue1234567890', FIND_TRIES: '2', FIND_WAIT_MS: '0', ...extra } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : [];
  let json = null; try { json = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); } catch { /* none */ }
  const mf = path.join(d, 'outputs/WS-EP15/autotrigger_marker.json');
  return { code: r.status, json, calls, marker: fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : null, out: r.stdout + r.stderr };
}
const dispatches = c => c.filter(x => x.startsWith('POST') && x.includes('/dispatches'));
const T1630 = '2026-11-25T09:30:00Z', T1645 = '2026-11-25T09:45:00Z';

test('READY today → gates → marker → exactly one dispatch (episode, run, WS-EP15-LIVE); next cron skips; EP14 entries ignored', () => {
  const d = data({ withEp14: true }), run = { id: 7, run_number: 1, display_title: 'publish-episode · WS-EP15 · run', status: 'queued', html_url: 'u', created_at: new Date(Date.now() + 60e3).toISOString() };
  // the queue also has a WS-EP14 entry for the same day: it must be ignored, not counted as a second episode
  const r = cli(d, T1630, [['GET', RUNS, 200, { workflow_runs: [] }, 1], ['POST', '/dispatches', 204, null], ['GET', RUNS, 200, { workflow_runs: [run] }], ...META_OK]);
  assert.equal(r.code, 0, r.out); assert.equal(r.json.result, 'dispatched');
  const dp = dispatches(r.calls); assert.equal(dp.length, 1);
  assert.deepEqual(JSON.parse(dp[0].slice(dp[0].indexOf('{'))), { ref: 'main', inputs: { episode: 'WS-EP15', action: 'run', confirm: 'WS-EP15-LIVE' } });
  assert.ok(dp[0].includes('/publish-episode.yml/dispatches')); assert.equal(r.marker.status, 'dispatched');
  assert.ok(!r.calls.some(c => c.startsWith('POST') && c.includes('graph.facebook.com')));
  const b = cli(d, T1645, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK]);
  assert.equal(b.code, 0); assert.match(b.json.result, /skip/); assert.equal(dispatches(b.calls).length, 0);
});

test('not READY: waiting (green) before 20.00 WIB, blocked (red) from 20.00; nothing dispatched', () => {
  const d = data({ status: 'PRODUCING' });
  const w = cli(d, T1630, [['GET', RUNS, 200, { workflow_runs: [] }], ...META_OK]); assert.equal(w.code, 0); assert.equal(w.json.result, 'waiting'); assert.equal(dispatches(w.calls).length, 0);
  const late = cli(d, '2026-11-25T13:00:00Z', [['GET', RUNS, 200, { workflow_runs: [] }], ...META_OK]); assert.equal(late.code, 2); assert.match(late.json.reasons.join(), /not READY by 20:00 WIB/);
});

test('ambiguous dispatch → marker "ambiguous", exit 3, no retry; a run of ANOTHER episode does not block, one of WS-EP15 does', () => {
  const d = data(), r = cli(d, T1630, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 0, null], ...META_OK]);
  assert.equal(r.code, 3); assert.equal(r.marker.status, 'ambiguous');
  const b = cli(d, T1645, [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK]); assert.equal(dispatches(b.calls).length, 0);
  const other = { run_number: 2, display_title: 'publish-episode · WS-EP16 · run', status: 'completed', conclusion: 'success', created_at: '2026-11-25T09:10:00Z' };
  const mine = { ...other, display_title: 'publish-episode · WS-EP15 · run' };
  assert.deepEqual(ET.gates({ EP: ET.epFor('WS-EP15', '2026-11-25 21:00'), now: new Date(T1630), cfg: { episode: 'WS-EP15', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-25 21:00' } }, runs: [other], stage: 'cheap' }), []);
  assert.match(ET.gates({ EP: ET.epFor('WS-EP15', '2026-11-25 21:00'), now: new Date(T1630), cfg: { episode: 'WS-EP15', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-25 21:00' } }, runs: [mine], stage: 'cheap' }).join(), /already started/);
});

test('workflow: routine-dispatch runs the SAME live gates as cron (source recorded), selftest is a separate read-only mode', () => {
  const y = fs.readFileSync(WF, 'utf8');
  assert.match(y, /options: \[dry-run, routine-dispatch, selftest-dispatch-plan\]/);
  assert.match(y, /MODE: \$\{\{ \(github\.event_name == 'schedule' \|\| inputs\.mode == 'routine-dispatch'\) && 'live-dispatch' \|\| inputs\.mode \}\}/);
  assert.match(y, /TRIGGER_SOURCE: .*'cron'.*'routine'.*'manual'/);
  assert.match(y, /concurrency:\s*\n\s*group: episode-autotrigger\s*\n\s*cancel-in-progress: false/);   // routine + cron never run side by side
});

test('routine first, cron after: one dispatch, marker says source=routine; cron backup then skips; cron first → routine skips', () => {
  const run = { id: 9, run_number: 1, display_title: 'publish-episode · WS-EP15 · run', status: 'queued', html_url: 'u', created_at: new Date(Date.now() + 60e3).toISOString() };
  const d = data(), r = cli(d, '2026-11-25T10:20:00Z', [['GET', RUNS, 200, { workflow_runs: [] }, 1], ['POST', '/dispatches', 204, null], ['GET', RUNS, 200, { workflow_runs: [run] }], ...META_OK], 'live-dispatch', { TRIGGER_SOURCE: 'routine' });
  assert.equal(r.code, 0, r.out); assert.equal(r.marker.source, 'routine'); assert.equal(r.marker.status, 'dispatched'); assert.equal(dispatches(r.calls).length, 1);
  const c = cli(d, '2026-11-25T10:30:00Z', [['GET', RUNS, 200, { workflow_runs: [run] }], ['POST', '/dispatches', 204, null], ...META_OK], 'live-dispatch', { TRIGGER_SOURCE: 'cron' });
  assert.equal(c.code, 0); assert.match(c.json.result, /skip: already triggered/); assert.equal(dispatches(c.calls).length, 0);
  const d2 = data(); fs.writeFileSync(path.join(d2, 'outputs/WS-EP15/autotrigger_marker.json'), JSON.stringify({ status: 'dispatched', at: '2026-11-25T09:30:05Z', source: 'cron', run_id: 5 }));
  const r2 = cli(d2, '2026-11-25T10:20:00Z', [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK], 'live-dispatch', { TRIGGER_SOURCE: 'routine' });
  assert.equal(r2.code, 0); assert.match(r2.json.result, /skip/); assert.equal(dispatches(r2.calls).length, 0);
  // an earlier AMBIGUOUS attempt (any caller) also stops the routine: no automatic retry
  fs.writeFileSync(path.join(d2, 'outputs/WS-EP15/autotrigger_marker.json'), JSON.stringify({ status: 'ambiguous', at: '2026-11-25T09:30:05Z', source: 'cron' }));
  const r3 = cli(d2, '2026-11-25T10:20:00Z', [['GET', RUNS, 200, { workflow_runs: [] }], ['POST', '/dispatches', 204, null], ...META_OK], 'live-dispatch', { TRIGGER_SOURCE: 'routine' });
  assert.equal(dispatches(r3.calls).length, 0); assert.match(JSON.stringify(r3.json.reasons), /already attempted \(ambiguous/);
});

test('selftest-dispatch-plan: only publish-episode WS-EP999 action=plan, no confirm, no marker, no queue, no Meta; refuses without the held fixture', () => {
  const d = data(), fx = path.join(d, 'outputs/WS-EP999');
  const none = cli(d, T1630, [['POST', '/dispatches', 204, null]], 'selftest-dispatch-plan');
  assert.equal(none.code, 2); assert.equal(dispatches(none.calls).length, 0);
  fs.mkdirSync(fx, { recursive: true }); fs.writeFileSync(path.join(fx, 'publish_config.json'), JSON.stringify({ episode: 'WS-EP999', selftest: true, hold: 'SELFTEST fixture: never publish' }));
  const run = { id: 3, run_number: 4, display_title: 'publish-episode · WS-EP999 · plan', status: 'queued', html_url: 'u', created_at: new Date(Date.now() + 60e3).toISOString() };
  const r = cli(d, T1630, [['POST', '/dispatches', 204, null], ['GET', RUNS, 200, { workflow_runs: [run] }]], 'selftest-dispatch-plan');
  assert.equal(r.code, 0, r.out); assert.match(r.json.result, /read-only plan dispatched/);
  const dp = dispatches(r.calls); assert.equal(dp.length, 1);
  assert.deepEqual(JSON.parse(dp[0].slice(dp[0].indexOf('{'))), { ref: 'main', inputs: { episode: 'WS-EP999', action: 'plan' } });
  assert.ok(!r.calls.some(c => c.includes('graph.facebook.com'))); assert.equal(r.marker, null);
  const amb = cli(d, T1630, [['POST', '/dispatches', 0, null]], 'selftest-dispatch-plan'); assert.equal(amb.code, 3); assert.equal(dispatches(amb.calls).length, 1);
});

test('plan gate: a channel the creator did not choose never blocks the trigger; a blocked CHOSEN channel does; no channel at all blocks', () => {
  const EP = ET.epFor('WS-EP15', '2026-11-25 21:00'), now = new Date(T1630), cfg = { episode: 'WS-EP15', video: { qc: 'PASS' }, schedule: { publish_at_wib: '2026-11-25 21:00' } };
  const okAuth = { code: 0, json: { check_auth_failures: [] } }, okConflict = { ok: true };
  const g = platforms => ET.gates({ EP, now, cfg, runs: [], plan: { json: { episode_problems: [], platforms } }, auth: okAuth, conflict: okConflict });
  assert.deepEqual(g({ facebook: { requested: true, blockers: [] }, instagram: { requested: false, blockers: ["instagram is not among the creator's platforms"] } }), []);
  assert.match(g({ facebook: { requested: true, blockers: ['no thumbnail file from the creator'] }, instagram: { requested: false, blockers: ['x'] } }).join(), /facebook blocked/);
  assert.match(g({ facebook: { requested: false, blockers: ['x'] }, instagram: { requested: false, blockers: ['y'] } }).join(), /no channel chosen/);
});
