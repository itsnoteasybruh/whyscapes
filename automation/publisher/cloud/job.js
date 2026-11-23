#!/usr/bin/env node
// Whyscape publisher — Cloud Run Job entrypoint. Triggered ONLY by Cloud Scheduler (time zone Asia/Jakarta), never by a Claude session.
//   node cloud/job.js tick            every 30 min: Facebook Reels schedule, Instagram prepare, verify
// Pilot scope: Meta only (Facebook Reels + Instagram Reels). YouTube is managed manually in YouTube Studio.
//   node cloud/job.js publish-window [--episode ID]  started by one-shot Cloud Tasks at publish_at (+5 min backup): Instagram media_publish
//                     inside [publish_at, +20 min]. Any publish time works; there is no fixed daily window.
//   node cloud/job.js report [--episode ID]  one-shot Cloud Tasks at publish_at + 15 / + 60 min, plus a daily summary (23:55 WIB):
//                     read back every platform, write reports/<date>/<ID>.json, alert on anything not done
// Acts ONLY on episodes that have a creator approval object episodes/<ID>/approval.json in the bucket whose file hashes match the
// stored files, that are not on hold, and whose final MP4 is ≤ 90 s. No approval → nothing happens. Secrets come from Secret
// Manager API at runtime; nothing secret is logged (all log lines pass through core.redact).
const fs = require('fs'), os = require('os'), path = require('path');
const C = require('../core'), F = require('../../format_rules');
const T = require('./tasks'), G = require('./gcp'), { CloudState, acquireLease, releaseLease } = require('./state'), { plan } = require('./planner'), S = require('./support');
const ADAPTERS = { facebook: require('../facebook'), instagram: require('../instagram') };
const PLATFORMS = Object.keys(ADAPTERS);

// ---------- approval (written by the creator with cloud/approve.js; Claude never writes one) ----------
function validateApproval(a, id) {
  const p = [];
  if (!a || a.schema !== 1) return ['approval.json missing or wrong schema'];
  if (a.episode !== id) p.push(`approval is for ${a.episode}, not ${id}`);
  for (const k of ['approved_by', 'approved_at', 'publish_at_wib']) if (!a[k]) p.push(`approval has no ${k}`);
  const at = C.parseWIB(a.publish_at_wib); if (!at) p.push(`publish_at_wib "${a.publish_at_wib}" is not "YYYY-MM-DD HH:MM" WIB`);
  if (!Array.isArray(a.platforms) || !a.platforms.length || a.platforms.some(x => !PLATFORMS.includes(x))) p.push('approval.platforms must be a subset of facebook, instagram (pilot scope: Meta only)');
  for (const k of ['video', 'post', 'thumbnail']) if (!a.files || !a.files[k] || !a.files[k].object || !/^[0-9a-f]{64}$/.test(a.files[k].sha256 || '')) p.push(`approval.files.${k} needs object + sha256`);
  return p;
}

