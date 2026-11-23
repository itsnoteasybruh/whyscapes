// Facebook Page Reels adapter (Reels Publishing API, Graph v27.0). Source (fetched 2026-11-22, ./sources/meta_reels_publishing_2026-11-22.md):
//   POST /{page-id}/video_reels upload_phase=start → video_id; bytes to rupload.facebook.com/video-upload/v27.0/{video_id}
//   (header "Authorization: OAuth <page token>", offset/file_size, resumable); GET /{video_id}?fields=status;
//   POST /{page-id}/video_reels upload_phase=finish video_state=SCHEDULED scheduled_publish_time (unix, > 10 min ahead, ≤ 29 days);
//   custom cover /{video_id}/thumbnails; duration 3–90 s (error 1363128); 30 API posts / 24 h; status values "completed"
//   (examples also show "complete"); publishing_phase.publish_status ∈ draft|error|published|scheduled, publish_time = unix.
// AUTH (22 Nov 2026): the environment's network secret injects the USER token as the Authorization header on graph.facebook.com
// (the proxy REPLACES any Authorization header we send there). The Reels endpoints need a PAGE token: it is derived in-process
// with GET /{page-id}?fields=access_token, kept only in a closure, sent as the access_token parameter (which Graph prefers over the
// injected header — verified 22 Nov: GET /me with it returns the Page id) and as "OAuth" header on rupload.facebook.com.
// It is never printed, logged, written to state, or returned.
// Idempotency: video_id exists from the start call → stored at once; bytes resume by offset on the same video_id; finish is never
// re-sent without reading status first.
const fs = require('fs');
const { createOutcome } = require('./core');
const V = 'v27.0', G = `https://graph.facebook.com/${V}`, RU = `https://rupload.facebook.com/video-upload/${V}`;
const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
const DONE = s => ['complete', 'completed'].includes(s);
const REQUIRED_PERMS = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];

// in-process Page token: one derivation per run; the value never leaves this closure
function pageTokenFor(ctx) {
  let pending = null;
  return () => pending || (pending = (async () => {
    const r = await ctx.http('GET', `${G}/${ctx.cfg.page_id}?fields=access_token`, {});
    const t = r.ok && r.json && r.json.access_token;
    if (typeof t !== 'string' || t.length < 20) throw Object.assign(new Error(`could not derive the Page token (HTTP ${r.status})`), { kind: 'not_sent' });
    return t;
  })());
}
const pt = ctx => (ctx._pageToken || Object.defineProperty(ctx, '_pageToken', { value: pageTokenFor(ctx), enumerable: false })._pageToken)();

function gate(ctx) {
  const r = [];
  if (!ctx.cfg.page_id) r.push('Facebook Page ID not configured');
  if (typeof (ctx.cfg.declarations || {}).is_ai_generated !== 'boolean') r.push('creator declaration "is_ai_generated" (true/false) is missing');
  if (ctx.video.duration < 3 || ctx.video.duration > 90) r.push(`video is ${ctx.video.duration}s: the implemented endpoint (Reels Publishing API, /{page-id}/video_reels) accepts 3–90 s (Meta error 1363128). The video is not changed; the creator decides the format/flow`);
  const lead = (ctx.publishAt - ctx.now) / 60e3;
  if (lead <= 10) r.push(`publish time is ${lead.toFixed(1)} min ahead; Meta requires > 10 min`);
  if (lead > 29 * 24 * 60) r.push('publish time is more than 29 days ahead');
  if (!ctx.thumb) r.push('no thumbnail file from the creator');
  return r;
}
// read-only: page readable with the injected token, Page token derivable and recognised as the Page, permissions granted
async function checkAuth(ctx) {
  const out = { ok: false, checks: {} };
  const page = await ctx.http('GET', `${G}/${ctx.cfg.page_id}?fields=id,name`, {});
  out.checks.page_readable = !!(page.ok && page.json && page.json.id === ctx.cfg.page_id);
  if (out.checks.page_readable) out.account = { page_id: page.json.id, name: page.json.name };
  const perms = await ctx.http('GET', `${G}/me/permissions`, {});
  const granted = perms.ok ? (perms.json.data || []).filter(p => p.status === 'granted').map(p => p.permission) : [];
  out.checks.missing_permissions = REQUIRED_PERMS.filter(p => !granted.includes(p));
  try {
    const t = await pt(ctx);
    const me = await ctx.http('GET', `${G}/me?${form({ fields: 'id', access_token: t })}`, {});
    out.checks.page_token_derived = true; out.checks.page_token_is_page = !!(me.ok && me.json && me.json.id === ctx.cfg.page_id);
  } catch (e) { out.checks.page_token_derived = false; out.detail = e.message; }
  out.ok = out.checks.page_readable && !out.checks.missing_permissions.length && out.checks.page_token_is_page === true;
  return out;
}
async function reconcile(ctx, p) {
  const r = await ctx.http('GET', `${G}/${ctx.cfg.page_id}/video_reels?${form({ fields: 'id,description,created_time,status', limit: 25, access_token: await pt(ctx) })}`, {});
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const since = new Date(new Date(p.intent_at).getTime() - 10 * 60e3);
  return { matches: (r.json.data || []).filter(v => new Date(v.created_time) >= since && (!v.description || v.description === ctx.post.text)).map(v => ({ id: v.id, at: v.created_time })) };
}
const status = async (ctx, id) => { const r = await ctx.http('GET', `${G}/${id}?${form({ fields: 'status,permalink_url', access_token: await pt(ctx) })}`, {}); return r.ok ? r.json : { error: `HTTP ${r.status}` }; };

