// Whyscape FORMAT BAKU (creator decision, 22 Nov 2026): the final MP4 is at most 90 s; production target 80–85 s.
// One module so preflight (VO), production QC and the publisher (final MP4) apply the same numbers.
// Never shorten by speeding up: a VO that does not fit is a creator fix (script/VO revision), and an MP4 that does not fit is a
// production fix (re-cut/re-render from a revised VO). Neither is "fixed" by time-stretching.
const FORMAT = {
  maxFinalS: 90,               // hard limit for any MP4 that may be uploaded (also the Facebook Reels API limit, 3–90 s)
  minFinalS: 3,
  targetFinalS: [80, 85],      // production target
  coverLeadS: 1.0,             // VO starts behind the cover (STANDARDS §16)
  tailS: 2.3,                  // closing logo after the last word (EP13/EP14 lib.js END = VO_END + 2.3)
};
// final length estimated from the VO FILE length (conservative: assumes no trailing silence in the MP3)
const finalFromVO = voS => +(voS + FORMAT.coverLeadS + FORMAT.tailS).toFixed(2);
const maxVO = () => +(FORMAT.maxFinalS - FORMAT.coverLeadS - FORMAT.tailS).toFixed(2);                 // 86.7 s
const targetVO = () => FORMAT.targetFinalS.map(x => +(x - FORMAT.coverLeadS - FORMAT.tailS).toFixed(2));  // 76.7–81.7 s

// → { ok, severity: null | 'INFO' | 'FIX', msg }
function checkVO(voS) {
  const est = finalFromVO(voS), [a, b] = targetVO();
  if (est > FORMAT.maxFinalS) return { ok: false, severity: 'FIX', msg: `VO is ${voS.toFixed(2)} s, so the video would be ≈ ${est} s, above the ${FORMAT.maxFinalS} s Whyscape format (VO ≤ ${maxVO()} s; target VO ${a}–${b} s). Revise the script/VO; the VO is never sped up` };
  if (voS < FORMAT.minFinalS) return { ok: false, severity: 'FIX', msg: `VO is ${voS.toFixed(2)} s: too short` };
  if (voS < a || voS > b) return { ok: true, severity: 'INFO', msg: `VO ${voS.toFixed(2)} s → video ≈ ${est} s: allowed, outside the 80–85 s production target (target VO ${a}–${b} s)` };
  return { ok: true, severity: null, msg: `VO ${voS.toFixed(2)} s → video ≈ ${est} s (target 80–85 s)` };
}
function checkFinal(mp4S) {
  if (!(mp4S > 0)) return { ok: false, severity: 'FIX', msg: 'final MP4 duration could not be read' };
  if (mp4S > FORMAT.maxFinalS) return { ok: false, severity: 'FIX', msg: `final MP4 is ${mp4S.toFixed(2)} s, above the ${FORMAT.maxFinalS} s Whyscape format: rejected before upload. Revise the script and re-render; do not speed the video up` };
  if (mp4S < FORMAT.minFinalS) return { ok: false, severity: 'FIX', msg: `final MP4 is ${mp4S.toFixed(2)} s: below ${FORMAT.minFinalS} s` };
  const [a, b] = FORMAT.targetFinalS;
  if (mp4S < a || mp4S > b) return { ok: true, severity: 'INFO', msg: `final MP4 ${mp4S.toFixed(2)} s: within the limit, outside the ${a}–${b} s target` };
  return { ok: true, severity: null, msg: `final MP4 ${mp4S.toFixed(2)} s (target ${a}–${b} s)` };
}
module.exports = { FORMAT, finalFromVO, maxVO, targetVO, checkVO, checkFinal };
