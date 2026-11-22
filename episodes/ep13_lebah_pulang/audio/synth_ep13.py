"""Whyscape EP13 audio — "Gimana Lebah Menemukan Jalan Pulang ke Sarangnya?" (LEBAH PULANG KE SARANG).
Music (6 phases, "micro expedition": pizzicato, kalimba, soft flute) + ambiences + per-action SFX, all synthesized by code
(numpy/scipy): no samples, no third-party recordings, no voices. Base generators = synth_base_ep10.py (copied unchanged).
Usage (inside audio/):  python synth_ep13.py cues.json  -> music.wav, sfx.wav, sfx_key.wav, sfx_detail.wav, amb.wav, CUE_SHEET.md
"""
import json, os, sys, numpy as np
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synth_base_ep10 as B
from synth_base_ep10 import S, SR, add, marimba, pluck_bass, pad, tick, hat, kick, midi, lp, hp, bp, ping, wood, shaker, normalise, CLASS_RMS
from synth_base_ep10 import tone, put, mx, noise_burst, sweep, epiano, stab, mtick, pluck, st, _env

rng = np.random.default_rng(1313)
MUSIC_TRIM_DB = -4.8   # EP13: pizz / kalimba sit in the speech band → music file kept lower (VO ≥ 12 dB over music)
MINE = set()
def mine(name):
    def deco(f): MINE.add(name); S.SFX[name] = f; return f
    return deco

# ---------------------------------------------------------------- instruments (EP13 colours)
def pizz(f, dur=.3, vel=1.):                  # plucked string, short and woody
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * (1 / k ** 1.3) * np.exp(-t * (14 + 6 * k)) for k in (1, 2, 3, 4, 5)) * .2 * vel * np.minimum(1, t / .003)
def kalimba(f, dur=.7, vel=1.):               # tine: fundamental + inharmonic partial, bell-like decay
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + .35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 22)) * .22 * vel * np.minimum(1, t / .002)
def flute(f, dur=.8, vel=1.):                 # breathy sine lead with a gentle vibrato and air
    n = int(dur * SR); t = np.arange(n) / SR; vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / .3)
    e = np.minimum(1, t / .08) * np.minimum(1, (dur - t) / .2)
    return (np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + .18 * np.sin(4 * np.pi * f * np.cumsum(vib) / SR)) * .12 * vel * e + bp(rng.standard_normal(n), 2000, 7000) * .006 * e

