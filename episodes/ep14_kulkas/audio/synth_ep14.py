"""Whyscape EP14 audio — "Kenapa Makanan di Kulkas Tetap Basi?" (KOK BASI DI KULKAS?).
Music (6 phases: kitchen → micro → before → risk → steps → close; marimba/celesta/pizz, 96 BPM, F major) + ambiences + per-action SFX,
all synthesized by code (numpy/scipy): no samples, no third-party recordings, no voices. Base generators = synth_base_ep10.py and
sfx_base.py (copied unchanged from EP13, which copied them from EP10/EP06).
Usage (inside audio/):  python3 synth_ep14.py cues.json  -> music.wav, sfx.wav, sfx_key.wav, sfx_detail.wav, amb.wav, CUE_SHEET.md
"""
import json, os, sys, numpy as np
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synth_base_ep10 as B
from synth_base_ep10 import S, SR, add, marimba, pluck_bass, pad, tick, hat, kick, midi, lp, hp, bp, shaker, normalise, CLASS_RMS
from synth_base_ep10 import tone, put, mx, noise_burst, sweep, epiano, mtick, st, _env

rng = np.random.default_rng(1414)
MUSIC_TRIM_DB = -2.5   # marimba/celesta sit in the speech band → music file kept lower (VO ≥ 12 dB over music)
MINE = set()
def mine(name):
    def deco(f): MINE.add(name); S.SFX[name] = f; return f
    return deco

# ---------------------------------------------------------------- instruments (EP14 colours)
def pizz(f, dur=.3, vel=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * (1 / k ** 1.3) * np.exp(-t * (14 + 6 * k)) for k in (1, 2, 3, 4, 5)) * .2 * vel * np.minimum(1, t / .003)
def celesta(f, dur=.8, vel=1.):               # cold, glassy bell (the fridge / micro colour)
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 4) + .4 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 14) + .15 * np.sin(2 * np.pi * f * 7.1 * t) * np.exp(-t * 30)) * .16 * vel * np.minimum(1, t / .002)

