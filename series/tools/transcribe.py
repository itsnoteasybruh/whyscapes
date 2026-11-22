"""Whyscape VO transcription — phrase-by-phrase (split on pauses with ffmpeg silencedetect), Whisper large-v3-turbo via sherpa-onnx.

  python3 series/tools/transcribe.py <episodeDir>                 -> <episodeDir>/transcript_raw.json
  python3 series/tools/transcribe.py <episodeDir> --recheck 33.0 35.2   (re-decode one doubtful window, wider context; prints text)

Then copy transcript_raw.json → transcript.json and FIX THE TEXT BY HAND against the script
(Whisper sometimes truncates/merges words: EP01 had "Tung", "Penurun", "Kobi sa"). Keep start/end; edit only text,
or split a segment in two if the subtitle needs it. The subtitle and every scene beat are derived from this file.

Model (not bundled, ~560 MB, from GitHub releases k2-fsa/sherpa-onnx tag asr-models):
  sherpa-onnx-whisper-turbo.tar.bz2  → extract, set WHISPER_DIR to the folder (default: <kit>/models/sherpa-onnx-whisper-turbo)
Requires: pip install sherpa-onnx numpy ; ffmpeg on PATH. VO file: <episodeDir>/audio/vo.mp3
"""
import json, os, re, subprocess, sys, wave
import numpy as np, sherpa_onnx

EP = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else '.'
KIT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = os.environ.get('WHISPER_DIR', os.path.join(KIT, 'models', 'sherpa-onnx-whisper-turbo')).rstrip('/') + '/'
VO = os.path.join(EP, 'audio', 'vo.mp3'); W16 = os.path.join(EP, 'audio', '_vo16k.wav')
NOISE, MIN_SIL = '-38dB', 0.16      # EP01 settings: pause ≥ 0.16 s below −38 dB splits a phrase

subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VO, '-ac', '1', '-ar', '16000', W16], check=True)
with wave.open(W16) as w:
    sr = w.getframerate(); pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
os.remove(W16); dur = len(pcm) / sr
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + 'turbo-encoder.int8.onnx', decoder=M + 'turbo-decoder.int8.onnx',
                                                 tokens=M + 'turbo-tokens.txt', language='id', task='transcribe', num_threads=os.cpu_count() or 4)
def decode(a, b, pad=.08):
    st = rec.create_stream(); st.accept_waveform(sr, pcm[max(0, int((a - pad) * sr)):int((b + pad) * sr)]); rec.decode_stream(st)
    return st.result.text.strip()

if '--recheck' in sys.argv:
    i = sys.argv.index('--recheck'); a, b = float(sys.argv[i + 1]), float(sys.argv[i + 2])
    for pad in (.08, .3, .6): print(f'pad {pad:.2f}s:', decode(a, b, pad))
    sys.exit()

log = subprocess.run(['ffmpeg', '-i', VO, '-af', f'silencedetect=noise={NOISE}:d={MIN_SIL}', '-f', 'null', '-'], capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)], [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
segs, cur = [], 0.0
for s, e in sil:
    if s - cur > 0.15: segs.append([cur, s])
    cur = e
if dur - cur > 0.15: segs.append([cur, dur])
out = [{'start': round(a, 2), 'end': round(b, 2), 'text': decode(a, b)} for a, b in segs]
json.dump({'duration': round(dur, 3), 'segments': out}, open(os.path.join(EP, 'transcript_raw.json'), 'w'), ensure_ascii=False, indent=1)
for o in out: print(f"{o['start']:7.2f}–{o['end']:7.2f}  {o['text']}")
print(f'{len(out)} phrases, VO {dur:.2f} s -> transcript_raw.json  (now fix the text by hand → transcript.json)')