def music_ep13(cues):
    """garden: light & curious (pizzicato ostinato + kalimba, 100 BPM, D lydian) → learn: warm flashback (soft flute, pad) →
    sky: open & spacious, a quiet ticking motif for the inner clock → flow: quicker pizz 8ths (scenery rushing past) →
    home: the clues arrive and instruments are ADDED one by one → nest: warm resolution, kalimba + flute, ends open for the loop."""
    dur = cues['duration']; bpm = 100; beat = 60 / bpm; bar = 4 * beat
    out = np.zeros((int(dur * SR) + SR, 2))
    order = ('nest', 'home', 'flow', 'sky', 'learn', 'garden')
    ph_of = lambda t: next((k for k in order if any(a <= t < b for a, b in cues.get(k, []))), 'garden')
    CH = {'garden': [(38, [62, 66, 69, 73]), (40, [64, 68, 71]), (38, [62, 66, 69]), (36, [64, 67, 71])],     # D · E (lydian lift) · D · Em/C
          'learn': [(38, [62, 66, 69, 74]), (43, [62, 67, 71]), (45, [64, 69, 73]), (43, [62, 67, 71])],
          'sky': [(38, [62, 69, 74]), (40, [64, 71, 76]), (43, [67, 71, 74]), (45, [64, 69, 73])],
          'flow': [(38, [62, 66, 69]), (40, [64, 68, 71]), (35, [62, 66, 71]), (40, [64, 68, 71])],
          'home': [(43, [67, 71, 74]), (45, [64, 69, 73]), (47, [66, 71, 74]), (45, [64, 69, 73])],
          'nest': [(38, [62, 66, 69, 74]), (43, [67, 71, 74, 78]), (45, [64, 69, 73, 76]), (38, [62, 66, 69, 74])]}
    home = cues.get('home', [[1e9, 1e9]])[0]
    t0, b = 0., 0
    while t0 < dur:
        ph = ph_of(t0 + .01); root, chord = CH[ph][b % 4]; R = root + 24
        add(out, pad([midi(m) for m in chord], bar + .5, {'garden': .4, 'learn': .75, 'sky': .8, 'flow': .4, 'home': .55, 'nest': .85}[ph]), t0, 0)
        if ph == 'garden':
            for k in range(8): add(out, pizz(midi(R + [0, 4, 7, 4, 9, 7, 4, 2][k] - 12), .28, .7), t0 + k * beat / 2, .3 if k % 2 else -.3)
            add(out, pluck_bass(midi(root), .4, .4), t0, -.1); add(out, pluck_bass(midi(root + 7), .3, .3), t0 + 2 * beat, -.1)
            add(out, kalimba(midi(R + 12 + (4 if b % 2 else 7)), .7, .6), t0 + 1.5 * beat, .4)
        elif ph == 'learn':
            add(out, pluck_bass(midi(root), 1.4, .35), t0, 0)
            for k, d in enumerate([7, 9, 11, 9]): add(out, flute(midi(R + d), beat * .95, .8), t0 + k * beat, .15)
        elif ph == 'sky':
            add(out, pluck_bass(midi(root), 1.8, .35), t0, 0)
            add(out, kalimba(midi(R + 19), 1.0, .4), t0 + beat, -.4); add(out, kalimba(midi(R + 14), 1.0, .35), t0 + 3 * beat, .4)
            for k in range(4): add(out, mtick(.22), t0 + k * beat, .3)                                   # quiet "inner clock" tick
        elif ph == 'flow':
            for k in range(8): add(out, pizz(midi(R + [0, 7, 12, 7, 4, 7, 12, 14][k] - 12), .22, .75), t0 + k * beat / 2, .35 if k % 2 else -.35)
            for k in range(8): add(out, shaker(.16 if k % 2 else .22), t0 + k * beat / 2, .25)
            add(out, kick(.26), t0, 0); add(out, kick(.2), t0 + 2 * beat, 0)
        elif ph == 'home':
            lay = 1 + int((t0 - home[0]) / (bar * 2))                                                       # a new layer every 2 bars
            add(out, pluck_bass(midi(root), .4, .42), t0, -.1); add(out, pluck_bass(midi(root + 7), .3, .32), t0 + 2 * beat, -.1)
            for k in range(8): add(out, pizz(midi(R + [0, 4, 7, 12, 7, 4, 7, 9][k] - 12), .25, .55), t0 + k * beat / 2, -.3 if k % 2 else .3)
            if lay >= 2: add(out, kalimba(midi(R + 12), .7, .5), t0 + beat, .4); add(out, kalimba(midi(R + 16), .7, .45), t0 + 3 * beat, -.4)
            if lay >= 3:
                for k, d in enumerate([12, 14, 16, 19]): add(out, flute(midi(R + d), beat * .9, .6), t0 + k * beat, .1)
            if lay >= 4:
                for k in range(8): add(out, shaker(.14), t0 + k * beat / 2, .25)
        else:
            add(out, pluck_bass(midi(root), 1.0, .4), t0, -.1)
            for k, d in enumerate([0, 4, 7, 11] if b % 2 == 0 else [12, 11, 7, None]):
                if d is not None: add(out, kalimba(midi(R + d), .9, .55), t0 + k * beat, .3 if k % 2 else -.3)
            add(out, flute(midi(R + 16), bar * .8, .5), t0, 0)
        t0 += bar; b += 1
    out = out[:int(dur * SR)]
    f = int(cues.get('fade', 1.0) * SR); out[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    fi = int(cues.get('fadeIn', 0) * SR)
    if fi: out[:fi] *= np.linspace(0, 1, fi)[:, None] ** 1.5
    return out

# ---------------------------------------------------------------- SFX (each tied to something visible)
@mine('buzz')
def sfx_buzz(dur=1.2, size=1., near=1., f0=230.):   # a wing-beat buzz GESTURE (not a loop): pitch/level follow size & distance
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 / size * (1 + .04 * np.sin(2 * np.pi * 3.1 * t))
    ph = np.cumsum(f) / SR * 2 * np.pi
    x = (np.sign(np.sin(ph)) * .4 + np.sin(ph) * .6) * (1 + .3 * np.sin(2 * np.pi * 7 * t))
    x = lp(x, 2500 + 1500 * near) * .07 * near * np.sin(np.pi * t / dur) ** .8
    return x
@mine('passby')
def sfx_passby(dur=1.1):                       # the bee passes close to the lens: buzz swelling + doppler drop, left → right
    n = int(dur * SR); t = np.arange(n) / SR; f = 260 * (1.12 - .24 * (t / dur)); ph = np.cumsum(f) / SR * 2 * np.pi
    m = lp(np.sign(np.sin(ph)) * .4 + np.sin(ph) * .6, 3500) * .1 * np.exp(-((t - dur * .5) ** 2) / (2 * (dur * .18) ** 2))
    pan = -1 + 2 * t / dur; return np.stack([m * np.sqrt((1 - pan) / 2), m * np.sqrt((1 + pan) / 2)], 1)
@mine('grassstep')
def sfx_grassstep(n=4, iv=.36):                # Mpi on grass/path: soft rustle + gritty pad
    out = np.zeros(int((n * iv + .3) * SR))
    for k in range(n): put(out, mx(bp(noise_burst(.12, 1500, 6000, 25, .16), 1500, 6000), lp(noise_burst(.05, 100, 800, 40, .2), 700)), int(k * iv * SR))
    return out
@mine('flowerbob')
def sfx_flowerbob(): return mx(tone(1320, .12, 30, .04, (1,)), bp(noise_burst(.08, 3000, 8000, 50, .06), 3000, 8000))   # a flower dips as the bee lands
@mine('phonepop')
def sfx_phonepop(): return mx(tone(1175, .08, 40, .05, (1,)), np.pad(tone(1568, .1, 34, .05, (1,)), (int(.07 * SR), 0)))
@mine('nope2')
def sfx_nope2(): return mx(tone(494, .14, 16, .07, (1, .3)), np.pad(tone(392, .2, 12, .07, (1, .3)), (int(.13 * SR), 0)))   # "uh-uh" (no phone for bees)
@mine('pullback')
def sfx_pullback(dur=1.2): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 900) * .07 * np.sin(np.pi * t / dur) ** 2 + sweep(420, 260, dur, .02)
@mine('flashback')
def sfx_flashback(dur=1.2):                    # into the memory: soft reversed shimmer
    n = int(dur * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t) for f in (880, 1108, 1318)) * .015 * (t / dur) ** 2
    return x + bp(rng.standard_normal(n), 3000, 8000) * .01 * (t / dur)