async function schedule(ctx, st) {
  let p = st.p('facebook');
  if (['SCHEDULED', 'PUBLISHED'].includes(p.state)) return verify(ctx, st);
  if (p.state === 'AMBIGUOUS') return { stop: true, reason: 'previous create had an unknown outcome; reconcile (GET) required before any retry' };
  // intent recorded but no video_id: the run stopped after (or during) the start request → never re-send blindly
  if (p.state === 'CREATING' && !p.remote_id) { await st.set('facebook', { state: 'AMBIGUOUS' }, { step: 'resume', note: 'intent without video_id from an earlier run; reconcile (GET) first' }); return { stop: true, reason: 'intent without video_id: reconcile (GET) required' }; }
  const token = await pt(ctx);                                    // fails closed (not_sent) before anything is created
  if (!p.remote_id) {
    await st.set('facebook', { state: 'CREATING', intent_at: new Date().toISOString(), file_sha256: ctx.videoSha, publish_at: ctx.publishAt.toISOString() }, { step: 'intent' });
    let r;
    try { r = await ctx.http('POST', `${G}/${ctx.cfg.page_id}/video_reels`, { body: form({ upload_phase: 'start', access_token: token }) }); }
    catch (e) { await st.set('facebook', { state: e.kind === 'not_sent' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'start', error: e.message }); return { stop: true, reason: e.message }; }
    const out = createOutcome(r);
    if (out !== 'done' || !r.json || !r.json.video_id) { await st.set('facebook', { state: out === 'rejected' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'start', http: r.status, error: r.json && r.json.error && r.json.error.message }); return { stop: true, reason: `start HTTP ${r.status}` }; }
    p = await st.set('facebook', { state: 'CREATED', remote_id: r.json.video_id }, { step: 'start', video_id: r.json.video_id });
  }
  // bytes: resume from what Meta already has (rupload.facebook.com — no network secret there; Page token sent by us)
  const s0 = await status(ctx, p.remote_id), up = (s0.status && s0.status.uploading_phase) || {}, have = +(up.bytes_transfered || 0);
  if (!DONE(up.status)) {
    const buf = fs.readFileSync(ctx.video.path);
    try {
      const r = await ctx.http('POST', `${RU}/${p.remote_id}`, { headers: { Authorization: `OAuth ${token}`, offset: String(have), file_size: String(buf.length) }, body: buf.subarray(have) });
      await st.set('facebook', {}, { step: 'upload', http: r.status, from_byte: have });
      if (!r.ok) return { stop: true, reason: `upload HTTP ${r.status}` };
    } catch (e) { await st.set('facebook', {}, { step: 'upload', error: e.message, note: 'same video_id; next run resumes by offset' }); return { stop: true, reason: e.kind === 'not_sent' ? `upload host not reachable: ${e.message}` : 'upload interrupted; resumable' }; }
  }
  if (p.thumbnail !== 'set') {
    const fd = new FormData(); fd.append('access_token', token); fd.append('is_preferred', 'true'); fd.append('source', new Blob([fs.readFileSync(ctx.thumb.path)], { type: ctx.thumb.mime }), 'thumbnail.' + ctx.thumb.ext);
    const r = await ctx.http('POST', `${G}/${p.remote_id}/thumbnails`, { body: fd });
    await st.set('facebook', { thumbnail: r.ok ? 'set' : 'failed' }, { step: 'thumbnail', http: r.status });
    if (!r.ok) return { stop: true, reason: `cover (thumbnail) upload failed: HTTP ${r.status}; the Reel is NOT scheduled` };   // never schedule without the creator's cover
  }
  // finish → SCHEDULED, only if Meta does not already show it scheduled/published
  const s1 = await status(ctx, p.remote_id), pub = (s1.status && s1.status.publishing_phase) || {};
  if (!(['scheduled', 'published'].includes(pub.publish_status) || DONE(pub.status) || pub.status === 'in_progress')) {
    let r;
    try { r = await ctx.http('POST', `${G}/${ctx.cfg.page_id}/video_reels`, { body: form({ upload_phase: 'finish', video_id: p.remote_id, video_state: 'SCHEDULED', scheduled_publish_time: Math.floor(ctx.publishAt / 1000), description: ctx.post.text, title: ctx.post.title, is_ai_generated: ctx.cfg.declarations.is_ai_generated, access_token: token }) }); }
    catch (e) { await st.set('facebook', {}, { step: 'finish', error: e.message, note: 'read status before any new finish' }); return verify(ctx, st); }
    await st.set('facebook', {}, { step: 'finish', http: r.status, error: r.json && r.json.error && r.json.error.message });
  }
  return verify(ctx, st);
}
async function verify(ctx, st) {
  const p = st.p('facebook'); if (!p.remote_id) return { stop: true, reason: 'nothing uploaded' };
  const s = await status(ctx, p.remote_id); if (s.error) return { stop: true, reason: 'read-back failed: ' + s.error };
  const ph = (s.status || {}).publishing_phase || {}, vs = (s.status || {}).video_status;
  let state = p.state;
  if (ph.publish_status === 'published') state = 'PUBLISHED';
  else if (ph.publish_status === 'scheduled' && ph.publish_time) state = 'SCHEDULED';
  const want = Math.floor(ctx.publishAt / 1000), got = ph.publish_time ? +ph.publish_time : null;
  // cover read-back: the Reel must carry a preferred custom thumbnail (the one this system uploaded)
  const th = await ctx.http('GET', `${G}/${p.remote_id}/thumbnails?${form({ fields: 'id,is_preferred', access_token: await pt(ctx) })}`, {});
  const coverOk = p.thumbnail === 'set' && th.ok && ((th.json && th.json.data) || []).some(x => x.is_preferred);
  const evidence = { video_id: p.remote_id, video_status: vs, publish_status: ph.publish_status || null, publish_time_unix: got, publish_time_wib: got ? require('./core').wibISO(new Date(got * 1000)) : null, publish_time_matches: got === want, cover_preferred: coverOk, permalink_url: s.permalink_url || null, checked_at: new Date().toISOString() };
  await st.set('facebook', { state, url: s.permalink_url || `https://www.facebook.com/reel/${p.remote_id}`, evidence }, { step: 'verify', video_status: vs, publish_status: ph.publish_status, publish_time: got, cover_preferred: coverOk });
  const fail = [];
  if (state === 'SCHEDULED' && got !== want) fail.push(`publish_time ${evidence.publish_time_wib} ≠ ${require('./core').wibISO(ctx.publishAt)}`);
  if (['SCHEDULED', 'PUBLISHED'].includes(state) && !coverOk) fail.push('cover not confirmed (no preferred custom thumbnail)');
  if (state !== 'SCHEDULED' && state !== 'PUBLISHED') fail.push(`state is ${state}, not SCHEDULED`);
  return fail.length ? { stop: true, reason: 'verify failed: ' + fail.join('; '), state, evidence } : { state, evidence };
}
module.exports = { name: 'facebook', gate, checkAuth, reconcile, schedule, verify, REQUIRED_PERMS };
