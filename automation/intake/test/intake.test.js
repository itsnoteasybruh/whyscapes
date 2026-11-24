// /eksekusizip intake: no network, no Meta, no production. node --test automation/intake/test/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const SM = require('../split_md'), SR = require('../../schedule_rules'), C = require('../../publisher/core');
const INTAKE = path.join(__dirname, '..', 'eksekusizip.js'), SAFE = path.join(__dirname, '..', 'safe_extract.py');
const MD = (o = {}) => `# Whyscape EP${o.ep || 15} — Kenapa Kita Cegukan?

- Target tayang: ${o.when || 'Rabu, 25 November 2026 pukul 21.00 WIB'}
- Kanal: Facebook Reels, Instagram Reels (YouTube manual)

## Naskah VO (tag ekspresi ElevenLabs v4)

> [curious] Hik! Kok tiba-tiba cegukan?
>
> Coba kita ikuti jejaknya.

## Arahan visual

| Pemicu VO | Aksi |
| --- | --- |
| "Hik!" | Mpi tersentak. |

## Paket posting

**Judul:** Kenapa Kita Cegukan?

${o.noCaption ? '' : '**Caption:**\n\nDiafragma bisa kaget. ❄️\n\nPernah cegukan lama? 🔎\n'}
**Hashtag:** #Whyscape #Cegukan #SainsSehariHari
`;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ez-'));
function pkg(dir, name, files) {          // a ZIP with the given {relpath: content|'MP3'|'PNG'|'JPG'}
  const src = path.join(dir, name + '_src'); fs.mkdirSync(src, { recursive: true });
  for (const [rel, c] of Object.entries(files)) {
    const f = path.join(src, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
    if (c === 'MP3') execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', f]);
    else if (c === 'PNG' || c === 'JPG') execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=108x192', '-frames:v', '1', f]);
    else fs.writeFileSync(f, c);
  }
  const zip = path.join(dir, name + '.zip');
  execFileSync('python3', ['-c', `import zipfile,os,sys\nz=zipfile.ZipFile(sys.argv[1],'w')\nfor r,d,fs in os.walk(sys.argv[2]):\n  for n in fs:\n    p=os.path.join(r,n); z.write(p, os.path.relpath(p, sys.argv[2]))\nz.close()`, zip, src]);
  return zip;
}
const run = (args, root) => { const r = spawnSync(process.execPath, [INTAKE, ...args, '--root', root, '--no-preflight'], { encoding: 'utf8' }); return { code: r.status, json: r.stdout.includes('{') ? JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))) : null, err: r.stderr }; };

test('dates: ISO and Indonesian forms → "YYYY-MM-DD HH:MM" WIB', () => {
  for (const [s, want] of [['Target tayang: 2026-11-25 21:00', '2026-11-25 21:00'], ['Target tayang: Rabu, 25 November 2026 pukul 21.00 WIB', '2026-11-25 21:00'],
    ['Jadwal tayang: **25 Nov 2026, 21.00 WIB**', '2026-11-25 21:00'], ['tayang: 3 Des 2026 21:30', '2026-12-03 21:30'], ['Target tayang: segera', null]]) assert.equal(SM.parseWhen(s), want, s);
});

test('split: every derived part is an exact slice of the MD; POST.md reads back identical in the publisher', () => {
  const md = MD(), s = SM.splitEpisodeMd(md);
  assert.deepEqual(s.problems, []); assert.equal(s.episode, 'WS-EP15'); assert.equal(s.publish_at_wib, '2026-11-25 21:00'); assert.deepEqual(s.channels, ['facebook', 'instagram']); assert.equal(s.youtube_manual, true);
  for (const k of ['vo_script', 'brief', 'caption', 'hashtags_line', 'title']) assert.ok(md.includes(s[k]), k);
  const d = tmp(), files = SM.derivedFiles(s); for (const [f, b] of Object.entries(files)) fs.writeFileSync(path.join(d, f), b);
  const p = C.readPost(path.join(d, 'POST.md'));
  assert.equal(p.title, 'Kenapa Kita Cegukan?'); assert.equal(p.caption, 'Diafragma bisa kaget. ❄️\n\nPernah cegukan lama? 🔎'); assert.deepEqual(p.hashtags, ['#Whyscape', '#Cegukan', '#SainsSehariHari']); assert.equal(p.publish_at, '2026-11-25 21:00');
  assert.ok(files['VO_SCRIPT.md'].includes('> [curious] Hik! Kok tiba-tiba cegukan?'));
});

test('schedule rules: production 16.00 WIB on the publish date; late package or a too-early slot is held (never shifted)', () => {
  const at = new Date('2026-11-25T14:00:00Z');                         // 25 Nov 21.00 WIB
  assert.equal(SR.produceAtFor(at).toISOString(), '2026-11-25T09:00:00.000Z');   // 25 Nov 16.00 WIB
  assert.deepEqual(SR.intakeTiming(new Date('2026-11-24T12:00:00Z'), at).problems, []);
  assert.match(SR.intakeTiming(new Date('2026-11-25T09:00:00Z'), at).problems.join(), /after production start \(2026-11-25 16:00 WIB\)/);
  assert.match(SR.intakeTiming(new Date('2026-11-24T12:00:00Z'), new Date('2026-11-25T12:00:00Z')).problems.join(), /needs ≥ 5 h/);   // 19.00 slot
  assert.equal(SR.RULES.produceOffsetDays, 0); assert.equal(SR.RULES.produceAt, '16:00');
});