@mine('loop')
def sfx_loop(dur=1.6, pitch=1.):               # an orientation loop: buzz circling (pan swings)
    n = int(dur * SR); t = np.arange(n) / SR; f = 240 * pitch * (1 + .06 * np.sin(2 * np.pi * t / dur * 2)); ph = np.cumsum(f) / SR * 2 * np.pi
    m = lp(np.sign(np.sin(ph)) * .45 + np.sin(ph) * .55, 4000) * .06 * np.sin(np.pi * t / dur) * (1 + .3 * np.sin(2 * np.pi * 7 * t)); pan = .8 * np.sin(2 * np.pi * t / dur)   # buzz-like (harmonics reach the phone band)
    return np.stack([m * np.sqrt((1 - pan) / 2), m * np.sqrt((1 + pan) / 2)], 1)
@mine('landmark')
def sfx_landmark(which=0):                     # a landmark recognised: three different little motifs (tree low / edge mid / skyline high)
    base = (330, 494, 740)[which]; return mx(kalimba(base, .6, 1.), np.pad(kalimba(base * 1.5, .5, .8), (int(.1 * SR), 0)))
@mine('snapshot')
def sfx_snapshot(): return mx(noise_burst(.03, 2000, 7000, 120, .08), tone(988, .15, 22, .04, (1,)))   # a memory card lands
@mine('suntone')
def sfx_suntone(dur=1.4): n = int(dur * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) for f in (523, 784, 1046)) * .02 * np.minimum(1, t / .2) * np.exp(-t * 1.6)
@mine('arc')
def sfx_arc(): return sweep(600, 900, .35, .04)
@mine('sunmove')
def sfx_sunmove(dur=2.0): n = int(dur * SR); t = np.arange(n) / SR; return sweep(392, 523, dur, .02) * np.sin(np.pi * t / dur) + bp(rng.standard_normal(n), 2000, 6000) * .006 * np.sin(np.pi * t / dur)
@mine('dial')
def sfx_dial(n=6): out = np.zeros(int((n * .18 + .3) * SR)); [put(out, tone(1760, .03, 120, .03, (1,)), int(k * .18 * SR)) for k in range(n)]; return out   # the abstract clock (no numbers): soft ticks
@mine('pocketpat')
def sfx_pocketpat(n=4): out = np.zeros(int((n * .2 + .3) * SR)); [put(out, lp(noise_burst(.06, 200, 2000, 50, .2), 1800), int(k * .2 * SR)) for k in range(n)]; return out
@mine('flowwhoosh')
def sfx_flowwhoosh(dur=1.6, near=1.):          # scenery rushing past: band depends on how near the layer is
    n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 600 + 1200 * near, 2500 + 4000 * near) * .06 * near * np.sin(np.pi * t / dur) ** 1.5
