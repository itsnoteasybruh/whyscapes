// EP14 cue sheet (VO Genesius, 1,00x, starting at lib.VO_OFFSET behind the cover). All times are VIDEO time (W() already includes the offset).
// Run (project root): node episodes/ep14_kulkas/audio/build_cues.js → (in audio/) python3 synth_ep14.py cues.json && python3 mix_ep14.py cues.json final && python3 audibility.py final cues.json
const path = require('path'), fs = require('fs');
const L = require('../lib'); const EP = require('../episode');
const J = require('../../../series/transition/jejak');
const A = require('../scenes_a').A, B = require('../scenes_b').B, C = require('../scenes_c').C, D = require('../scenes_d').D, E = require('../scenes_e').E;
const { END, SWITCH, t0, VO_OFFSET, SNIFF } = L;
const ev = [];
const X = (cls, label, name, t, o = {}) => { if (t < 0 || t > END - .05) return; ev.push({ cls, label, name, t: +t.toFixed(3), pan: o.pan || 0, trim: o.trim || 0, gain: o.gain || 1, why: o.why || '', anchor: o.anchor || '', ...(o.args ? { args: o.args } : {}) }); };

// identity (locked)
X('id', 'cover pembuka (logo)', 'chime', .04, { gain: .7, anchor: 'frame 0' });
X('id', '"Coba kita ikuti jejaknya": tapak → portal ke permukaan makanan', 'motif_transisi', t0 + J.MOTIF.at, { gain: 1.0, why: 'motif signature tidak diubah', anchor: '"Coba"' });
X('id', 'cover penutup (logo)', 'chime', END - 1.43, { gain: .65, anchor: 'END − 1,43' });

// ambience per shot
const KIND = { kitchen: 'kitchen', insideOut: 'fridge', openBox: 'kitchen', question: 'kitchen', enterMicro: 'micro', twoTracks: 'micro', spoilers: 'micro', changes: 'paper',
  players: 'micro', allSlow: 'micro', remoteJoke: 'kitchen', headstart: 'kitchen', tableTime: 'kitchen', bigTub: 'fridge', noRewind: 'kitchen', twoMeters: 'paper', twoDoors: 'paper',
  sniffTest: 'kitchen', stepStore: 'kitchen', step2h: 'kitchen', stepShallow: 'kitchen', stepThermo: 'fridge', stepLabel: 'kitchen', stepFreeze: 'kitchen', pullback: 'kitchen', timeBar: 'paper', mystery: 'kitchen' };
const LABEL = { kitchen: 'dapur Mpi: udara ruang, dengung kulkas rendah, burung jauh sesekali (tanpa suara orang)', fridge: 'dalam kulkas: dengung lebih dekat + udara dingin',
  micro: 'dunia mikro dingin: udara berkilau pelan', paper: 'dunia penjelas: udara lembut' };
const shots = EP.SC; let i = 0;
while (i < shots.length) {
  const kind = KIND[shots[i][0]]; if (!kind) throw new Error('no ambience kind for ' + shots[i][0]);
  let j = i; while (j + 1 < shots.length && KIND[shots[j + 1][0]] === kind) j++;
  const a = Math.max(0, shots[i][1] - .3), b = j + 1 < shots.length ? shots[j + 1][1] + .35 : END;
  X('ambience', LABEL[kind] + ` (${shots.slice(i, j + 1).map(s => s[0]).join(', ')})`, 'amb_' + kind, a, { args: { dur: +(b - a).toFixed(2) }, anchor: `shot ${shots[i][0]}` });
  i = j + 1;
}

