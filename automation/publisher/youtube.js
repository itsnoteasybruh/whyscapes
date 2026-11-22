// YouTube Shorts adapter (YouTube Data API v3). Sources (fetched 2026-11-22, kept in ./sources):
//   videos.insert — resumable upload; status.publishAt only when privacyStatus = private (ISO 8601).
//   2026-11-02 revision: uploads from unverified API projects are no longer restricted to private.
//   2026-11-03 revision: thumbnails.set supports Shorts custom thumbnails after processing (processingStatus = succeeded); JPEG/PNG ≤ 50 MB.
//   2026-11-16 revision: paidProductPlacementDetails.hasPaidProductPlacement no longer defaults to false → must be declared explicitly.
// Idempotency: the video resource only exists once the resumable upload completes. Session creation is therefore safe to retry;
// an ambiguous byte upload is resolved by querying the SAME session (Content-Range: bytes */size), never by starting a new one.
const fs = require('fs');
const { TransportError, createOutcome } = require('./core');
const API = 'https://www.googleapis.com/youtube/v3', UP = 'https://www.googleapis.com/upload/youtube/v3';

// auth: ctx.auth.youtube() (Cloud: access token minted in-process from the refresh token in Secret Manager) > YT_ACCESS_TOKEN > proxy-injected
let CUR = null;
const authHeaders = () => CUR ? { Authorization: `Bearer ${CUR}` } : process.env.YT_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.YT_ACCESS_TOKEN}` } : {};
async function useAuth(ctx) { CUR = ctx.auth && ctx.auth.youtube ? await ctx.auth.youtube() : null; }
function gate(ctx) {
  const r = [], d = ctx.cfg.declarations || {};
  for (const k of ['made_for_kids', 'contains_synthetic_media', 'has_paid_product_placement']) if (typeof d[k] !== 'boolean') r.push(`creator declaration "${k}" (true/false) is missing: the channel owner must state it, Claude does not guess`);
  if (ctx.video.duration > 180) r.push(`video is ${ctx.video.duration}s; Shorts are ≤ 3 min`);   // platform limit; the 90 s Whyscape format is enforced earlier in publish.js
  if (ctx.video.height <= ctx.video.width) r.push('video is not vertical/square (Shorts)');
  if (!ctx.thumb) r.push('no thumbnail file from the creator');
  if (ctx.publishAt <= ctx.now) r.push('publish time is not in the future');
  return r;
}
const metadata = ctx => ({
  snippet: { title: ctx.post.title, description: ctx.post.text, ...(ctx.cfg.category_id ? { categoryId: String(ctx.cfg.category_id) } : {}) },
  status: { privacyStatus: 'private', publishAt: ctx.publishAt.toISOString(), selfDeclaredMadeForKids: ctx.cfg.declarations.made_for_kids, containsSyntheticMedia: ctx.cfg.declarations.contains_synthetic_media },
  paidProductPlacementDetails: { hasPaidProductPlacement: ctx.cfg.declarations.has_paid_product_placement } });
const urls = id => ({ shorts_url: `https://www.youtube.com/shorts/${id}`, studio_url: `https://studio.youtube.com/video/${id}/edit` });

