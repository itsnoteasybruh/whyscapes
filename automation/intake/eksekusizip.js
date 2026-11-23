#!/usr/bin/env node
// /eksekusizip intake: creator archives (ZIP/RAR, ≤ 5 per call) → per-episode pipeline inputs → preflight → queue entries.
// It does NOT produce, schedule or publish anything: production starts at 16.00 WIB on each episode's publish date
// (automation/schedule_rules.js). It never calls Meta.
//   node automation/intake/eksekusizip.js <archive…> [--now ISO] [--batch name] [--no-preflight] [--queue queue/queue.json]
// Layout written (inbox/ and queue/ are committed by the caller):
//   inbox/<batch>/_archives/<archive>                  the archive exactly as received (sha256 in the report)
//   inbox/<batch>/epNN/{VO.mp3, THUMBNAIL.png, VO_SCRIPT.md, BRIEF.md, POST.md, SOURCE/…}   episodes that split cleanly
//   inbox/<batch>/_hold/epNN/{SOURCE/…, HOLD.json}     episodes held for a creator decision (other episodes continue)
//   inbox/<batch>/INTAKE_REPORT.{json,md}
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync, spawnSync } = require('child_process');
const SM = require('./split_md'), SR = require('../schedule_rules');
const ROOT = path.join(__dirname, '..', '..'), MAX_ARCHIVES = 5;
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const isMd = f => /\.md$/i.test(f), isMp3 = f => /\.mp3$/i.test(f), isImg = f => /\.(png|jpe?g|webp)$/i.test(f);
const skip = f => /(^|\/)(__MACOSX|\.)/.test(f);
const epToken = f => { const m = path.basename(f).match(/ep\s*0*(\d{1,3})/i); return m ? +m[1] : null; };

// group extracted files into episodes: one MD + one MP3 + one image per group (by folder, then by "EPnn" in file names)
function inventory(files) {
  const byDir = new Map();
  for (const f of files.filter(x => !skip(x))) { const d = path.dirname(f); if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(f); }
  const groups = [], problems = [];
  for (const [d, fs_] of byDir) {
    const md = fs_.filter(isMd), mp3 = fs_.filter(isMp3), img = fs_.filter(isImg);
    if (!md.length && !mp3.length && !img.length) continue;
    if (md.length <= 1 && mp3.length <= 1 && img.length <= 1) { groups.push({ dir: d, md: md[0] || null, mp3: mp3[0] || null, img: img[0] || null }); continue; }
    const nums = [...new Set([...md, ...mp3, ...img].map(epToken))];
    if (nums.includes(null)) { problems.push(`folder "${d}" holds several MD/MP3/images without an "EPnn" in every file name: cannot tell the episodes apart`); continue; }
    for (const n of nums) { const pick = arr => arr.filter(f => epToken(f) === n); const [a, b, c] = [pick(md), pick(mp3), pick(img)];
      if (a.length > 1 || b.length > 1 || c.length > 1) problems.push(`EP${n}: more than one MD/MP3/image in "${d}"`); else groups.push({ dir: d, md: a[0] || null, mp3: b[0] || null, img: c[0] || null }); }
  }
  return { groups, problems };
}

