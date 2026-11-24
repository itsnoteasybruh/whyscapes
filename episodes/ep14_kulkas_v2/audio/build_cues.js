// EP14 v2 cue sheet (VO Genesius, 1,00x, starting at lib.VO_OFFSET behind the cover). All times are VIDEO time (W() already includes the offset).
// Run (project root): node episodes/ep14_kulkas_v2/audio/build_cues.js → (in audio/) python3 synth_ep14.py cues.json && python3 mix_ep14.py cues.json final && python3 audibility.py final cues.json
const path = require('path'), fs = require('fs');
const L = require('../lib'); const EP = require('../episode');
const J = require('../../../series/transition/jejak');
const A = require('../scenes_a').A, B = require('../scenes_b').B, D = require('../scenes_d').D, E = require('../scenes_e').E;
const { END, SWITCH, t0, VO_OFFSET, SNIFF } = L;
const ev = [];
const X = (cls, label, name, t, o = {}) => { if (t < 0 || t > END - .05) return; ev.push({ cls, label, name, t: +t.toFixed(3), pan: o.pan || 0, trim: o.trim || 0, gain: o.gain || 1, why: o.why || '', anchor: o.anchor || '', ...(o.args ? { args: o.args } : {}) }); };

// identity (locked)
X('id', 'cover pembuka (logo)', 'chime', .04, { gain: .7, anchor: 'frame 0' });
X('id', '"Coba kita ikuti jejaknya": tapak → portal ke permukaan makanan', 'motif_transisi', t0 + J.MOTIF.at, { gain: 1.0, why: 'motif signature tidak diubah', anchor: '"Coba"' });
X('id', 'cover penutup (logo)', 'chime', END - 1.43, { gain: .65, anchor: 'END − 1,43' });

// ambience per shot
const KIND = { kitchen: 'kitchen', insideOut: 'fridge', openBox: 'kitchen', question: 'kitchen', enterMicro: 'micro', twoTracks: 'micro', spoilers: 'micro', players: 'micro',
  changes: 'paper', sniffRisk: 'kitchen', stepTime: 'kitchen', stepShallow: 'kitchen', stepThermo: 'fridge', stepLabel: 'kitchen', stepFreeze: 'kitchen', payoff: 'kitchen', teaser: 'kitchen' };
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

// 1. hook
X('movement', 'Mpi meraih gagang', 'swish', A.bayangin + .3, { pan: .2, trim: -3 });
X('hero', 'pintu kulkas terbuka, lampu & dengung', 'fridgeopen', A.buka, { pan: .3, anchor: '"dibuka"' });
X('movement', 'kotak ditarik dari rak', 'boxslide', A.kotak + .15, { pan: 0, args: { dur: .8 } });
X('hero', 'tutup wadah diangkat: klik', 'lidclick', A.dibuka - .05, { pan: .1, anchor: '"diangkat"' });
X('movement', 'aroma naik dari wadah', 'odor', SNIFF - .3, { pan: .1, trim: -3, args: { dur: 1.2 } });
X('hero', 'Mpi mundur kaget', 'recoil', A.lah, { pan: -.3, anchor: '"mundur"' });
X('movement', 'pintu kulkas menutup', 'fridgeclose', A.padahal + .3, { pan: .4, trim: -3 });
X('movement', 'awan pikiran muncul', 'bubblein', A.bukannya, { pan: -.2 });
X('hero', 'tanda tanya "basi?"', 'qpop', A.awet, { pan: -.1, anchor: '"basi?"' });

