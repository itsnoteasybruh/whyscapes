"""Whyscape EP13 mix (EP06/EP07 mix + cues.json duckAmb: ambience can be pulled down for a story silence, e.g. jam ke-72 before "Ting"; VO / music / SFX / ambience stems; hero cues on the KEY bus, movement cues on the DETAIL bus).
Whyscape EP03 final mix — the series mix (series/audio/mix.py) extended for the final patch:
  · four stems: VO / music / SFX / ambience (stem_vo, stem_music, stem_sfx, stem_amb)
  · SFX in two buses with their own ceilings: KEY (reveals, findings, decisions, identity) may sit closer to the VO
    (≤ VO − 6 dB while speaking, ≤ music + 6 dB in gaps); DETAIL/TEXTURE stay further back (≤ VO − 10 dB / ≤ music + 4 dB)
  · music ducks a few dB under key cues and under the densest explanations (cues.json duckMusic), then recovers slowly
  · per-cue audibility report (headphone + phone-speaker band) and an A/B against the v2 stems if they are in ../archive_v2
Usage (inside audio/):  python3 mix_ep03.py <cues.json> <out_tag>     e.g.  python3 mix_ep03.py cues.json final
Inputs: vo.mp3 (or VO_IN env), music.wav, sfx_key.wav, sfx_detail.wav, amb.wav.  Outputs: mix_<tag>.wav, stem_*_<tag>.wav, report_<tag>.json
"""
import subprocess, sys, json, os, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
from scipy.ndimage import uniform_filter1d

SR = 44100; cues = json.load(open(sys.argv[1])); TAG = sys.argv[2] if len(sys.argv) > 2 else 'final'
D = cues['duration']; n = int(D * SR); db = lambda x: 10 ** (x / 20)
VO_IN = os.environ.get('VO_IN', 'vo.mp3')
OFF = float(cues.get('voOffset', 0))      # EP13: the VO is scheduled behind the cover by a fixed offset (whole file, uncut, 1.00x)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VO_IN, '-ac', '1', '-ar', str(SR)] + (['-af', f'adelay={int(round(OFF * 1000))}'] if OFF > 0 else []) + ['-f', 'f32le', 'vo.f32'], check=True)
vo = np.fromfile('vo.f32', dtype=np.float32).astype(np.float64); vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
fit = lambda x: np.pad(x, ((0, max(0, n - len(x))), (0, 0)))[:n].astype(np.float64)
rd = lambda f: fit(wavfile.read(f)[1])
mus, sk, sd, amb = rd(os.environ.get('MUSIC_IN', 'music.wav')), rd('sfx_key.wav'), rd('sfx_detail.wav'), rd('amb.wav')

def env(x, win_s=.03):
    w = int(win_s * SR); return np.sqrt(np.maximum(uniform_filter1d(x ** 2, w, mode='constant'), 0) + 1e-12)   # EP13: O(n) moving average (EP10 used np.convolve: ~14 min on Windows)
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

vo_env = env(vo)
speech = smooth((vo_env > db(-42)).astype(float), .08, .55, hold=.32)

# music (series values) + lifts + ducks
g_db = -5.0 + (-11.0 + 5.0) * speech
lift = np.zeros(n)
for a, b, amt in cues.get('lift', []):
    i0, i1 = int(a * SR), int(min(b, D) * SR)
    ramp = np.minimum(1, np.minimum(np.arange(i1 - i0) / (.25 * SR), (i1 - i0 - np.arange(i1 - i0)) / (.35 * SR)))
    lift[i0:i1] = np.maximum(lift[i0:i1], amt * ramp)
duck = np.zeros(n)
for a, b, amt in cues.get('duckMusic', []):
    i0, i1 = max(0, int(a * SR)), int(min(b, D) * SR); duck[i0:i1] = np.minimum(duck[i0:i1], amt)
duck = -smooth(-duck, .04, .6)                     # quick dip, slow recovery
g_db = g_db + lift * (1 - .6 * speech) + duck
music = mus * db(g_db)[:, None]

# SFX buses
def bus(x, trim, duck_db, sp_ceiling_db, gap_ceiling_db, floor_db):
    s = x * db(trim) * db(duck_db * speech)[:, None]
    s_env = env(s.mean(1), .05); m_env = env(music.mean(1), .25); v_env = env(vo, .05)
    ceiling = np.where(speech > .5, v_env * db(sp_ceiling_db), np.maximum(m_env * db(gap_ceiling_db), db(floor_db)))
    gr = smooth(np.minimum(1, ceiling / s_env), .005, .12)
    return s * np.minimum(1, gr)[:, None], gr
