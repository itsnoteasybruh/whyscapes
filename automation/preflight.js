#!/usr/bin/env node
// Whyscape preflight: inbox/<batch>/<NN>_<slug>/{vo.mp3,brief.md} -> queue/queue.json (1 episode/day, Asia/Jakarta).
// usage: node automation/preflight.js <batchDir> <firstTargetDate YYYY-MM-DD> [--queue queue/queue.json] [--dry] [--allow-partial]
// Reads only; writes the queue file only when every package passes (or --allow-partial) and not --dry.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), flag = f => args.includes(f), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const [batchDir, firstDate] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--queue'));
if (!batchDir || !/^\d{4}-\d{2}-\d{2}$/.test(firstDate || '')) { console.error('usage: preflight.js <batchDir> <YYYY-MM-DD> [--queue file] [--dry] [--allow-partial]'); process.exit(2); }
const queueFile = opt('--queue', 'queue/queue.json');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const q = fs.existsSync(queueFile) ? JSON.parse(fs.readFileSync(queueFile, 'utf8'))
  : { schema: 1, tz: 'Asia/Jakarta', produce_at: '17:00', publish_at: '21:00', episodes: [] };
const usedKeys = new Set(q.episodes.map(e => e.pair_key)), usedDates = new Set(q.episodes.map(e => e.target_date));
// next episode number: max of queue ids and existing episodes/epNN_* folders
const epRoot = path.join(__dirname, '..', 'episodes');
const nums = [...q.episodes.map(e => +e.id.replace(/\D/g, '')), ...(fs.existsSync(epRoot) ? fs.readdirSync(epRoot) : []).map(n => +(n.match(/^ep(\d+)_/) || [0, 0])[1])];
let next = Math.max(0, ...nums) + 1;

const pk = fs.readdirSync(batchDir).filter(n => /^\d{2}_[a-z0-9_]+$/.test(n) && fs.statSync(path.join(batchDir, n)).isDirectory()).sort();
const stray = fs.readdirSync(batchDir).filter(n => !pk.includes(n));
const rows = [], fails = [];
let date = firstDate;
for (const name of pk) {
  const dir = path.join(batchDir, name), vo = path.join(dir, 'vo.mp3'), br = path.join(dir, 'brief.md'), err = [];
  if (!fs.existsSync(vo)) err.push('vo.mp3 missing');
  if (!fs.existsSync(br)) err.push('brief.md missing');
  let secs = null, title = null, vs = null, bs = null;
  if (!err.length) {
    try { secs = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', vo]).toString().trim(); } catch { err.push('ffprobe cannot read vo.mp3'); }
    if (secs != null && !(secs >= 30 && secs <= 180)) err.push(`VO length ${secs}s outside 30-180s`);
    const text = fs.readFileSync(br, 'utf8'); title = (text.match(/^#\s+(.+)$/m) || [])[1] || null;
    if (!title) err.push('brief has no # title');
    if (!/\bVO\b|cover/i.test(text)) err.push('brief mentions neither VO nor cover');
    vs = sha(vo); bs = sha(br);
  }
  const key = vs && bs ? vs.slice(0, 12) + '-' + bs.slice(0, 12) : null;
  if (key && usedKeys.has(key)) err.push('duplicate: this VO+brief pair is already queued');
  while (usedDates.has(date)) date = addDays(date, 1);
  if (err.length) { fails.push({ package: name, errors: err }); continue; }
  usedKeys.add(key); usedDates.add(date);
  const id = `WS-EP${String(next++).padStart(2, '0')}`, rel = p => path.relative(process.cwd(), p).split(path.sep).join('/');
  rows.push({ id, order: +name.slice(0, 2), slug: name.slice(3), title, target_date: date, vo: rel(vo), brief: rel(br),
    vo_sha256: vs, brief_sha256: bs, pair_key: key, vo_seconds: +secs.toFixed(2), status: 'QUEUED', attempts: 0, max_attempts: 3,
    claimed_by: null, claimed_at: null, output_dir: `outputs/${id}/`, log: `outputs/${id}/LOG.md`, qc: null, published: { ig: null, fb: null, yt: null } });
  date = addDays(date, 1);
}
console.log(JSON.stringify({ batch: batchDir, packages: pk.length, ok: rows.length, failed: fails, ignored_entries: stray,
  schedule: rows.map(r => `${r.target_date} ${r.id} ${r.slug} (${r.vo_seconds}s)`) }, null, 2));
if (flag('--dry')) process.exit(fails.length ? 1 : 0);
if (fails.length && !flag('--allow-partial')) { console.error('preflight FAILED: queue not written'); process.exit(1); }
q.episodes.push(...rows); fs.mkdirSync(path.dirname(queueFile), { recursive: true });
fs.writeFileSync(queueFile, JSON.stringify(q, null, 2) + '\n'); console.log('queue written:', queueFile);