function main(argv = process.argv.slice(2)) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const valued = ['--now', '--batch', '--queue', '--root'];
  const archives = argv.filter((a, i) => !a.startsWith('--') && !valued.includes(argv[i - 1]));
  const now = new Date(opt('--now', new Date().toISOString())), root = path.resolve(opt('--root', ROOT));
  if (!archives.length) { console.error('usage: eksekusizip.js <archive…> [--now ISO] [--batch name] [--no-preflight]'); return 2; }
  if (archives.length > MAX_ARCHIVES) { console.error(`${archives.length} archives: at most ${MAX_ARCHIVES} per call`); return 2; }
  const stamp = new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const batch = opt('--batch', `zip_${stamp}`), B = path.join(root, 'inbox', batch);
  if (fs.existsSync(B)) { console.error(`batch ${batch} already exists: nothing overwritten`); return 2; }
  const report = { batch, received_at: now.toISOString(), received_wib: SR.wibDate(now) + ' ' + new Date(now.getTime() + 7 * 3600e3).toISOString().slice(11, 16), archives: [], episodes: [], problems: [] };
  fs.mkdirSync(path.join(B, '_archives'), { recursive: true });
  const seen = new Map();
  for (const a of archives) {
    const name = path.basename(a), keep = path.join(B, '_archives', name), x = path.join(B, '_extract', name.replace(/\.[^.]+$/, ''));
    fs.copyFileSync(a, keep);
    const ar = { archive: name, sha256: sha(keep) };
    const r = spawnSync('python3', [path.join(__dirname, 'safe_extract.py'), keep, x], { encoding: 'utf8' });
    let res; try { res = JSON.parse(r.stdout); } catch { res = { ok: false, problems: [`extractor failed: ${(r.stderr || '').slice(-300)}`] }; }
    if (!res.ok) { report.archives.push({ ...ar, refused: res.problems }); continue; }
    const inv = inventory(res.files); ar.files = res.files.filter(f => !skip(f)); report.archives.push(ar);
    report.problems.push(...inv.problems.map(p => `${name}: ${p}`));
    for (const g of inv.groups) {
      const ep = { archive: name, folder: g.dir, source: { md: g.md, mp3: g.mp3, thumbnail: g.img }, problems: [] };
      for (const [k, v, what] of [['md', g.md, 'combined MD'], ['mp3', g.mp3, 'VO MP3'], ['img', g.img, 'thumbnail (PNG/JPG/WEBP)']]) if (!v) ep.problems.push({ part: k, msg: `no ${what} in "${g.dir}"` });
      let s = null;
      if (g.md) { s = SM.splitEpisodeMd(fs.readFileSync(path.join(x, g.md), 'utf8')); ep.id = s.episode; ep.publish_at_wib = s.publish_at_wib; ep.schedule_line = s.schedule_line; ep.channels = s.channels; ep.title = s.title; ep.problems.push(...s.problems); }
      if (ep.publish_at_wib) { const t = SR.intakeTiming(now, new Date(ep.publish_at_wib.replace(' ', 'T') + ':00+07:00')); ep.produce_at = t.produce_at; ep.problems.push(...t.problems.map(msg => ({ part: 'schedule', msg }))); }
      const folder = ep.id ? ep.id.replace('WS-', '').toLowerCase() : `unknown_${ep.archive}_${g.dir}`.replace(/[^a-z0-9_]/gi, '_');
      if (ep.id && seen.has(ep.id)) ep.problems.push({ part: 'episode', msg: `${ep.id} also in ${seen.get(ep.id)}` }); else if (ep.id) seen.set(ep.id, name);
      const held = ep.problems.length > 0, dest = path.join(B, held ? '_hold' : '', folder);
      fs.mkdirSync(path.join(dest, 'SOURCE'), { recursive: true });
      for (const f of [g.md, g.mp3, g.img].filter(Boolean)) fs.copyFileSync(path.join(x, f), path.join(dest, 'SOURCE', path.basename(f)));
      ep.source_sha256 = Object.fromEntries([['md', g.md], ['mp3', g.mp3], ['thumbnail', g.img]].filter(([, f]) => f).map(([k, f]) => [k, sha(path.join(x, f))]));
      if (held) { ep.status = 'HOLD_NEEDS_CREATOR_DECISION'; fs.writeFileSync(path.join(dest, 'HOLD.json'), JSON.stringify(ep, null, 2) + '\n'); report.episodes.push(ep); continue; }
      // pipeline inputs: VO copied byte-for-byte; thumbnail as given (PNG) or converted to PNG with pixels untouched (recorded)
      fs.copyFileSync(path.join(x, g.mp3), path.join(dest, 'VO.mp3'));
      if (/\.png$/i.test(g.img)) fs.copyFileSync(path.join(x, g.img), path.join(dest, 'THUMBNAIL.png'));
      else { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(x, g.img), '-frames:v', '1', path.join(dest, 'THUMBNAIL.png')]); ep.thumbnail_conversion = { from: path.basename(g.img), to: 'THUMBNAIL.png', note: 'format conversion only (no crop, no resize, no redesign)' }; }
      for (const [f, body] of Object.entries(SM.derivedFiles(s))) fs.writeFileSync(path.join(dest, f), body);
      ep.status = 'SPLIT_OK'; ep.inputs = path.relative(root, dest); report.episodes.push(ep);
    }
  }
  fs.rmSync(path.join(B, '_extract'), { recursive: true, force: true });
  if (!argv.includes('--no-preflight') && report.episodes.some(e => e.status === 'SPLIT_OK')) {
    const pf = spawnSync(process.execPath, [path.join(root, 'automation', 'preflight.js'), B, '--queue', opt('--queue', path.join(root, 'queue', 'queue.json')), '--now', now.toISOString()], { encoding: 'utf8', cwd: root });
    report.preflight = { exit: pf.status, out: (pf.stdout || '').slice(-4000), err: (pf.stderr || '').slice(-2000) };
  }
  fs.writeFileSync(path.join(B, 'INTAKE_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  const L = [`# Intake ${batch} (${report.received_wib} WIB)`, '', '| Arsip | Episode | Slot (dari MD) | Kanal | Status | Masalah |', '|---|---|---|---|---|---|'];
  for (const e of report.episodes) L.push(`| ${e.archive} | ${e.id || '?'} | ${e.publish_at_wib || '—'} | ${(e.channels || []).join(', ') || '—'} | ${e.status} | ${e.problems.map(p => p.msg).join('; ') || '—'} |`);
  for (const a of report.archives.filter(a => a.refused)) L.push(`| ${a.archive} | — | — | — | REFUSED | ${a.refused.join('; ')} |`);
  if (report.problems.length) L.push('', ...report.problems.map(p => `- ${p}`));
  fs.writeFileSync(path.join(B, 'INTAKE_REPORT.md'), L.join('\n') + '\n');
  console.log(JSON.stringify(report, null, 2));
  return report.archives.some(a => a.refused) || report.episodes.some(e => e.status !== 'SPLIT_OK') ? 1 : 0;
}
module.exports = { inventory, main };
if (require.main === module) process.exit(main());
