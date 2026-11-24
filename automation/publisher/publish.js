#!/usr/bin/env node
// Whyscape publisher CLI. Default is a DRY plan: nothing is sent to any platform without --execute.
//   node automation/publisher/publish.js --config outputs/WS-EP14/publish_config.json <mode> [--platform facebook|instagram] [--execute]
// modes:
//   plan        gates + exactly what would be sent (redacted), per platform. No network.
//   check-auth  read-only identity call per platform (proves "account authorised"). No content is created.
//   schedule    Facebook: Reel SCHEDULED · Instagram: prepare container (no native schedule)
// Pilot scope (22 Nov 2026): Meta only (Facebook Reels + Instagram Reels). YouTube is managed manually in YouTube Studio.
//   publish     Instagram only, inside the publish window (the routine calls it at publish_at)
//   verify      read back every platform that has an ID; updates state with evidence
//   reconcile   look for an upload this system may already have made (after an AMBIGUOUS outcome); adopts exactly one match, never more
//   report      FINAL check after publish_at, GET only: every channel the creator chose must read PUBLISHED with a permalink
//               (Facebook: Reel publish_status published; Instagram: media id → REELS + permalink). Writes publish_result.json.
//               Exit 2 unless every chosen channel is verified. A green earlier step or a FINISHED container is never "success".
// Channels the creator did not choose are skipped (no state change, no failure), so a Facebook-only or Instagram-only episode works.
// State: <outputs>/<id>/publish_state.json (committed) + publish_state.local.json (never committed). Exit 0 ok, 2 blocked/stop, 3 usage.
const fs = require('fs'), path = require('path');
const C = require('./core');
const ADAPTERS = { facebook: require('./facebook'), instagram: require('./instagram') };
function load(cfgFile, { now = new Date() } = {}) {
  const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')), root = path.resolve(path.dirname(cfgFile), cfg.root || '../..'), R = p => path.resolve(root, p);
  const problems = [];
  const videoPath = R(cfg.video.path), video = { path: videoPath, ...C.probe(videoPath) };
  const videoMd5 = C.md5(videoPath), videoSha = C.sha256(videoPath);
  if (cfg.video.expected_md5 && videoMd5 !== cfg.video.expected_md5) problems.push(`video md5 ${videoMd5} ≠ the QC-passed ${cfg.video.expected_md5}`);
  if (cfg.video.qc !== 'PASS') problems.push('video has no QC PASS recorded');
  // FORMAT BAKU: duration measured from the final MP4 file itself (ffprobe), before any upload, for every platform
  const fmt = require('../format_rules').checkFinal(video.duration);
  if (!fmt.ok) problems.push(fmt.msg);
  if (cfg.hold) problems.push(`episode is ON HOLD by the creator: ${cfg.hold}`);
  const post = C.readPost(R(cfg.post_file));
  if (cfg.expected_post_sha256 && post.sha256 !== cfg.expected_post_sha256) problems.push('POST.md changed since it was validated');
  if (post.episode && post.episode.toUpperCase() !== cfg.episode.toUpperCase()) problems.push(`POST.md is for ${post.episode}, not ${cfg.episode}`);
  if (!post.title || !post.caption) problems.push('POST.md has no title or caption');
  // schedule: POST.md first; otherwise a recorded creator instruction (quoted). Never invented.
  const sched = post.publish_at ? { at: post.publish_at, source: 'POST.md' } : cfg.schedule && cfg.schedule.creator_instruction ? { at: cfg.schedule.publish_at_wib, source: `creator instruction: "${cfg.schedule.creator_instruction}"` } : null;
  const publishAt = sched && C.parseWIB(sched.at); if (!publishAt) problems.push('no valid publish time from the creator');
  const platforms = (post.platforms.length ? post.platforms : (cfg.schedule && cfg.schedule.platforms) || []).map(p => p.replace(/\s.*$/, ''));
  // thumbnail: creator file; technical conversion per platform recorded
  let thumbSrc = cfg.thumbnail_file && R(cfg.thumbnail_file); if (thumbSrc && !fs.existsSync(thumbSrc)) thumbSrc = null;
  const work = path.join(path.dirname(path.resolve(cfgFile)), 'publish_work');
  const thumbs = {};
  if (thumbSrc) {
    const ext = path.extname(thumbSrc).slice(1).toLowerCase();
    for (const [p, fmt] of [['facebook', ['png', 'jpg', 'jpeg'].includes(ext) ? null : 'png'], ['instagram', ['jpg', 'jpeg'].includes(ext) ? null : 'jpeg']]) {
      if (!fmt) { thumbs[p] = { path: thumbSrc, ext, mime: ext === 'png' ? 'image/png' : 'image/jpeg', conversion: null }; continue; }
      const dest = path.join(work, `thumbnail_${p}.${fmt === 'jpeg' ? 'jpg' : 'png'}`), conv = C.convertImage(thumbSrc, dest, fmt);
      thumbs[p] = { path: dest, ext: fmt === 'jpeg' ? 'jpg' : 'png', mime: `image/${fmt}`, conversion: conv };
    }
  }
  return { cfg, root, video, videoMd5, videoSha, post, publishAt, sched, platforms, thumbs, problems, now, stateFile: path.join(path.dirname(path.resolve(cfgFile)), 'publish_state.json') };
}