def music_ep14(cues):
    """kitchen: curious & light (marimba + pizz, 96 BPM, F) → micro: quicker 8ths + celesta, cooler → before: a ticking clock motif,
    a little tension → risk: sparse low pad + single celesta notes (the VO's caution has room) → steps: warm, bouncy (epiano + pizz) →
    close: warm resolution, ends open for the loop."""
    dur = cues['duration']; bpm = 96; beat = 60 / bpm; bar = 4 * beat
    out = np.zeros((int(dur * SR) + SR, 2))
    order = ('close', 'steps', 'risk', 'before', 'micro', 'kitchen')
    ph_of = lambda t: next((k for k in order if any(a <= t < b for a, b in cues.get(k, []))), 'kitchen')
    CH = {'kitchen': [(41, [65, 69, 72]), (46, [65, 70, 74]), (43, [67, 70, 74]), (48, [64, 67, 72])],      # F · Bb · Gm · C
          'micro': [(41, [65, 72, 77]), (39, [63, 70, 74]), (46, [65, 70, 77]), (48, [67, 72, 76])],
          'before': [(38, [62, 65, 69]), (46, [65, 70, 74]), (36, [64, 67, 72]), (41, [65, 69, 72])],
          'risk': [(38, [62, 65, 69]), (34, [62, 65, 70]), (36, [60, 64, 67]), (41, [60, 65, 69])],
          'steps': [(41, [65, 69, 72, 76]), (46, [65, 70, 74]), (38, [62, 65, 69, 72]), (48, [64, 67, 70, 72])],
          'close': [(41, [65, 69, 72, 76]), (46, [65, 70, 74, 77]), (48, [64, 67, 72, 76]), (41, [65, 69, 72, 77])]}
    t0, b = 0., 0
    while t0 < dur:
        ph = ph_of(t0 + .01); root, chord = CH[ph][b % 4]; R = root + 24
        add(out, pad([midi(m) for m in chord], bar + .5, {'kitchen': .4, 'micro': .5, 'before': .55, 'risk': .75, 'steps': .45, 'close': .8}[ph]), t0, 0)
        if ph == 'kitchen':
            for k in range(8):
                if k in (0, 3, 4, 6): add(out, marimba(midi(R + [0, 4, 7, 9, 7, 4, 2, 4][k] - 12), .3, .75), t0 + k * beat / 2, .3 if k % 2 else -.3)
            add(out, pluck_bass(midi(root), .4, .4), t0, -.1); add(out, pluck_bass(midi(root + 7), .3, .3), t0 + 2.5 * beat, -.1)
            add(out, pizz(midi(R + 12 + (4 if b % 2 else 7)), .3, .5), t0 + 3 * beat, .4)
        elif ph == 'micro':
            for k in range(8): add(out, pizz(midi(R + [0, 7, 12, 7, 4, 7, 11, 7][k] - 12), .22, .7), t0 + k * beat / 2, .35 if k % 2 else -.35)
            add(out, celesta(midi(R + 12 + [7, 4, 9, 11][b % 4]), 1.0, .55), t0 + beat, -.4); add(out, celesta(midi(R + 19), .8, .4), t0 + 3 * beat, .4)
            add(out, pluck_bass(midi(root), .35, .4), t0, 0); add(out, pluck_bass(midi(root), .3, .3), t0 + 2 * beat, 0)
            for k in range(4): add(out, shaker(.14), t0 + k * beat + beat / 2, .25)
        elif ph == 'before':
            add(out, pluck_bass(midi(root), .6, .4), t0, -.1)
            for k in range(8): add(out, mtick(.28 if k % 2 == 0 else .18), t0 + k * beat / 2, .3)               # the clock motif
            add(out, marimba(midi(R + [0, 3, 7][b % 3]), .5, .55), t0 + 1.5 * beat, -.3)
        elif ph == 'risk':
            add(out, pluck_bass(midi(root), 1.6, .3), t0, 0)
            add(out, celesta(midi(R + [12, 15, 10, 12][b % 4]), 1.4, .35), t0 + 2 * beat, .2)
        elif ph == 'steps':
            add(out, pluck_bass(midi(root), .4, .42), t0, -.1); add(out, pluck_bass(midi(root + 7), .3, .32), t0 + 2 * beat, -.1)
            for k in range(4): add(out, epiano(midi(R + [0, 4, 7, 4][k]), beat * .9, .45), t0 + k * beat, .2 if k % 2 else -.2)
            for k in range(8): add(out, pizz(midi(R + [12, 7, 9, 7, 12, 14, 12, 7][k]), .2, .4), t0 + k * beat / 2, .35 if k % 2 else -.35)
            add(out, kick(.2), t0, 0); add(out, kick(.15), t0 + 2 * beat, 0)
        else:
            add(out, pluck_bass(midi(root), 1.0, .4), t0, -.1)
            for k, d in enumerate([0, 4, 7, 11] if b % 2 == 0 else [12, 11, 7, None]):
                if d is not None: add(out, marimba(midi(R + d), .6, .55), t0 + k * beat, .3 if k % 2 else -.3)
            add(out, celesta(midi(R + 16), 1.2, .35), t0 + beat, 0)
        t0 += bar; b += 1
    out = out[:int(dur * SR)]
    f = int(cues.get('fade', 1.0) * SR); out[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    fi = int(cues.get('fadeIn', 0) * SR)
    if fi: out[:fi] *= np.linspace(0, 1, fi)[:, None] ** 1.5
    return out

fitn = lambda x, n: np.pad(x, (0, max(0, n - len(x))))[:n]
# ---------------------------------------------------------------- SFX (each tied to something visible)
@mine('fridgeopen')
def sfx_fridgeopen():                          # door seal lets go (soft suck-pop) + the compressor/light hum swells in
    n = int(1.2 * SR); t = np.arange(n) / SR
    pop = mx(lp(noise_burst(.06, 100, 1500, 40, .35), 1500), tone(180, .12, 30, .08, (1, .5)))
    hum = (np.sin(2 * np.pi * 100 * t) * .4 + np.sin(2 * np.pi * 200 * t) * .2 + bp(rng.standard_normal(n), 300, 1200) * .3) * .03 * np.minimum(1, t / .4) * np.exp(-t * 1.2)
    return mx(pop, hum)
@mine('fridgeclose')
def sfx_fridgeclose(): return mx(lp(noise_burst(.12, 60, 700, 25, .5), 600), np.pad(tone(140, .2, 25, .1, (1, .5)), (int(.01 * SR), 0)), np.pad(noise_burst(.02, 1500, 5000, 200, .05), (int(.05 * SR), 0)))
@mine('lidclick')
def sfx_lidclick(): return mx(noise_burst(.012, 2500, 8000, 400, .25), np.pad(tone(1900, .04, 120, .08, (1,)), (int(.004 * SR), 0)), np.pad(noise_burst(.015, 1500, 6000, 300, .15), (int(.09 * SR), 0)), np.pad(lp(noise_burst(.2, 200, 2500, 20, .1), 2500), (int(.12 * SR), 0)))   # two latches + plastic lid lift
@mine('boxslide')
def sfx_boxslide(dur=.6): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 600, 3500) * .05 * np.sin(np.pi * t / dur) ** 1.5
@mine('odor')
def sfx_odor(dur=1.4):                         # the smell rises: a soft, wobbly, slightly "off" airy glide (comic, not gross)
    n = int(dur * SR); t = np.arange(n) / SR; f = 420 + 60 * np.sin(2 * np.pi * 3 * t) + 120 * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * .03 * np.sin(np.pi * t / dur) + bp(rng.standard_normal(n), 800, 2500) * .01 * np.sin(np.pi * t / dur)
