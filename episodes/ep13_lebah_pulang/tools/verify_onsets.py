"""EP11: verify onsets of key beat words by prefix decoding (binary search) → tools/onset_overrides.json.

  WHISPER_DIR=… python episodes/ep11_gedung_angin/tools/verify_onsets.py episodes/ep11_gedung_angin
For word i of phrase s: decode [phrase start, cut]; the word is "heard" when the decode contains ≥ i+1 words and the
word at position ≥ i starts with the first 3 letters of the target. Onset = smallest such cut − 0.09 s (same rule as EP10).
Search window: aligned onset ± 0.4 s, resolution 0.03 s. Only applied when |Δ| ≤ 0.35 s; otherwise logged for review.
"""
import json, os, re, subprocess, sys
import numpy as np, sherpa_onnx

EP = os.path.abspath(sys.argv[1]); M = os.environ['WHISPER_DIR'].rstrip('/\\') + '/'
KEYS = [(1, 3), (3, 3), (3, 4), (6, 4), (6, 7), (9, 1), (9, 5), (10, 1), (11, 2), (12, 2), (13, 1), (14, 3), (15, 2), (16, 5), (16, 12),
        (17, 0), (18, 4), (19, 0), (19, 9), (20, 15), (20, 17), (21, 1), (22, 0), (22, 5), (22, 9), (23, 5), (24, 2), (24, 5), (24, 9),
        (25, 1), (26, 10), (26, 13), (27, 6), (27, 9), (28, 13), (28, 18), (28, 23), (29, 2), (29, 9), (31, 3)]
if os.environ.get('ONLY'): KEYS = [tuple(map(int, k.split(':'))) for k in os.environ['ONLY'].split(',')]
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(EP, 'audio', 'vo.mp3'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
pcm = np.frombuffer(raw, dtype=np.float32); SR = 16000
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + 'turbo-encoder.int8.onnx', decoder=M + 'turbo-decoder.int8.onnx', tokens=M + 'turbo-tokens.txt',
                                                 language='id', task='transcribe', num_threads=os.cpu_count() or 4)
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
def heard(a, cut, i, target):
    st = rec.create_stream(); st.set_option('max_tokens_per_second', '30')
    st.accept_waveform(SR, pcm[int(max(0, a - .08) * SR):int(cut * SR)]); rec.decode_stream(st)
    ws = [norm(w) for w in st.result.text.split()]; ws = [w for w in ws if w]
    tg = norm(target)[:3]
    return len(ws) >= i + 1 and any(w.startswith(tg) for w in ws[max(0, i - 1):])
tr = json.load(open(os.path.join(EP, 'transcript_aligned.json'), encoding='utf-8'))
ovp = os.path.join(EP, 'tools', 'onset_overrides.json'); OV = json.load(open(ovp)) if os.path.exists(ovp) else {}
log = []
for si, wi in KEYS:
    s = tr['segments'][si]; w, t_al, _ = s['words'][wi]; a = s['start']
    lo, hi = max(a + .05, t_al - .3), min(s['end'] + .05, t_al + .5)
    if not heard(a, hi, wi, w): log.append(f'{si}:{wi} {w}: not heard by {hi:.2f} — kept {t_al:.2f}'); print(log[-1], flush=True); continue
    if heard(a, lo, wi, w): log.append(f'{si}:{wi} {w}: already heard at {lo:.2f} — kept {t_al:.2f}'); print(log[-1], flush=True); continue
    while hi - lo > .03:
        mid = (lo + hi) / 2
        if heard(a, mid, wi, w): hi = mid
        else: lo = mid
    on = round(hi - .09, 2); d = on - t_al
    if abs(d) <= .35: OV[f'{si}:{wi}'] = on; log.append(f'{si}:{wi} {w}: aligned {t_al:.2f} → verified {on:.2f} (Δ {d:+.2f})')
    else: log.append(f'{si}:{wi} {w}: aligned {t_al:.2f}, prefix says {on:.2f} (Δ {d:+.2f}) — REVIEW, not applied')
    print(log[-1], flush=True)
    json.dump(OV, open(ovp, 'w'), indent=1)          # saved after every word (a stopped run keeps its results)
json.dump(OV, open(ovp, 'w'), indent=1)
open(os.path.join(EP, '_verify_onsets.log'), 'w', encoding='utf-8').write('\n'.join(log) + '\n')
