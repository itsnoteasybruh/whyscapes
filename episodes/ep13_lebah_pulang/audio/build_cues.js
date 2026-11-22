// EP13 cue sheet (VO Genesius, 1,00x, starting at lib.VO_OFFSET behind the cover). All times are VIDEO time (W() already includes the offset).
// Run (project root): node episodes/ep13_lebah_pulang/audio/build_cues.js → (in audio/) python synth_ep13.py cues.json && python mix_ep13.py cues.json final && python audibility.py final cues.json
const path = require('path'), fs = require('fs');
const L = require('../lib'); const EP = require('../episode');
const J = require('../../../series/transition/jejak');
const A = require('../scenes_a').A, B = require('../scenes_b').B, C = require('../scenes_c').C, D = require('../scenes_d').D, E = require('../scenes_e').E;
const { W, END, SWITCH, t0, VO_OFFSET } = L;
const ev = [];
const X = (cls, label, name, t, o = {}) => { if (t < 0 || t > END - .05) return; ev.push({ cls, label, name, t: +t.toFixed(3), pan: o.pan || 0, trim: o.trim || 0, gain: o.gain || 1, why: o.why || '', anchor: o.anchor || '', ...(o.args ? { args: o.args } : {}) }); };

// identity (locked)
X('id', 'cover pembuka (logo)', 'chime', .04, { gain: .7, anchor: 'frame 0' });
X('id', '"Coba kita ikuti jejaknya": tapak Mpi + lebah kecil di jalur → masuk ke penerbangan orientasi', 'motif_transisi', t0 + J.MOTIF.at, { gain: 1.0, why: 'motif signature tidak diubah', anchor: '"Coba"' });
X('id', 'cover penutup (logo)', 'chime', END - 1.43, { gain: .65, anchor: 'END − 1,43' });

// ambience per shot
const KIND = { hook: 'garden', mapsJoke: 'garden', atHive: 'hive', loops: 'diagram', landmarks: 'garden', learn: 'garden', lookUp: 'garden', sunCompass: 'diagram', keys: 'garden',
  flight: 'garden', beeEye: 'diagram', estimate: 'garden', differ: 'diagram', homing: 'diagram', experiment: 'lab', magicLine: 'garden', payoff: 'hive', cta: 'strange' };
const LABEL = { garden: 'kebun: angin di daun, burung jauh sesekali, tanpa suara orang', hive: 'dekat sarang: dengung koloni lembut (di bawah VO)', diagram: 'dunia penjelas: udara lembut',
  lab: 'meja penelitian: ruang tenang', strange: 'kebun asing: angin berbeda warna, jangkrik jauh' };
const shots = EP.SC; let i = 0;
while (i < shots.length) {
  const kind = KIND[shots[i][0]]; let j = i; while (j + 1 < shots.length && KIND[shots[j + 1][0]] === kind) j++;
  const a = Math.max(0, shots[i][1] - .3), b = j + 1 < shots.length ? shots[j + 1][1] + .35 : END;
  X('ambience', LABEL[kind] + ` (${shots.slice(i, j + 1).map(s => s[0]).join(', ')})`, 'amb_' + kind, a, { args: { dur: +(b - a).toFixed(2) }, anchor: `shot ${shots[i][0]}` });
  i = j + 1;
}

// 1. hook
X('movement', 'lebah keluar dari pintu sarang', 'buzz', A.keluar, { pan: -.4, args: { dur: .9, size: .8, near: .4 } });
X('hero', 'lebah melintas dekat kamera', 'passby', A.keluar + .55, { pan: 0, args: { dur: 1.1 }, anchor: '"keluar dari sarangnya"' });
X('movement', 'menuju pohon', 'buzz', A.pohon, { pan: .2, trim: 4, args: { dur: .9, size: 1.1, near: .5 } });
X('movement', 'Mpi berjalan di jalan setapak', 'grassstep', A.kebun, { pan: .1, args: { n: 5, iv: .38 } });
X('hero', 'mampir: bunga menunduk', 'flowerbob', A.mampir + .3, { pan: .3, anchor: '"mampir"' });
X('movement', 'bunga ke bunga', 'flowerbob', A.bunga, { pan: .4, trim: -2 });
X('movement', 'bunga ketiga', 'flowerbob', A.bunga + .9, { pan: .5, trim: -4 });
X('hero', 'Mpi mengangkat HP (lebah tidak punya)', 'phonepop', A.maps, { pan: -.2, anchor: '"buka Maps"' });
X('movement', 'tanda silang di kartu lebah', 'nope2', A.maps + .5, { pan: .3, trim: -2 });
X('hero', 'tarik kamera: sarang kecil jauh', 'pullback', A.rumahnya - .1, { pan: 0, args: { dur: 1.2 }, anchor: '"rumahnya di mana?"' });
X('movement', 'tanda tanya di sarang', 'qpop', A.rumahnya + .3, { pan: -.4, trim: -3 });

