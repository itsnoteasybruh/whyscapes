// One-shot Instagram publish triggers with Cloud Tasks (replaces a fixed daily Scheduler window, so any publish time works).
// Source (fetched 2026-11-22, ../sources/gcp_tasks_*.txt): HTTP-target tasks may carry an OAuth token for *.googleapis.com
// targets; an explicit task ID de-duplicates — creating an ID that exists (or ran/was deleted recently) fails with ALREADY_EXISTS;
// the Cloud Tasks service agent needs roles/iam.serviceAccountUser on the token's service account.
// Each prepared Instagram episode gets two tasks: at publish_at and publish_at + 5 min (backup). Both start the SAME Cloud Run job
// in "publish-window" mode for that episode; the job's own state makes the second one a no-op if the first published.
const crypto = require('crypto');
const API = 'https://cloudtasks.googleapis.com/v2';

function taskId(episode, publishAt, slot, tag = 'ig') {          // deterministic, hashed prefix (the docs advise hashed IDs for dedup lookups)
  const key = `${episode}|${publishAt.toISOString()}|${tag}|${slot}`;
  return `${crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)}-${tag}-${episode.toLowerCase()}-${Math.floor(publishAt / 1000)}-${slot}`;
}
async function ensureTasks({ http, auth, project, region, queue, job, triggerSa, episode, publishAt, offsetsMin, mode, tag }) {
  const parent = `projects/${project}/locations/${region}/queues/${queue}`, out = [];
  for (const [i, off] of offsetsMin.entries()) {
    const at = new Date(publishAt.getTime() + off * 60e3), id = taskId(episode, publishAt, i, tag);
    const body = { task: { name: `${parent}/tasks/${id}`, scheduleTime: at.toISOString(), httpRequest: {
      httpMethod: 'POST', url: `https://run.googleapis.com/v2/projects/${project}/locations/${region}/jobs/${job}:run`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ overrides: { containerOverrides: [{ args: ['automation/publisher/cloud/job.js', mode, '--episode', episode] }] } })).toString('base64'),
      oauthToken: { serviceAccountEmail: triggerSa, scope: 'https://www.googleapis.com/auth/cloud-platform' } } } };
    const r = await http('POST', `${API}/${parent}/tasks`, { headers: { ...(await auth.header()), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) out.push({ id, at: at.toISOString(), created: true });
    else if (r.status === 409 || (r.json && r.json.error && r.json.error.status === 'ALREADY_EXISTS')) out.push({ id, at: at.toISOString(), created: false, note: 'already exists (de-duplicated)' });
    else throw new Error(`Cloud Tasks create HTTP ${r.status}`);
  }
  return out;
}
const ensureIgPublishTasks = c => ensureTasks({ offsetsMin: [0, 5], ...c, mode: 'publish-window', tag: 'ig' });
// post-publish read-back for every platform of the episode, at publish_at + 15 min (and + 60 min), whatever the publish time
const ensureVerifyTasks = c => ensureTasks({ offsetsMin: [15, 60], ...c, mode: 'report', tag: 'verify' });
module.exports = { ensureTasks, ensureIgPublishTasks, ensureVerifyTasks, taskId };
