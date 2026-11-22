#!/usr/bin/env node
// CREATOR tool — the only way an episode becomes publishable. Run it yourself after reviewing the final MP4 + POST.md + THUMBNAIL.
// Claude never runs this for a real episode. It writes approval.json locally and prints the `gcloud storage cp` commands that you run.
//   node automation/publisher/cloud/approve.js --episode WS-EP15 --video outputs/WS-EP15/WS-EP15.mp4 --post <POST.md> --thumbnail <THUMBNAIL.png>
//        --publish-at "2026-12-01 21:00" --platforms youtube,facebook,instagram --approved-by "Elang" --bucket <bucket>
//        --yt-made-for-kids false --yt-synthetic false --yt-paid-placement false --fb-ai-generated false --ig-share-to-feed true
//        [--page-id 1421016024432912] [--ig-user-id 17841464723522892] [--now ISO]
// Refuses: MP4 > 90 s (format baku), publish time not ≥ 2 h ahead, missing declarations for a chosen platform, POST without title/caption.
const fs = require('fs'), path = require('path'), C = require('../core'), F = require('../../format_rules');
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const bool = k => { const v = opt(k); return v === 'true' ? true : v === 'false' ? false : null; };
function build() {
  const errs = [], ep = opt('--episode'), files = { video: opt('--video'), post: opt('--post'), thumbnail: opt('--thumbnail') };
  if (!/^WS-EP\d{2,3}$/.test(ep || '')) errs.push('--episode WS-EPnn');
  for (const [k, f] of Object.entries(files)) if (!f || !fs.existsSync(f)) errs.push(`--${k} file not found`);
  const platforms = (opt('--platforms', '') || '').split(',').filter(Boolean), now = new Date(opt('--now', new Date().toISOString()));
  const at = C.parseWIB(opt('--publish-at')); if (!at) errs.push('--publish-at "YYYY-MM-DD HH:MM" (WIB)'); else if (at - now < 2 * 3600e3) errs.push('publish time must be at least 2 h ahead');
  if (!platforms.length || platforms.some(p => !['youtube', 'facebook', 'instagram'].includes(p))) errs.push('--platforms youtube,facebook,instagram (subset)');
  if (!opt('--approved-by')) errs.push('--approved-by');
  // the Instagram publish-window Scheduler trigger runs every 5 min 20:00–22:55 WIB (Instagram has no native scheduling)
  if (at && platforms.includes('instagram')) { const h = +C.wibISO(at).slice(11, 13), m = +C.wibISO(at).slice(14, 16); if (h < 20 || h > 22 || (h === 22 && m > 35)) errs.push('Instagram publish time must be between 20:00 and 22:35 WIB (publish-window trigger); change the time or the Scheduler window'); }
  if (errs.length) return { errs };
  const dur = C.probe(files.video).duration, fmt = F.checkFinal(dur); if (!fmt.ok) errs.push(fmt.msg);
  const post = C.readPost(files.post); if (!post.title || !post.caption) errs.push('POST.md needs a title and caption');
  const decl = {};
  if (platforms.includes('youtube')) { decl.youtube = { made_for_kids: bool('--yt-made-for-kids'), contains_synthetic_media: bool('--yt-synthetic'), has_paid_product_placement: bool('--yt-paid-placement') }; if (Object.values(decl.youtube).some(v => v === null)) errs.push('YouTube declarations: --yt-made-for-kids --yt-synthetic --yt-paid-placement true|false'); }
  if (platforms.includes('facebook')) { decl.facebook = { is_ai_generated: bool('--fb-ai-generated') }; if (decl.facebook.is_ai_generated === null) errs.push('Facebook declaration: --fb-ai-generated true|false'); }
  const ig = platforms.includes('instagram') ? { ig_user_id: opt('--ig-user-id', '17841464723522892'), share_to_feed: bool('--ig-share-to-feed') } : undefined;
  if (ig && ig.share_to_feed === null) errs.push('Instagram: --ig-share-to-feed true|false');
  if (errs.length) return { errs };
  const obj = k => `episodes/${ep}/${path.basename(files[k])}`;
  return { approval: { schema: 1, episode: ep, approved_by: opt('--approved-by'), approved_at: new Date().toISOString(), publish_at_wib: opt('--publish-at'), platforms,
    files: Object.fromEntries(Object.keys(files).map(k => [k, { object: obj(k), sha256: C.sha256(files[k]) }])), video_duration_s: dur, post_title: post.title,
    declarations: decl, facebook: platforms.includes('facebook') ? { page_id: opt('--page-id', '1421016024432912') } : undefined, instagram: ig, youtube: platforms.includes('youtube') ? { category_id: opt('--yt-category') || null } : undefined }, files, obj };
}
if (require.main === module) {
  const r = build();
  if (r.errs) { console.error('NOT approved:\n - ' + r.errs.join('\n - ')); process.exit(2); }
  const out = `approval_${r.approval.episode}.json`; fs.writeFileSync(out, JSON.stringify(r.approval, null, 1));
  const b = opt('--bucket', '<BUCKET>');
  console.log(`approval written: ${out}  (publish ${C.timeEvidence(C.parseWIB(r.approval.publish_at_wib)).asia_jakarta}, platforms ${r.approval.platforms.join(', ')})`);
  console.log('Upload (run yourself; the approval goes LAST so the job never sees a half-uploaded episode):');
  for (const k of ['video', 'post', 'thumbnail']) console.log(`  gcloud storage cp "${r.files[k]}" gs://${b}/${r.obj(k)}`);
  console.log(`  gcloud storage cp "${out}" gs://${b}/episodes/${r.approval.episode}/approval.json`);
}
module.exports = { build };
