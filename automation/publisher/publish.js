#!/usr/bin/env node
// Whyscape publisher CLI. Default is a DRY plan: nothing is sent to any platform without --execute.
//   node automation/publisher/publish.js --config outputs/WS-EP14/publish_config.json <mode> [--platform youtube|facebook|instagram] [--execute]
// modes:
//   plan        gates + exactly what would be sent (redacted), per platform. No network.
//   check-auth  read-only identity call per platform (proves "account authorised"). No content is created.
//   schedule    YouTube: upload private + publishAt + thumbnail · Facebook: Reel SCHEDULED · Instagram: prepare container (no native schedule)
//   publish     Instagram only, inside the publish window (the routine calls it at publish_at)
//   verify      read back every platform that has an ID; updates state with evidence
//   reconcile   look for an upload this system may already have made (after an AMBIGUOUS outcome); adopts exactly one match, never more
// State: <outputs>/<id>/publish_state.json (committed) + publish_state.local.json (never committed). Exit 0 ok, 2 blocked/stop, 3 usage.
const fs = require('fs'), path = require('path');
const C = require('./core');
const ADAPTERS = { youtube: require('./youtube'), facebook: require('./facebook'), instagram: require('./instagram') };
function load(cfgFile, { now = new Date() } = {}) {
  const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')), root = path.resolve(path.dirname(cfgFile), cfg.root || '../..'), R = p => path.resolve(root, p);
  const problems = [];
  const videoPath = R(cfg.video.path), video = { path: videoPath, ...C.probe(videoPath) };
  const videoMd5 = C.md5(videoPath), videoSha = C.sha256(videoPath);
  if (cfg.video.expected_md5 && videoMd5 !== cfg.video.expected_md5) problems.push(`video md5 ${videoMd5} ≠ the QC-passed ${cfg.video.expected_md5}`);
  if (cfg.video.qc !== 'PASS') problems.push('video has no QC PASS recorded');
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
    for (const [p, fmt] of [['youtube', ['png', 'jpg', 'jpeg'].includes(ext) ? null : 'png'], ['facebook', ['png', 'jpg', 'jpeg'].includes(ext) ? null : 'png'], ['instagram', ['jpg', 'jpeg'].includes(ext) ? null : 'jpeg']]) {
      if (!fmt) { thumbs[p] = { path: thumbSrc, ext, mime: ext === 'png' ? 'image/png' : 'image/jpeg', conversion: null }; continue; }
      const dest = path.join(work, `thumbnail_${p}.${fmt === 'jpeg' ? 'jpg' : 'png'}`), conv = C.convertImage(thumbSrc, dest, fmt);
      thumbs[p] = { path: dest, ext: fmt === 'jpeg' ? 'jpg' : 'png', mime: `image/${fmt}`, conversion: conv };
    }
  }
  return { cfg, root, video, videoMd5, videoSha, post, publishAt, sched, platforms, thumbs, problems, now, stateFile: path.join(path.dirname(path.resolve(cfgFile)), 'publish_state.json') };
}

function main() {
const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; }, flag = f => a.includes(f);
const MODES = ['plan', 'check-auth', 'schedule', 'publish', 'verify', 'reconcile'];
const mode = a.find(x => MODES.includes(x)), cfgFile = opt('--config');
if (!mode || !cfgFile) { console.error(`usage: publish.js --config <publish_config.json> <${MODES.join('|')}> [--platform p] [--execute]`); process.exit(3); }