// token facts without the value: type, validity, expiry, granted scopes (GET /debug_token with the token inspecting itself)
async function tokenInfo(http, t) {
  try {
    const r = await http('GET', `https://graph.facebook.com/v27.0/debug_token?input_token=${encodeURIComponent(t)}`, {});
    const d = (r.json && r.json.data) || {}, when = s => s === 0 ? 'never' : s ? new Date(s * 1000).toISOString() : null;
    return { http: r.status, type: d.type || null, is_valid: d.is_valid ?? null, expires_at: when(d.expires_at), data_access_expires_at: when(d.data_access_expires_at), scopes: d.scopes || null, error: r.ok ? undefined : C.redact(r.json && r.json.error && r.json.error.message) };
  } catch (e) { return { error: C.redact(e.message) }; }
}
// check-auth must FAIL (exit 2) when any of these is true: an account is not readable / not the configured one, a permission is
// missing, the Page is not linked to the configured Instagram account, or the token is invalid / expires before publish_at + 2 h.
const NEED_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'];
async function authFailures({ report, targets, http, META, L }) {
  const fails = [];
  for (const p of targets) { const a = report.platforms[p].auth; if (!a || !a.ok) fails.push(`${p}: auth not ok (${JSON.stringify((a && (a.checks || a.detail)) || null)})`); }
  const fb = (L.cfg.platforms || {}).facebook || {}, ig = (L.cfg.platforms || {}).instagram || {};
  if (targets.includes('facebook') && targets.includes('instagram')) {
    const r = await http('GET', `https://graph.facebook.com/v27.0/${fb.page_id}?fields=instagram_business_account`, {});
    const linked = r.ok && r.json && r.json.instagram_business_account ? r.json.instagram_business_account.id : null;
    report.account_link = { page_id: fb.page_id, instagram_linked: linked, configured: ig.ig_user_id, matches: linked === ig.ig_user_id };
    if (linked !== ig.ig_user_id) fails.push(`account mismatch: Page ${fb.page_id} is linked to IG ${linked}, config says ${ig.ig_user_id}`);
  }
  if (META) {
    const f = report.meta_token_facts || {}, mustLast = L.publishAt ? new Date(L.publishAt.getTime() + 2 * 3600e3) : new Date(Date.now() + 6 * 3600e3);
    if (f.is_valid !== true) fails.push(`token is not valid (${f.error || 'is_valid=' + f.is_valid})`);
    const miss = NEED_SCOPES.filter(x => !(f.scopes || []).includes(x)); if (miss.length) fails.push(`token lacks scopes: ${miss.join(', ')}`);
    for (const k of ['expires_at', 'data_access_expires_at']) if (f[k] && f[k] !== 'never' && new Date(f[k]) < mustLast) fails.push(`token ${k} ${f[k]} is before ${mustLast.toISOString()} (publish_at + 2 h)`);
  } else if (process.env.GITHUB_ACTIONS === 'true') fails.push('secret META_TOKEN is not set');
  return fails;
}
const MODES = ['plan', 'check-auth', 'schedule', 'publish', 'verify', 'reconcile', 'report'];
// one mode, in-process (the CLI and the end-to-end tests both call this). Returns { report, code }; never calls process.exit.
async function runMode({ cfgFile, mode, only = null, execute = false, now = new Date(), http, META = '', sleep = ms => new Promise(r => setTimeout(r, ms)), onSave = null, tune = {} }) {
  const flag = f => f === '--execute' ? execute : false;
  const L = load(cfgFile, { now });
  const st = new C.State(L.stateFile, L.cfg.episode);
  if (onSave && execute) st.onSave = onSave;
  const targets = Object.keys(ADAPTERS).filter(p => (!only || p === only));
  const report = { episode: L.cfg.episode, mode, executed: execute, at: C.timeEvidence(L.now), video: { path: path.relative(L.root, L.video.path), md5: L.videoMd5, duration_s: L.video.duration, size: L.video.size, wh: `${L.video.width}x${L.video.height}` },
    schedule: L.publishAt ? { ...C.timeEvidence(L.publishAt), source: L.sched.source } : null, episode_problems: L.problems, platforms: {} };
  for (const p of targets) {
    const A = ADAPTERS[p], pc = (L.cfg.platforms || {})[p] || {};
    const ctx = { cfg: pc, video: L.video, videoSha: L.videoSha, post: L.post, publishAt: L.publishAt, now: L.now, thumb: L.thumbs[p] || null, http, sleep, ...tune };
    const requested = L.platforms.includes(p) && pc.enabled !== false;
    const blockers = [...L.problems, ...(requested ? [] : [`${p} is not among the creator's platforms`]), ...(L.publishAt ? A.gate(ctx, mode) : [])];
    const out = report.platforms[p] = { requested, blockers, state: st.p(p).state, thumbnail: ctx.thumb ? { file: path.relative(L.root, ctx.thumb.path), conversion: ctx.thumb.conversion && { ...ctx.thumb.conversion, to: path.relative(L.root, ctx.thumb.conversion.to) } } : null };
    if (mode === 'plan') {
      out.would_send = { title: L.post.title, text: L.post.text };
      continue;
    }
    if (mode === 'check-auth' && META && flag('--execute') && !report.meta_token_facts) report.meta_token_facts = await tokenInfo(http, META);   // facts only, never the value
    if (mode === 'check-auth') { if (!flag('--execute')) { out.note = 'dry run: add --execute to call the read-only identity endpoint'; continue; } try { out.auth = await A.checkAuth(ctx); } catch (e) { out.auth = { ok: false, detail: e.message }; } continue; }
    if (!flag('--execute')) { out.note = 'dry run: nothing sent (add --execute)'; continue; }
    // a channel the creator did not choose is not part of this episode: nothing is sent, read or changed for it
    if (!requested && ['schedule', 'publish', 'verify', 'report'].includes(mode)) { out.result = { skipped: `${p} not chosen by the creator` }; continue; }
    if (mode === 'verify') { out.result = C.redact(await A.verify(ctx, st)); continue; }
    if (mode === 'report') {
      if (L.publishAt && L.now < L.publishAt) {   // before the slot: read-back of the PREPARATION only; never called "verified"
        let r; try { r = await A.verify(ctx, st); } catch (e) { r = { stop: true, reason: 'read-back error: ' + e.message }; }
        const ps = st.p(p), ready = p === 'facebook' ? !r.stop && ps.state === 'SCHEDULED' : ps.state === 'CREATED' && ps.container_status === 'FINISHED';
        out.result = C.redact(r);
        out.final = { stage: 'before publish_at', verified: false, prepared: ready, state: ps.state, container_status: ps.container_status || undefined, reason: ready ? null : C.redact(r.reason || `not prepared (state ${ps.state})`), checked_at: new Date().toISOString() };
        continue;
      }
      let r; try { r = await A.verify(ctx, st, { final: true }); } catch (e) { r = { stop: true, reason: 'read-back error: ' + e.message }; }
      const ps = st.p(p);
      out.result = C.redact(r);
      out.final = { verified: !r.stop, state: ps.state, permalink: !r.stop ? ps.url : null, remote_id: ps.remote_id || null, reason: r.stop ? C.redact(r.reason) : null, checked_at: new Date().toISOString() };
      continue;
    }
    if (mode === 'reconcile') {
      // GET-only reconciliation after an unknown outcome; decides whether a retry is safe. Never sends a create/publish request.
      const pst = st.p(p); if (!['AMBIGUOUS', 'CREATING'].includes(pst.state)) { out.result = { note: `state ${pst.state}: nothing to reconcile` }; continue; }
      if (p === 'instagram' && pst.container_id) {
        const c = await http('GET', `https://graph.facebook.com/v27.0/${pst.container_id}?fields=status_code`, {}), code = c.ok && c.json ? c.json.status_code : null;
        out.result = { container_id: pst.container_id, container_status: code };
        if (code === 'FINISHED') { await st.set(p, { state: 'CREATED', container_status: 'FINISHED' }, { step: 'reconcile', container: code, note: 'container NOT published: media_publish may run inside the window' }); continue; }
        if (['ERROR', 'EXPIRED'].includes(code)) { await st.set(p, { state: 'NOT_STARTED', container_id: null, container_status: null }, { step: 'reconcile', container: code, note: 'dead container, nothing published: a new container may be prepared' }); continue; }
        if (code !== 'PUBLISHED') { await st.set(p, { state: 'AMBIGUOUS' }, { step: 'reconcile', container: code || `HTTP ${c.status}`, note: 'not decidable yet; no retry' }); continue; }
      }
      const m = await A.reconcile(ctx, pst); out.result = { ...(out.result || {}), ...C.redact(m) };
      if (m.error) { await st.set(p, { state: 'AMBIGUOUS' }, { step: 'reconcile', error: m.error, note: 'read failed; no retry' }); continue; }
      if (m.matches.length === 1) await st.set(p, p === 'instagram' ? { state: 'PUBLISHED', remote_id: m.matches[0].id, url: m.matches[0].url || null } : { state: 'CREATED', remote_id: m.matches[0].id }, { step: 'reconcile-adopt', id: m.matches[0].id });
      else if (m.matches.length === 0 && !(p === 'instagram' && pst.container_id)) await st.set(p, { state: 'NOT_STARTED', intent_at: null }, { step: 'reconcile', found: 0, note: 'GET found nothing created after the intent: a retry is safe' });
      else await st.set(p, { state: 'AMBIGUOUS' }, { step: 'reconcile', found: m.matches.length, note: 'not exactly one match: creator decides; no retry' });
      continue;
    }
    if (blockers.length) { out.result = { stop: true, reason: 'blocked', blockers }; await st.set(p, { state: ['NOT_STARTED', 'BLOCKED'].includes(st.p(p).state) ? 'BLOCKED' : st.p(p).state, blockers }, { step: 'gate' }); continue; }
    if (mode === 'publish' && p !== 'instagram') { out.result = { note: 'publish mode is only for Instagram; other platforms publish by their own schedule' }; continue; }
    try { out.result = C.redact(await (mode === 'publish' ? A.publish(ctx, st) : A.schedule(ctx, st))); }
    catch (e) { await st.set(p, { state: e.kind === 'not_sent' ? st.p(p).state : 'AMBIGUOUS' }, { step: mode, error: e.message }); out.result = { stop: true, reason: e.message }; }
    out.state = st.p(p).state;
  }
  if (mode === 'check-auth' && flag('--execute')) report.check_auth_failures = await authFailures({ report, targets, http, META, L });
  if (mode === 'report') {
    const chosen = Object.entries(report.platforms).filter(([, v]) => v.requested);
    const before = L.publishAt && L.now < L.publishAt;
    report.final = { stage: before ? 'before publish_at (preparation only)' : 'after publish_at', all_verified: !before && chosen.length > 0 && chosen.every(([, v]) => v.final && v.final.verified),
      all_prepared: before ? chosen.length > 0 && chosen.every(([, v]) => v.final && v.final.prepared) : undefined,
      channels: Object.fromEntries(chosen.map(([k, v]) => [k, v.final || { verified: false, reason: (v.result && v.result.reason) || 'not checked' }])) };
    if (execute) fs.writeFileSync(path.join(path.dirname(L.stateFile), 'publish_result.json'), JSON.stringify(C.redact({ episode: report.episode, at: report.at, schedule: report.schedule, ...report.final }), null, 2) + '\n');
  }
  const code = Object.values(report.platforms).some(x => x.result && x.result.stop) || (report.check_auth_failures || []).length || (report.final && !(report.final.all_verified || report.final.all_prepared)) ? 2 : 0;
  return { report: C.redact(report), code };
}
function main() {
  const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; }, flag = f => a.includes(f);
  const mode = a.find(x => MODES.includes(x)), cfgFile = opt('--config');
  if (!mode || !cfgFile) { console.error(`usage: publish.js --config <publish_config.json> <${MODES.join('|')}> [--platform p] [--execute]`); process.exit(3); }
  // GitHub Actions: META_TOKEN (repository secret) is added as "Authorization: Bearer" on graph.facebook.com only — what the Claude-cloud
  // egress proxy does with its network secret. The value stays in this process; every output goes through redact().
  const META = process.env.META_TOKEN || '';
  const base = C.makeTransport({ timeoutMs: +(opt('--timeout-ms', 300000)) });
  const http = META ? require('./cloud/support').withGraphAuth(base, META) : base;
  // GitHub Actions: STATE_SYNC = script that commits + pushes publish_state.json; run on EVERY state change (intent before a request, ID right after)
  const onSave = process.env.STATE_SYNC ? () => require('child_process').execFileSync('bash', [process.env.STATE_SYNC, `${mode}`], { stdio: ['ignore', 2, 2] }) : null;
  runMode({ cfgFile, mode, only: opt('--platform') || null, execute: flag('--execute'), now: opt('--now') ? new Date(opt('--now')) : new Date(), http, META, onSave }).then(({ report, code }) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.final && process.env.GITHUB_STEP_SUMMARY) {
      const L = [`### ${report.episode}: hasil akhir per kanal`, '', '| Kanal | Terverifikasi | State | Permalink | Alasan |', '|---|---|---|---|---|'];
      for (const [k, v] of Object.entries(report.final.channels)) L.push(`| ${k} | ${v.verified ? 'YA' : 'TIDAK'} | ${v.state || '-'} | ${v.permalink || '-'} | ${v.reason || '-'} |`);
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, L.join('\n') + '\n');
    }
    process.exit(code);
  }, e => { console.error(C.redact(String(e && e.stack || e))); process.exit(2); });
}
module.exports = { load, runMode, MODES };
if (require.main === module) {
  // Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 (Node ≥ 22.21); re-exec once so every request uses the egress proxy
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
    const r = require('child_process').spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 2);
  } else main();
}