// 2. orientation flight
X('hero', 'masuk kilas balik', 'flashback', B.sebelum, { pan: 0, args: { dur: 1.2 }, anchor: '"sejak sebelum"' });
X('movement', 'lebah muda melayang menghadap sarang', 'loop', B.lebah + .3, { pan: 0, trim: 5, args: { dur: 1.8 } });
X('hero', 'penerbangan orientasi', 'loop', B.orientasi, { pan: 0, args: { dur: 1.6, pitch: 1.05 }, anchor: '"orientasi"' });
X('hero', 'pintu sarang disorot', 'tagpop', B.pintu, { pan: -.2, anchor: '"pintu masuknya"' });
X('movement', 'lingkaran makin lebar (atas)', 'loop', B.menjelajah, { pan: 0, trim: 5, args: { dur: 2.0, pitch: .95 } });
X('hero', 'pohon dikenali', 'landmark', B.pohon, { pan: -.3, args: { which: 0 }, anchor: '"Pohon di sini"' });
X('hero', 'tepi kebun dikenali', 'landmark', B.tepi, { pan: .1, args: { which: 1 }, anchor: '"Tepi kebun"' });
X('hero', 'garis langit dikenali', 'landmark', B.bentuk, { pan: .4, args: { which: 2 }, anchor: '"garis langit"' });
X('movement', 'kartu ingatan 1', 'snapshot', B.lewat, { pan: -.3 });
X('movement', 'kartu ingatan 2', 'snapshot', B.lewat + .4, { pan: -.2, trim: -2 });
X('hero', 'belajar', 'snapshot', B.belajar, { pan: -.1, anchor: '"belajar"' });

// 3. sun compass
X('movement', 'arah-arah kemungkinan', 'candidates', C.menjaga, { pan: 0, trim: -2 });
X('movement', 'kamera menengadah', 'pullback', C.salah, { pan: 0, trim: -4, args: { dur: 1.4 } });
X('hero', 'matahari', 'suntone', C.matahari, { pan: .2, anchor: '"Matahari"' });
X('hero', 'sudut terhadap matahari (kompas)', 'arc', C.kompas, { pan: 0, anchor: '"kompas"' });
X('hero', 'matahari bergeser', 'sunmove', C.bergeser, { pan: .3, args: { dur: 2.0 }, anchor: '"bergeser"' });
X('hero', 'jam biologis (dial tanpa angka)', 'dial', C.jam, { pan: .4, args: { n: 6 }, anchor: '"jam biologis"' });
X('movement', 'kompas & jam terhubung', 'suntone', C.kompasnya + .2, { pan: .3, trim: -3, args: { dur: 1.0 } });
X('hero', 'Mpi menepuk saku', 'pocketpat', C.lupa, { pan: 0, args: { n: 5 }, anchor: '"lupa naruh kunci"' });
X('movement', 'lebah lewat santai', 'passby', C.tersinggung, { pan: 0, trim: -3, args: { dur: 1.0 } });

// 4. distance
X('hero', 'pemandangan meluncur (dekat cepat)', 'flowwhoosh', D.bergerak, { pan: -.2, args: { dur: 1.6, near: 1 }, anchor: '"bergerak melewati"' });
X('movement', 'lapisan jauh pelan', 'flowwhoosh', D.bergerak + .3, { pan: .3, trim: -6, args: { dur: 1.8, near: .3 } });
X('movement', 'pandangan mata lebah', 'buzz', D.matanya, { pan: 0, trim: -4, args: { dur: 1.0, size: 1, near: .8 } });
X('hero', 'perkiraan jarak terisi', 'jar', D.gerakan + .3, { pan: .3, args: { n: 9, iv: .2 }, anchor: '"seberapa jauh"' });
X('hero', 'bukan angka kilometer', 'kmstrike', D.kilometer, { pan: -.1, anchor: '"kilometer"' });
X('movement', 'padang bunga: banyak gerak', 'jar', D.pemandangan2 + .3, { pan: -.3, trim: -3, args: { n: 6, iv: .12 } });
X('movement', 'rumput & pagar: sedikit', 'jar', D.berbeda, { pan: .3, trim: -5, args: { n: 3, iv: .3 } });

