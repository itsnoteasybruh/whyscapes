// Facebook Page Reels adapter (Reels Publishing API, Graph v27.0). Source (fetched 2026-11-22, ./sources/meta_reels_publishing_2026-11-22.md):
//   POST /{page-id}/video_reels upload_phase=start → video_id; bytes to rupload.facebook.com/video-upload/v27.0/{video_id} (offset/resume);
//   GET /{video_id}?fields=status; POST /{page-id}/video_reels upload_phase=finish video_state=SCHEDULED scheduled_publish_time (unix,
//   > 10 min ahead and ≤ 29 days); custom cover via /{video_id}/thumbnails; duration 3–90 s (error 1363128); 30 API posts / 24 h;
//   Page access token with CREATE_CONTENT + pages_show_list, pages_read_engagement, pages_manage_posts. Field is_ai_generated (default false).
// Idempotency: video_id exists from the start call → stored at once; bytes resume by offset on the same video_id; finish is never
// re-sent without reading status first.
const fs = require('fs');
const { createOutcome } = require('./core');
const V = 'v27.0', G = `https://graph.facebook.com/${V}`, RU = `https://rupload.facebook.com/video-upload/${V}`;
const tok = () => process.env.META_PAGE_TOKEN ? { Authorization: `OAuth ${process.env.META_PAGE_TOKEN}` } : {};   // else injected by the egress proxy
const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));

function gate(ctx) {
  const r = [];
  if (!ctx.cfg.page_id) r.push('Facebook Page ID not configured');
  if (typeof (ctx.cfg.declarations || {}).is_ai_generated !== 'boolean') r.push('creator declaration "is_ai_generated" (true/false) is missing');
  if (ctx.video.duration < 3 || ctx.video.duration > 90) r.push(`video is ${ctx.video.duration}s: the Reels Publishing API accepts 3–90 s (Meta error 1363128). The video is not changed; the creator decides the format/flow`);
  const lead = (ctx.publishAt - ctx.now) / 60e3;
  if (lead <= 10) r.push(`publish time is ${lead.toFixed(1)} min ahead; Meta requires > 10 min`);
  if (lead > 29 * 24 * 60) r.push('publish time is more than 29 days ahead');
  if (!ctx.thumb) r.push('no thumbnail file from the creator');
  return r;
}
async function checkAuth(ctx) {
  const r = await ctx.http('GET', `${G}/${ctx.cfg.page_id}?fields=id,name`, { headers: tok() });
  return r.ok && r.json && r.json.id ? { ok: true, account: { page_id: r.json.id, name: r.json.name } } : { ok: false, detail: `HTTP ${r.status} ${JSON.stringify(r.json && r.json.error && r.json.error.message || '')}` };
}
async function reconcile(ctx, p) {
  const r = await ctx.http('GET', `${G}/${ctx.cfg.page_id}/video_reels?fields=id,description,created_time,status&limit=25`, { headers: tok() });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const since = new Date(new Date(p.intent_at).getTime() - 10 * 60e3);
  return { matches: (r.json.data || []).filter(v => new Date(v.created_time) >= since && (!v.description || v.description === ctx.post.text)).map(v => ({ id: v.id, at: v.created_time })) };
}
const status = async (ctx, id) => { const r = await ctx.http('GET', `${G}/${id}?fields=status,permalink_url,description`, { headers: tok() }); return r.ok ? r.json : { error: `HTTP ${r.status}` }; };

