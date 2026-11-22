// Pure planning: given the creator's approval, the stored state and "now", which platform actions are due. No I/O.
// Windows (all relative to publish_at, Asia/Jakarta handled by core.parseWIB):
//   YouTube   upload private + publishAt any time after approval until publish_at − 15 min (YouTube publishes it itself);
//             if the thumbnail is still pending, the same action continues (re-entrant).
//   Facebook  schedule when publish_at is > 15 min and ≤ 28 days ahead (Meta: > 10 min, ≤ 29 days — 5 min / 1 day safety margin).
//   Instagram prepare the container from publish_at − 6 h to publish_at − 10 min (container lives 24 h); media_publish only in
//             the publish window [publish_at, publish_at + 20 min] (Instagram API has no native scheduling).
//   verify    every platform with a remote ID; after publish_at + 10 min the expected state is PUBLISHED.
//   missed    publish_at + 20 min passed and a platform is neither SCHEDULED nor PUBLISHED → alert (never auto-retried later).
const MIN = 60e3, H = 3600e3, D = 86400e3;
const DONE = ['SCHEDULED', 'PUBLISHED'];
function plan({ approval, states, now, mode = 'tick' }) {
  const out = [], at = new Date(approval.publish_at_utc).getTime(), t = now.getTime();
  if (approval.hold) return [{ platform: '*', action: 'skip', reason: `hold: ${approval.hold}` }];
  for (const p of approval.platforms) {
    const s = (states[p] || {}).state || 'NOT_STARTED', hasId = !!(states[p] && (states[p].remote_id || states[p].container_id));
    if (['AMBIGUOUS'].includes(s)) { out.push({ platform: p, action: 'alert', reason: 'AMBIGUOUS: unknown outcome, needs reconcile/creator decision; no automatic retry' }); continue; }
    if (s === 'BLOCKED') { out.push({ platform: p, action: 'alert', reason: 'BLOCKED by a gate (see state blockers)' }); continue; }
    if (t > at + 20 * MIN && !DONE.includes(s) && !(p === 'instagram' && s === 'PUBLISHED')) { out.push({ platform: p, action: 'alert', reason: `missed: publish_at passed and state is ${s}` }); if (hasId) out.push({ platform: p, action: 'verify' }); continue; }
    if (p === 'youtube') {
      if (s === 'PUBLISHED') continue;
      if (!DONE.includes(s) || (states[p] && states[p].thumbnail !== 'set' && s !== 'PUBLISHED')) { if (t < at - 15 * MIN) out.push({ platform: p, action: 'schedule' }); }
      if (hasId && (mode === 'report' || t >= at + 10 * MIN || s === 'SCHEDULED')) out.push({ platform: p, action: 'verify' });
    } else if (p === 'facebook') {
      if (s === 'PUBLISHED') continue;
      if (!DONE.includes(s)) { if (at - t > 15 * MIN && at - t <= 28 * D) out.push({ platform: p, action: 'schedule' }); else if (at - t > 28 * D) out.push({ platform: p, action: 'wait', reason: 'more than 28 days ahead' }); }
      if (hasId) out.push({ platform: p, action: 'verify' });
    } else if (p === 'instagram') {
      if (s === 'PUBLISHED') { if (mode === 'report') out.push({ platform: p, action: 'verify' }); continue; }
      const prepared = states[p] && states[p].container_status === 'FINISHED';
      if (!prepared && t >= at - 6 * H && t <= at - 10 * MIN) out.push({ platform: p, action: 'prepare' });
      if (mode === 'publish-window' && prepared && t >= at && t <= at + 20 * MIN) out.push({ platform: p, action: 'publish' });
      if (!prepared && t > at - 10 * MIN && t <= at + 20 * MIN) out.push({ platform: p, action: 'alert', reason: 'not prepared before publish time' });
    }
  }
  return out;
}
module.exports = { plan };
