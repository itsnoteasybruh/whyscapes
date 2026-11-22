#!/usr/bin/env node
// Records the CREATOR's decision on a NEEDS_CREATOR_FIX entry when the creator says the flagged item is intended as-is
// (e.g. OCR misread a stylised thumbnail title, or a flagged claim is deliberate). Files are never changed here.
// If the creator FIXES files instead, re-run preflight on the batch: that replaces the entry.
// Claude runs this ONLY when the creator gives that instruction (quote it in --instruction); Claude never confirms on its own.
// usage: node automation/creator_confirm.js --queue queue/queue.json --id WS-EP15 --items 0,2 --instruction "<kata-kata creator>" [--by creator]
const fs = require('fs');
const a = process.argv.slice(2), opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const file = opt('--queue', 'queue/queue.json'), id = opt('--id'), items = (opt('--items', '') || '').split(',').filter(Boolean).map(Number), instr = opt('--instruction'), by = opt('--by', 'creator');
if (!id || !items.length || !instr) { console.error('usage: creator_confirm.js --queue file --id WS-EPnn --items 0,1 --instruction "<creator words>" [--by creator]'); process.exit(2); }
const q = JSON.parse(fs.readFileSync(file, 'utf8')), e = q.episodes.find(x => x.id === id);
if (!e) { console.error('no such id', id); process.exit(2); }
if (e.status !== 'NEEDS_CREATOR_FIX') { console.error(`${id} is ${e.status}, not NEEDS_CREATOR_FIX`); process.exit(3); }
// structural problems cannot be "confirmed away": they need corrected files
const HARD = ['files', 'readable', 'identity', 'duplicate', 'schedule'];
for (const i of items) {
  const it = e.creator_fix[i]; if (!it) { console.error('no item', i); process.exit(2); }
  if (HARD.includes(it.check)) { console.error(`item ${i} (${it.check}) needs corrected files, not a confirmation: ${it.msg}`); process.exit(3); }
  if (!e.creator_confirmations.some(c => c.item === i)) e.creator_confirmations.push({ item: i, check: it.check, msg: it.msg, by, instruction: instr, at: new Date().toISOString() });
}
const open = e.creator_fix.map((_, i) => i).filter(i => !e.creator_confirmations.some(c => c.item === i));
if (!open.length && !(e.system_issues || []).length) e.status = 'QUEUED';
fs.writeFileSync(file, JSON.stringify(q, null, 2) + '\n');
console.log(`${id}: confirmed ${items.join(',')}; open items ${open.length ? open.join(',') : 'none'} → ${e.status}`);