async function schedule(ctx, st) {
  let p = st.p('facebook');
  if (['SCHEDULED', 'PUBLISHED'].includes(p.state)) return verify(ctx, st);
  if (p.state === 'AMBIGUOUS') return { stop: true, reason: 'previous create had an unknown outcome; reconcile or creator instruction required' };
  if (!p.remote_id) {
    st.set('facebook', { state: 'CREATING', intent_at: new Date().toISOString(), file_sha256: ctx.videoSha, publish_at: ctx.publishAt.toISOString() }, { step: 'intent' });
    let r;
    try { r = await ctx.http('POST', `${G}/${ctx.cfg.page_id}/video_reels`, { headers: tok(), body: form({ upload_phase: 'start' }) }); }
    catch (e) { st.set('facebook', { state: e.kind === 'not_sent' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'start', error: e.message }); return { stop: true, reason: e.message }; }
    const out = createOutcome(r);
    if (out !== 'done' || !r.json || !r.json.video_id) { st.set('facebook', { state: out === 'rejected' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'start', http: r.status, error: r.json && r.json.error && r.json.error.message }); return { stop: true, reason: `start HTTP ${r.status}` }; }
    p = st.set('facebook', { state: 'CREATED', remote_id: r.json.video_id }, { step: 'start', video_id: r.json.video_id });
  }
  // bytes: resume from what Meta already has
  const s0 = await status(ctx, p.remote_id), have = +(s0.status && s0.status.uploading_phase && s0.status.uploading_phase.bytes_transfered || 0);
  if (!(s0.status && s0.status.uploading_phase && s0.status.uploading_phase.status === 'complete')) {
    const buf = fs.readFileSync(ctx.video.path);
    try {
      const r = await ctx.http('POST', `${RU}/${p.remote_id}`, { headers: { ...tok(), offset: String(have), file_size: String(buf.length) }, body: buf.subarray(have) });
      st.set('facebook', {}, { step: 'upload', http: r.status, from_byte: have });
      if (!r.ok) return { stop: true, reason: `upload HTTP ${r.status}` };
    } catch (e) { st.set('facebook', {}, { step: 'upload', error: e.message, note: 'same video_id; next run resumes by offset' }); return { stop: true, reason: 'upload interrupted; resumable' }; }
  }
  if (p.thumbnail !== 'set') {
    const fd = new FormData(); fd.append('is_preferred', 'true'); fd.append('source', new Blob([fs.readFileSync(ctx.thumb.path)], { type: ctx.thumb.mime }), 'thumbnail.' + ctx.thumb.ext);
    const r = await ctx.http('POST', `${G}/${p.remote_id}/thumbnails`, { headers: tok(), body: fd });
    st.set('facebook', { thumbnail: r.ok ? 'set' : 'failed' }, { step: 'thumbnail', http: r.status });
  }
  // finish → SCHEDULED, but only if Meta does not already show it scheduled/published
  const s1 = await status(ctx, p.remote_id), pub = s1.status && s1.status.publishing_phase;
  if (!(pub && ['complete', 'in_progress'].includes(pub.status))) {
    let r;
    try { r = await ctx.http('POST', `${G}/${ctx.cfg.page_id}/video_reels`, { headers: tok(), body: form({ upload_phase: 'finish', video_id: p.remote_id, video_state: 'SCHEDULED', scheduled_publish_time: Math.floor(ctx.publishAt / 1000), description: ctx.post.text, title: ctx.post.title, is_ai_generated: ctx.cfg.declarations.is_ai_generated }) }); }
    catch (e) { st.set('facebook', {}, { step: 'finish', error: e.message, note: 'read status before any new finish' }); return verify(ctx, st); }
    st.set('facebook', {}, { step: 'finish', http: r.status, error: r.json && r.json.error && r.json.error.message });
  }
  return verify(ctx, st);
}
async function verify(ctx, st) {
  const p = st.p('facebook'); if (!p.remote_id) return { stop: true, reason: 'nothing uploaded' };
  const s = await status(ctx, p.remote_id); if (s.error) return { stop: true, reason: 'read-back failed: ' + s.error };
  const ph = (s.status || {}).publishing_phase || {}, vs = (s.status || {}).video_status;
  let state = p.state;
  if (vs === 'ready' && ph.status === 'complete' && !ph.publish_time) state = 'PUBLISHED';
  if (ph.publish_status === 'scheduled' || (ph.publish_time && new Date(ph.publish_time) > new Date())) state = 'SCHEDULED';
  st.set('facebook', { state, url: s.permalink_url || `https://www.facebook.com/reel/${p.remote_id}`, evidence: { video_id: p.remote_id, video_status: vs, publishing_phase: ph, permalink_url: s.permalink_url || null, checked_at: new Date().toISOString() } }, { step: 'verify', video_status: vs, publishing_phase: ph });
  return { state, evidence: st.p('facebook').evidence };
}
module.exports = { name: 'facebook', gate, checkAuth, reconcile, schedule, verify };
