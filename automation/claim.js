#!/usr/bin/env node
// Picks the ONE episode due for production and marks it PRODUCING. Prints its JSON, or nothing (exit 3) when none is due.
// Schema 2: due = produce_date (= the publish date, production at 16.00 WIB — automation/schedule_rules.js) == today WIB and status QUEUED.
// Only QUEUED is claimed: NEEDS_CREATOR_FIX and PREFLIGHT_INCOMPLETE never are. A PRODUCING claim is never taken over automatically
// (no automatic retry): a stale one is reported (exit 5) for the creator to decide.
// usage: node automation/claim.js [--queue queue/queue.json] [--runner name] [--now ISO] [--dry]
// Concurrency: the caller must commit + `git push` right after; a rejected push means another run won -> pull and re-run.
const fs = require('fs');
const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const file = opt('--queue', 'queue/queue.json'), runner = opt('--runner', 'cloud'), now = new Date(opt('--now', new Date().toISOString()));
const wib = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);          // Asia/Jakarta = UTC+7, no DST
const today = wib(now), STALE_H = 3;                                                     // schema 1: produce on target_date · schema 2: produce on produce_date
const q = JSON.parse(fs.readFileSync(file, 'utf8'));
const prodDay = e => e.produce_date || e.target_date;
const stale = q.episodes.filter(e => prodDay(e) === today && e.status === 'PRODUCING' && e.claimed_at && (now - new Date(e.claimed_at)) / 3600e3 > STALE_H);
if (stale.length) { console.error('stale PRODUCING claim, not taken over (no automatic retry):', stale.map(e => `${e.id} by ${e.claimed_by} at ${e.claimed_at}`).join(', ')); process.exit(5); }
const due = q.episodes.filter(e => prodDay(e) === today && e.status === 'QUEUED');
if (due.length > 1) { console.error('queue error: more than one episode for', today); process.exit(4); }
if (!due.length) { console.error('nothing due for', today, '(WIB)'); process.exit(3); }
const e = due[0];
Object.assign(e, { status: 'PRODUCING', claimed_by: runner, claimed_at: now.toISOString() });
if (!a.includes('--dry')) fs.writeFileSync(file, JSON.stringify(q, null, 2) + '\n');
console.log(JSON.stringify(e, null, 2));