(async () => {
  const L = load(cfgFile, { now: opt('--now') ? new Date(opt('--now')) : new Date() });
  const st = new C.State(L.stateFile, L.cfg.episode), http = C.makeTransport({ timeoutMs: +(opt('--timeout-ms', 300000)) });
  const only = opt('--platform'), targets = Object.keys(ADAPTERS).filter(p => (!only || p === only));
  const report = { episode: L.cfg.episode, mode, executed: flag('--execute'), at: C.timeEvidence(L.now), video: { path: path.relative(L.root, L.video.path), md5: L.videoMd5, duration_s: L.video.duration, size: L.video.size, wh: `${L.video.width}x${L.video.height}` },
    schedule: L.publishAt ? { ...C.timeEvidence(L.publishAt), source: L.sched.source } : null, episode_problems: L.problems, platforms: {} };
  for (const p of targets) {
    const A = ADAPTERS[p], pc = (L.cfg.platforms || {})[p] || {};
    const ctx = { cfg: pc, video: L.video, videoSha: L.videoSha, post: L.post, publishAt: L.publishAt, now: L.now, thumb: L.thumbs[p] || null, http, sleep: ms => new Promise(r => setTimeout(r, ms)) };
    const requested = L.platforms.includes(p) && pc.enabled !== false;
    const blockers = [...L.problems, ...(requested ? [] : [`${p} is not among the creator's platforms`]), ...(L.publishAt ? A.gate(ctx, mode) : [])];
    const out = report.platforms[p] = { requested, blockers, state: st.p(p).state, thumbnail: ctx.thumb ? { file: path.relative(L.root, ctx.thumb.path), conversion: ctx.thumb.conversion && { ...ctx.thumb.conversion, to: path.relative(L.root, ctx.thumb.conversion.to) } } : null };
    if (mode === 'plan') {
      out.would_send = p === 'youtube' && blockers.length === 0 ? C.redact(A.metadata(ctx)) : { title: L.post.title, text: L.post.text };
      continue;
    }
    if (mode === 'check-auth') { if (!flag('--execute')) { out.note = 'dry run: add --execute to call the read-only identity endpoint'; continue; } try { out.auth = await A.checkAuth(ctx); } catch (e) { out.auth = { ok: false, detail: e.message }; } continue; }
    if (!flag('--execute')) { out.note = 'dry run: nothing sent (add --execute)'; continue; }
    if (mode === 'verify') { out.result = C.redact(await A.verify(ctx, st)); continue; }
    if (mode === 'reconcile') {
      const pst = st.p(p); if (!['AMBIGUOUS', 'CREATING'].includes(pst.state)) { out.result = { note: `state ${pst.state}: nothing to reconcile` }; continue; }
      const m = await A.reconcile(ctx, pst); out.result = C.redact(m);
      if (m.matches && m.matches.length === 1) st.set(p, { state: p === 'instagram' ? 'PUBLISHED' : 'CREATED', remote_id: m.matches[0].id }, { step: 'reconcile-adopt', id: m.matches[0].id });
      else st.set(p, { state: 'AMBIGUOUS' }, { step: 'reconcile', found: m.matches ? m.matches.length : 'error', note: 'no automatic retry; a creator instruction decides' });
      continue;
    }
    if (blockers.length) { out.result = { stop: true, reason: 'blocked', blockers }; st.set(p, { state: ['NOT_STARTED', 'BLOCKED'].includes(st.p(p).state) ? 'BLOCKED' : st.p(p).state, blockers }, { step: 'gate' }); continue; }
    if (mode === 'publish' && p !== 'instagram') { out.result = { note: 'publish mode is only for Instagram; other platforms publish by their own schedule' }; continue; }
    try { out.result = C.redact(await (mode === 'publish' ? A.publish(ctx, st) : A.schedule(ctx, st))); }
    catch (e) { st.set(p, { state: e.kind === 'not_sent' ? st.p(p).state : 'AMBIGUOUS' }, { step: mode, error: e.message }); out.result = { stop: true, reason: e.message }; }
    out.state = st.p(p).state;
  }
  console.log(JSON.stringify(C.redact(report), null, 2));
  process.exit(Object.values(report.platforms).some(x => x.result && x.result.stop) ? 2 : 0);
})().catch(e => { console.error(C.redact(String(e && e.stack || e))); process.exit(2); });
}
module.exports = { load };
if (require.main === module) {
  // Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 (Node ≥ 22.21); re-exec once so every request uses the egress proxy
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
    const r = require('child_process').spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
    process.exit(r.status ?? 2);
  } else main();
}