// 5. homing, experiment
X('movement', 'beberapa kemungkinan arah', 'candidates', E.saat + .3, { pan: .2, trim: -2 });
X('hero', 'arah dari langit', 'clue', E.arah, { pan: -.3, args: { which: 0 }, anchor: '"Arah dari langit"' });
X('hero', 'perkiraan perjalanan', 'clue', E.perkiraan, { pan: 0, args: { which: 1 }, anchor: '"Perkiraan perjalanan"' });
X('hero', 'tempat yang dikenal', 'clue', E.pohon, { pan: .3, args: { which: 2 }, anchor: '"Lalu pohon"' });
X('movement', 'tepi kebun cocok', 'landmark', E.kebun, { pan: .2, trim: -2, args: { which: 1 } });
X('movement', 'satu petunjuk meredup', 'dimclue', E.kurang, { pan: -.3, trim: -2 });
X('movement', 'yang lain ikut berperan', 'clue', E.lain, { pan: .3, trim: -3, args: { which: 2 } });
X('hero', 'kotak pembawa ditutup', 'latch', E.memindahkan, { pan: .2, anchor: '"memindahkan"' });
X('movement', 'dilepas di lokasi lain', 'release', E.lokasi + .4, { pan: .3, trim: -2 });
X('hero', 'penerbangan dilacak', 'track', E.melacak, { pan: 0, args: { dur: 2.4 }, anchor: '"melacak"' });
X('hero', 'ingatan bentang alam', 'memory', E.ingatannya, { pan: -.3, anchor: '"ingatannya"' });
X('movement', 'garis ajaib muncul', 'magicline', E.garis, { pan: 0, trim: -3 });
X('hero', 'garis ajaib ditolak', 'nope2', E.ajaib, { pan: 0, anchor: '"ajaib"' });

// 6. payoff + CTA
X('movement', 'lebah melewati pohon', 'buzz', E.belok, { pan: -.2, args: { dur: 1.2, size: 1, near: .6 } });
X('hero', 'proses tersembunyi', 'reveal', E.tersembunyi, { pan: 0, args: { dur: 2.0 }, anchor: '"tersembunyi"' });
X('movement', 'membaca langit', 'suntone', E.membaca, { pan: .3, trim: -3, args: { dur: 1.0 } });
X('movement', 'pemandangan bergerak', 'flowwhoosh', E.melihat, { pan: 0, trim: -4, args: { dur: 1.2, near: .8 } });
X('hero', 'mengenali tempat → mendarat di pintu', 'land', E.dilewati + .2, { pan: -.3, anchor: '"dilewatinya"' });
X('movement', 'HP tanpa petunjuk (memutar)', 'spinner', E.hp, { pan: .4, args: { dur: 1.6 } });
X('hero', 'lebah melesat pulang', 'passby', E.lebah - .5, { pan: 0, args: { dur: 1.2 }, anchor: '"secepat lebah"' });

const ev2 = ev.sort((x, y) => x.t - y.t);
const heroT = ev2.filter(e => e.cls === 'hero').map(e => e.t);
const cues = {
  duration: END, fade: 1.2, fadeIn: .4, voOffset: VO_OFFSET,
  garden: [[0, SWITCH]], learn: [[SWITCH, C.lalu]], sky: [[C.lalu, D.jarak]], flow: [[D.jarak, E.saat]], home: [[E.saat, E.di]], nest: [[E.di, END + 1]],
  lift: [[0, 1.0, 4], [t0, t0 + J.REL.gone, 2.5], [E.tersembunyi, E.tersembunyi + 1.8, 3], [END - 1.95, END, 4]],
  duckMusic: [...heroT.map(t => [t - .08, t + .5, -3]), [C.bergeser, C.waktu + .5, -2], [E.peneliti, E.ingatannya + 1, -2]],
  duckAmb: [],
  sheetHead: `# EP13 — cue sheet audio (timestamp = waktu VIDEO; VO Genesius 1,00x mulai di ${VO_OFFSET} s di balik cover)\n\nKolom: waktu · anchor VO | aksi di layar | kelas | sumber/file | level relatif (pre-mix) | tujuan | lisensi. Fase musik di \`cues.json\` (garden → learn → sky → flow → home → nest).\n` +
    `Dengung lebah dibuat sebagai gestur pendek yang berubah ukuran/jarak/stereo, bukan loop. Semua bunyi disintesis dengan kode; tidak ada rekaman pihak ketiga dan tidak ada suara orang.\n\n`,
  sfx: ev2,
};
fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(cues, null, 1));
console.log('cues.json:', ev2.length, 'cues (' + ['id', 'hero', 'movement', 'ambience'].map(c => c + ' ' + ev2.filter(e => e.cls === c).length).join(', ') + '), duration', END);
