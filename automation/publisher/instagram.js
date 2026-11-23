// Instagram Reels adapter (Instagram Platform, Graph v27.0). Sources (fetched 2026-11-22, ./sources/meta_ig_*):
//   POST /{ig-user-id}/media media_type=REELS (video_url on a PUBLIC server, or upload_type=resumable + rupload.facebook.com/ig-api-upload);
//   cover_url = PUBLIC JPEG (≤ 8 MB, 9:16 recommended; overrides thumb_offset); Reels 3 s – 15 min; GET /{container}?fields=status_code
//   (EXPIRED, ERROR, FINISHED, IN_PROGRESS, PUBLISHED; poll ≤ once/min, ≤ 5 min); POST /{ig-user-id}/media_publish creation_id;
//   100 API posts / 24 h (GET /{ig-user-id}/content_publishing_limit). The docs describe NO scheduled-publish parameter.
// So "scheduling" on Instagram = prepare the container in advance, then media_publish at publish_at (run by the routine).
// AUTH (22 Nov 2026): graph.facebook.com calls carry NO token from this code — the environment's network secret injects the user
// token (instagram_basic + instagram_content_publish granted). Resumable upload is NOT used: it needs "Authorization: OAuth <user
// token>" on rupload.facebook.com, and that value only exists inside the proxy for graph.facebook.com. Video and cover therefore go
// by PUBLIC URL (video_url / cover_url), as the docs require.
// Idempotency: container id stored at once; media_publish is never repeated if the container already says PUBLISHED.
const { createOutcome } = require('./core');
const V = 'v27.0', G = `https://graph.facebook.com/${V}`;
const tok = () => ({});                                  // token injected by the egress proxy (network secret on graph.facebook.com)
const REQUIRED_PERMS = ['instagram_basic', 'instagram_content_publish'];
const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
const PUBLISH_WINDOW_MIN = 20;

