"""Whyscape preflight helper: does VO_SCRIPT.md match what VO.mp3 actually says? (the AUDIO is the source of truth)

  WHISPER_DIR=… python3 automation/vo_check.py <VO.mp3> <VO_SCRIPT.md>   → JSON on stdout
Steps: split the VO on silences (−38 dB / 0.16 s, same as the episode tools) → Whisper turbo (sherpa-onnx, language id) per phrase →
collapse Whisper's repeated n-gram hallucinations → normalise both texts (lower case, punctuation off, Indonesian number words → digits,
expression tags removed from the script) → word-level diff (difflib).
Expression tags are NOT spoken words: [tag], <tag/>, {tag} and lines starting with '>' are ignored. Front matter (--- … ---) is read, not compared.
Output: similarity (0..1), word counts, tags found, and the differing spans (script vs heard) so a human can correct the SCRIPT (never the VO).
Whisper itself makes errors (seen in EP14: "makamnya" for "makanan"), so a few small diffs are normal; thresholds live in preflight.js.
"""
import json, os, re, subprocess, sys, difflib
import numpy as np

vo_path, script_path = sys.argv[1], sys.argv[2]
NUM = {'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'sepuluh': '10'}
SAME = {'nggak': 'gak', 'enggak': 'gak', 'ga': 'gak', 'lho': 'loh', 'celcius': 'celsius', 'aja': 'saja', 'udah': 'sudah'}

def norm_words(text):
    text = text.replace('–', ' ').replace('—', ' ').replace('-', ' ')
    ws = re.sub(r"[^\w\s]", ' ', text.lower()).split()
    return [SAME.get(NUM.get(w, w), NUM.get(w, w)) for w in ws]
def collapse(ws):                       # "a b a b a b" → "a b": only runs of ≥ 3 identical n-grams (Whisper loops); "pelan-pelan" (×2) stays
    out = list(ws); changed = True
    while changed:
        changed = False
        for n in range(6, 0, -1):
            i = 0
            while i + 3 * n <= len(out):
                if out[i:i + n] == out[i + n:i + 2 * n] == out[i + 2 * n:i + 3 * n]:
                    j = i + n
                    while out[j:j + n] == out[i:i + n]: del out[j:j + n]
                    changed = True
                else: i += 1
    return out

# ---- script: front matter + tags
raw = open(script_path, encoding='utf-8').read()
fm = {}
m = re.match(r'^---\s*\n(.*?)\n---\s*\n', raw, re.S)
body = raw[m.end():] if m else raw
if m:
    for line in m.group(1).splitlines():
        if ':' in line: k, v = line.split(':', 1); fm[k.strip().lower()] = v.strip()
lines = [l for l in body.splitlines() if l.strip() and not l.lstrip().startswith(('#', '>'))]
spoken = '\n'.join(lines)
tags = re.findall(r'\[[^\]]+\]|<[^>]+>|\{[^}]+\}', spoken)
spoken = re.sub(r'\[[^\]]+\]|<[^>]+>|\{[^}]+\}', ' ', spoken)
script_words = norm_words(spoken)

# ---- audio → words
M = os.environ.get('WHISPER_DIR', '').rstrip('/\\') + '/'
if not os.path.exists(M + 'turbo-encoder.int8.onnx'):
    print(json.dumps({'ok': False, 'error': 'WHISPER_DIR not set or model missing; VO check not run', 'front_matter': fm, 'tags': tags})); sys.exit(0)
import sherpa_onnx
pcm = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', vo_path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout, dtype=np.float32)
SR = 16000; dur = len(pcm) / SR
log = subprocess.run(['ffmpeg', '-i', vo_path, '-af', 'silencedetect=noise=-38dB:d=0.16', '-f', 'null', '-'], capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)], [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]))
segs, cur = [], 0.0
for s, e in sil:
    if s - cur > .15: segs.append([cur, s])
    cur = e
if dur - cur > .15: segs.append([cur, dur])
# merge very short phrases with the next one (single short words are where Whisper hallucinates most)
merged = []
for a, b in segs:
    if merged and (merged[-1][1] - merged[-1][0] < 1.2 or b - a < .7) and a - merged[-1][1] < .6: merged[-1][1] = b
    else: merged.append([a, b])
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M + 'turbo-encoder.int8.onnx', decoder=M + 'turbo-decoder.int8.onnx', tokens=M + 'turbo-tokens.txt',
                                                 language='id', task='transcribe', num_threads=os.cpu_count() or 4)
heard_text = []
for a, b in merged:
    st = rec.create_stream(); st.set_option('max_tokens_per_second', '30')
    st.accept_waveform(SR, pcm[int(max(0, a - .3) * SR):int((b + .3) * SR)]); rec.decode_stream(st)
    heard_text.append(st.result.text.strip())
heard_words = collapse(norm_words(' '.join(heard_text)))

sm = difflib.SequenceMatcher(a=script_words, b=heard_words, autojunk=False)
diffs = [{'op': op, 'script': ' '.join(script_words[i1:i2]), 'heard': ' '.join(heard_words[j1:j2])} for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']
print(json.dumps({'ok': True, 'similarity': round(sm.ratio(), 3), 'script_words': len(script_words), 'heard_words': len(heard_words), 'vo_seconds': round(dur, 2),
                  'phrases': len(merged), 'tags': tags, 'front_matter': fm, 'diffs': diffs, 'heard_text': ' '.join(heard_text)}, ensure_ascii=False))