async function runEpisode({ id, approval, mode, now, store, http, httpGraph, signer, auth, log, tmp, tasksCfg = null, tasksAuth = null, creds = { meta: true } }) {
  const L = log.child({ episode: id }), report = { episode: id, mode, at: C.timeEvidence(now), platforms: {}, alerts: [] };
  const alert = (platform, reason) => { report.alerts.push({ platform, reason }); L.error('alert', { platform, reason }); };
  const probs = validateApproval(approval, id);
  if (probs.length) { probs.forEach(r => alert('*', r)); return report; }
  const publishAt = C.parseWIB(approval.publish_at_wib); approval.publish_at_utc = publishAt.toISOString();
  report.schedule = C.timeEvidence(publishAt);
  const lease = await acquireLease(store, id, `${process.env.CLOUD_RUN_EXECUTION || 'local'}:${mode}`);
  if (!lease) { L.warn('episode busy (lease held by another execution); skipped'); report.skipped = 'busy'; return report; }
  try {
    const st = await new CloudState(store, id).load();
    const actions = plan({ approval, states: st.data.platforms, now, mode });
    report.actions = actions;
    for (const a of actions.filter(x => x.action === 'alert')) alert(a.platform, a.reason);
    const work = actions.filter(x => ['schedule', 'prepare', 'publish', 'verify'].includes(x.action));
    if (!work.length) return report;
    // assets: download, verify the creator-approved hashes, measure the final MP4 (format baku) — before ANY platform call
    const dir = fs.mkdtempSync(path.join(tmp, `${id}-`)), local = {};
    for (const k of ['video', 'post', 'thumbnail']) {
      local[k] = await store.download(approval.files[k].object, path.join(dir, path.basename(approval.files[k].object)));
      if (C.sha256(local[k]) !== approval.files[k].sha256) { alert('*', `${k} in the bucket does not match the approved sha256: nothing done`); return report; }
    }
    const video = { path: local.video, ...C.probe(local.video) }, fmt = F.checkFinal(video.duration);
    report.video = { duration_s: video.duration, size: video.size, wh: `${video.width}x${video.height}`, format: fmt.msg };
    if (!fmt.ok) { alert('*', fmt.msg); return report; }
    const post = C.readPost(local.post);
    if (!post.title || !post.caption) { alert('*', 'POST.md has no title or caption'); return report; }
    const thumbs = {
      facebook: thumbFor(local.thumbnail, dir, ['png', 'jpg', 'jpeg'], 'png'),
      instagram: thumbFor(local.thumbnail, dir, ['jpg', 'jpeg'], 'jpeg') };
    const st0 = st;
    for (const a of work) {
      const A = ADAPTERS[a.platform], PL = L.child({ platform: a.platform, action: a.action });
      if (!creds.meta) { alert(a.platform, 'credentials not configured in Secret Manager (meta-token); nothing sent'); continue; }
      const cfg = { ...(approval[a.platform] || {}), declarations: (approval.declarations || {})[a.platform] };
      const ctx = { cfg, video, videoSha: approval.files.video.sha256, post, publishAt, now, thumb: thumbs[a.platform], http: httpGraph,
        auth, sleep: ms => new Promise(r => setTimeout(r, ms)) };
      if (a.platform === 'instagram' && a.action === 'prepare') {           // Meta fetches both by URL: short-lived V4 signed URLs, bucket stays private
        const coverObj = `work/${id}/cover_instagram.jpg`; await store.putBytes(coverObj, fs.readFileSync(thumbs.instagram.path), 'image/jpeg');
        ctx.cfg.public_video_url = (await G.signedUrl({ bucket: store.bucket, object: approval.files.video.object, email: await auth.email(), now, expiresS: 7200 }, signer)).url;
        ctx.cfg.public_cover_url = (await G.signedUrl({ bucket: store.bucket, object: coverObj, email: await auth.email(), now, expiresS: 7200 }, signer)).url;
      }
      if (a.action !== 'verify') {
        const blockers = A.gate(ctx, a.action === 'publish' ? 'publish' : undefined);
        if (blockers.length) { await st0.set(a.platform, { state: st0.p(a.platform).state === 'NOT_STARTED' ? 'BLOCKED' : st0.p(a.platform).state, blockers }, { step: 'gate' }); blockers.forEach(b => alert(a.platform, b)); continue; }
      }
      try {
        const fn = a.action === 'verify' ? A.verify : a.action === 'publish' ? A.publish : A.schedule;   // instagram.schedule = prepare
        const res = C.redact(await fn(ctx, st0));
        report.platforms[a.platform] = { action: a.action, result: res, state: st0.p(a.platform).state, evidence: st0.p(a.platform).evidence || null, url: st0.p(a.platform).url || null };
        // Instagram has no native scheduling: once the container is FINISHED, enqueue the one-shot publish triggers (idempotent IDs)
        if (a.platform === 'instagram' && a.action === 'prepare' && st0.p('instagram').container_status === 'FINISHED' && tasksCfg) {
          const tk = await T.ensureIgPublishTasks({ ...tasksCfg, http, auth: tasksAuth, episode: id, publishAt });
          await st0.set('instagram', { publish_triggers: tk.map(x => ({ id: x.id, at: x.at })) }, { step: 'publish-triggers', created: tk.filter(x => x.created).length });
          report.platforms.instagram.publish_triggers = tk;
        }
        PL.info('done', { state: st0.p(a.platform).state, stop: res && res.stop ? res.reason : undefined });
        if (st0.p(a.platform).state === 'AMBIGUOUS') alert(a.platform, 'AMBIGUOUS after this run: no automatic retry; reconcile/creator decision needed');
      } catch (e) {
        if (e.conflict) { alert(a.platform, 'state changed concurrently (412); stopped without retry'); break; }
        alert(a.platform, `error: ${C.redact(e.message)}`);
      }
    }
    // post-publish verification trigger (idempotent): once anything is scheduled/prepared for this episode
    if (tasksCfg && mode === 'tick' && Object.values(st0.data.platforms).some(p => ['SCHEDULED', 'CREATED'].includes(p.state)) && !st0.data.verify_triggers) {
      const vt = await T.ensureVerifyTasks({ ...tasksCfg, http, auth: tasksAuth, episode: id, publishAt });
      await st0.setTop({ verify_triggers: vt.map(x => ({ id: x.id, at: x.at })) });
      report.verify_triggers = vt;
    }
    return report;
  } finally {
    await releaseLease(store, lease);
  }
}
function thumbFor(src, dir, okExt, fmt) {
  const ext = path.extname(src).slice(1).toLowerCase();
  if (okExt.includes(ext)) return { path: src, ext, mime: ext === 'png' ? 'image/png' : 'image/jpeg', conversion: null };
  const conv = C.convertImage(src, path.join(dir, `thumb_${fmt}.${fmt === 'jpeg' ? 'jpg' : fmt}`), fmt);
  return { path: conv.to, ext: fmt === 'jpeg' ? 'jpg' : fmt, mime: `image/${fmt}`, conversion: conv };
}