// 2. micro world
X('hero', 'perubahan skala: masuk ke permukaan makanan', 'scale', SWITCH + .2, { pan: 0, args: { dur: 1.3 }, anchor: 'portal' });
X('movement', 'label DI KULKAS', 'tagpop', B.kulkas, { pan: 0, trim: -3 });
X('movement', 'tombol muncul', 'uipop', B.tombol, { pan: -.3, trim: -3 });
X('hero', 'tombol PELAMBAT ditekan', 'button', B.pelambat - .03, { pan: -.3, anchor: '"pelambat"' });
X('movement', 'dunia mikro melambat', 'slowmo', B.pelambat + .1, { pan: 0, trim: -2, args: { dur: 1.2 } });
X('hero', 'tombol BERHENTI ditekan … tidak mempan', 'button', B.berhenti - .03, { pan: .3, args: { pitch: 1.2 }, anchor: '"berhenti"' });
X('movement', 'tombol berhenti dicoret', 'pausefail', B.berhenti + .45, { pan: .4, trim: -1 });
X('hero', 'dua jalur: hangat cepat vs dingin lambat', 'divide', B.dingin + .3, { pan: -.3, args: { n: 6, iv: .3, pitch: 1.1 }, anchor: '"Dingin"' });
X('movement', 'jalur dingin: satu pembelahan pelan', 'divide', B.memperlambat + .9, { pan: .3, trim: -2, args: { n: 1, pitch: .8 } });
X('movement', 'jalur dingin mengambil layar', 'swish', B.banyak - .1, { pan: 0, trim: -3 });
X('hero', 'sebagian disorot', 'ringpulse', B.sebagian, { pan: -.2, args: { pitch: .9 }, anchor: '"sebagian"' });
X('hero', 'sebagian masih tumbuh', 'divide', B.tumbuh, { pan: .2, args: { n: 4, iv: .15, pitch: .9 }, anchor: '"tumbuh"' });
X('hero', 'panel ENZIM: rantai dipotong', 'snip', B.enzim + .15, { pan: -.3, args: { n: 3, iv: .5 }, anchor: '"Enzim"' });
X('hero', 'panel UDARA: oksigen menyentuh permukaan', 'o2', B.udara, { pan: .3, anchor: '"udara"' });
X('movement', 'bercak cokelat menyebar', 'smear', B.bekerja, { pan: .3, trim: -3 });
X('movement', 'time-lapse permukaan makanan', 'microbes', B.pelan, { pan: 0, trim: -3, args: { dur: 1.4 } });
X('hero', 'kartu RASA', 'card', B.rasanya, { pan: -.4, args: { pitch: 1 }, anchor: '"rasa"' });
X('hero', 'kartu WARNA', 'card', B.warna, { pan: 0, args: { pitch: 1.12 }, anchor: '"warna"' });
X('hero', 'kartu TEKSTUR', 'card', B.teksturnya, { pan: .4, args: { pitch: 1.26 }, anchor: '"teksturnya"' });

// 3. no strange smell ≠ safe; germs without signs
X('movement', 'Mpi mencium: tidak ada bau aneh', 'sparkle', D.aneh, { pan: .3, trim: -3 });
X('hero', 'kartu AMAN? + tanda tanya', 'qpop', D.belum, { pan: -.3, anchor: '"belum tentu"' });
X('hero', 'lensa: penyebab sakit tak terlihat', 'lens', D.mikroba, { pan: 0, anchor: '"Mikroba penyebab sakit"' });
X('movement', 'label TAK SELALU ADA TANDA', 'tagpop', D.tanda, { pan: 0, trim: -3 });

// 4. steps (numbers only on their words)
X('movement', 'jam: waktu berjalan', 'ticks', E.kulkas, { pan: .2, trim: -3 });
X('hero', '"2 JAM"', 'tagpop', E.dua, { pan: .2, anchor: '"2 jam"' });
X('movement', 'termometer ruang muncul', 'tap', E.suhu, { pan: -.4, trim: 8 });
X('hero', '"> 32 °C": termometer naik', 'needle', E.t32, { pan: -.4, args: { dur: .6 }, anchor: '"32 derajat"' });
X('hero', '"1 JAM": batas dipendekkan', 'tagpop', E.satu, { pan: .2, args: { pitch: 1.2 }, anchor: '"1 jam"' });
X('movement', 'menuang ke wadah 1', 'pour', E.masakan - .1, { pan: .1, trim: -3 });
X('movement', 'menuang ke wadah 2', 'pour', E.wadah - .1, { pan: .3, trim: -4 });
X('hero', 'wadah dangkal', 'pour', E.dangkal - .1, { pan: .5, anchor: '"dangkal"' });
X('movement', 'penampang: dangkal cepat dingin', 'coldair', E.cepat - .1, { pan: .3, trim: -3, args: { dur: 1.2 } });
X('movement', 'termometer kulkas ditaruh', 'tap', E.kulkas2, { pan: .4, trim: 10 });
X('hero', 'jarum ke 4 °C', 'needle', E.empat - .3, { pan: .3, args: { dur: .6 }, anchor: '"4 derajat"' });
X('hero', 'label tanggal ditulis', 'scribble', E.masakan2 - .1, { pan: .1, args: { dur: .6 }, anchor: '"Sisa masakan"' });
X('hero', 'kalender: 3–4 hari', 'calendar', E.tigaempat - .1, { pan: .2, args: { n: 4 }, anchor: '"3–4 hari"' });
X('movement', 'freezer dibuka', 'fridgeopen', E.kalau2, { pan: .4, trim: 0 });
X('hero', 'bekukan: kristal es', 'frost', E.bekukan, { pan: .3, anchor: '"bekukan"' });