test('safe extraction refuses "../" paths and symlinks; extracts a normal ZIP', () => {
  const d = tmp(), evil = path.join(d, 'evil.zip');
  execFileSync('python3', ['-c', `import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1],'w'); z.writestr('../escape.txt','x'); z.close()`, evil]);
  let r = spawnSync('python3', [SAFE, evil, path.join(d, 'o1')], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.match(r.stdout, /unsafe path/); assert.ok(!fs.existsSync(path.join(d, 'escape.txt')));
  const link = path.join(d, 'link.zip');
  execFileSync('python3', ['-c', `import zipfile,sys,stat\nz=zipfile.ZipFile(sys.argv[1],'w'); i=zipfile.ZipInfo('l'); i.external_attr=(stat.S_IFLNK|0o777)<<16; z.writestr(i,'/etc/passwd'); z.close()`, link]);
  r = spawnSync('python3', [SAFE, link, path.join(d, 'o2')], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.match(r.stdout, /symlink/);
  const ok = pkg(d, 'ok', { 'a/EP15.md': MD(), 'a/vo.mp3': 'MP3', 'a/thumb.png': 'PNG' });
  r = spawnSync('python3', [SAFE, ok, path.join(d, 'o3')], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout); assert.deepEqual(JSON.parse(r.stdout).files, ['a/EP15.md', 'a/thumb.png', 'a/vo.mp3']);
});

test('intake: a good episode is split and kept with its sources; a problem episode is held while the other continues; archive name is not the schedule', () => {
  const d = tmp(), root = tmp();
  const a1 = pkg(d, 'EP15_tayang_2026-11-30', { 'EP15.md': MD(), 'VO_EP15.mp3': 'MP3', 'thumb.jpg': 'JPG' });            // name says 30 Nov; MD says 25 Nov
  const a2 = pkg(d, 'ep16', { 'EP16.md': MD({ ep: 16, when: 'Kamis, 26 November 2026 pukul 21.00 WIB', noCaption: true }), 'vo.mp3': 'MP3', 'thumb.png': 'PNG' });
  const r = run([a1, a2, '--now', '2026-11-24T12:00:00Z', '--batch', 'b1'], root);
  assert.equal(r.code, 1);                                            // one episode held
  const e15 = r.json.episodes.find(e => e.id === 'WS-EP15'), e16 = r.json.episodes.find(e => e.id === 'WS-EP16');
  assert.equal(e15.status, 'SPLIT_OK'); assert.equal(e15.publish_at_wib, '2026-11-25 21:00'); assert.equal(e15.produce_at, '2026-11-25T09:00:00.000Z');
  for (const f of ['VO.mp3', 'THUMBNAIL.png', 'VO_SCRIPT.md', 'BRIEF.md', 'POST.md', 'SOURCE/EP15.md', 'SOURCE/VO_EP15.mp3', 'SOURCE/thumb.jpg']) assert.ok(fs.existsSync(path.join(root, 'inbox/b1/ep15', f)), f);
  assert.equal(fs.readFileSync(path.join(root, 'inbox/b1/ep15/VO.mp3')).equals(fs.readFileSync(path.join(root, 'inbox/b1/ep15/SOURCE/VO_EP15.mp3'))), true);   // VO byte-identical
  assert.ok(e15.thumbnail_conversion);                                // JPG → PNG recorded
  assert.equal(e16.status, 'HOLD_NEEDS_CREATOR_DECISION'); assert.match(e16.problems.map(p => p.msg).join(), /no caption/);
  assert.ok(fs.existsSync(path.join(root, 'inbox/b1/_hold/ep16/HOLD.json'))); assert.ok(!fs.existsSync(path.join(root, 'inbox/b1/ep16')));
  assert.ok(fs.existsSync(path.join(root, 'inbox/b1/_archives/EP15_tayang_2026-11-30.zip'))); assert.ok(!fs.existsSync(path.join(root, 'inbox/b1/_extract')));
  // the same batch name is never overwritten
  assert.equal(run([a1, '--batch', 'b1'], root).code, 2);
});

test('intake: more than five archives refused; a package received after 16.00 WIB on its publish date is held (slot not shifted)', () => {
  const d = tmp(), root = tmp(), a = pkg(d, 'ep15', { 'EP15.md': MD(), 'vo.mp3': 'MP3', 'thumb.png': 'PNG' });
  const six = Array.from({ length: 6 }, (_, i) => { const f = path.join(d, `c${i}.zip`); fs.copyFileSync(a, f); return f; });
  const r6 = run(six, root); assert.equal(r6.code, 2); assert.match(r6.err, /at most 5/);
  const late = run([a, '--now', '2026-11-25T09:05:00Z', '--batch', 'late'], root);     // 25 Nov 16.05 WIB
  const e = late.json.episodes[0]; assert.equal(e.status, 'HOLD_NEEDS_CREATOR_DECISION'); assert.match(e.problems.map(p => p.msg).join(), /after production start/); assert.equal(e.publish_at_wib, '2026-11-25 21:00');
});
