"""Whyscape series mix (from EP01 v4) — VO first, music as the glue, SFX as short accents.
Usage (inside <episode>/audio/, after synth.py): python3 <kit>/series/audio/mix.py <duration_s>
Inputs: vo.wav (if present) or vo.mp3, music.wav, sfx.wav, cues.json (lift).  Outputs: mix_final.wav (−14 LUFS, true peak ≤ −1 dBTP), stem_vo/music/sfx.wav
Writes stems (same master gain, pre-limiter) + final mix, and prints checks for headphone and phone-speaker playback.
"""
import subprocess, sys, json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100; D = float(sys.argv[1]); n = int(D * SR)
cues = json.load(open('cues.json'))
db = lambda x: 10 ** (x / 20)

import os
VO_IN = 'vo.wav' if os.path.exists('vo.wav') else 'vo.mp3'   # kit v1.4: lossless VO (e.g. a speed-adjusted master) when present
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VO_IN, '-ac', '1', '-ar', str(SR), '-f', 'f32le', 'vo.f32'], check=True)
vo = np.fromfile('vo.f32', dtype=np.float32); vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
_, mus = wavfile.read('music.wav'); _, sfx = wavfile.read('sfx.wav')
fit = lambda x: np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n].astype(np.float64)
mus, sfx = fit(mus), fit(sfx)

def env(x, win_s=.03):
    w = int(win_s * SR); return np.sqrt(np.convolve(x ** 2, np.ones(w) / w, mode='same') + 1e-12)
def smooth(target, att, rel, hold=0.):
    out = np.zeros(n); acc = 0.; h = 0; B = 64
    a, r = 1 - np.exp(-B / (att * SR)), 1 - np.exp(-B / (rel * SR)); H = int(hold * SR / B)
    for i in range(0, n, B):
        tg = target[i]
        if tg >= acc: acc += (tg - acc) * a; h = H
        elif h > 0: h -= 1
        else: acc += (tg - acc) * r
        out[i:i + B] = acc
    return out

# 1) speech activity with hold → short gaps keep the music ducked (no pumping between words)
vo_env = env(vo)
speech = smooth((vo_env > db(-42)).astype(float), .08, .55, hold=.32)

# 2) music: louder than before (+2.5 dB in gaps, +5.5 dB under speech), lifted further in transitions / logo
g_db = -5.0 + (-11.0 + 5.0) * speech            # gaps −5 dB, under speech −11 dB (music clearly present)
lift = np.zeros(n)
for a, b, amt in cues.get('lift', []):
    i0, i1 = int(a * SR), int(min(b, D) * SR)
    ramp = np.minimum(1, np.minimum(np.arange(i1 - i0) / (.25 * SR), (i1 - i0 - np.arange(i1 - i0)) / (.35 * SR)))
    lift[i0:i1] = np.maximum(lift[i0:i1], amt * ramp)
g_db = g_db + lift * (1 - .6 * speech)          # transition lift stays modest while words are spoken
music = mus * db(g_db)[:, None]

# 3) SFX: global trim + duck under speech, then an envelope limiter so an accent never covers a word
#    (≤ VO − 9 dB while speaking) and never stands far above the music bed in gaps (≤ music + 4 dB)
s = sfx * .5 * db(-5.0 * speech)[:, None]
s_env = env(s.mean(1), .05); m_env = env(music.mean(1), .25); v_env = env(vo, .05)
ceiling = np.where(speech > .5, v_env * db(-9), np.maximum(m_env * db(3), db(-34)))
gr = np.minimum(1, ceiling / s_env)
gr = smooth(gr, .005, .12)                       # fast attack, gentle release
s = s * np.minimum(1, gr)[:, None]

vo2 = np.repeat(vo[:, None], 2, 1)
mix = vo2 + music + s

# 4) master: one gain for everything (stems stay summable), target −14 LUFS, then true-peak limit only on the final
wavfile.write('_premix.wav', SR, mix.astype(np.float32))
m = subprocess.run(['ffmpeg', '-i', '_premix.wav', '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(m.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])
G = db(-14.0 - I)
for name, x in (('stem_vo', vo2), ('stem_music', music), ('stem_sfx', s)):
    wavfile.write(f'{name}.wav', SR, (x * G).astype(np.float32))
y = mix * G
pk = np.abs(y).max(); lim = db(-1.2)
if pk > lim:   # soft-knee peak limiter (look-ahead-free, gentle)
    e = smooth(np.maximum(1, np.abs(y).max(1) / lim), .0005, .08)
    y = y / e[:, None]
wavfile.write('_master_pre.wav', SR, y.astype(np.float32))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_master_pre.wav', '-af', 'aresample=176400,alimiter=limit=0.79:attack=2:release=60:level=false,aresample=44100',
                '-c:a', 'pcm_s16le', 'mix_final.wav'], check=True)

# 5) checks — headphone (full band) and phone speaker (HPF 350 Hz / LPF 7 kHz)
def ratio(sig, bg, mask, phone=False):
    if mask.sum() < SR * .1: return None   # e.g. silent placeholder VO → nothing to measure
    if phone:
        sos = butter(4, [350 / (SR / 2), 7000 / (SR / 2)], 'band', output='sos'); sig, bg = sosfilt(sos, sig), sosfilt(sos, bg)
    return 20 * np.log10(np.sqrt(np.mean(sig[mask] ** 2)) / (np.sqrt(np.mean(bg[mask] ** 2)) + 1e-12))
sp = speech > .9; gap = (speech < .4) & (np.arange(n) > SR * 1.5) & (np.arange(n) < (D - 2) * SR)
msum, ssum = music.mean(1), s.mean(1)
rep = {
  'master_gain_dB': round(20 * np.log10(G), 2),
  'speech_vs_music_dB(headphone)': ratio(vo, msum, sp), 'speech_vs_music_dB(phone)': ratio(vo, msum, sp, True),
  'speech_vs_sfx_dB(headphone)': ratio(vo, ssum, sp), 'speech_vs_sfx_dB(phone)': ratio(vo, ssum, sp, True),
  'music_vs_sfx_in_gaps_dB': ratio(msum, ssum, gap),
  'sfx_frames_limited_%': round(float(np.mean(gr < .98) * 100), 1),
}
rep = {k: (round(v, 1) if isinstance(v, float) and k != 'master_gain_dB' else v) for k, v in rep.items()}
print(json.dumps(rep))
import os
for f in ('_premix.wav', '_master_pre.wav', 'vo.f32'):
    if os.path.exists(f): os.remove(f)