async function checkAuth(ctx) {
  await useAuth(ctx);
  const r = await ctx.http('GET', `${API}/channels?part=id,snippet,contentDetails&mine=true`, { headers: authHeaders() });
  if (!r.ok || !r.json || !(r.json.items || []).length) return { ok: false, detail: `HTTP ${r.status} ${JSON.stringify(r.json && r.json.error && r.json.error.message || r.text || '')}` };
  const c = r.json.items[0]; return { ok: true, account: { channel_id: c.id, title: c.snippet.title }, uploads_playlist: c.contentDetails.relatedPlaylists.uploads };
}
// find uploads with exactly this title created after the intent (private/scheduled uploads are included for the owner)
async function reconcile(ctx, p) {
  await useAuth(ctx);
  const a = await checkAuth(ctx); if (!a.ok) return { error: 'auth: ' + a.detail };
  const r = await ctx.http('GET', `${API}/playlistItems?part=snippet,status&maxResults=25&playlistId=${a.uploads_playlist}`, { headers: authHeaders() });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const since = new Date(new Date(p.intent_at).getTime() - 10 * 60e3);
  const matches = (r.json.items || []).filter(i => i.snippet.title === ctx.post.title && new Date(i.snippet.publishedAt) >= since).map(i => ({ id: i.snippet.resourceId.videoId, at: i.snippet.publishedAt }));
  return { matches };
}
async function readBack(ctx, id) {
  const r = await ctx.http('GET', `${API}/videos?part=status,snippet,processingDetails&id=${id}`, { headers: authHeaders() });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const v = (r.json.items || [])[0]; if (!v) return { missing: true };
  return { privacy: v.status.privacyStatus, publishAt: v.status.publishAt || null, uploadStatus: v.status.uploadStatus, processing: v.processingDetails && v.processingDetails.processingStatus, title: v.snippet.title, thumbnails: v.snippet.thumbnails };
}
async function setThumbnail(ctx, st, id) {
  const r = await ctx.http('POST', `${UP}/thumbnails/set?videoId=${id}&uploadType=media`, { headers: { ...authHeaders(), 'Content-Type': ctx.thumb.mime }, body: fs.readFileSync(ctx.thumb.path) });
  if (r.ok) { await st.set('youtube', { thumbnail: 'set' }, { step: 'thumbnails.set', http: r.status }); return true; }
  await st.set('youtube', { thumbnail: 'failed' }, { step: 'thumbnails.set', http: r.status, error: r.json && r.json.error && r.json.error.message }); return false;
}

