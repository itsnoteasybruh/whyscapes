// Builds audio/cues.json for this episode from the episode beats (word-based, so it follows the VO).
//   node audio/build_cues.js   (run from the episode folder)  →  then: python3 <kit>/series/audio/synth.py cues.json
// Series-locked cues: logo chime (open/close) + signature motif. Everything else is the episode's choice
// (see series/audio/library/INDEX.csv for names, mood and EP01 usage).
const path = require('path'), fs = require('fs');
const ep = require('../episode.js');
const OC = require('../../../series/brand/opening_closing');
const J = require('../../../series/transition/jejak');
const B = ep.beats, ev = [];
const E = (name, t, gain = 1, pan = 0, args) => ev.push({ name, t: +t.toFixed(3), gain, pan, ...(args ? { args } : {}) });

// --- locked (series) ---
E('chime', OC.T.sfx.chimeOpen, .7);
E('motif_transisi', B.t0 + J.MOTIF.at, .9);
E('chime', ep.END + OC.T.sfx.chimeClose, .7);
// --- episode (CONTOH) ---
E('pop', B.kok, .45, .2, { pitch: 1.15 });
E('dive', B.SWITCH + .2, .5);
E('pop', B.tujuan, .4, 0, { pitch: .9 });
E('whoosh', B.penutup - .5, .4, 0, { dur: .5 });
E('discover', B.penutup, .45, .2);

const cues = {
  duration: ep.END, fade: 1.0,
  dark: [[B.SWITCH, B.penutup - .45]],                         // music bed switches to its darker variant while "inside"
  lift: [[0, 1.25, 4], [B.t0, B.t0 + J.REL.gone, 2.5], [ep.END + OC.T.close.blurIn, ep.END, 5]],  // music lift (dB) at logo + transition
  sfx: ev.sort((a, b) => a.t - b.t),
};
fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(cues, null, 1));
console.log('cues.json:', ev.length, 'sfx, duration', ep.END);