@mine('jar')
def sfx_jar(n=8, iv=.18):                      # the distance estimate fills: soft bubbly rising blips
    out = np.zeros(int((n * iv + .3) * SR)); [put(out, sweep(500 + 60 * k, 700 + 60 * k, .07, .03), int(k * iv * SR)) for k in range(n)]; return out
@mine('kmstrike')
def sfx_kmstrike(): return mx(tone(1046, .06, 50, .04, (1,)), np.pad(tone(1046, .06, 50, .04, (1,)), (int(.1 * SR), 0)), np.pad(B.sfx_strike() if hasattr(B, 'sfx_strike') else noise_burst(.2, 1500, 5000, 20, .1), (int(.35 * SR), 0)))
@mine('candidates')
def sfx_candidates(): out = np.zeros(int(.9 * SR)); [put(out, tone(f, .2, 14, .035, (1,)), int(k * .16 * SR)) for k, f in enumerate((587, 659, 554))]; return out
@mine('clue')
def sfx_clue(which=0): return mx(tone((659, 784, 988)[which], .4, 8, .06, (1, .3)), np.pad(kalimba((1318, 1568, 1976)[which], .4, .5), (int(.08 * SR), 0)))
@mine('dimclue')
def sfx_dimclue(): return sweep(700, 450, .4, .03)
@mine('latch')
def sfx_latch(): return mx(noise_burst(.02, 1500, 6000, 200, .1), tone(800, .06, 60, .05, (1, .5)), np.pad(tone(600, .05, 60, .04, (1,)), (int(.05 * SR), 0)))
@mine('release')
def sfx_release(): return mx(sweep(400, 900, .3, .04), np.pad(S.SFX['passby'](.8).mean(1) * .6, (int(.15 * SR), 0)))
@mine('track')
def sfx_track(dur=2.0): out = np.zeros(int(dur * SR)); [put(out, tone(1568 + 100 * (k % 3), .04, 80, .02, (1,)), int(k * .12 * SR)) for k in range(int(dur / .12))]; return out
@mine('memory')
def sfx_memory(): return mx(kalimba(659, .8, .8), np.pad(kalimba(988, .7, .6), (int(.12 * SR), 0)), np.pad(kalimba(1318, .6, .5), (int(.24 * SR), 0)))
@mine('magicline')
def sfx_magicline(): n = int(.6 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * (900 + 600 * t / .6) * t) * .04 * np.exp(-t * 2)   # a too-perfect neon "zing"
@mine('reveal')
def sfx_reveal(dur=1.8): n = int(dur * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) for f in (587, 740, 880, 1175)) * .018 * np.minimum(1, t / .2) * np.exp(-t * 1.3)
@mine('land')
def sfx_land(): return mx(tone(880, .1, 40, .04, (1,)), lp(noise_burst(.04, 300, 3000, 80, .06), 3000))   # tiny landing at the door
@mine('spinner')
def sfx_spinner(dur=1.6): out = np.zeros(int(dur * SR)); [put(out, tone(1318, .03, 100, .015, (1,)), int(k * .13 * SR)) for k in range(int(dur / .13))]; return out

# ---------------------------------------------------------------- ambiences
@mine('amb_garden')
def amb_garden(dur=4.):                        # garden at the edge of a neighbourhood: light breeze in leaves, far birds, a far bee murmur, no voices
    n = int(dur * SR); t = np.arange(n) / SR
    out = bp(rng.standard_normal(n), 400, 3000) * .012 * (1 + .6 * np.sin(2 * np.pi * .15 * t)) + lp(rng.standard_normal(n), 300) * .01
    k = .4
    while k < dur - .5: put(out, tone(2600 + 800 * rng.random(), .12, 16, .006, (1,)), int(k * SR)); k += 1.2 + 2 * rng.random()
    return st(out, .4)
