#!/usr/bin/env node
// Episode trigger for EP15+ (GitHub Actions cron every 15 min, 16.30–20.15 WIB: .github/workflows/episode-autotrigger.yml).
// Generalised from ep14_autotrigger.js (which stays untouched for EP14). It reads the queue on the data branch, takes TODAY's episode
// (WIB) whose status is READY (QC PASS written by the 16.00 production session), and only DISPATCHES publish-episode.yml
// (episode=<ID>, action=run, confirm=<ID>-LIVE) after every gate passes. All live safety stays in publish-episode.yml.
// Gates and anti-duplication are the same as for EP14: WIB date, window (≤ 340 min before, ≥ 30 min before publish_at), config time
// = queue time, QC PASS, no hold, no marker, no non-read-only run for that episode on the day, state NOT_STARTED, plan, check-auth,
// GET-only conflict check; marker pushed BEFORE the dispatch; unclear dispatch → exit 3, never a second one.
// Today's episode not READY: exit 0 (waiting) until 20.00 WIB, then exit 2 (red → e-mail): production/QC missed the deadline.
//   node automation/publisher/episode_autotrigger.js --mode dry-run | live-dispatch [--now ISO]
//   env: DATA_DIR (data branch checkout), QUEUE (path in DATA_DIR), MARKER_SYNC, META_TOKEN, GH_TOKEN, GITHUB_REPOSITORY
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const C = require('./core'), W = require('./gha_wait'), { withGraphAuth } = require('./cloud/support');

const BASE = { workflow: 'publish-episode.yml', ref: 'main', maxWaitMin: 340, prepDeadlineMin: 30, conflictSpanH: 2, readyDeadline: '20:00' };
const SR = require('../schedule_rules');
const epFor = (id, publishAtWib) => ({ ...BASE, episode: id, date: publishAtWib.slice(0, 10), publishAt: publishAtWib });
const READ_ONLY_RUN = /·\s*(check-auth|plan|verify)\s*$/;      // run-name of publish-episode.yml is "publish-episode · <ID> · <action>"
const G = 'https://graph.facebook.com/v27.0';

const wibDate = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);

