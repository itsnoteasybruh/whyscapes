"""Per-cue audibility on a phone speaker (350 Hz–7 kHz): 95th-pct 20 ms envelope of the SFX stem vs RMS of VO+music+ambience in the cue window."""
import json, sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
from scipy.ndimage import uniform_filter1d
SR = 44100; PH = butter(4, [350 / (SR / 2), 7000 / (SR / 2)], 'band', output='sos')
mono = lambda f: (lambda x: x.mean(1) if x.ndim > 1 else x)(wavfile.read(f)[1].astype(np.float64))
lvl = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
def penv(x): w = int(.02 * SR); e = np.sqrt(np.maximum(uniform_filter1d(x ** 2, w, mode='constant'), 0) + 1e-12); return 20 * np.log10(np.percentile(e, 95) + 1e-12)
tag = sys.argv[1]; cues = json.load(open(sys.argv[2]))
sfx = mono(f'stem_sfx_{tag}.wav'); bed = mono(f'stem_vo_{tag}.wav') + mono(f'stem_music_{tag}.wav') + mono(f'stem_amb_{tag}.wav')
rows = []
for e in cues['sfx']:
    if e['cls'] in ('ambience', 'amb'): continue
    a = int(e['t'] * SR); d = e.get('args', {}).get('dur', .4); b = min(len(sfx), a + int(min(.8, max(.15, d)) * SR))
    if b - a < 200: continue
    s, g = sosfilt(PH, sfx[a:b]), sosfilt(PH, bed[a:b]); rows.append((e['t'], e['cls'], e['label'], round(penv(s) - lvl(g), 1)))
pk = np.array([r[3] for r in rows])
print(json.dumps({'cues': len(rows), 'median': round(float(np.median(pk)), 1), 'clear(>-12)': int((pk > -12).sum()), 'lost(<-18)': int((pk < -18).sum()),
  'by_class': {c: round(float(np.median([r[3] for r in rows if r[1] == c])), 1) for c in set(r[1] for r in rows)}}))
for r in rows:
    if r[3] < -18: print('LOST', r)
json.dump(rows, open(f'audibility_{tag}.json', 'w'), ensure_ascii=False, indent=1)