// 1. hook (the VO's own sniff at SNIFF gets NO sfx — EP06 rule: body sounds already in the VO are not doubled)
X('movement', 'Mpi meraih gagang', 'swish', A.bayangin + .3, { pan: .2, trim: -3 });
X('hero', 'pintu kulkas terbuka, lampu & dengung', 'fridgeopen', A.buka, { pan: .3, anchor: '"buka kulkas"' });
X('movement', 'kotak ditarik dari rak', 'boxslide', A.kotak + .15, { pan: 0, args: { dur: .8 } });
X('hero', 'tutup wadah: klik', 'lidclick', A.tutupnya + .1, { pan: .1, anchor: '"Tutupnya dibuka"' });
X('movement', 'aroma naik dari wadah', 'odor', A.tutupnya + .5, { pan: .1, trim: -3, args: { dur: 1.2 } });
X('hero', 'Mpi mundur kaget ("Lah")', 'recoil', A.lah, { pan: -.3, anchor: '"Lah"' });
X('movement', 'pintu kulkas menutup', 'fridgeclose', A.padahal + .3, { pan: .4, trim: -3 });
X('movement', 'awan pikiran muncul', 'bubblein', A.bukannya, { pan: -.2 });
X('hero', 'tanda tanya "awet?"', 'qpop', A.awet, { pan: -.1, anchor: '"awet?"' });

// 2. micro world
X('hero', 'perubahan skala: masuk ke permukaan makanan', 'scale', SWITCH + .2, { pan: 0, args: { dur: 1.3 }, anchor: 'portal' });
X('movement', 'label DINGIN', 'tagpop', B.kulkas, { pan: 0, trim: -3 });
X('hero', 'dua jalur: hangat cepat vs dingin lambat', 'divide', B.dingin + .3, { pan: -.3, args: { n: 6, iv: .3, pitch: 1.1 }, anchor: '"suhu dingin"' });
X('movement', 'jalur dingin: satu pembelahan pelan', 'divide', B.memperlambat + 1.2, { pan: .3, trim: -2, args: { n: 1, pitch: .8 } });
X('movement', 'jalur dingin mengambil layar', 'swish', B.memperlambat2 - .1, { pan: 0, trim: -3 });
X('hero', 'masih membelah (bukan berhenti)', 'divide', B.menghentikan, { pan: 0, args: { n: 1, pitch: .85 }, anchor: '"menghentikan"' });
X('hero', 'sebagian disorot', 'ringpulse', B.sebagian, { pan: -.2, args: { pitch: .9 }, anchor: '"Sebagian"' });
X('movement', 'label PEMBUSUK', 'tagpop', B.pembusuk, { pan: .1, trim: -3 });
X('hero', 'pembusuk tumbuh', 'divide', B.tumbuh, { pan: .2, args: { n: 4, iv: .15, pitch: .9 }, anchor: '"tumbuh"' });
X('movement', 'time-lapse permukaan makanan', 'microbes', B.mengubah, { pan: 0, trim: -3, args: { dur: 1.4 } });
X('hero', 'kartu BAU', 'card', B.baunya, { pan: -.4, args: { pitch: 1 }, anchor: '"Baunya"' });
X('hero', 'kartu RASA', 'card', B.rasanya, { pan: 0, args: { pitch: 1.12 }, anchor: '"Rasanya"' });
X('hero', 'kartu TEKSTUR', 'card', B.teksturnya, { pan: .4, args: { pitch: 1.26 }, anchor: '"Teksturnya"' });
X('movement', 'kamera geser ke enzim', 'whoosh', B.enzim - .45, { pan: .3, trim: -4 });
X('hero', 'enzim memotong rantai', 'snip', B.enzim + .2, { pan: .1, args: { n: 3, iv: .55 }, anchor: '"Enzim"' });
X('movement', 'kamera geser ke udara', 'whoosh', B.udara - .45, { pan: .3, trim: -4 });
X('hero', 'oksigen menyentuh permukaan', 'o2', B.udara, { pan: 0, anchor: '"udara"' });
X('movement', 'bercak cokelat menyebar', 'smear', B.memicu, { pan: .1, trim: -3 });
X('movement', 'tiga lensa muncul', 'lens', B.jadi, { pan: 0, trim: -2 });
X('hero', 'jarum kecepatan: rendah, tidak nol', 'needle', B.lambat, { pan: 0, args: { dur: .8 }, anchor: '"lebih lambat"' });