function gate(ctx, mode) {
  const r = [];
  if (!ctx.cfg.ig_user_id) r.push('Instagram professional account ID not configured');
  if (ctx.video.duration < 3 || ctx.video.duration > 900) r.push(`video is ${ctx.video.duration}s; Reels API accepts 3 s – 15 min`);
  if (!ctx.cfg.public_video_url) r.push('no PUBLIC URL for the MP4 (video_url must be fetchable by Meta; resumable upload would need the token on rupload.facebook.com, which only the proxy holds for graph.facebook.com)');
  if (!ctx.cfg.public_cover_url) r.push('no PUBLIC URL for the cover JPEG (cover_url); the creator thumbnail must be hosted publicly');
  if (mode === 'publish') { const m = (ctx.now - ctx.publishAt) / 60e3; if (m < 0 || m > PUBLISH_WINDOW_MIN) r.push(`publish runs only within ${PUBLISH_WINDOW_MIN} min after publish_at (now ${m.toFixed(1)} min)`); }
  return r;
}
async function checkAuth(ctx) {
  const out = { ok: false, checks: {} };
  const r = await ctx.http('GET', `${G}/${ctx.cfg.ig_user_id}?fields=id,username`, { headers: tok() });
  out.checks.ig_readable = !!(r.ok && r.json && r.json.id === ctx.cfg.ig_user_id); if (out.checks.ig_readable) out.account = { ig_user_id: r.json.id, username: r.json.username };
  const perms = await ctx.http('GET', `${G}/me/permissions`, { headers: tok() });
  const granted = perms.ok ? (perms.json.data || []).filter(p => p.status === 'granted').map(p => p.permission) : [];
  out.checks.missing_permissions = REQUIRED_PERMS.filter(p => !granted.includes(p));
  const q = await ctx.http('GET', `${G}/${ctx.cfg.ig_user_id}/content_publishing_limit?fields=config,quota_usage`, { headers: tok() });
  const d = q.ok && q.json && (q.json.data || [])[0]; out.checks.quota = d ? { used: d.quota_usage, total: d.config && d.config.quota_total, window_s: d.config && d.config.quota_duration } : null;
  out.ok = out.checks.ig_readable && !out.checks.missing_permissions.length;
  return out;
}
const container = async (ctx, id) => { const r = await ctx.http('GET', `${G}/${id}?fields=status_code,status`, { headers: tok() }); return r.ok ? r.json : { error: `HTTP ${r.status}` }; };
async function reconcile(ctx, p) {
  const r = await ctx.http('GET', `${G}/${ctx.cfg.ig_user_id}/media?fields=id,caption,timestamp,permalink,media_product_type&limit=25`, { headers: tok() });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const since = new Date(new Date(p.intent_at).getTime() - 10 * 60e3);
  return { matches: (r.json.data || []).filter(m => m.caption === ctx.post.text && new Date(m.timestamp) >= since).map(m => ({ id: m.id, at: m.timestamp, url: m.permalink })) };
}
// step 1 (any time before publish_at, container lives 24 h): create the container and wait for FINISHED
async function prepare(ctx, st) {
  let p = st.p('instagram');
  if (['PUBLISHED'].includes(p.state)) return verify(ctx, st);
  if (p.state === 'AMBIGUOUS') return { stop: true, reason: 'unknown outcome earlier; reconcile (GET) required' };
  if (p.state === 'CREATING' && !p.container_id) { await st.set('instagram', { state: 'AMBIGUOUS' }, { step: 'resume', note: 'intent without container_id from an earlier run; reconcile (GET) first' }); return { stop: true, reason: 'intent without container_id: reconcile (GET) required' }; }
  if (!p.container_id) {
    await st.set('instagram', { state: 'CREATING', intent_at: new Date().toISOString(), file_sha256: ctx.videoSha, publish_at: ctx.publishAt.toISOString() }, { step: 'intent' });
    let r;
    try { r = await ctx.http('POST', `${G}/${ctx.cfg.ig_user_id}/media`, { headers: tok(), body: form({ media_type: 'REELS', video_url: ctx.cfg.public_video_url, cover_url: ctx.cfg.public_cover_url, caption: ctx.post.text, share_to_feed: ctx.cfg.share_to_feed, is_ai_generated: (ctx.cfg.declarations || {}).is_ai_generated }) }); }   // AI self-disclosure (docs: is_ai_generated on the container)
    catch (e) { await st.set('instagram', { state: e.kind === 'not_sent' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'container', error: e.message, note: 'outcome unknown: stop; reconcile (GET) before a new container (an orphan container is not a post and expires in 24 h)' }); return { stop: true, reason: e.message }; }
    if (createOutcome(r) !== 'done' || !r.json || !r.json.id) { await st.set('instagram', { state: createOutcome(r) === 'ambiguous' ? 'AMBIGUOUS' : 'FAILED_DEFINITE' }, { step: 'container', http: r.status, error: r.json && r.json.error && r.json.error.message }); return { stop: true, reason: `container HTTP ${r.status}` }; }
    p = await st.set('instagram', { state: 'CREATED', container_id: r.json.id }, { step: 'container', container_id: r.json.id });
  }
  for (let i = 0; i < (ctx.pollTries ?? 5); i++) {
    const c = await container(ctx, p.container_id);
    if (c.status_code === 'FINISHED') { await st.set('instagram', { container_status: 'FINISHED' }, { step: 'container-status' }); return { state: 'CREATED', prepared: true, container_id: p.container_id, note: `ready; media_publish will run at ${ctx.publishAt.toISOString()} (Instagram API has no native scheduling)` }; }
    if (['ERROR', 'EXPIRED'].includes(c.status_code)) { await st.set('instagram', { state: 'FAILED_DEFINITE', container_id: null }, { step: 'container-status', status: c.status_code }); return { stop: true, reason: 'container ' + c.status_code }; }
    await ctx.sleep(ctx.pollMs ?? 60000);
  }
  return { stop: true, reason: 'container still processing; next run continues' };
}
// step 2 (inside the publish window): media_publish once
async function publish(ctx, st) {
  const p = st.p('instagram');
  if (p.state === 'PUBLISHED') return verify(ctx, st);
  if (!p.container_id || p.container_status !== 'FINISHED') return { stop: true, reason: 'container not prepared' };
  const c = await container(ctx, p.container_id);
  if (c.status_code === 'PUBLISHED') { const m = await reconcile(ctx, p); if (m.matches && m.matches.length === 1) { await st.set('instagram', { state: 'PUBLISHED', remote_id: m.matches[0].id, url: m.matches[0].url }, { step: 'adopt' }); return verify(ctx, st); } await st.set('instagram', { state: 'AMBIGUOUS' }, { step: 'publish', note: 'container PUBLISHED but media not uniquely found' }); return { stop: true, reason: 'ambiguous' }; }
  await st.set('instagram', { publish_attempted_at: new Date().toISOString() }, { step: 'publish-intent' });
  let r;
  try { r = await ctx.http('POST', `${G}/${ctx.cfg.ig_user_id}/media_publish`, { headers: tok(), body: form({ creation_id: p.container_id }) }); }
  catch (e) { await st.set('instagram', { state: e.kind === 'not_sent' ? 'CREATED' : 'AMBIGUOUS' }, { step: 'publish', error: e.message }); return { stop: true, reason: e.message }; }
  if (r.ok && r.json && r.json.id) { await st.set('instagram', { state: 'PUBLISHED', remote_id: r.json.id }, { step: 'publish', media_id: r.json.id }); return verify(ctx, st); }
  await st.set('instagram', { state: createOutcome(r) === 'rejected' ? 'CREATED' : 'AMBIGUOUS' }, { step: 'publish', http: r.status, error: r.json && r.json.error && r.json.error.message });
  return { stop: true, reason: `publish HTTP ${r.status}` };
}
async function verify(ctx, st) {
  const p = st.p('instagram');
  if (!p.remote_id) return { state: p.state, evidence: { container_id: p.container_id || null, container_status: p.container_status || null } };
  const r = await ctx.http('GET', `${G}/${p.remote_id}?fields=id,permalink,timestamp,media_product_type`, { headers: tok() });
  if (!r.ok) return { stop: true, reason: `read-back HTTP ${r.status}` };
  await st.set('instagram', { state: 'PUBLISHED', url: r.json.permalink, evidence: { media_id: r.json.id, permalink: r.json.permalink, timestamp: r.json.timestamp, type: r.json.media_product_type, checked_at: new Date().toISOString() } }, { step: 'verify' });
  return { state: 'PUBLISHED', evidence: st.p('instagram').evidence };
}
module.exports = { name: 'instagram', gate, checkAuth, reconcile, prepare, publish, verify, schedule: prepare };