// schedule = upload private + publishAt, set thumbnail after processing, then read back. Re-entrant at every step.
async function schedule(ctx, st) {
  await useAuth(ctx);
  let p = st.p('youtube');
  if (p.state === 'PUBLISHED' || (p.state === 'SCHEDULED' && p.thumbnail === 'set')) return verify(ctx, st);
  if (p.state === 'AMBIGUOUS') return { stop: true, reason: 'previous create had an unknown outcome; run reconcile or get a creator instruction (no automatic retry)' };
  if (!['CREATED', 'SCHEDULED'].includes(p.state) || !p.remote_id) {          // never re-create once a video ID exists
    const size = ctx.video.size;
    if (!(await st.local('yt_resume_uri'))) {
      await st.set('youtube', { state: 'CREATING', intent_at: new Date().toISOString(), file_sha256: ctx.videoSha, publish_at: ctx.publishAt.toISOString() }, { step: 'intent' });
      let r;
      try { r = await ctx.http('POST', `${UP}/videos?uploadType=resumable&part=snippet,status,paidProductPlacementDetails`, { headers: { ...authHeaders(), 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': 'video/mp4' }, body: JSON.stringify(metadata(ctx)) }); }
      catch (e) { await st.set('youtube', { state: 'FAILED_DEFINITE' }, { step: 'session', error: e.message, note: 'no video exists before the upload completes: safe to retry' }); return { stop: true, reason: e.message }; }
      if (!r.ok || !r.headers.location) { await st.set('youtube', { state: 'FAILED_DEFINITE' }, { step: 'session', http: r.status, error: r.json && r.json.error && r.json.error.message }); return { stop: true, reason: `session HTTP ${r.status}` }; }
      await st.local('yt_resume_uri', r.headers.location); p = await st.set('youtube', { session: 'open' }, { step: 'session', http: r.status });
    }
    // upload bytes (or resume / query the same session)
    let r, start = 0;
    const uri = await st.local('yt_resume_uri');
    const query = async () => ctx.http('PUT', uri, { headers: { 'Content-Range': `bytes */${size}`, 'Content-Length': '0' } });
    try {
      const q = p.upload_attempted ? await query() : null;
      if (q && (q.status === 200 || q.status === 201)) r = q;
      else {
        if (q && q.status === 308) start = q.headers.range ? +q.headers.range.split('-')[1] + 1 : 0;
        else if (q && q.status !== 308) { await st.set('youtube', { state: 'AMBIGUOUS' }, { step: 'session-query', http: q.status }); return { stop: true, reason: `upload session answered ${q.status}; reconcile required` }; }
        await st.set('youtube', { upload_attempted: true }, { step: 'upload', from_byte: start });
        const buf = fs.readFileSync(ctx.video.path).subarray(start);
        r = await ctx.http('PUT', uri, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(buf.length), ...(start ? { 'Content-Range': `bytes ${start}-${size - 1}/${size}` } : {}) }, body: buf });
      }
    } catch (e) {
      // the bytes may have arrived: ask the same session once; if that also fails → AMBIGUOUS, stop
      try { const q = await query(); if (q.status === 200 || q.status === 201) r = q; else if (q.status === 308) { await st.set('youtube', {}, { step: 'upload', error: e.message, note: 'session says incomplete (308): next run resumes the SAME session' }); return { stop: true, reason: 'upload incomplete; resumable on next run' }; } }
      catch (e2) { /* fall through */ }
      if (!r) { await st.set('youtube', { state: 'AMBIGUOUS' }, { step: 'upload', error: e.message }); return { stop: true, reason: 'upload outcome unknown; no retry' }; }
    }
    const out = createOutcome(r);
    if (out !== 'done' || !r.json || !r.json.id) { await st.set('youtube', { state: out === 'rejected' ? 'FAILED_DEFINITE' : 'AMBIGUOUS' }, { step: 'upload', http: r.status, error: r.json && r.json.error && r.json.error.message }); return { stop: true, reason: `upload HTTP ${r.status}` }; }
    await st.local('yt_resume_uri', null); p = await st.set('youtube', { state: 'CREATED', remote_id: r.json.id, session: 'closed', ...urls(r.json.id) }, { step: 'upload', http: r.status, video_id: r.json.id });
  }
  // thumbnail after processing (bounded wait; a later run finishes it)
  if (p.thumbnail !== 'set') {
    for (let i = 0; i < (ctx.pollTries ?? 20); i++) {
      const b = await readBack(ctx, p.remote_id);
      if (b.processing === 'succeeded') { await setThumbnail(ctx, st, p.remote_id); break; }
      if (b.processing === 'failed' || b.missing) { await st.set('youtube', {}, { step: 'processing', result: b }); break; }
      await ctx.sleep(ctx.pollMs ?? 30000);
    }
  }
  return verify(ctx, st);
}
async function verify(ctx, st) {
  await useAuth(ctx);
  const p = st.p('youtube'); if (!p.remote_id) return { stop: true, reason: 'nothing uploaded' };
  const b = await readBack(ctx, p.remote_id);
  if (b.error || b.missing) { await st.set('youtube', {}, { step: 'verify', result: b }); return { stop: true, reason: 'read-back failed: ' + (b.error || 'video not found') }; }
  const want = ctx.publishAt.toISOString().replace('.000Z', 'Z'), got = b.publishAt && new Date(b.publishAt).toISOString().replace('.000Z', 'Z');
  let state = p.state;
  if (b.privacy === 'public') state = 'PUBLISHED';
  else if (b.privacy === 'private' && got === want) state = 'SCHEDULED';
  await st.set('youtube', { state, evidence: { video_id: p.remote_id, privacyStatus: b.privacy, publishAt: b.publishAt, processing: b.processing, thumbnail: p.thumbnail || null, checked_at: new Date().toISOString(), ...urls(p.remote_id) } }, { step: 'verify', privacy: b.privacy, publishAt: b.publishAt });
  return { state, evidence: st.p('youtube').evidence };
}
module.exports = { name: 'youtube', gate, checkAuth, reconcile, schedule, verify, metadata };