// 5. close: payoff + teaser (the VO's own "hik!" gets NO sfx — body sounds already in the VO are not doubled)
X('movement', 'kamera ke kotak semula', 'zoomout', E.dinginEnd - .2, { pan: 0, trim: -3, args: { dur: 1.4 } });
X('hero', 'lensa: proses melambat', 'lens', E.memperlambat, { pan: .3, anchor: '"memperlambat proses"' });
X('hero', 'jam: waktu tetap berjalan', 'clocklapse', E.waktu, { pan: .3, anchor: '"waktu tetap berjalan"' });
X('movement', 'tanda tanya cegukan', 'qpop', E.berasal, { pan: .1, trim: -3 });
X('hero', 'gelembung komentar', 'uipop', E.tulis, { pan: .3, anchor: '"Tulis tebakan"' });
X('movement', 'jejak oranye keluar layar', 'extend', E.ditelusuri - .1, { pan: .5, trim: -3, args: { dur: .9 } });

const ev2 = ev.sort((x, y) => x.t - y.t);
const heroT = ev2.filter(e => e.cls === 'hero').map(e => e.t);
const cues = {
  duration: END, fade: 1.2, fadeIn: .4, voOffset: VO_OFFSET,
  kitchen: [[0, SWITCH]], micro: [[SWITCH, B.pelan]], before: [[B.pelan, D.tapi]], risk: [[D.tapi, E.makanan]], steps: [[E.makanan, E.dinginEnd]], close: [[E.dinginEnd, END + 1]],
  lift: [[0, 1.0, 4], [t0, t0 + J.REL.gone, 2.5], [B.pelambat, B.pelambat + 1.2, 2], [END - 1.95, END, 4]],
  duckMusic: [...heroT.map(t => [t - .08, t + .5, -3]), [D.tapi, D.tanda + .6, -2.5], [E.dua - .3, E.jam + .6, -2], [E.t32 - .3, E.satu + .8, -2], [E.empat - .3, E.rendah + .6, -2], [E.tigaempat - .3, E.hari + .6, -2], [E.hik - .4, E.hik + .5, -4]],
  duckAmb: [],
  sheetHead: `# EP14 v2 — cue sheet audio (timestamp = waktu VIDEO; VO Genesius 1,00x mulai di ${VO_OFFSET} s di balik cover)\n\nKolom: waktu · anchor VO | aksi di layar | kelas | sumber/file | level relatif (pre-mix) | tujuan | lisensi. Fase musik di \`cues.json\` (kitchen → micro → before → risk → steps → close).\n` +
    `Bunyi "hik!" sudah ada di VO (${E.hik.toFixed(2)} s video) dan sengaja TIDAK diberi SFX. Semua bunyi disintesis dengan kode; tidak ada rekaman pihak ketiga dan tidak ada suara orang.\n\n`,
  sfx: ev2,
};
fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(cues, null, 1));
console.log('cues.json:', ev2.length, 'cues (' + ['id', 'hero', 'movement', 'ambience'].map(c => c + ' ' + ev2.filter(e => e.cls === c).length).join(', ') + '), duration', END);