// 3. remote, head start, table, tub, rewind
X('movement', 'Mpi mengangkat remote', 'swish', C.anggap + .2, { pan: -.2, trim: -3 });
X('hero', 'tombol slow motion', 'button', C.slow - .05, { pan: -.1, anchor: '"slow motion"' });
X('movement', 'semuanya melambat', 'slowmo', C.slow + .1, { pan: .2, trim: -2, args: { dur: 1.2 } });
X('hero', 'tombol pause … tidak mempan', 'button', C.pause - .05, { pan: -.1, args: { pitch: 1.2 }, anchor: '"pause"' });
X('movement', 'ikon pause dicoret', 'pausefail', C.pause + .45, { pan: .4, trim: -1 });
X('hero', 'MODAL: mikroba sudah ada', 'tagpop', C.modal, { pan: -.3, anchor: '"modal"' });
X('movement', 'kotak masuk ke rak', 'boxslide', C.pintu - .2, { pan: .3, trim: -2, args: { dur: .6 } });
X('hero', 'pintu kulkas ditutup', 'fridgeclose', C.ditutup, { pan: .4, anchor: '"ditutup"' });
X('hero', 'jam time-lapse di meja', 'clocklapse', C.sisa, { pan: -.2, anchor: '"sisa masakan"' });
X('movement', 'mikroba berlipat di meja hangat', 'divide', C.dibiarkan + .3, { pan: .3, trim: -2, args: { n: 6, iv: .2, pitch: 1.15 } });
X('movement', 'wadah besar masuk kulkas', 'boxslide', C.ditaruh, { pan: 0, trim: -2, args: { dur: .7 } });
X('movement', 'udara dingin di dinding kulkas', 'coldair', C.wadah, { pan: .2, trim: -4, args: { dur: 1.6 } });
X('hero', 'penampang: tengah masih hangat', 'xray', C.tengahnya - .3, { pan: 0, anchor: '"bagian tengahnya"' });
X('movement', 'pintu menutup', 'fridgeclose', C.masuk + .3, { pan: .4, trim: -3 });
X('hero', 'tombol rewind … jam tidak mundur', 'rewind', C.diputar - .1, { pan: -.1, anchor: '"diputar balik"' });
X('movement', 'tanda silang', 'nope', C.diputar + .5, { pan: .2, trim: -2 });

// 4. basi vs aman
X('movement', 'tanda tanya Mpi', 'qpop', D.satu, { pan: .2, trim: -3 });
X('hero', 'penggaris BASI', 'card', D.basi, { pan: -.3, args: { pitch: .9 }, anchor: '"Basi"' });
X('hero', 'penggaris AMAN', 'card', D.aman, { pan: .3, args: { pitch: 1.2 }, anchor: '"aman"' });
X('movement', 'tanda tidak sama', 'nope', D.ukuran, { pan: 0, trim: -3 });
X('hero', 'pintu pembusuk terbuka', 'door', D.bakteri, { pan: -.4, anchor: '"Bakteri"' });
X('hero', 'pintu penyebab sakit terbuka', 'door', D.kuman, { pan: .4, anchor: '"kuman"' });
X('hero', 'masih wangi (kilau)', 'sparkle', D.wangi + .1, { pan: .1, anchor: '"wangi"' });
X('hero', 'lensa: belum tentu', 'lens', D.belum, { pan: .1, anchor: '"Belum tentu"' });

