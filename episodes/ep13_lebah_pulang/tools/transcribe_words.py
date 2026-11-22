"""EP11 — VO transcription with per-word timing (sherpa-onnx >= 2.0, Whisper turbo).

Same phrase split as series/tools/transcribe.py (silencedetect −38 dB / 0.16 s), plus:
  - max_tokens_per_second raised (sherpa 2.x defaults to 6 tok/s and truncates fast Indonesian phrases);
  - enable_token_timestamps → word onsets (a word starts at its first token; tokens starting with a space open a word).

  WHISPER_DIR=… python episodes/ep11_gedung_angin/tools/transcribe_words.py episodes/ep11_gedung_angin
  → <ep>/transcript_raw.json (segments[].words = [[word, start, end], …], absolute seconds)
  … --recheck A B   prints the decode of one window at three paddings.
Candidate for the kit (series/tools) once a second episode uses it.
"""
import json, os, re, subprocess, sys, wave
import numpy as np, sherpa_onnx

EP = os.path.abspath(sys.argv[1])
M = os.environ['WHISPER_DIR'].rstrip('/\\') + '/'
VO = os.path.join(EP, 'audio', 'vo.mp3'); W16 = os.path.join(EP, 'audio', '_vo16k.wav')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VO, '-ac', '1', '-ar', '16000', W16], check=True)
with wave.open(W16) as w:
    sr = w.getframerate(); pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
os.remove(W16); dur = len(pcm) / sr
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + 'turbo-encoder.int8.onnx', decoder=M + 'turbo-decoder.int8.onnx', tokens=M + 'turbo-tokens.txt',
                                                 language='id', task='transcribe', num_threads=os.cpu_count() or 4, enable_token_timestamps=True)

def decode(a, b, pad=.08):
    a0 = max(0, a - pad)
    st = rec.create_stream()
    st.set_option('max_tokens_per_second', '30')   # has_option() reports False, but set_option works (sherpa 2.0.2)
    st.accept_waveform(sr, pcm[int(a0 * sr):int((b + pad) * sr)]); rec.decode_stream(st)
    r = st.result
    toks, ts = list(r.tokens), list(r.timestamps)
    words = []
    for tk, t in zip(toks, ts):
        if not tk.strip() and not words: continue
        if tk.startswith(' ') or not words: words.append([tk.strip(), a0 + t])
        else: words[-1][0] += tk
    words = [[w, round(s, 2)] for w, s in words if w]
    for i, w in enumerate(words): w.append(words[i + 1][1] if i + 1 < len(words) else round(b, 2))
    return r.text.strip(), words

if '--recheck' in sys.argv:
    i = sys.argv.index('--recheck'); a, b = float(sys.argv[i + 1]), float(sys.argv[i + 2])
    for pad in (.08, .3, .6): print(f'pad {pad:.2f}s:', decode(a, b, pad)[0])
    sys.exit()

log = subprocess.run(['ffmpeg', '-i', VO, '-af', 'silencedetect=noise=-38dB:d=0.16', '-f', 'null', '-'], capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)], [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
segs, cur = [], 0.0
for s, e in sil:
    if s - cur > 0.15: segs.append([cur, s])
    cur = e
if dur - cur > 0.15: segs.append([cur, dur])
out = []
for a, b in segs:
    text, words = decode(a, b)
    out.append({'start': round(a, 2), 'end': round(b, 2), 'text': text, 'words': words})
    print(f'{a:7.2f}–{b:7.2f}  {text}\n         ' + ' '.join(f'{w}@{s:.2f}' for w, s, e in words))
json.dump({'duration': round(dur, 3), 'segments': out}, open(os.path.join(EP, 'transcript_raw.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{len(out)} phrases, VO {dur:.2f} s -> transcript_raw.json')
