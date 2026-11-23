#!/usr/bin/env node
// GitHub Actions helper: sleep until the episode's publish_at (WIB, from publish_config.json), then exit 0 so the next step can run
// Instagram media_publish inside its window. Refuses (exit 2) when publish_at is missing, already more than 15 min past, or further
// away than the runner can wait (a GitHub-hosted job is limited to 6 h; we stop at 5 h 40 min to leave room for publish + verify).
//   node automation/publisher/gha_wait.js --config <publish_config.json> [--max-wait-min 340] [--dry]
const fs = require('fs'), C = require('./core');
function plan(cfg, now = new Date(), maxWaitMin = 340) {
  const at = C.parseWIB(cfg.schedule && cfg.schedule.publish_at_wib);
  if (!at) return { ok: false, reason: 'publish_at_wib is not set in the config' };
  const waitS = (at - now) / 1000;
  if (waitS < -15 * 60) return { ok: false, reason: `publish_at ${C.wibISO(at)} passed ${Math.round(-waitS / 60)} min ago; no late publish` };
  if (waitS > maxWaitMin * 60) return { ok: false, reason: `publish_at ${C.wibISO(at)} is ${Math.round(waitS / 60)} min away; dispatch within ${maxWaitMin} min of it` };
  return { ok: true, at: C.wibISO(at), wait_s: Math.max(0, Math.ceil(waitS) + 3) };   // +3 s: publish gate needs now ≥ publish_at
}
if (require.main === module) {
  const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
  const p = plan(JSON.parse(fs.readFileSync(opt('--config'), 'utf8')), new Date(), +opt('--max-wait-min', 340));
  console.log(JSON.stringify(p));
  if (!p.ok) process.exit(2);
  if (a.includes('--dry')) process.exit(0);
  console.log(`waiting ${p.wait_s} s until ${p.at} …`);
  setTimeout(() => { console.log('publish time reached', new Date().toISOString()); process.exit(0); }, p.wait_s * 1000);
}
module.exports = { plan };