@mine('recoil')
def sfx_recoil(): n = int(.45 * SR); t = np.arange(n) / SR; f = 520 * np.exp(-t * 2.2) + 260; return np.sin(2 * np.pi * np.cumsum(f) / SR) * .08 * np.exp(-t * 6)   # comic "boing" back
@mine('scale')
def sfx_scale(dur=1.2):                        # scale change: into the food surface, a soft downward whoosh with a glassy tail
    n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 2200) * .09 * np.sin(np.pi * t / dur) ** 2 + sweep(700, 220, dur, .03) + fitn(np.pad(celesta(1397, .6, .5), (int(.6 * SR), 0)), n) * .6
@mine('divide')
def sfx_divide(n=1, iv=.4, pitch=1.):          # a cell divides: a tiny wet double "blip" (rising), one per division
    out = np.zeros(int((n * iv + .3) * SR))
    for k in range(n): put(out, mx(sweep(400 * pitch, 700 * pitch, .06, .05), np.pad(sweep(500 * pitch, 900 * pitch, .05, .04), (int(.06 * SR), 0))), int(k * iv * SR))
    return out
@mine('card')
def sfx_card(pitch=1.): return mx(noise_burst(.025, 1500, 6000, 150, .1), np.pad(marimba(660 * pitch, .3, .8), (int(.01 * SR), 0)) * .5)
@mine('snip')
def sfx_snip(n=3, iv=.5): out = np.zeros(int((n * iv + .2) * SR)); [put(out, mx(noise_burst(.01, 3000, 9000, 500, .12), np.pad(tone(1200, .06, 60, .06, (1, .5)), (int(.012 * SR), 0))), int(k * iv * SR)) for k in range(n)]; return out
@mine('slowmo')
def sfx_slowmo(dur=1.2): n = int(dur * SR); t = np.arange(n) / SR; f = 700 * np.exp(-t * 1.4) + 150; return np.sin(2 * np.pi * np.cumsum(f) / SR) * .05 * np.minimum(1, t / .05) * np.exp(-t * 1.5) + lp(rng.standard_normal(n), 900) * .02 * np.exp(-t * 2)
@mine('pausefail')
def sfx_pausefail(): return mx(tone(523, .12, 20, .06, (1, .3)), np.pad(tone(392, .14, 18, .06, (1, .3)), (int(.12 * SR), 0)), np.pad(tone(330, .2, 12, .05, (1, .3)), (int(.26 * SR), 0)))
@mine('frost')
def sfx_frost(): out = np.zeros(int(.9 * SR)); [put(out, celesta(f, .5, .6), int(k * .06 * SR)) for k, f in enumerate((2093, 2349, 2637, 3136, 2794))]; return out + np.pad(hp(rng.standard_normal(int(.5 * SR)), 5000) * .01 * _env(int(.5 * SR), .05, .3), (0, int(.4 * SR)))
@mine('coldair')
def sfx_coldair(dur=1.6): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 1500, 6000) * .025 * np.sin(np.pi * t / dur) ** 2
@mine('scribble')
def sfx_scribble(dur=.6): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 2000, 7000) * (.5 + .5 * np.sin(2 * np.pi * 9 * t)) * .05 * _env(n, .03, .1)
@mine('flag')
def sfx_flag(): return mx(lp(noise_burst(.08, 80, 900, 30, .4), 800), np.pad(tone(220, .3, 10, .08, (1, .4)), (int(.01 * SR), 0)))
@mine('extend')
def sfx_extend(dur=.9): return sweep(330, 660, dur, .04) + fitn(np.pad(celesta(1047, .6, .4), (int((dur - .1) * SR), 0)), int(dur * SR)) * .6
@mine('mystery')
def sfx_mystery(): return mx(tone(196, .6, 4, .08, (1, .5, .3)), np.pad(tone(233, .6, 4, .07, (1, .5)), (int(.18 * SR), 0)), np.pad(celesta(1480, .7, .5), (int(.36 * SR), 0)))   # low "dun-dun" + a curious bell (light)
@mine('pour')
def sfx_pour(dur=.5): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 1500) * .06 * np.sin(np.pi * t / dur) + sweep(300, 500, dur, .02)
@mine('needle')
def sfx_needle(dur=.8): out = np.zeros(int(dur * SR)); [put(out, tone(2600, .015, 300, .02, (1,)), int(k * .06 * SR)) for k in range(int(dur / .06))]; return out

