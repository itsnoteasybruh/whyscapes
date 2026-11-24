// /eksekusizip: split the creator's COMBINED episode MD into the pipeline inputs, verbatim. Pure functions, no I/O.
// The creator's words are never rewritten: every derived file is made of exact slices of the MD (front matter keys are added only
// so preflight/publisher can read them; their values are copied from the MD). What cannot be found is reported, never invented.
//
// Recognised (case-insensitive; "##" headings of any level ≥ 2, or bold labels "**Label:**"):
//   episode   first "EP<nn>" in the H1 (or the first line that has one)                 → WS-EP<nn>
//   schedule  a line with "target tayang" / "jadwal tayang" / "tayang:" / "publish_at:" holding a date + time:
//             "2026-11-25 21:00" | "25 Nov 2026, 21.00 WIB" | "Rabu, 25 November 2026 pukul 21.00 WIB"   (Asia/Jakarta)
//   channels  a line with "kanal" / "platform": facebook|fb, instagram|ig (youtube = manual, not automated)
//   VO        section "Naskah VO" / "VO" / "VO final" / "Narasi" / "Voice over"            → VO_SCRIPT.md
//   visual    section "Arahan visual" / "Visual" / "Brief" / "Storyboard" / "Adegan"      → BRIEF.md
//   post      "**Judul:**" or section "Judul"; "**Caption:**" block or section "Caption"; "**Hashtag(s):**" or section "Hashtag(s)" → POST.md
// The archive's file name is never used as the schedule.
const MONTHS = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  agu: 8, ags: 8, agt: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12 };
const pad = n => String(n).padStart(2, '0');

// "YYYY-MM-DD HH:MM" (WIB) from a line, or null
function parseWhen(line) {
  const s = String(line).replace(/\*/g, ' ');
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T,]+(?:pukul\s+)?(\d{1,2})[.:](\d{2})/i);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${pad(m[4])}:${m[5]}`;
  m = s.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})[\s,]+(?:pukul\s+|jam\s+)?(\d{1,2})[.:](\d{2})/i);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])} ${pad(m[4])}:${m[5]}`;
  return null;
}
// sections by markdown heading (level ≥ 2) → [{title, level, body}]
function sections(md) {
  const lines = md.split('\n'), out = []; let cur = null;
  for (const l of lines) {
    const h = l.match(/^(#{2,6})\s+(.*?)\s*#*\s*$/);
    if (h) { cur = { title: h[2].trim(), level: h[1].length, body: [] }; out.push(cur); continue; }
    if (cur) cur.body.push(l);
  }
  return out.map(x => ({ ...x, body: x.body.join('\n').trim() }));
}
// a section whose title matches re, including its deeper sub-sections (until the next heading of the same or higher level)
function sectionText(md, re) {
  const lines = md.split('\n'); let start = -1, lvl = 0;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{2,6})\s+(.*)$/);
    if (start < 0 && h && re.test(h[2])) { start = i + 1; lvl = h[1].length; continue; }
    if (start >= 0 && h && h[1].length <= lvl) return lines.slice(start, i).join('\n').trim();
  }
  return start >= 0 ? lines.slice(start).join('\n').trim() : null;
}
const boldLabel = (md, re) => { const m = md.match(new RegExp(`^\\s*[-*]?\\s*\\*\\*(?:${re}):\\*\\*[ \\t]*(\\S.*)$`, 'mi')); return m ? m[1].trim() : null; };
function boldBlock(md, re) {
  const m = md.match(new RegExp(`^\\s*\\*\\*(?:${re}):\\*\\*[ \\t]*\\n([\\s\\S]*?)(?=^\\s*[-*]?\\s*\\*\\*[^*\\n]+:\\*\\*|^#{1,6}\\s|(?![\\s\\S]))`, 'mi'));
  const v = m ? m[1].trim() : ''; return v || null;
}

function splitEpisodeMd(md) {
  const problems = [], out = {};
  const h1 = (md.match(/^#\s+(.+)$/m) || [])[1] || '';
  const epm = (h1.match(/EP\s*0*(\d{1,3})\b/i) || md.match(/\bEP\s*0*(\d{1,3})\b/i) || [])[1];
  out.episode = epm ? `WS-EP${pad(+epm)}` : null;
  if (!out.episode) problems.push({ part: 'episode', msg: 'no "EP<nn>" in the title line' });
  // schedule: the first line that names the slot and holds a parsable date + time
  const schedLine = md.split('\n').find(l => /(target\s+tayang|jadwal\s+tayang|\btayang\s*:|publish_at\s*:)/i.test(l) && parseWhen(l));
  out.publish_at_wib = schedLine ? parseWhen(schedLine) : null;
  out.schedule_line = schedLine ? schedLine.trim() : null;
  if (!out.publish_at_wib) problems.push({ part: 'schedule', msg: 'no target date + time (e.g. "Target tayang: 25 Nov 2026, 21.00 WIB")' });
  const chanLine = md.split('\n').find(l => /\b(kanal|platforms?)\b/i.test(l)) || '';
  out.channels = [['facebook', /\b(facebook|fb)\b/i], ['instagram', /\b(instagram|ig)\b/i]].filter(([, re]) => re.test(chanLine)).map(([c]) => c);
  out.youtube_manual = /\byoutube\b/i.test(chanLine);
  if (!out.channels.length) problems.push({ part: 'channels', msg: 'no channel line naming Facebook and/or Instagram ("Kanal: Facebook Reels, Instagram Reels")' });
  out.vo_script = sectionText(md, /^(naskah\s*vo|vo(\s+final)?|narasi|voice\s*-?\s*over)\b/i);
  if (!out.vo_script) problems.push({ part: 'vo', msg: 'no VO script section ("## Naskah VO")' });
  out.brief = sectionText(md, /^(arahan\s+visual|visual|brief|storyboard|adegan)\b/i);
  if (!out.brief) problems.push({ part: 'visual', msg: 'no visual direction section ("## Arahan visual")' });
  out.title = boldLabel(md, 'Judul') || ((sectionText(md, /^judul\b/i) || '').split('\n')[0].trim() || null);
  out.caption = boldBlock(md, 'Caption') || sectionText(md, /^caption\b/i);
  out.hashtags_line = boldLabel(md, 'Hashtags?') || sectionText(md, /^hashtags?\b/i);
  out.hashtags = ((out.hashtags_line || '').match(/#[\p{L}\p{N}_]+/gu) || []);
  if (!out.title) problems.push({ part: 'post', msg: 'no post title ("**Judul:** …")' });
  if (!out.caption) problems.push({ part: 'post', msg: 'no caption ("**Caption:**" block)' });
  if (!out.hashtags.length) problems.push({ part: 'post', msg: 'no hashtags ("**Hashtag:** #…")' });
  return { ...out, problems };
}
// derived pipeline files (front matter values copied from the MD; bodies are verbatim slices)
function derivedFiles(s) {
  const fm = o => '---\n' + Object.entries(o).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---\n';
  return {
    'VO_SCRIPT.md': fm({ episode: s.episode, title: s.title }) + `\n${s.vo_script}\n`,
    'BRIEF.md': `# BRIEF — ${s.episode}\n\n${s.brief}\n`,
    'POST.md': fm({ episode: s.episode, title: s.title, publish_at: s.publish_at_wib, timezone: 'Asia/Jakarta', platforms: s.channels.join(', ') }) +
      `\n## Caption\n\n${s.caption}\n\n## Hashtags\n\n${s.hashtags_line}\n`,
  };
}
module.exports = { parseWhen, sections, sectionText, splitEpisodeMd, derivedFiles, MONTHS };
