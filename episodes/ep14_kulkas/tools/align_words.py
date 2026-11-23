"""EP11 word onsets: letter-weighted estimate (as core.timeline) snapped to energy dips of the real VO.

  python episodes/ep11_gedung_angin/tools/align_words.py episodes/ep11_gedung_angin
  in : transcript_textonly.json (manually corrected text, phrase start/end from silencedetect)
  out: transcript_aligned.json (segments[].words = [[word, start, end]]) + _align.log
Optional overrides (verified onsets, e.g. from prefix decoding): tools/onset_overrides.json {"segIndex:wordIndex": seconds}

Method: per phrase, word weights = spoken letters + 1.5 (digits spelled as spoken). Each inner boundary is moved to the
lowest point of the 10 ms RMS envelope within ±0.15 s IF that point is a real dip (< 45 % of the local median); otherwise
the estimate is kept. Boundaries stay ordered with ≥ 0.07 s per word. Precision ≈ ±0.1 s (stated in NOTES).
"""
import json, os, re, subprocess, sys
import numpy as np

EP = os.path.abspath(sys.argv[1])
SPOKEN = {'2': 'dua', '4': 'empat', '34': 'tigasampaiempat', 'slow': 'slou', 'pause': 'pos', 'lho': 'lo'}
tr = json.load(open(os.path.join(EP, 'transcript_textonly.json'), encoding='utf-8'))
ovp = os.path.join(EP, 'tools', 'onset_overrides.json')
OV = json.load(open(ovp, encoding='utf-8')) if os.path.exists(ovp) else {}

raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(EP, 'audio', 'vo.mp3'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32); SR = 16000; HOP = 160
env = np.sqrt(np.convolve(x ** 2, np.ones(400) / 400, mode='same')[::HOP] + 1e-12)          # 25 ms window, 10 ms hop
env = np.convolve(env, np.ones(3) / 3, mode='same')
E = lambda t: env[min(len(env) - 1, max(0, int(t * 100)))]

def weight(w):
    k = re.sub(r'[^\w%]', '', w.lower())
    return len(SPOKEN.get(k, re.sub(r'[^\w]', '', k))) + 1.5

log, out = [], []
for si, s in enumerate(tr['segments']):
    ws = s['text'].split(); wt = [weight(w) for w in ws]; tot = sum(wt); a, b = s['start'], s['end']
    est = [a + (b - a) * sum(wt[:i]) / tot for i in range(len(ws))]
    on = est[:]
    for i in range(1, len(ws)):
        lo, hi = max(on[i - 1] + .07, est[i] - .15), min(b - .07 * (len(ws) - i), est[i] + .15)
        if hi <= lo: on[i] = max(on[i - 1] + .07, min(est[i], b - .07)); continue
        i0, i1 = int(lo * 100), int(hi * 100) + 1
        seg = env[i0:i1]; j = int(np.argmin(seg)); tmin = (i0 + j) / 100
        med = np.median(env[max(0, i0 - 20):i1 + 20])
        on[i] = tmin if seg[j] < .45 * med else est[i]
        key = f'{si}:{i}'
        if key in OV: on[i] = float(OV[key]); log.append(f'override {key} {ws[i]} → {on[i]:.2f}')
    if f'{si}:0' in OV and len(ws) > 1: on[0] = min(float(OV[f'{si}:0']), on[1] - .07); log.append(f'override {si}:0 {ws[0]} → {on[0]:.2f}')   # phrase start stays; only the word onset moves
    words = [[w, round(on[i], 2), round(on[i + 1] if i + 1 < len(ws) else b, 2)] for i, w in enumerate(ws)]
    out.append({**s, 'words': words})
    log.append(f'{si} ' + ' '.join(f'{w}@{st:.2f}' for w, st, _ in words))
json.dump({'duration': tr['duration'], 'segments': out}, open(os.path.join(EP, 'transcript_aligned.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(os.path.join(EP, '_align.log'), 'w', encoding='utf-8').write('\n'.join(log) + '\n')
print('\n'.join(log))
