#!/usr/bin/env node
// EP14 scheduled trigger — GitHub Actions cron at 15.45 / 16.15 / 16.45 WIB on 24 Nov 2026 (.github/workflows/ep14-autotrigger.yml).
// It only DISPATCHES the existing workflow publish-ep14.yml (action=run, confirm=EP14-LIVE) after every gate passes; all live safety
// stays in that workflow (check-auth, 20.30 deadline, durable state, strict read-back). This script never writes to Meta.
//
// Gates, cheapest first; the first failing group stops everything (exit 2 = blocked, the job turns red → GitHub e-mails the owner):
//   date/time  today (Asia/Jakarta) is 2026-11-24 and now is inside [publish_at − 340 min, publish_at − 30 min] (15.20–20.30 WIB)
//   config     publish_at_wib is exactly "2026-11-24 21:00", video.qc = PASS, no hold
//   once       no auto-trigger marker for EP14 yet (any earlier attempt, even an unclear one, stops the backups: no automatic retry)
//   runs       no publish-ep14 run created on 24 Nov (WIB) other than a read-only one (check-auth / plan / verify), whatever its status
//   state      Facebook and Instagram are both NOT_STARTED in publish_state.json on the data branch
//   plan       publish.js plan: no episode problem, no platform blocker
//   auth       publish.js check-auth --execute: exit 0, no failure (token valid ≥ publish_at + 2 h, scopes, accounts, Page↔IG link)
//   conflict   GET only: no other Facebook post/Reel scheduled within 2 h of 21.00, no Instagram media in that span, EP14 not already
//              posted on either channel (Instagram posts scheduled inside Meta Business Suite are not visible to the API)
// Dispatch: the marker (status "dispatching") is committed + pushed BEFORE the dispatch request. 204 → the new run is looked up and
// recorded. A broken / unclear answer → marker "ambiguous", exit 3: stop and reconcile by GET (list runs) — never a second dispatch.
//
//   node automation/publisher/ep14_autotrigger.js --mode dry-run | live-dispatch | selftest-dispatch-plan [--now ISO]
//   env: CONFIG, DATA_DIR (data branch checkout), MARKER (path in DATA_DIR), MARKER_SYNC (commit+push script), META_TOKEN,
//        GH_TOKEN, GITHUB_REPOSITORY
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const C = require('./core'), W = require('./gha_wait'), { withGraphAuth } = require('./cloud/support');

const EP = { episode: 'WS-EP14', date: '2026-11-24', publishAt: '2026-11-24 21:00', workflow: 'publish-ep14.yml', ref: 'main',
  maxWaitMin: 340, prepDeadlineMin: 30, conflictSpanH: 2 };
const READ_ONLY_RUN = /·\s*(check-auth|plan|verify)\s*$/;      // run-name of publish-ep14.yml is "publish-ep14 · <action>"
const G = 'https://graph.facebook.com/v27.0';

const wibDate = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);