// 5. steps
X('hero', 'simpan secepatnya', 'boxslide', E.simpan - .2, { pan: .3, args: { dur: .5 }, anchor: '"simpan"' });
X('movement', 'ikon daftar 1', 'uipop', E.simpan + .1, { pan: -.4, trim: -4 });
X('movement', 'jam: dua jam', 'ticks', E.ruang, { pan: .2, trim: -3 });
X('hero', '"2 JAM"', 'tagpop', E.dua, { pan: .2, anchor: '"2 jam"' });
X('movement', 'menuang ke wadah kecil 1', 'pour', E.wadah - .1, { pan: .1, trim: -3 });
X('movement', 'menuang ke wadah kecil 2', 'pour', E.kecil - .1, { pan: .3, trim: -4 });
X('hero', 'wadah dangkal', 'pour', E.dangkal - .1, { pan: .5, anchor: '"dangkal"' });
X('movement', 'penampang: dangkal cepat dingin', 'coldair', E.cepat - .2, { pan: .3, trim: -3, args: { dur: 1.2 } });
X('movement', 'termometer ditaruh', 'tap', E.suhu2, { pan: .4, trim: 3 });
X('hero', 'jarum ke 4 °C', 'needle', E.empat - .3, { pan: .3, args: { dur: .6 }, anchor: '"4 derajat"' });
X('hero', 'label tanggal ditulis', 'scribble', E.disimpan, { pan: .1, args: { dur: .6 }, anchor: '"disimpan"' });
X('hero', 'kalender: 3–4 hari', 'calendar', E.tigaempat - .1, { pan: .2, args: { n: 4 }, anchor: '"3–4 hari"' });
X('movement', 'freezer dibuka', 'fridgeopen', E.kalau, { pan: .4, trim: 0 });
X('hero', 'bekukan: kristal es', 'frost', E.bekukan, { pan: .3, anchor: '"bekukan"' });

// 6. close
X('movement', 'kamera mundur dari kotak', 'zoomout', E.diam - .2, { pan: 0, trim: -3, args: { dur: 1.4 } });
X('hero', 'lensa: proses tersembunyi', 'lens', E.proses, { pan: 0, anchor: '"proses tersembunyi"' });
X('hero', 'bilah waktu memanjang', 'extend', E.tambahan - .1, { pan: .2, args: { dur: .9 }, anchor: '"tambahan waktu"' });
X('hero', 'bendera batas', 'flag', E.batas, { pan: .4, anchor: '"batas"' });
X('movement', 'Mpi meraih ke belakang kulkas', 'swish', E.nemu - .2, { pan: .3, trim: -3 });
X('hero', 'wadah misterius', 'mystery', E.misterius, { pan: .1, anchor: '"misterius"' });

const ev2 = ev.sort((x, y) => x.t - y.t);
const heroT = ev2.filter(e => e.cls === 'hero').map(e => e.t);
const cues = {
  duration: END, fade: 1.2, fadeIn: .4, voOffset: VO_OFFSET,
  kitchen: [[0, SWITCH]], micro: [[SWITCH, C.masalahnya]], before: [[C.masalahnya, D.terus]], risk: [[D.terus, E.biar]], steps: [[E.biar, E.jadi]], close: [[E.jadi, END + 1]],
  lift: [[0, 1.0, 4], [t0, t0 + J.REL.gone, 2.5], [C.slow, C.slow + 1.2, 2], [END - 1.95, END, 4]],
  duckMusic: [...heroT.map(t => [t - .08, t + .5, -3]), [D.bakteri, D.tentu + .6, -2.5], [E.dua - .3, E.jam + .6, -2], [E.empat - .3, E.rendah + .6, -2], [E.tigaempat - .3, E.hari + .6, -2]],
  duckAmb: [],
  sheetHead: `# EP14 — cue sheet audio (timestamp = waktu VIDEO; VO Genesius 1,00x mulai di ${VO_OFFSET} s di balik cover)\n\nKolom: waktu · anchor VO | aksi di layar | kelas | sumber/file | level relatif (pre-mix) | tujuan | lisensi. Fase musik di \`cues.json\` (kitchen → micro → before → risk → steps → close).\n` +
    `Hirupan yang sudah ada di VO (${SNIFF.toFixed(2)} s video) sengaja TIDAK diberi SFX. Semua bunyi disintesis dengan kode; tidak ada rekaman pihak ketiga dan tidak ada suara orang.\n\n`,
  sfx: ev2,
};
fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(cues, null, 1));
console.log('cues.json:', ev2.length, 'cues (' + ['id', 'hero', 'movement', 'ambience'].map(c => c + ' ' + ev2.filter(e => e.cls === c).length).join(', ') + '), duration', END);