@mine('amb_hive')
def amb_hive(dur=4.):                          # near the hive: a soft colony murmur (low, below speech)
    n = int(dur * SR); t = np.arange(n) / SR; return st(bp(rng.standard_normal(n), 180, 600) * .03 * (1 + .2 * np.sin(2 * np.pi * .4 * t)) + np.sin(2 * np.pi * 220 * t) * .002, .3)
@mine('amb_diagram')
def amb_diagram(dur=4.):
    n = int(dur * SR); t = np.arange(n) / SR; return st(bp(rng.standard_normal(n), 300, 1500) * .012 * (1 + .5 * np.sin(2 * np.pi * .12 * t)), .4)
@mine('amb_lab')
def amb_lab(dur=4.): n = int(dur * SR); t = np.arange(n) / SR; return st(lp(rng.standard_normal(n), 500) * .015 + np.sin(2 * np.pi * 100 * t) * .002, .2)
@mine('amb_strange')
def amb_strange(dur=4.):                       # unfamiliar garden: wider, a different breeze colour, crickets far
    n = int(dur * SR); t = np.arange(n) / SR; out = bp(rng.standard_normal(n), 600, 2500) * .014 * (1 + .5 * np.sin(2 * np.pi * .2 * t))
    for k in range(int(dur / .5)): put(out, tone(4200, .04, 60, .004, (1,)), int(k * .5 * SR))
    return st(out, .5)

if __name__ == '__main__':
    cues = json.load(open(sys.argv[1], encoding='utf-8'))
    m = music_ep13(cues)
    wavfile.write('music.wav', SR, (m / (np.abs(m).max() + 1e-9) * .8 * 10 ** (MUSIC_TRIM_DB / 20)).astype(np.float32))
    N = int(cues['duration'] * SR); sfx = np.zeros((N, 2))
    tracks = {k: np.zeros((N, 2)) for k in ('key', 'detail', 'amb')}
    def add2(buf, x, at, pan):
        if x.ndim == 1: return add(buf, x, at, pan)
        i = int(at * SR); x = x[:len(buf) - i]; buf[i:i + len(x)] += x
    rows = []
    for ev in cues['sfx']:
        cls = ev.get('cls', 'movement')
        x = S.SFX[ev['name']](**ev.get('args', {}))
        x = normalise(x, cls) * 10 ** (ev.get('trim', 0) / 20) if cls in CLASS_RMS else x * ev.get('gain', 1.)
        tr = tracks['amb' if cls in ('amb', 'ambience') else 'key' if cls in ('key', 'id', 'hero') else 'detail']
        add2(tr, x, ev['t'], ev.get('pan', 0.))
        if cls not in ('amb', 'ambience'): add2(sfx, x, ev['t'], ev.get('pan', 0.))
        xm = x.mean(1) if x.ndim > 1 else x
        rms = 20 * np.log10(np.sqrt(np.mean(xm[np.abs(xm) > np.abs(xm).max() * .1] ** 2)) + 1e-9)
        src = f"`synth_ep13.py` → {ev['name']}" if ev['name'] in MINE else f"`synth_base_ep10.py` (kit lineage) → {ev['name']}"
        rows.append(f"| {ev['t']:.2f}–{ev['t'] + len(x) / SR:.2f} · {ev.get('anchor', '')} | {ev.get('label', '')} | {cls} | {src} | {rms:.1f} dBFS RMS (trim {ev.get('trim', 0):+g}) | {ev.get('why', '')} | buatan sendiri (kode) |")
    wavfile.write('sfx.wav', SR, sfx.astype(np.float32))
    for k, v in tracks.items(): wavfile.write(f'sfx_{k}.wav' if k != 'amb' else 'amb.wav', SR, v.astype(np.float32))
    open(os.environ.get('CUE_OUT', 'CUE_SHEET.md'), 'w', encoding='utf-8').write(cues.get('sheetHead', '') + '| Waktu (s) · anchor VO | Aksi | Kelas | Sumber / file | Level relatif (pre-mix) | Tujuan | Lisensi |\n|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    print('music', round(m.shape[0] / SR, 2), 's; sfx events', len(cues['sfx']))
