#!/usr/bin/env node
// Whyscape preflight (input contract, 22 Nov 2026 — see automation/INPUT_CONTRACT.md). Reads a CREATOR batch and writes queue entries. Posts nothing.
//   <batch>/epNN/{VO.mp3, VO_SCRIPT.md, BRIEF.md, THUMBNAIL.png, POST.md}      e.g. forecast_batch_01/ep15/
// The CREATOR (the user) authors all five files. Claude only validates them: it never creates, fills in, rewrites or redesigns any of them.
// Roles: VO.mp3 + VO_SCRIPT.md = narration & sync (the audio is the truth) · BRIEF.md = video production (visual, motion, music, SFX, video title) ·
//        THUMBNAIL.png = social-media post thumbnail ONLY (never the video's opening/closing) · POST.md = post title, caption, hashtags, platforms, publish time.
// usage: node automation/preflight.js <batchDir> [--queue queue/queue.json] [--report file.md] [--now ISO] [--episodes-root episodes] [--dry]
// Every episode folder becomes ONE queue entry:
//   QUEUED              all checks passed → may be claimed for production on its produce_date
//   NEEDS_CREATOR_FIX   something in the creator's files must be fixed or confirmed by the creator (reasons name the file); never produced/published
//   PREFLIGHT_INCOMPLETE a check could not run here (e.g. Whisper/tesseract missing): a system problem, not the creator's; never produced
// Re-running on the same batch after the creator fixed files replaces NEEDS_CREATOR_FIX / PREFLIGHT_INCOMPLETE entries; QUEUED (or later) entries are
// never replaced: identical files → "unchanged", different files → reported, and the queued entry is kept until the creator gives an instruction.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), flag = f => args.includes(f), opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const VALUED = ['--queue', '--report', '--now', '--episodes-root'];  // flags: --dry
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const batchDir = pos[0];
if (!batchDir) { console.error('usage: preflight.js <batchDir> [--queue file] [--report file] [--now ISO] [--episodes-root dir] [--dry]'); process.exit(2); }
const ROOT = path.join(__dirname, '..');
const queueFile = opt('--queue', 'queue/queue.json'), epRoot = opt('--episodes-root', path.join(ROOT, 'episodes'));
const reportFile = opt('--report', path.join('queue', 'preflight', path.basename(path.resolve(batchDir)) + '_report.md'));
const NOW = new Date(opt('--now', new Date().toISOString()));
const RULES = { files: ['VO.mp3', 'VO_SCRIPT.md', 'BRIEF.md', 'THUMBNAIL.png', 'POST.md'], voSeconds: [30, 180],
  titleOcrPass: .85, scriptPass: .90, scriptFail: .80, minGapHours: 12, leadHours: 28, produceOffsetDays: 1, produceAt: '17:00',
  platforms: { instagram: { max: 2200, tags: 30 }, facebook: { max: 63206, tags: 30 }, youtube: { titleMax: 100, max: 5000, tags: 15 }, tiktok: { max: 2200, tags: 30 } } };

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const normT = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const rel = p => path.relative(process.cwd(), p).split(path.sep).join('/');
const py = (script, ...a) => JSON.parse(execFileSync('python3', [path.join(__dirname, script), ...a], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).toString());
function frontMatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/), fm = {};
  if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) fm[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim(); }
  return { fm, body: m ? text.slice(m[0].length) : text };
}
const section = (body, name) => { const m = body.match(new RegExp(`^##\\s+${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, 'mi')); return m ? m[1].replace(/^>.*$/gm, '').trim() : null; };
// Asia/Jakarta = UTC+7 all year (no DST)
function parseWIB(s) {
  const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/); if (!m) return null;
  const [, Y, Mo, D, h, mi] = m.map(Number), d = new Date(Date.UTC(Y, Mo - 1, D, h - 7, mi));
  const back = new Date(d.getTime() + 7 * 3600e3);
  return back.getUTCFullYear() === Y && back.getUTCMonth() === Mo - 1 && back.getUTCDate() === D && h < 24 && mi < 60 ? d : null;   // rejects 2026-02-30, 25:00 …
}
const wibDate = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const wibISO = d => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 16) + '+07:00';
const addDays = (ymd, n) => { const t = new Date(ymd + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

// risky factual claims (VO text + caption) → editorial flags. HIGH = absolute/medical/safety guarantees or a brief condition the VO omits (NEEDS_CREATOR_FIX);
// CHECK = numbers, thresholds, health words (INFO: fact-check list for production QC). Nothing is rewritten.
const HIGH = [/\b(pasti|dijamin|jaminan)\b/i, /\b100\s?%/, /\b(selalu|tidak pernah) (aman|berbahaya|sehat)\b/i, /\btanpa risiko\b/i, /\btidak berbahaya\b/i,
  /\b(menyembuhkan|obat (untuk|bagi)|mencegah (kanker|penyakit|covid))\b/i, /\b(beracun|mematikan)\b/i, /\bsemua (bakteri|kuman|virus|orang|makanan)\b/i, /\bterbukti\b/i];
const CHECK = [/\d+([.,–-]\d+)?\s?(°\s?C|derajat|jam|hari|menit|detik|persen|%|kg|gram|km|meter|tahun|kali)\b/i, /\b(bakteri|kuman|virus|penyakit|sakit|keracunan|berbahaya|aman|sehat|kanker)\b/i,
  /\b(menurut|penelitian|studi|ilmuwan|peneliti|para ahli)\b/i];
function claimScan(text, where) {
  const out = [];
  text.replace(/\[[^\]]*\]/g, ' ').split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(Boolean).forEach(s => {
    const hi = HIGH.find(r => r.test(s)), ck = CHECK.filter(r => r.test(s));
    if (hi) out.push({ level: 'HIGH', where, sentence: s, why: `kata mutlak/jaminan: "${s.match(hi)[0]}"` });
    else if (ck.length) out.push({ level: 'CHECK', where, sentence: s, why: ck.map(r => `"${s.match(r)[0]}"`).join(', ') });
  });
  return out;
}

// ---------- existing state: queue + produced episodes (duplicates, IDs, schedule collisions)
const q = fs.existsSync(queueFile) ? JSON.parse(fs.readFileSync(queueFile, 'utf8'))
  : { schema: 2, tz: 'Asia/Jakarta', produce_at: RULES.produceAt, produce_offset_days: RULES.produceOffsetDays, episodes: [] };
if (q.schema !== 2) { console.error(`queue ${queueFile} is schema ${q.schema}; migrate to schema 2 first (see automation/QUEUE_SCHEMA.md)`); process.exit(2); }
const produced = (fs.existsSync(epRoot) ? fs.readdirSync(epRoot) : []).filter(n => /^ep\d+_/.test(n));
const producedVO = Object.fromEntries(produced.map(n => [path.join(epRoot, n, 'audio', 'vo.mp3'), n]).filter(([f]) => fs.existsSync(f)).map(([f, n]) => [sha(f), n]));
const producedIds = new Map(produced.map(n => [`WS-EP${n.match(/^ep(\d+)_/)[1]}`, n]));
const REPLACEABLE = ['NEEDS_CREATOR_FIX', 'PREFLIGHT_INCOMPLETE'];
const prior = new Map(q.episodes.map(e => [e.id, e]));
// entries that this run may replace do not count as "already there" for duplicate/collision checks
const kept = q.episodes.filter(e => !REPLACEABLE.includes(e.status));
const seen = { vo: new Map(kept.filter(e => e.sha256).map(e => [e.sha256.vo, e.id])), thumbnail: new Map(kept.filter(e => e.sha256).map(e => [e.sha256.thumbnail, e.id])),
  title: new Map(kept.filter(e => e.post_title).map(e => [normT(e.post_title), e.id])) };
const slots = kept.filter(e => e.publish_at).map(e => ({ id: e.id, at: new Date(e.publish_at) }));

// ---------- packages
const all = fs.readdirSync(batchDir);
const pk = all.filter(n => /^ep\d{2,3}$/i.test(n) && fs.statSync(path.join(batchDir, n)).isDirectory()).sort((a, b) => +a.slice(2) - +b.slice(2));
const stray = all.filter(n => !pk.includes(n) && !n.startsWith('.'));
const results = [];
for (const name of pk) {
  const dir = path.join(batchDir, name), epNo = name.slice(2), F = Object.fromEntries(RULES.files.map(f => [f, path.join(dir, f)]));
  const issues = [], add = (sev, check, msg, file = null) => issues.push({ sev, check, file, msg });
  const r = { package: name, id: `WS-EP${epNo}`, issues };
  // 1. presence + names (exact names; near-misses are reported, never renamed)
  const present = fs.readdirSync(dir);
  for (const f of RULES.files) if (!present.includes(f)) { const near = present.find(p => p.toLowerCase() === f.toLowerCase()); add('FIX', 'files', `${f} is missing${near ? ` (found "${near}": the file name must be exactly ${f})` : ''}`, f); }
  const extra = present.filter(p => !RULES.files.includes(p)); if (extra.length) add('INFO', 'files', `extra files kept as-is: ${extra.join(', ')}`);
  const has = f => present.includes(f);          // missing files are reported above; every other check still runs on the files that exist
  // 2. readable
  let txt = {};
  for (const f of ['VO_SCRIPT.md', 'BRIEF.md', 'POST.md'].filter(has)) { const b = fs.readFileSync(F[f]); txt[f] = b.toString('utf8'); if (Buffer.compare(Buffer.from(txt[f], 'utf8'), b) !== 0) add('FIX', 'readable', `${f} is not valid UTF-8 text`, f); if (!txt[f].trim()) add('FIX', 'readable', `${f} is empty`, f); }
  if (has('VO.mp3')) try { r.vo_seconds = +(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', F['VO.mp3']]).toString().trim()).toFixed(2); }
  catch { add('FIX', 'readable', 'VO.mp3 cannot be decoded (ffprobe)', 'VO.mp3'); }
  if (r.vo_seconds != null && !(r.vo_seconds >= RULES.voSeconds[0] && r.vo_seconds <= RULES.voSeconds[1])) add('FIX', 'readable', `VO is ${r.vo_seconds}s, outside the series range ${RULES.voSeconds.join('–')}s`, 'VO.mp3');
  r.sha256 = Object.fromEntries([['vo', 'VO.mp3'], ['vo_script', 'VO_SCRIPT.md'], ['brief', 'BRIEF.md'], ['thumbnail', 'THUMBNAIL.png'], ['post', 'POST.md']].map(([k, f]) => [k, has(f) ? sha(F[f]) : null]));
  // 3. POST.md (creator's editorial decision: validated, never edited)
  const P = frontMatter(txt['POST.md'] || ''), S = frontMatter(txt['VO_SCRIPT.md'] || '');
  // creator formats accepted as written: front matter (title/episode/publish_at/platforms) OR headings "# POST — WS-EP14", "## Judul", "## Hashtag(s)",
  // "## Platform", "## Jadwal" (one "YYYY-MM-DD HH:MM" line). Nothing in the file is rewritten; missing fields → NEEDS_CREATOR_FIX.
  const h1 = (P.body.match(/^#\s+POST\s*[—–-]\s*(\S+)/mi) || [])[1];
  if (!P.fm.episode && h1) P.fm.episode = h1;
  if (!P.fm.title) P.fm.title = (section(P.body, 'Judul') || '').split('\n')[0].trim() || undefined;
  if (!P.fm.platforms) P.fm.platforms = (section(P.body, 'Platform(?:s)?') || '').replace(/^[-*]\s*/gm, '').split('\n').join(',') || undefined;
  if (!P.fm.publish_at) P.fm.publish_at = ((section(P.body, 'Jadwal(?: tayang)?') || '').match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/) || [])[0];
  r.title = P.fm.title || null; r.slug = (P.fm.slug || '').toLowerCase().replace(/[^a-z0-9_]/g, '') || null;
  if (has('POST.md') && !r.title) add('FIX', 'post', 'no post title ("title:" or "## Judul")', 'POST.md');
  const caption = section(P.body, 'Caption'), tagsRaw = section(P.body, 'Hashtags?');
  if (has('POST.md') && !caption) add('FIX', 'post', 'no "## Caption" section (Claude does not write captions)', 'POST.md');
  const hashtags = (tagsRaw || '').match(/#[\p{L}\p{N}_]+/gu) || [];
  if (has('POST.md') && !hashtags.length) add('FIX', 'post', 'no hashtags under "## Hashtags"', 'POST.md');
  const dupTags = hashtags.filter((h, i) => hashtags.findIndex(x => x.toLowerCase() === h.toLowerCase()) !== i); if (dupTags.length) add('FIX', 'post', `repeated hashtags: ${dupTags.join(' ')}`, 'POST.md');
  const platforms = (P.fm.platforms || '').split(/[,\s]+/).map(s => s.toLowerCase()).filter(Boolean);
  if (has('POST.md') && !platforms.length) add('FIX', 'post', 'no target platforms ("platforms:" or "## Platform")', 'POST.md');
  for (const p of platforms) if (!RULES.platforms[p]) add('FIX', 'post', `unknown platform "${p}" (known: ${Object.keys(RULES.platforms).join(', ')})`, 'POST.md');
  if (P.fm.timezone && P.fm.timezone !== 'Asia/Jakarta') add('FIX', 'schedule', `timezone "${P.fm.timezone}": the contract is Asia/Jakarta`, 'POST.md');
  // 4. same episode: the folder name (epNN) must be declared in POST.md and VO_SCRIPT.md; BRIEF must name the episode or its title
  const okEp = v => [name.toLowerCase(), `ws-ep${epNo}`, `ep${epNo}`].includes((v || '').toLowerCase());
  if (has('POST.md') && !okEp(P.fm.episode)) add('FIX', 'identity', `"episode: ${P.fm.episode || ''}" ≠ folder "${name}" (file from another episode?)`, 'POST.md');
  if (has('VO_SCRIPT.md') && !okEp(S.fm.episode)) add('FIX', 'identity', `"episode: ${S.fm.episode || ''}" ≠ folder "${name}" (file from another episode?)`, 'VO_SCRIPT.md');
  const B = txt['BRIEF.md'] || '';
  const briefTitle = ((B.match(/^\s*[-*]?\s*Judul (?:video|cover):\s*\**([^*\n]+?)\**\s*$/mi) || [])[1] || '').trim() || null;
  const briefEp = new RegExp(`\\b(ws-)?ep\\s?0*${+epNo}\\b`, 'i').test(B), briefMentionsTitle = r.title && normT(B).includes(normT(r.title));
  if (has('BRIEF.md') && !briefEp && !briefMentionsTitle && !(S.fm.title && normT(B).includes(normT(S.fm.title)))) add('FIX', 'identity', `names neither ${name} nor the POST/VO_SCRIPT title: is it this episode's brief? (add "episode: ${name}" or the title)`, 'BRIEF.md');
  // 5. titles: the POST title and the THUMBNAIL title must agree editorially. The VIDEO title is a production decision (BRIEF / series standard):
  //    it may differ from the post title and is only reported.
  r.video_title = briefTitle;
  if (has('BRIEF.md') && !briefTitle) add('INFO', 'title', 'BRIEF.md has no "Judul video:"/"Judul cover:" line: the producer takes the video title from the brief text / series standard');
  else if (r.title && normT(briefTitle) !== normT(r.title)) add('INFO', 'title', `video title (BRIEF) "${briefTitle}" differs from POST title "${r.title}": allowed, reported only`);
  if (S.fm.title && r.title && normT(S.fm.title) !== normT(r.title) && (!briefTitle || normT(S.fm.title) !== normT(briefTitle))) add('FIX', 'title', `title "${S.fm.title}" matches neither POST.md "${r.title}" nor the BRIEF video title: conflicting titles`, 'VO_SCRIPT.md');
  // THUMBNAIL.png = social-media post thumbnail (only its title is checked against POST.md; it is never compared with the video)
  if (r.title && has('THUMBNAIL.png')) {
    const c = py('thumbnail_check.py', F['THUMBNAIL.png'], r.title);
    if (!c.ok) add(c.error && c.error.includes('tesseract') ? 'SYSTEM' : 'FIX', 'thumbnail', c.error, 'THUMBNAIL.png');
    else {
      r.thumbnail = { width: c.width, height: c.height, ratio: c.ratio, title_match: c.title_match, ocr_text: c.matched_text };
      if (c.format !== 'PNG') add('FIX', 'thumbnail', `file is ${c.format}, not PNG`, 'THUMBNAIL.png');
      add('INFO', 'thumbnail', `${c.width}×${c.height} (ratio ${c.ratio}); publisher-only asset: per-platform resize/pad is technical and reported, the design is never changed`);
      if (c.title_match < RULES.titleOcrPass) add('FIX', 'title', `thumbnail text vs POST title "${r.title}": match ${c.title_match} (< ${RULES.titleOcrPass}), OCR read "${c.matched_text}". Creator: fix one of the two, or confirm they agree (OCR can misread stylised lettering)`, 'THUMBNAIL.png + POST.md');
    }
  }
  r.thumbnail_in_video = /THUMBNAIL\.png/i.test(B);
  if (r.thumbnail_in_video) add('INFO', 'thumbnail', 'BRIEF.md mentions THUMBNAIL.png: the producer follows that exact sentence only, and never uses the thumbnail as the opening or closing', 'BRIEF.md');
  // 6. VO_SCRIPT ↔ VO (audio is the truth)
  if (has('VO.mp3') && has('VO_SCRIPT.md')) {
    const v = py('vo_check.py', F['VO.mp3'], F['VO_SCRIPT.md']);
    if (!v.ok) add('SYSTEM', 'vo_script', `VO check could not run: ${v.error}`);
    else {
      r.vo_script = { similarity: v.similarity, script_words: v.script_words, heard_words: v.heard_words, tags: v.tags.length, diffs: v.diffs };
      if (v.similarity < RULES.scriptFail) add('FIX', 'vo_script', `matches the audio only ${v.similarity} (< ${RULES.scriptFail}): script and VO from different episodes or versions?`, 'VO_SCRIPT.md / VO.mp3');
      else if (v.similarity < RULES.scriptPass) add('FIX', 'vo_script', `matches the audio ${v.similarity} (< ${RULES.scriptPass}), ${v.diffs.length} differences listed below: the audio is the truth, align the script to it (or send the intended VO)`, 'VO_SCRIPT.md');
      else if (v.diffs.length) add('INFO', 'vo_script', `VO_SCRIPT ↔ audio ${v.similarity}; ${v.diffs.length} small diffs (often Whisper mishearing), listed in the report`);
    }
  }
  // 7. schedule: valid WIB time, lead time, collisions
  const at = parseWIB(P.fm.publish_at);
  if (!at && has('POST.md')) add('FIX', 'schedule', P.fm.publish_at ? `publish_at "${P.fm.publish_at}" is not a valid "YYYY-MM-DD HH:MM" (Asia/Jakarta)` : 'no publish date/time ("publish_at:" or "## Jadwal" with YYYY-MM-DD HH:MM WIB)', 'POST.md');
  else if (at) {
    r.publish_at = wibISO(at); r.target_date = wibDate(at); r.produce_date = addDays(r.target_date, -RULES.produceOffsetDays);
    const lead = (at - NOW) / 3600e3;
    if (lead <= 0) add('FIX', 'schedule', `publish_at ${r.publish_at} is in the past`, 'POST.md');
    else if (lead < RULES.leadHours) add('FIX', 'schedule', `only ${lead.toFixed(1)} h before publish_at: production runs H-${RULES.produceOffsetDays} ${RULES.produceAt} WIB, it needs ≥ ${RULES.leadHours} h`, 'POST.md');
    for (const s of slots) { const gap = Math.abs(at - s.at) / 3600e3; if (wibDate(s.at) === r.target_date || gap < RULES.minGapHours) add('FIX', 'schedule', `collides with ${s.id} at ${wibISO(s.at)} (same day or < ${RULES.minGapHours} h apart)`, 'POST.md'); }
  }
  // 8. duplicates (queue, this batch, already produced episodes)
  if (r.sha256.vo) {
    if (producedVO[r.sha256.vo]) add('FIX', 'duplicate', `identical to episodes/${producedVO[r.sha256.vo]}/audio/vo.mp3 (already produced)`, 'VO.mp3');
    if (producedIds.has(r.id)) add('FIX', 'duplicate', `folder ${name} = ${r.id}, which already exists as episodes/${producedIds.get(r.id)}`, 'folder name');
    for (const [k, v, f] of [['vo', r.sha256.vo, 'VO.mp3'], ['thumbnail', r.sha256.thumbnail, 'THUMBNAIL.png'], ['title', normT(r.title), 'POST.md']]) if (v && seen[k].has(v)) add('FIX', 'duplicate', `same ${k} as ${seen[k].get(v)}`, f);
  }
  // 9. per-platform text (format only: the words, title and hashtags are the creator's)
  if (caption && hashtags.length && r.title) {
    r.platform_text = {};
    for (const p of platforms.filter(p => RULES.platforms[p])) {
      const L = RULES.platforms[p], body = `${caption}\n\n${hashtags.join(' ')}`, t = {};
      if (p === 'youtube') { t.title = r.title; t.description = body; if (r.title.length > L.titleMax) add('FIX', 'post', `title is ${r.title.length} chars, YouTube allows ${L.titleMax}`, 'POST.md'); if (/[<>]/.test(r.title)) add('FIX', 'post', 'title contains < or >, which YouTube rejects', 'POST.md'); }
      else t.caption = body;
      if (body.length > L.max) add('FIX', 'post', `${p}: caption + hashtags = ${body.length} chars > ${L.max} (Claude does not shorten it)`, 'POST.md');
      if (hashtags.length > L.tags) add('FIX', 'post', `${p}: ${hashtags.length} hashtags > ${L.tags}`, 'POST.md');
      r.platform_text[p] = t;
    }
  }
  // 10. risky factual claims → editorial flags (nothing is rewritten)
  r.editorial_flags = [...claimScan(S.body.split('\n').filter(l => !/^\s*(#|>)/.test(l)).join('\n'), 'VO_SCRIPT'), ...claimScan(caption || '', 'POST caption')];
  // brief conditions the VO leaves out: numbers with units in the brief's claims section (heading containing "klaim") that the VO never says
  const claimSec = (B.match(/^##+[^\n]*klaim[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/mi) || [])[1] || '';
  const unitRe = /(\d+(?:[.,]\d+)?(?:\s?[–-]\s?\d+)?)\s?(°\s?C|derajat|jam|hari|menit|persen|%)/gi, keyOf = (n, u) => n.replace(/\s/g, '').replace('-', '–') + ' ' + u.toLowerCase().replace(/\s/g, '').replace('derajat', '°c');
  const voNums = new Set([...S.body.matchAll(unitRe)].map(m => keyOf(m[1], m[2])));
  const capNums = new Set([...(caption || '').matchAll(unitRe)].map(m => keyOf(m[1], m[2])));
  const missing = has('VO_SCRIPT.md') ? [...new Set([...claimSec.matchAll(unitRe)].map(m => keyOf(m[1], m[2])))].filter(k => !voNums.has(k)) : [];
  for (const k of missing) { const line = claimSec.split('\n').find(l => [...l.matchAll(unitRe)].some(m => keyOf(m[1], m[2]) === k)) || ''; const inCap = capNums.has(k); r.editorial_flags.push({ level: inCap ? 'CHECK' : 'HIGH', where: 'BRIEF vs VO', sentence: line.replace(/^\s*\d+\.\s*/, '').trim().slice(0, 300), why: inCap ? `"${k}" is not in the VO but the creator's POST caption states it` : `the brief's claim limits mention "${k}", the VO never says it: an omitted condition?` }); }
  const hi = r.editorial_flags.filter(f => f.level === 'HIGH');
  if (hi.length) add('FIX', 'claims', `${hi.length} claim flag(s) for editorial correction (absolute wording, or a condition in BRIEF that the VO omits): ${hi.map(f => f.why).join(' · ')}. Creator decides: correct VO/caption, or confirm as intended`, 'VO.mp3 / VO_SCRIPT.md / POST.md');
  if (r.editorial_flags.length - hi.length) add('INFO', 'claims', `${r.editorial_flags.length - hi.length} sentence(s) with numbers/health terms to fact-check (listed)`);
  // register for in-batch duplicate/collision checks (also when the episode needs a fix: the creator sees every clash)
  for (const [k, v] of [['vo', r.sha256.vo], ['thumbnail', r.sha256.thumbnail], ['title', normT(r.title)]]) if (v && !seen[k].has(v)) seen[k].set(v, name);
  if (at) slots.push({ id: name, at });
  results.push(r);
}

// ---------- queue entries: one per episode folder
const statusOf = r => r.issues.some(i => i.sev === 'FIX') ? 'NEEDS_CREATOR_FIX' : r.issues.some(i => i.sev === 'SYSTEM') ? 'PREFLIGHT_INCOMPLETE' : 'QUEUED';
const rows = [], untouched = [];
for (const r of results) {
  const old = prior.get(r.id);
  if (old && !REPLACEABLE.includes(old.status)) {      // already QUEUED or further: never replaced by a re-run
    const same = old.sha256 && r.sha256 && Object.keys(old.sha256).every(k => old.sha256[k] === r.sha256[k]);
    untouched.push({ id: r.id, status: old.status, note: same ? 'unchanged' : 'files differ from the queued version: the queued entry is kept until the creator gives an instruction' });
    r.queueNote = untouched.at(-1).note; continue;
  }
  const id = r.id, fix = r.issues.filter(i => i.sev === 'FIX'), sys = r.issues.filter(i => i.sev === 'SYSTEM');
  const files = Object.fromEntries([['vo', 'VO.mp3'], ['vo_script', 'VO_SCRIPT.md'], ['brief', 'BRIEF.md'], ['thumbnail', 'THUMBNAIL.png'], ['post', 'POST.md']].map(([k, f]) => [k, rel(path.join(batchDir, r.package, f))]));
  r.status = statusOf(r);
  rows.push({ id, batch: path.basename(path.resolve(batchDir)), package: r.package, slug: r.slug || null, post_title: r.title || null, video_title: r.video_title || null,
    publish_at: r.publish_at || null, target_date: r.target_date || null, produce_date: r.produce_date || null,
    files, sha256: r.sha256 || null, vo_seconds: r.vo_seconds ?? null,
    roles: { narration_sync: ['vo', 'vo_script'], video_production: ['brief'], social_post: ['thumbnail', 'post'] },
    thumbnail: r.thumbnail ? { ...r.thumbnail, use: 'social post thumbnail only', opening_closing: false, brief_mentions: !!r.thumbnail_in_video } : null,
    post: { platforms: Object.keys(r.platform_text || {}) }, platform_text: r.platform_text || null,
    checks: { vo_script_similarity: r.vo_script ? r.vo_script.similarity : null, thumbnail_title_match: r.thumbnail ? r.thumbnail.title_match : null },
    editorial_flags: r.editorial_flags || [],
    creator_fix: fix.map(i => ({ file: i.file, check: i.check, msg: i.msg })), system_issues: sys.map(i => `${i.check}: ${i.msg}`),
    creator_confirmations: [],
    status: r.status, attempts: 0, max_attempts: 3, claimed_by: null, claimed_at: null,
    output_dir: `outputs/${id}/`, log: `outputs/${id}/LOG.md`, qc: null, published: Object.fromEntries(Object.keys(r.platform_text || {}).map(p => [p, null])) });
}
const counts = s => rows.filter(x => x.status === s).length;

// ---------- report (always written)
const L = [`# Preflight — ${path.basename(path.resolve(batchDir))}`, '', `Dijalankan: ${wibISO(NOW)} (Asia/Jakarta) · folder episode: ${pk.length} · QUEUED: ${counts('QUEUED')} · NEEDS_CREATOR_FIX: ${counts('NEEDS_CREATOR_FIX')} · PREFLIGHT_INCOMPLETE: ${counts('PREFLIGHT_INCOMPLETE')}` +
  (untouched.length ? ` · sudah di antrean (tidak diganti): ${untouched.map(u => `${u.id} ${u.note}`).join('; ')}` : '') + (stray.length ? ` · bukan folder epNN, diabaikan: ${stray.join(', ')}` : ''), '',
  `Queue: \`${queueFile}\` ${flag('--dry') ? '(dry run: tidak ditulis)' : '(ditulis)'}. Tidak ada jadwal aktif dan tidak ada posting yang dibuat oleh preflight.`, '',
  '| Paket | ID | Tayang (WIB) | Produksi | Status | Judul POST | Judul video (BRIEF) | Thumbnail OCR | VO_SCRIPT↔VO |', '|---|---|---|---|---|---|---|---|---|'];
for (const r of results) { L.push(`| ${r.package} | ${r.id} | ${r.publish_at || '—'} | ${r.produce_date ? r.produce_date + ' ' + RULES.produceAt : '—'} | ${r.status || prior.get(r.id).status + ' (tetap)'} | ${r.title || '—'} | ${r.video_title || '—'} | ${r.thumbnail ? r.thumbnail.title_match : '—'} | ${r.vo_script ? r.vo_script.similarity : '—'} |`); }
for (const r of results) {
  L.push('', `## ${r.package}`, '');
  for (const i of r.issues) L.push(`- **${{ FIX: 'PERLU DIPERBAIKI CREATOR', SYSTEM: 'CEK TIDAK JALAN (sistem)', INFO: 'info' }[i.sev]}** · ${i.file ? `\`${i.file}\` · ` : ''}${i.check}: ${i.msg}`);
  if (r.queueNote) L.push(`- antrean: ${r.queueNote}`);
  if (!r.issues.length) L.push('- semua cek lolos');
  if (r.vo_script && r.vo_script.diffs.length) { L.push('', 'Selisih VO_SCRIPT ↔ audio (audio = kebenaran; perbaiki naskah, bukan VO):', '', '| Naskah | Terdengar |', '|---|---|'); r.vo_script.diffs.forEach(d => L.push(`| ${d.script || '∅'} | ${d.heard || '∅'} |`)); }
  if (r.editorial_flags && r.editorial_flags.length) { L.push('', 'Tanda editorial (tidak ada yang diubah):', '', '| Level | Di | Kalimat | Alasan |', '|---|---|---|---|'); r.editorial_flags.forEach(f => L.push(`| ${f.level} | ${f.where} | ${f.sentence} | ${f.why} |`)); }
  if (r.platform_text) { L.push('', 'Teks akhir per platform (hanya digabung/diformat; judul, caption, dan hashtag persis dari POST.md):'); for (const [p, t] of Object.entries(r.platform_text)) { L.push('', `**${p}**`, '```'); if (t.title) L.push(`[judul] ${t.title}`, '[deskripsi]'); L.push(t.caption || t.description, '```'); } }
}
fs.mkdirSync(path.dirname(path.resolve(reportFile)), { recursive: true }); fs.writeFileSync(reportFile, L.join('\n') + '\n');
console.log(JSON.stringify({ batch: batchDir, episodes: pk.length, entries: rows.map(x => `${x.id} ${x.status} ${x.publish_at || '-'} ${x.post_title || '-'}`), kept: untouched, report: reportFile }, null, 2));
if (flag('--dry')) process.exit(rows.every(x => x.status === 'QUEUED') ? 0 : 1);
const ids = new Set(rows.map(x => x.id));
q.episodes = [...q.episodes.filter(e => !ids.has(e.id)), ...rows].sort((a, b) => (a.publish_at || '9999').localeCompare(b.publish_at || '9999') || a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(path.resolve(queueFile)), { recursive: true }); fs.writeFileSync(queueFile, JSON.stringify(q, null, 2) + '\n'); console.log('queue written:', queueFile);
process.exit(rows.every(x => x.status === 'QUEUED') ? 0 : 1);