// pure: every input already gathered; returns the list of reasons (empty = go)
function gates({ EP, now, cfg, state, marker, runs, plan, auth, conflict, stage = 'all' }) {
  const r = [];
  if (wibDate(now) !== EP.date) r.push(`date: today is ${wibDate(now)} (WIB), this trigger only acts on ${EP.date}`);
  const sch = (cfg && cfg.schedule) || {};
  if (sch.publish_at_wib !== EP.publishAt) r.push(`config: publish_at_wib is ${JSON.stringify(sch.publish_at_wib)}, expected "${EP.publishAt}"`);
  if (!cfg || cfg.episode !== EP.episode) r.push(`config: episode ${cfg && cfg.episode} is not ${EP.episode}`);
  if (!cfg || !cfg.video || cfg.video.qc !== 'PASS') r.push('config: video has no QC PASS');
  if (cfg && cfg.hold) r.push(`config: episode is on hold (${cfg.hold})`);
  if (!r.some(x => x.startsWith('config: publish_at'))) { const w = W.plan(cfg, now, EP.maxWaitMin, EP.prepDeadlineMin); if (!w.ok) r.push('window: ' + w.reason); }
  if (marker) r.push(`once: auto-trigger already attempted (${marker.status} at ${marker.at}${marker.run_id ? ', run ' + marker.run_id : ''}); no automatic retry`);
  const today = (runs || []).filter(x => wibDate(new Date(x.created_at)) === EP.date && (x.display_title || '').includes(` ${EP.episode} `) && !READ_ONLY_RUN.test(x.display_title || ''));
  if (runs === null) r.push('runs-unknown: could not list publish-episode runs (no dispatch without knowing)');
  else if (today.length) r.push(`runs: publish-episode ${EP.episode} already started on ${EP.date}: ${today.map(x => `#${x.run_number} "${x.display_title}" ${x.status}/${x.conclusion || '-'}`).join(', ')}`);
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
async function conflictCheck(EP, http, cfg, post, at) {
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
    if (v.description && v.description === post.text) reasons.push(`${EP.episode} already on Facebook: Reel ${v.id} (${ph.publish_status || 'unknown'})`);
    else if (ph.publish_status === 'scheduled' && ph.publish_time && near(+ph.publish_time * 1000)) reasons.push(`Facebook Reel ${v.id} scheduled at ${C.wibISO(new Date(ph.publish_time * 1000))}`);
  }
  const md = await http('GET', `${G}/${ig}/media?fields=id,caption,timestamp&limit=25`, {});
  if (!md.ok) reasons.push(`Instagram media unreadable (HTTP ${md.status})`);
  else for (const m of md.json.data || []) {
    if (m.caption === post.text) reasons.push(`${EP.episode} already on Instagram: media ${m.id}`);
    else if (near(Date.parse(m.timestamp))) reasons.push(`Instagram media ${m.id} posted at ${C.wibISO(new Date(m.timestamp))}`);
  }
  return { ok: !reasons.length, reasons };
}

const gh = (http, token) => (method, p, body) => http(method, `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${p}`,
  { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
async function listRuns(api) {
  try { const r = await api('GET', `/actions/workflows/${BASE.workflow}/runs?per_page=100&event=workflow_dispatch`); return r.ok && r.json ? r.json.workflow_runs || [] : null; }
  catch { return null; }
}
const node = (args, env) => { const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 1 << 24 }); const o = r.stdout || ''; let json = null; try { json = JSON.parse(o.slice(o.indexOf('{'))); } catch { /* no report */ } return { code: r.status, json }; };

async function main(argv = process.argv.slice(2), env = process.env) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const mode = opt('--mode', 'dry-run'), now = opt('--now') ? new Date(opt('--now')) : new Date();
  if (!['dry-run', 'live-dispatch'].includes(mode)) { console.error('bad --mode'); return 2; }
  const dataDir = env.DATA_DIR, http = C.makeTransport({ timeoutMs: 60000 }), api = gh(http, env.GH_TOKEN), meta = withGraphAuth(http, env.META_TOKEN || '');
  const out = (o) => console.log(JSON.stringify(C.redact({ mode, at: C.timeEvidence(now), ...o }), null, 2));
  const queue = JSON.parse(fs.readFileSync(path.join(dataDir, env.QUEUE || 'queue/queue.json'), 'utf8'));
  const today = (queue.episodes || []).filter(e => e.publish_at && wibDate(new Date(e.publish_at)) === wibDate(now) && !/WS-EP14\b/.test(e.id));
  if (!today.length) { out({ result: 'nothing scheduled today in the queue' }); return 0; }
  if (today.length > 1) { out({ result: 'blocked', reasons: [`queue has ${today.length} episodes for ${wibDate(now)}: ${today.map(e => e.id).join(', ')}`] }); return 2; }
  const e = today[0], pubWib = C.wibISO(new Date(e.publish_at)).slice(0, 16).replace('T', ' ');
  if (e.status !== 'READY') {
    const late = now >= SR.atWIB(wibDate(now), BASE.readyDeadline);
    out({ result: late ? 'blocked' : 'waiting', episode: e.id, status: e.status, reasons: late ? [`${e.id} is ${e.status}, not READY by ${BASE.readyDeadline} WIB: stopped (no publish now, slot not shifted)`] : undefined });
    return late ? 2 : 0;
  }
  const EP = epFor(e.id, pubWib);
  const cfgFile = path.join(dataDir, 'outputs', e.id, 'publish_config.json'), markerFile = path.join(dataDir, 'outputs', e.id, 'autotrigger_marker.json');
  if (!fs.existsSync(cfgFile)) { out({ result: 'blocked', reasons: [`${e.id} is READY but ${path.relative(dataDir, cfgFile)} is missing`] }); return 2; }
  const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  const stateFile = path.join(path.dirname(cfgFile), 'publish_state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
  const marker = fs.existsSync(markerFile) ? JSON.parse(fs.readFileSync(markerFile, 'utf8')) : null;
  const runs = await listRuns(api);
  let reasons = gates({ EP, now, cfg, state, marker, runs, stage: 'cheap' });
  // a marker or an earlier run on the day means a trigger already happened: the backups end quietly (green), they never re-trigger
  if (reasons.length && reasons.every(x => x.startsWith('once:') || x.startsWith('runs:') || x.startsWith('state:')) && (marker || reasons.some(x => x.startsWith('runs:')))) { out({ result: 'skip: already triggered', reasons }); return 0; }
  if (reasons.length && mode !== 'dry-run') { out({ result: 'blocked', reasons }); return 2; }
  const childEnv = { ...env, STATE_SYNC: '' };       // plan / check-auth never write state here
  const pub = path.join(__dirname, 'publish.js');
  const plan = node([pub, '--config', cfgFile, 'plan', '--now', now.toISOString()], childEnv);
  const auth = node([pub, '--config', cfgFile, 'check-auth', '--execute', '--now', now.toISOString()], childEnv);
  const post = C.readPost(path.resolve(path.dirname(cfgFile), cfg.root || '../..', cfg.post_file));
  let conflict; try { conflict = await conflictCheck(EP, meta, cfg, post, C.parseWIB(cfg.schedule.publish_at_wib)); } catch (e) { conflict = { ok: false, reasons: [C.redact(e.message)] }; }
  reasons = gates({ EP, now, cfg, state, marker, runs, plan, auth, conflict });
  const evidence = { plan_problems: plan.json && plan.json.episode_problems, check_auth_failures: auth.json && auth.json.check_auth_failures, token: auth.json && auth.json.meta_token_facts && { type: auth.json.meta_token_facts.type, expires_at: auth.json.meta_token_facts.expires_at }, conflict };
  if (reasons.length) { out({ result: 'blocked', reasons, evidence }); return 2; }
  if (mode === 'dry-run') { out({ result: 'dry-run: all gates pass; nothing dispatched, no marker written', evidence }); return 0; }

  // live-dispatch: durable intent first; a failing push stops before the request
  const writeMarker = (m) => { fs.mkdirSync(path.dirname(markerFile), { recursive: true }); fs.writeFileSync(markerFile, JSON.stringify(m, null, 2) + '\n'); if (env.MARKER_SYNC) spawnSync('bash', [env.MARKER_SYNC, m.status, path.relative(dataDir, markerFile)], { stdio: ['ignore', 2, 2] }).status === 0 || (() => { throw new Error('marker push failed'); })(); };
  const m = { episode: EP.episode, publish_at_wib: EP.publishAt, status: 'dispatching', at: new Date().toISOString(), trigger: env.GITHUB_RUN_ID || 'local' };
  try { writeMarker(m); } catch (e) { out({ result: 'blocked', reasons: ['marker: ' + e.message + ' (nothing dispatched)'] }); return 2; }
  const t0 = Date.now(); let r, err = null;
  try { r = await api('POST', `/actions/workflows/${EP.workflow}/dispatches`, { ref: EP.ref, inputs: { episode: EP.episode, action: 'run', confirm: `${EP.episode}-LIVE` } }); } catch (e) { err = e; }
  if (!err && r.status === 204) {
    const run = await findNewRun(api, t0, EP.episode, env);
    writeMarker({ ...m, status: run ? 'dispatched' : 'dispatch_unconfirmed', run_id: run && run.id, run_url: run && run.html_url });
    out({ result: run ? 'dispatched' : 'dispatch_unconfirmed: 204 but no run seen; reconcile by listing runs, no retry', run, evidence }); return run ? 0 : 3;
  }
  const definite = !err && r.status >= 400 && r.status < 500 && ![408, 409, 429].includes(r.status);
  writeMarker({ ...m, status: definite ? 'rejected' : 'ambiguous', http: r && r.status, error: err && C.redact(err.message) });
  out({ result: definite ? `rejected (HTTP ${r.status}); nothing dispatched; no retry` : 'ambiguous: stop; reconcile by GET (list runs) before anything else; no retry', evidence }); return 3;
}
async function findNewRun(api, t0, episode, env) {
  for (let i = 0; i < (+env.FIND_TRIES || 12); i++) {
    const runs = await listRuns(api) || [];
    const hit = runs.find(x => Date.parse(x.created_at) >= t0 - 5000 && (x.display_title || '').includes(` ${episode} `) && /·\s*run\s*$/.test(x.display_title || ''));
    if (hit) return { id: hit.id, run_number: hit.run_number, status: hit.status, html_url: hit.html_url, created_at: hit.created_at };
    await new Promise(s => setTimeout(s, +env.FIND_WAIT_MS || 5000));
  }
  return null;
}
module.exports = { gates, wibDate, epFor, BASE, conflictCheck, main };
if (require.main === module) {
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
    const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 2);
  } else main().then(c => process.exit(c), e => { console.error(C.redact(String(e && e.stack || e))); process.exit(2); });
}