async function runJob({ mode, now = new Date(), store, http, httpGraph, signer, auth, log, tmp = os.tmpdir(), only = null, tasksCfg = null, tasksAuth = null, creds = { meta: true } }) {
  if (!['tick', 'publish-window', 'report'].includes(mode)) throw new Error('mode must be tick | publish-window | report');
  const items = await store.list('episodes/');
  const ids = items.map(i => (i.name.match(/^episodes\/([^/]+)\/approval\.json$/) || [])[1]).filter(Boolean).filter(x => !only || x === only);
  log.info('run', { mode, approvals: ids.length, now: C.timeEvidence(now) });
  const reports = [];
  for (const id of ids) {
    const ap = await store.getJSON(`episodes/${id}/approval.json`);
    const r = await runEpisode({ id, approval: ap && ap.json, mode, now, store, http, httpGraph, signer, auth, log, tmp, tasksCfg, tasksAuth, creds });
    reports.push(r);
    const day = C.wibISO(now).slice(0, 10), name = `reports/${day}/${id}_${mode}.json`, cur = await store.getJSON(name);
    try { await store.putJSON(name, r, cur ? cur.generation : '0'); } catch (e) { log.warn('report write raced; skipped', { episode: id }); }
  }
  const alerts = reports.reduce((n, r) => n + r.alerts.length, 0);
  log[alerts ? 'error' : 'info']('run finished', { mode, episodes: ids.length, alerts });
  return { reports, alerts };
}

module.exports = { runJob, runEpisode, validateApproval };

if (require.main === module) {
  const mode = process.argv[2], log = S.logger({ component: 'whyscape-publisher' });
  (async () => {
    if (!process.env.WHYSCAPE_BUCKET) throw new Error('WHYSCAPE_BUCKET not set');
    const http = C.makeTransport({ timeoutMs: 600000 }), auth = G.metadataAuth(http), store = G.storage(http, auth, process.env.WHYSCAPE_BUCKET);
    const P = process.env.GCP_PROJECT, sec = n => G.accessSecret(http, auth, P, n);
    const meta = await sec('meta-token');
    if (!meta) log.warn('secret not configured yet', { secret: 'meta-token' });
    const jobAuth = { email: auth.email };
    const i = process.argv.indexOf('--episode'), only = i > 0 ? process.argv[i + 1] : null;
    const E = process.env, tasksCfg = E.TASKS_QUEUE ? { project: E.GCP_PROJECT, region: E.GCP_REGION, queue: E.TASKS_QUEUE, job: E.JOB_NAME || 'whyscape-publisher', triggerSa: E.TRIGGER_SA } : null;
    const res = await runJob({ mode, store, http, httpGraph: S.withGraphAuth(http, meta), signer: G.iamSigner(http, auth), auth: jobAuth, log, only, tasksCfg, tasksAuth: auth, creds: { meta: !!meta } });
    process.exitCode = res.alerts ? 1 : 0;                 // a failed execution is visible in Cloud Run + alerting; max-retries is 0
  })().catch(e => { log.error('run crashed', { error: C.redact(String(e && e.stack || e)) }); process.exitCode = 1; });
}
