#!/usr/bin/env node
// Picks the ONE episode due for production and marks it PRODUCING. Prints its JSON, or nothing (exit 3) when none is due.
// usage: node automation/claim.js [--queue queue/queue.json] [--runner name] [--now ISO] [--dry]
// Concurrency: the caller must commit + `git push` right after; a rejected push means another run won -> pull and re-run.
const fs = require('fs');
const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const file = opt('--queue', 'queue/queue.json'), runner = opt('--runner', 'cloud'), now = new Date(opt('--now', new Date().toISOString()));
const wib = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);          // Asia/Jakarta = UTC+7, no DST
const today = wib(now), STALE_H = 3;                                                     // produce 17:00 -> publish 21:00 the SAME WIB day
const q = JSON.parse(fs.readFileSync(file, 'utf8'));
const due = q.episodes.filter(e => e.target_date === today && (e.status === 'QUEUED' ||
  (e.status === 'PRODUCING' && e.claimed_at && (now - new Date(e.claimed_at)) / 3600e3 > STALE_H && e.attempts < e.max_attempts)));
if (due.length > 1) { console.error('queue error: more than one episode for', today); process.exit(4); }
if (!due.length) { console.error('nothing due for', today, '(WIB)'); process.exit(3); }
const e = due[0];
if (e.status === 'PRODUCING') e.attempts += 1;                                              // stale claim taken over
Object.assign(e, { status: 'PRODUCING', claimed_by: runner, claimed_at: now.toISOString() });
if (!a.includes('--dry')) fs.writeFileSync(file, JSON.stringify(q, null, 2) + '\n');
console.log(JSON.stringify(e, null, 2));