// pure: every input already gathered; returns the list of reasons (empty = go)
function gates({ now, cfg, state, marker, runs, plan, auth, conflict, stage = 'all' }) {
  const r = [];
  if (wibDate(now) !== EP.date) r.push(`date: today is ${wibDate(now)} (WIB), this trigger only acts on ${EP.date}`);
  const sch = (cfg && cfg.schedule) || {};
  if (sch.publish_at_wib !== EP.publishAt) r.push(`config: publish_at_wib is ${JSON.stringify(sch.publish_at_wib)}, expected "${EP.publishAt}"`);
  if (!cfg || cfg.episode !== EP.episode) r.push(`config: episode ${cfg && cfg.episode} is not ${EP.episode}`);
  if (!cfg || !cfg.video || cfg.video.qc !== 'PASS') r.push('config: video has no QC PASS');
  if (cfg && cfg.hold) r.push(`config: episode is on hold (${cfg.hold})`);
  if (!r.some(x => x.startsWith('config: publish_at'))) { const w = W.plan(cfg, now, EP.maxWaitMin, EP.prepDeadlineMin); if (!w.ok) r.push('window: ' + w.reason); }
  if (marker) r.push(`once: auto-trigger already attempted (${marker.status} at ${marker.at}${marker.run_id ? ', run ' + marker.run_id : ''}); no automatic retry`);
  const today = (runs || []).filter(x => wibDate(new Date(x.created_at)) === EP.date && !READ_ONLY_RUN.test(x.display_title || ''));
  if (runs === null) r.push('runs-unknown: could not list publish-ep14 runs (no dispatch without knowing)');
  else if (today.length) r.push(`runs: publish-ep14 already started on ${EP.date}: ${today.map(x => `#${x.run_number} "${x.display_title}" ${x.status}/${x.conclusion || '-'}`).join(', ')}`);
  for (const p of ['facebook', 'instagram']) { const s = (((state || {}).platforms || {})[p] || {}).state || 'NOT_STARTED'; if (s !== 'NOT_STARTED') r.push(`state: ${p} is ${s}, not NOT_STARTED`); }
  if (stage === 'cheap') return r;
  if (!plan || !plan.json) r.push(`plan: no report (exit ${plan && plan.code})`);
  else {
    if ((plan.json.episode_problems || []).length) r.push('plan: ' + plan.json.episode_problems.join('; '));
    for (const [p, v] of Object.entries(plan.json.platforms || {})) if ((v.blockers || []).length) r.push(`plan: ${p} blocked: ${v.blockers.join('; ')}`);
  }
  if (!auth || auth.code !== 0 || !auth.json || (auth.json.check_auth_failures || []).length) r.push('check-auth: ' + (auth && auth.json ? (auth.json.check_auth_failures || []).join('; ') || `exit ${auth.code}` : `no report (exit ${auth && auth.code})`));
  if (!conflict || !conflict.ok) r.push(...((conflict && conflict.reasons) || ['conflict: not checked']).map(x => 'conflict: ' + x));
  return r;
}

// GET only. A slot conflict = something else scheduled / posted within ±2 h of publish_at; EP14 already posted = duplicate.
async function conflictCheck(http, cfg, post, at) {
  const reasons = [], span = EP.conflictSpanH * 3600e3, near = t => Math.abs(t - at.getTime()) <= span;
  const fb = cfg.platforms.facebook.page_id, ig = cfg.platforms.instagram.ig_user_id;
  const pt = await http('GET', `${G}/${fb}?fields=access_token`, {});
  const tok = pt.ok && pt.json && pt.json.access_token; if (!tok) return { ok: false, reasons: [`Page token not derivable (HTTP ${pt.status})`] };
  const q = o => new URLSearchParams({ ...o, access_token: tok }).toString();
  const sp = await http('GET', `${G}/${fb}/scheduled_posts?${q({ fields: 'id,scheduled_publish_time' })}`, {});
  if (!sp.ok) reasons.push(`Facebook scheduled_posts unreadable (HTTP ${sp.status})`);
  else for (const x of sp.json.data || []) if (near(+x.scheduled_publish_time * 1000)) reasons.push(`Facebook post ${x.id} scheduled at ${C.wibISO(new Date(x.scheduled_publish_time * 1000))}`);
  const vr = await http('GET', `${G}/${fb}/video_reels?${q({ fields: 'id,description,status', limit: 25 })}`, {});
  if (!vr.ok) reasons.push(`Facebook video_reels unreadable (HTTP ${vr.status})`);
  else for (const v of vr.json.data || []) {
    const ph = (v.status || {}).publishing_phase || {};
    if (v.description && v.description === post.text) reasons.push(`EP14 already on Facebook: Reel ${v.id} (${ph.publish_status || 'unknown'})`);
    else if (ph.publish_status === 'scheduled' && ph.publish_time && near(+ph.publish_time * 1000)) reasons.push(`Facebook Reel ${v.id} scheduled at ${C.wibISO(new Date(ph.publish_time * 1000))}`);
  }
  const md = await http('GET', `${G}/${ig}/media?fields=id,caption,timestamp&limit=25`, {});
  if (!md.ok) reasons.push(`Instagram media unreadable (HTTP ${md.status})`);
  else for (const m of md.json.data || []) {
    if (m.caption === post.text) reasons.push(`EP14 already on Instagram: media ${m.id}`);
    else if (near(Date.parse(m.timestamp))) reasons.push(`Instagram media ${m.id} posted at ${C.wibISO(new Date(m.timestamp))}`);
  }
  return { ok: !reasons.length, reasons };
}

const gh = (http, token) => (method, p, body) => http(method, `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${p}`,
  { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
async function listRuns(api) {
  try { const r = await api('GET', `/actions/workflows/${EP.workflow}/runs?per_page=100&event=workflow_dispatch`); return r.ok && r.json ? r.json.workflow_runs || [] : null; }
  catch { return null; }
}
const node = (args, env) => { const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 1 << 24 }); const o = r.stdout || ''; let json = null; try { json = JSON.parse(o.slice(o.indexOf('{'))); } catch { /* no report */ } return { code: r.status, json }; };

async function main(argv = process.argv.slice(2), env = process.env) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const mode = opt('--mode', 'dry-run'), now = opt('--now') ? new Date(opt('--now')) : new Date();
  if (!['dry-run', 'live-dispatch', 'selftest-dispatch-plan'].includes(mode)) { console.error('bad --mode'); return 2; }
  const cfgFile = env.CONFIG, dataDir = env.DATA_DIR, markerFile = path.join(dataDir, env.MARKER);
  const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  const stateFile = path.join(path.dirname(cfgFile), 'publish_state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
  const marker = fs.existsSync(markerFile) ? JSON.parse(fs.readFileSync(markerFile, 'utf8')) : null;
  const http = C.makeTransport({ timeoutMs: 60000 }), api = gh(http, env.GH_TOKEN), meta = withGraphAuth(http, env.META_TOKEN || '');
  const out = (o) => console.log(JSON.stringify(C.redact({ mode, at: C.timeEvidence(now), ...o }), null, 2));

  if (mode === 'selftest-dispatch-plan') {            // proves the GITHUB_TOKEN can dispatch publish-ep14.yml — with the READ-ONLY action plan
    const t0 = Date.now(), r = await api('POST', `/actions/workflows/${EP.workflow}/dispatches`, { ref: EP.ref, inputs: { action: 'plan', confirm: '' } });
    const run = r.status === 204 ? await findNewRun(api, t0, 'plan', env) : null;
    out({ selftest: { dispatch_http: r.status, run } }); return r.status === 204 && run ? 0 : 3;
  }
  const runs = await listRuns(api);
  let reasons = gates({ now, cfg, state, marker, runs, stage: 'cheap' });
  // a marker or an earlier run on the day means a trigger already happened: the backups end quietly (green), they never re-trigger
  if (reasons.length && reasons.every(x => x.startsWith('once:') || x.startsWith('runs:') || x.startsWith('state:')) && (marker || reasons.some(x => x.startsWith('runs:')))) { out({ result: 'skip: already triggered', reasons }); return 0; }
  if (reasons.length && mode !== 'dry-run') { out({ result: 'blocked', reasons }); return 2; }
  const childEnv = { ...env, STATE_SYNC: '' };       // plan / check-auth never write state here
  const pub = path.join(__dirname, 'publish.js');
  const plan = node([pub, '--config', cfgFile, 'plan', '--now', now.toISOString()], childEnv);
  const auth = node([pub, '--config', cfgFile, 'check-auth', '--execute', '--now', now.toISOString()], childEnv);
  const post = C.readPost(path.resolve(path.dirname(cfgFile), cfg.root || '../..', cfg.post_file));
  let conflict; try { conflict = await conflictCheck(meta, cfg, post, C.parseWIB(cfg.schedule.publish_at_wib)); } catch (e) { conflict = { ok: false, reasons: [C.redact(e.message)] }; }
  reasons = gates({ now, cfg, state, marker, runs, plan, auth, conflict });
  const evidence = { plan_problems: plan.json && plan.json.episode_problems, check_auth_failures: auth.json && auth.json.check_auth_failures, token: auth.json && auth.json.meta_token_facts && { type: auth.json.meta_token_facts.type, expires_at: auth.json.meta_token_facts.expires_at }, conflict };
  if (reasons.length) { out({ result: 'blocked', reasons, evidence }); return 2; }
  if (mode === 'dry-run') { out({ result: 'dry-run: all gates pass; nothing dispatched, no marker written', evidence }); return 0; }

  // live-dispatch: durable intent first; a failing push stops before the request
  const writeMarker = (m) => { fs.mkdirSync(path.dirname(markerFile), { recursive: true }); fs.writeFileSync(markerFile, JSON.stringify(m, null, 2) + '\n'); if (env.MARKER_SYNC) spawnSync('bash', [env.MARKER_SYNC, m.status], { stdio: ['ignore', 2, 2] }).status === 0 || (() => { throw new Error('marker push failed'); })(); };
  const m = { episode: EP.episode, publish_at_wib: EP.publishAt, status: 'dispatching', at: new Date().toISOString(), trigger: env.GITHUB_RUN_ID || 'local' };
  try { writeMarker(m); } catch (e) { out({ result: 'blocked', reasons: ['marker: ' + e.message + ' (nothing dispatched)'] }); return 2; }
  const t0 = Date.now(); let r, err = null;
  try { r = await api('POST', `/actions/workflows/${EP.workflow}/dispatches`, { ref: EP.ref, inputs: { action: 'run', confirm: 'EP14-LIVE' } }); } catch (e) { err = e; }
  if (!err && r.status === 204) {
    const run = await findNewRun(api, t0, 'run', env);
    writeMarker({ ...m, status: run ? 'dispatched' : 'dispatch_unconfirmed', run_id: run && run.id, run_url: run && run.html_url });
    out({ result: run ? 'dispatched' : 'dispatch_unconfirmed: 204 but no run seen; reconcile by listing runs, no retry', run, evidence }); return run ? 0 : 3;
  }
  const definite = !err && r.status >= 400 && r.status < 500 && ![408, 409, 429].includes(r.status);
  writeMarker({ ...m, status: definite ? 'rejected' : 'ambiguous', http: r && r.status, error: err && C.redact(err.message) });
  out({ result: definite ? `rejected (HTTP ${r.status}); nothing dispatched; no retry` : 'ambiguous: stop; reconcile by GET (list runs) before anything else; no retry', evidence }); return 3;
}
async function findNewRun(api, t0, action, env) {
  for (let i = 0; i < (+env.FIND_TRIES || 12); i++) {
    const runs = await listRuns(api) || [];
    const hit = runs.find(x => Date.parse(x.created_at) >= t0 - 5000 && new RegExp(`·\\s*${action}\\s*$`).test(x.display_title || ''));
    if (hit) return { id: hit.id, run_number: hit.run_number, status: hit.status, html_url: hit.html_url, created_at: hit.created_at };
    await new Promise(s => setTimeout(s, +env.FIND_WAIT_MS || 5000));
  }
  return null;
}
module.exports = { gates, wibDate, EP, conflictCheck, main };
if (require.main === module) {
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
    const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 2);
  } else main().then(c => process.exit(c), e => { console.error(C.redact(String(e && e.stack || e))); process.exit(2); });
}
