// Whyscape schedule rules — ONE source of truth for intake, preflight, queue, production and publishing (creator decision 23 Nov 2026).
//   • The creator's package (ZIP/RAR via /eksekusizip) is checked, split and queued when it is RECEIVED. Production does NOT start then.
//   • Production starts automatically at 16.00 WIB on the PUBLISH DATE of the episode (e.g. EP15: 25 Nov 2026 16.00 → 21.00 the same day).
//   • QC runs once the render exists and is repeated after technical fixes. QC PASS must be reached by 20.00 WIB (publish gates need time).
//   • After QC PASS: token / account / conflict / state checks; Instagram preparation must pass by publish_at − 30 min (20.30 for 21.00);
//     Facebook is scheduled by Meta for publish_at (read back: time + cover); Instagram is published by a GitHub runner at publish_at.
//   • Any failure (production, QC, access, conflict, deadline) stops THAT episode: no "publish now", no slot shift, no retry of an
//     ambiguous API result. The slot is the creator's.
// Replaces the old rules "production H-1 at 17.00", "input ≥ 28 h before publish" and "production starts when the ZIP arrives".
const RULES = {
  tz: 'Asia/Jakarta', utcOffsetH: 7,
  produceAt: '16:00',            // WIB, on the publish date
  produceOffsetDays: 0,          // 0 = same day as publish
  qcDeadline: '20:00',           // WIB: no QC PASS by then → stop (gates + IG preparation need the remaining time)
  igPrepMinBeforePublish: 30,    // IG container must be ready ≥ 30 min before publish_at (20.30 for a 21.00 slot)
  minProductionHours: 5,         // publish_at must be ≥ produceAt + 5 h (16.00 → 21.00 at the earliest)
  minGapHours: 12,               // one episode per day
};
const pad = n => String(n).padStart(2, '0');
const wibDate = d => new Date(d.getTime() + RULES.utcOffsetH * 3600e3).toISOString().slice(0, 10);
const atWIB = (date, hhmm) => { const [Y, M, D] = date.split('-').map(Number), [h, m] = hhmm.split(':').map(Number); return new Date(Date.UTC(Y, M - 1, D, h - RULES.utcOffsetH, m)); };
const produceAtFor = publishAt => atWIB(wibDate(new Date(publishAt.getTime() - RULES.produceOffsetDays * 864e5)), RULES.produceAt);
// a package can only be queued when it arrives BEFORE its production start and the slot leaves the production window
function intakeTiming(now, publishAt) {
  const prod = produceAtFor(publishAt), out = { produce_at: prod.toISOString(), produce_date: wibDate(prod), problems: [] };
  if (publishAt <= now) out.problems.push('publish time is in the past');
  else if (now >= prod) out.problems.push(`received after production start (${wibDate(prod)} ${RULES.produceAt} WIB): the slot cannot be met by the automatic pipeline; send the package earlier or choose another slot (the system never shifts it)`);
  if ((publishAt - prod) / 3600e3 < RULES.minProductionHours) out.problems.push(`slot leaves ${((publishAt - prod) / 3600e3).toFixed(1)} h after the ${RULES.produceAt} WIB production start; it needs ≥ ${RULES.minProductionHours} h (earliest 21.00 WIB)`);
  return out;
}
module.exports = { RULES, wibDate, atWIB, produceAtFor, intakeTiming, pad };