# ---------------------------------------------------------------- ambiences
@mine('amb_kitchen')
def amb_kitchen(dur=4.):                       # Mpi's kitchen: soft room air, the fridge's low hum, a far bird outside now and then
    n = int(dur * SR); t = np.arange(n) / SR
    out = lp(rng.standard_normal(n), 400) * .01 + np.sin(2 * np.pi * 100 * t) * .003 + np.sin(2 * np.pi * 200 * t) * .0015
    k = .8
    while k < dur - .5: put(out, tone(2900 + 600 * rng.random(), .1, 18, .004, (1,)), int(k * SR)); k += 2 + 2.5 * rng.random()
    return st(out, .3)
@mine('amb_micro')
def amb_micro(dur=4.):                         # the micro world in the cold: airy, glassy, slow drifting shimmer (quiet)
    n = int(dur * SR); t = np.arange(n) / SR
    return st(bp(rng.standard_normal(n), 2500, 8000) * .006 * (1 + .5 * np.sin(2 * np.pi * .2 * t)) + lp(rng.standard_normal(n), 250) * .012, .5)
@mine('amb_fridge')
def amb_fridge(dur=4.):                        # inside the fridge: closer hum + cold air
    n = int(dur * SR); t = np.arange(n) / SR
    return st(np.sin(2 * np.pi * 100 * t) * .006 + np.sin(2 * np.pi * 300 * t) * .002 + bp(rng.standard_normal(n), 800, 4000) * .008, .2)
@mine('amb_paper')
def amb_paper(dur=4.): n = int(dur * SR); t = np.arange(n) / SR; return st(bp(rng.standard_normal(n), 300, 1500) * .01 * (1 + .5 * np.sin(2 * np.pi * .12 * t)), .4)

if __name__ == '__main__':
    cues = json.load(open(sys.argv[1], encoding='utf-8'))
    m = music_ep14(cues)
    wavfile.write('music.wav', SR, (m / (np.abs(m).max() + 1e-9) * .8 * 10 ** (MUSIC_TRIM_DB / 20)).astype(np.float32))
    N = int(cues['duration'] * SR); sfx = np.zeros((N, 2))
    tracks = {k: np.zeros((N, 2)) for k in ('key', 'detail', 'amb')}
    def add2(buf, x, at, pan):
        if x.ndim == 1: return add(buf, x, at, pan)
        i = int(at * SR); x = x[:len(buf) - i]; buf[i:i + len(x)] += x
    rows = []
    for ev in cues['sfx']:
        cls = ev.get('cls', 'movement')
        x = np.asarray(S.SFX[ev['name']](**ev.get('args', {})), dtype=np.float64)
        x = normalise(x, cls) * 10 ** (ev.get('trim', 0) / 20) if cls in CLASS_RMS else x * ev.get('gain', 1.)
        tr = tracks['amb' if cls in ('amb', 'ambience') else 'key' if cls in ('key', 'id', 'hero') else 'detail']
        add2(tr, x, ev['t'], ev.get('pan', 0.))
        if cls not in ('amb', 'ambience'): add2(sfx, x, ev['t'], ev.get('pan', 0.))
        xm = x.mean(1) if x.ndim > 1 else x
        rms = 20 * np.log10(np.sqrt(np.mean(xm[np.abs(xm) > np.abs(xm).max() * .1] ** 2)) + 1e-9)
        src = f"`synth_ep14.py` → {ev['name']}" if ev['name'] in MINE else f"`synth_base_ep10.py`/`sfx_base.py` (kit lineage) → {ev['name']}"
        rows.append(f"| {ev['t']:.2f}–{ev['t'] + len(x) / SR:.2f} · {ev.get('anchor', '')} | {ev.get('label', '')} | {cls} | {src} | {rms:.1f} dBFS RMS (trim {ev.get('trim', 0):+g}) | {ev.get('why', '')} | buatan sendiri (kode) |")
    wavfile.write('sfx.wav', SR, sfx.astype(np.float32))
    for k, v in tracks.items(): wavfile.write(f'sfx_{k}.wav' if k != 'amb' else 'amb.wav', SR, v.astype(np.float32))
    open(os.environ.get('CUE_OUT', 'CUE_SHEET.md'), 'w', encoding='utf-8').write(cues.get('sheetHead', '') + '| Waktu (s) · anchor VO | Aksi | Kelas | Sumber / file | Level relatif (pre-mix) | Tujuan | Lisensi |\n|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    print('music', round(m.shape[0] / SR, 2), 's; sfx events', len(cues['sfx']))