key, gr_k = bus(sk, -5.0, -2.5, -8.5, 6.0, -26)
det, gr_d = bus(sd, -3.5, -4.0, -12.0, 5.0, -30)
sfx = key + det
ad = np.zeros(n)
for a, b, amt in cues.get('duckAmb', []):
    i0, i1 = max(0, int(a * SR)), int(min(b, D) * SR); ad[i0:i1] = np.minimum(ad[i0:i1], amt)
ad = -smooth(-ad, .6, .25)                         # slow fade into the hush, quicker return after it
ambm = amb * db(-4.0 * speech + ad)[:, None]

vo2 = np.repeat(vo[:, None], 2, 1)
mix = vo2 + music + sfx + ambm
wavfile.write('_premix.wav', SR, mix.astype(np.float32))
m = subprocess.run(['ffmpeg', '-i', '_premix.wav', '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(m.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0]); G = db(-14.0 - I)
for name, x in (('stem_vo', vo2), ('stem_music', music), ('stem_sfx', sfx), ('stem_amb', ambm)):
    wavfile.write(f'{name}_{TAG}.wav', SR, (x * G).astype(np.float32))
y = mix * G
pk = np.abs(y).max(); lim = db(-1.2)
if pk > lim:
    e = smooth(np.maximum(1, np.abs(y).max(1) / lim), .0005, .08); y = y / e[:, None]
wavfile.write('_master_pre.wav', SR, y.astype(np.float32))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '_master_pre.wav', '-af', 'aresample=176400,alimiter=limit=0.79:attack=2:release=60:level=false,aresample=44100',
                '-c:a', 'pcm_s16le', f'mix_{TAG}.wav'], check=True)

# ---------- checks ----------
PH = butter(4, [350 / (SR / 2), 7000 / (SR / 2)], 'band', output='sos')
def lvl(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
def ratio(sig, bg, mask, phone=False):
    if mask.sum() < SR * .1: return None
    if phone: sig, bg = sosfilt(PH, sig), sosfilt(PH, bg)
    return round(lvl(sig[mask]) - lvl(bg[mask]), 1)
sp = speech > .9
rep = {'master_gain_dB': round(20 * np.log10(G), 2),
       'speech_vs_music_dB(headphone)': ratio(vo, music.mean(1), sp), 'speech_vs_music_dB(phone)': ratio(vo, music.mean(1), sp, True),
       'speech_vs_sfx_dB(headphone)': ratio(vo, sfx.mean(1), sp), 'speech_vs_sfx_dB(phone)': ratio(vo, sfx.mean(1), sp, True),
       'key_frames_limited_%': round(float(np.mean(gr_k < .98) * 100), 1), 'detail_frames_limited_%': round(float(np.mean(gr_d < .98) * 100), 1)}
# per-cue audibility: the cue's bus inside its window vs everything else (VO + music + amb) in the same window, phone band
# (a cue more than ~18 dB under its surroundings on a phone speaker is treated as "lost")
vo_ph, rest_ph = sosfilt(PH, vo * G), sosfilt(PH, (music + ambm).mean(1) * G)
busmap = {'key': key, 'id': key, 'hero': key, 'detail': det, 'texture': det, 'movement': det}
rows = []; lost = 0
for e in cues['sfx']:
    if e['cls'] in ('amb', 'ambience'): continue
    a = int(e['t'] * SR); b = min(n, a + int(min(.6, max(.12, e.get('args', {}).get('dur', .4))) * SR))
    if b - a < 100: continue
    cue_ph = sosfilt(PH, busmap[e['cls']].mean(1)[a:b] * G)
    bg = vo_ph[a:b] + rest_ph[a:b]
    r = lvl(cue_ph) - lvl(bg); on_speech = float(speech[a:b].mean()) > .5
    if r < -18: lost += 1
    rows.append({'t': e['t'], 'label': e['label'], 'cls': e['cls'], 'cue_vs_bed_phone_dB': round(r, 1), 'over_speech': on_speech})
rep['cues_measured'] = len(rows); rep['cues_lost_on_phone(<-18dB)'] = lost
rep['median_cue_vs_bed_phone_dB'] = {c: round(float(np.median([x['cue_vs_bed_phone_dB'] for x in rows if x['cls'] == c])), 1) for c in ('id', 'hero', 'movement', 'key', 'detail', 'texture') if any(x['cls'] == c for x in rows)}
json.dump({'summary': rep, 'cues': rows}, open(f'report_{TAG}.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(rep))
for f in ('_premix.wav', '_master_pre.wav', 'vo.f32'):
    if os.path.exists(f): os.remove(f)
