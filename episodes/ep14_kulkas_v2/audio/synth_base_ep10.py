"""Whyscape EP10 audio — "Kalau Semua Pohon di Kota Hilang Semalam, Apa yang Terjadi?" (SEHARI TANPA POHON). Music (6 phases) + ambiences + per-action SFX.
EP09 generators stay available (same file lineage); the EP10 section at the end adds this episode's sounds.
Everything is synthesized by code (numpy/scipy): no samples, no third-party recordings, no voices.
Usage (inside this folder):  python3 synth_ep10.py cues.json  -> music.wav, sfx.wav, sfx_key.wav, sfx_detail.wav, amb.wav, CUE_SHEET.md
"""
import json, os, sys, numpy as np
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfx_base import S, SR, add, marimba, pluck_bass, pad, tick, hat, kick, midi, lp, hp, bp, ping, wood, shaker, normalise, CLASS_RMS

rng = np.random.default_rng(1010)
MUSIC_TRIM_DB = -1.2
MINE = set()
def mine(name):
    def deco(f): MINE.add(name); S.SFX[name] = f; return f
    return deco
def _env(n, a=.3, r=.4):
    t = np.arange(n) / SR; d = n / SR; return np.minimum(1, np.minimum(t / max(a, 1e-3), (d - t) / max(r, 1e-3))).clip(0, 1)
def tone(f, dur, decay=6., amp=.3, harm=(1, .3, .1)):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(h * np.sin(2 * np.pi * f * (i + 1) * t) for i, h in enumerate(harm)) * np.exp(-t * decay) * (1 - np.exp(-t * 400)) * amp
def put(out, x, j):
    m = min(len(x), len(out) - j)
    if m > 0: out[j:j + m] += x[:m]
def mx(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out
def noise_burst(dur, lo, hi, decay, amp):
    n = int(dur * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), lo, hi) * np.exp(-t * decay) * amp
def sweep(f0, f1, dur, amp=.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * amp
def epiano(f, dur=.8, vel=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8) + .12 * np.sin(2 * np.pi * 7.1 * f * t) * np.exp(-t * 30)) * np.exp(-t * 3.4)
    x[:int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR)); return x * vel * .2
def stab(f, dur=.16, vel=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp((np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 14) * (1 - np.exp(-t * 400)), 1200) * vel * .4
def mtick(vel=1.):
    n = int(.05 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2000, 7000) * .4 + np.sin(2 * np.pi * 1600 * t) * .25) * np.exp(-t * 110) * vel * .22
def pluck(f, dur=.3, vel=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp((np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t) + .2 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 16), 3500) * vel * .25

def st(x, wob=.2, rate=.1):
    t = np.arange(len(x)) / SR; return np.stack([x * (1 + wob * np.sin(2 * np.pi * rate * t)), x * (1 - wob * np.sin(2 * np.pi * rate * t))], 1)

def music_ep10(cues):
    """home: curious & a little absurd (marimba + pizzicato bass, 100 BPM) → travel: bright, rhythmic investigation →
    heat: pressing (driving minor pulse + high shimmer, never loud) → tpa: restrained (house / afternoon) → deep: held tones (night, rain) →
    warm: e-piano, reflective, ends open."""
    dur = cues['duration']; bpm = 100; beat = 60 / bpm; bar = 4 * beat
    out = np.zeros((int(dur * SR) + SR, 2))
    ph_of = lambda t: next((k for k in ('warm', 'deep', 'tpa', 'heat', 'travel', 'home') if any(a <= t < b for a, b in cues.get(k, []))), 'home')
    CH = {'home': [(41, [65, 69, 72, 76]), (38, [62, 65, 69, 74]), (34, [65, 70, 74]), (36, [64, 67, 72])],          # F · Dm · Bb · C
          'travel': [(41, [65, 69, 72]), (36, [64, 67, 72]), (38, [62, 65, 69]), (34, [62, 65, 70])],
          'heat': [(38, [62, 65, 69]), (43, [62, 67, 70]), (34, [62, 65, 70]), (33, [61, 64, 69])],                   # Dm · Gm · Bb · A (pressing)
          'tpa': [(38, [62, 65, 69]), (34, [62, 65, 70]), (36, [60, 64, 67]), (33, [61, 64, 69])],                    # Dm · Bb · C · A (held back)
          'deep': [(38, [62, 69]), (34, [62, 70]), (31, [62, 67]), (33, [64, 69])],
          'warm': [(41, [65, 69, 72, 76]), (34, [62, 65, 69, 74]), (36, [64, 67, 72, 74]), (41, [65, 67, 72, 76])]}
    FIG = [0, 4, 7, 9]
    t0, b = 0., 0
    while t0 < dur:
        ph = ph_of(t0 + .01); root, chord = CH[ph][b % 4]; R = root + 24
        add(out, pad([midi(m) for m in chord], bar + .5, {'home': .55, 'travel': .5, 'heat': .6, 'tpa': .7, 'deep': .8, 'warm': .9}[ph]), t0, 0)
        if ph == 'home':
            add(out, pluck_bass(midi(root), .5, .45), t0, -.1); add(out, pluck_bass(midi(root + 7), .4, .35), t0 + 2 * beat, -.1)
            for k, d in enumerate(FIG if b % 2 == 0 else [12, 9, 7, None]):
                if d is not None: add(out, marimba(midi(R + d), .5, .5), t0 + k * beat + (beat / 2 if k == 3 else 0), .3 if k % 2 else -.3)
        elif ph == 'travel':
            for k in range(8): add(out, pluck_bass(midi(root + [0, 0, 7, 0, 5, 0, 7, 4][k]), .25, .42), t0 + k * beat / 2, -.05)
            for k in range(8): add(out, shaker(.22 if k % 2 else .3), t0 + k * beat / 2, .25)
            for k in (1, 3): add(out, wood(.35), t0 + k * beat, -.2)
            add(out, kick(.36), t0, 0); add(out, kick(.3), t0 + 2 * beat, 0)
            for k, d in enumerate([7, 9, 12, 9] if b % 2 else [4, 7, 9, 7]): add(out, marimba(midi(R + d), .3, .32), t0 + (k + .5) * beat, .35 if k % 2 else -.35)
        elif ph == 'heat':
            for k in range(8): add(out, pluck_bass(midi(root + (12 if k % 4 == 3 else 0)), .22, .44), t0 + k * beat / 2, -.05)
            for k in range(16): add(out, shaker(.12 if k % 2 else .18), t0 + k * beat / 4, .3)
            add(out, kick(.34), t0, 0); add(out, kick(.28), t0 + 2 * beat, 0)
            for k in range(8): add(out, ping(midi(R + 19 + (1 if (b % 2 and k >= 6) else 0)), .35, .1), t0 + k * beat / 2 + beat / 4, .4 if k % 2 else -.4)
        elif ph == 'tpa':
            add(out, pluck_bass(midi(root), 1.2, .45), t0, 0); add(out, pluck_bass(midi(root), .6, .3), t0 + 2.5 * beat, 0)
            add(out, ping(midi(R + 12 + (3 if b % 2 else 0)), 1.0, .3), t0 + 1.5 * beat, .3)
            for k in range(4): add(out, mtick(.35), t0 + k * beat, .2)
        elif ph == 'deep':
            add(out, pluck_bass(midi(root), 1.8, .38), t0, 0)
            if b % 2 == 0: add(out, ping(midi(R + 19), 1.6, .22), t0 + 2 * beat, -.3)
        else:
            add(out, pluck_bass(midi(root), 1.0, .45), t0, -.1)
            for k, d in enumerate([0, 7, 4, None] if b % 2 == 0 else [9, 7, 4, 12]):
                if d is not None: add(out, epiano(midi(R + d), 1.1, .6), t0 + k * beat, .3 if k % 2 else -.3)
        t0 += bar; b += 1
    out = out[:int(dur * SR)]
    f = int(cues.get('fade', 1.0) * SR); out[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    fi = int(cues.get('fadeIn', 0) * SR)
    if fi: out[:fi] *= np.linspace(0, 1, fi)[:, None] ** 1.5
    return out

# ---------- ambience ----------
def birds(dur, every=2.3, amp=.01):
    x = np.zeros(int(dur * SR))
    for k in np.arange(.6, dur, every):
        m = int(.09 * SR); tt = np.arange(m) / SR; ch = np.sin(2 * np.pi * (3400 + 900 * np.sin(2 * np.pi * 24 * tt)) * tt) * np.exp(-tt * 30) * amp
        put(x, ch, int(k * SR)); put(x, ch * .7, int((k + .13) * SR))
    return x
@mine('amb_street')
def amb_street(dur=4.):                               # quiet morning street: far traffic, birds, a distant broom now and then
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 450) * .028 * (1 + .3 * np.sin(2 * np.pi * .17 * t)) + birds(dur, 2.1, .012)[:n]
    for k in np.arange(1.4, dur, 4.7):
        for q in range(3): put(x, bp(rng.standard_normal(int(.18 * SR)), 1500, 5000) * np.sin(np.pi * np.arange(int(.18 * SR)) / (.18 * SR)) * .008, int((k + q * .32) * SR))
    return st(x * _env(n, .5, .5), .25, .12)
@mine('amb_tps')
def amb_tps(dur=4.):                                  # roadside TPS: open air, traffic, a truck idling far
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 500) * .032 + lp(np.sign(np.sin(2 * np.pi * 28 * t)), 300) * .006 + birds(dur, 3.3, .008)[:n]
    return st(x * _env(n, .5, .5), .2, .15)
@mine('amb_map')
def amb_map(dur=4.):
    n = int(dur * SR); return st((lp(rng.standard_normal(n), 900) * .008 + lp(rng.standard_normal(n), 120) * .01) * _env(n), .05)
@mine('amb_hall')
def amb_hall(dur=4.):                                 # open sorting shed: roof-space air, a faint belt hum, soft handling knocks (no voices)
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 300) * .02 + (np.sin(2 * np.pi * 90 * t) + .3 * np.sin(2 * np.pi * 180 * t)) * .004
    for k in np.arange(1.1, dur, 2.9): put(x, lp(noise_burst(.06, 150, 1500, 50, .05), 1500), int(k * SR))
    return st(x * _env(n, .5, .5), .15)
@mine('amb_country')
def amb_country(dur=4.):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 600) * .03 * (.6 + .4 * np.sin(2 * np.pi * .11 * t) ** 2) + birds(dur, 3.0, .01)[:n]
    return st(x * _env(n, .5, .5), .3, .1)
@mine('amb_site')
def amb_site(dur=4.):                                 # landfill site: wind over open land, far heavy machinery, birds overhead
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 700) * .034 * (.6 + .4 * np.sin(2 * np.pi * .09 * t) ** 2) + lp(np.sign(np.sin(2 * np.pi * 31 * t)), 260) * .008 + birds(dur, 4.1, .007)[:n]
    return st(x * _env(n, .6, .6), .3, .08)
@mine('amb_inside')
def amb_inside(dur=4.):                               # inside the heap (imagined): muffled low room, slow creaks — quiet, not scary
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 160) * .03 + np.sin(2 * np.pi * 55 * t) * .004
    for k in np.arange(1.7, dur, 3.6): put(x, lp(sweep(180, 120, .4, .02), 600), int(k * SR))
    return st(x * _env(n, .6, .6), .1)

# ---------- SFX ----------
@mine('kresek')
def sfx_kresek(dur=.5):                               # plastic bag rustle
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 2500, 9000) * (np.abs(np.sin(2 * np.pi * 9 * t)) ** 2) * .12
    return x * _env(n, .03, .15)
@mine('steps')
def sfx_steps(n=4, iv=.28, pitch=1.):                 # work boots on the pavement
    out = np.zeros(int((n * iv + .2) * SR))
    for k in range(n): put(out, mx(lp(noise_burst(.06, 100, 1800, 60, .3), 1500), noise_burst(.02, 2000, 5000, 200, .05)), int(k * iv * SR))
    return out
@mine('bagthud')
def sfx_bagthud(pitch=1.): return mx(lp(noise_burst(.12, 80, 900, 30, .5), 800), sfx_kresek(.25) * .6)
@mine('engine')
def sfx_engine(dur=1.5, start=1):                     # small pickup: starter + idle that pulls away
    n = int(dur * SR); t = np.arange(n) / SR; f = 38 + 20 * np.clip((t - .3) / .8, 0, 1)
    e = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .4 + np.sin(2 * np.pi * np.cumsum(2 * f) / SR), 700) * .045
    rasp = bp(rng.standard_normal(n), 700, 2400) * (np.sin(2 * np.pi * np.cumsum(f) / SR) > .4) * .05
    x = (e + rasp) * np.minimum(1, t / .15) * np.clip((dur - t) / (dur * .5), 0, 1)
    if start: x = mx(x, lp(noise_burst(.25, 300, 2000, 12, .08) * np.abs(np.sin(2 * np.pi * 14 * np.arange(int(.25 * SR)) / SR)), 2000))
    return x
@mine('tyre')
def sfx_tyre(): n = int(.5 * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 900, 3000) * np.sin(np.pi * t / .5) * .03 + sweep(700, 600, .5, .015)
@mine('deletekey')
def sfx_deletekey():                                  # a keyboard-like "delete" press: click + tiny UI blip
    return mx(noise_burst(.02, 2000, 8000, 300, .4), np.pad(tone(1320, .12, 25, .1, (1,)), (int(.02 * SR), 0)), np.pad(tone(990, .14, 22, .08, (1,)), (int(.1 * SR), 0)))
@mine('nope')
def sfx_nope():                                       # the "delete" doesn't work: two-note little "uh-uh", turning into a stretched rope sound
    out = np.zeros(int(.9 * SR)); put(out, tone(660, .14, 14, .1, (1, .2)), 0); put(out, tone(587, .2, 10, .1, (1, .2)), int(.16 * SR)); put(out, sweep(400, 900, .5, .05), int(.35 * SR)); return out
@mine('routedraw')
def sfx_routedraw(dur=1.2): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 1500, 5000) * np.sin(np.pi * t / dur) * .04 + sweep(500, 760, dur, .03)
@mine('dumpbags')
def sfx_dumpbags(dur=1.0):                            # a load of bags slides out of a tilted bed
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 1500, 7000) * np.sin(np.pi * t / dur) * .07
    for d in (.25, .45, .6, .78): put(x, lp(noise_burst(.1, 80, 900, 35, .25), 800), int(d * SR))
    return x
@mine('tagpop')
def sfx_tagpop(pitch=1.): return mx(sweep(500 * pitch, 900 * pitch, .14, .14), np.pad(noise_burst(.02, 2000, 6000, 200, .08), (int(.1 * SR), 0)))
@mine('sticker')
def sfx_sticker(): return mx(noise_burst(.05, 1500, 6000, 70, .2), np.pad(tone(1000, .1, 30, .07, (1,)), (int(.04 * SR), 0)))
@mine('reversebeep')
def sfx_reversebeep(n=3): out = np.zeros(int((n * .45 + .2) * SR)); [put(out, tone(1100, .22, 3, .05, (1,)), int(k * .45 * SR)) for k in range(n)]; return out
@mine('hydraulic')
def sfx_hydraulic(dur=1.0): n = int(dur * SR); t = np.arange(n) / SR; return mx(hp(rng.standard_normal(n), 3000) * _env(n, .05, .2) * .03, lp(np.sin(2 * np.pi * (180 + 60 * t / dur) * t) * .05 * _env(n, .1, .2), 1500))
@mine('truckgo')
def sfx_truckgo(dur=2.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = 30 + 22 * np.clip(t / 1.2, 0, 1)
    eng = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .5 + np.sin(2 * np.pi * np.cumsum(2 * f) / SR), 500) * .03
    rasp = bp(rng.standard_normal(n), 600, 2400) * (np.sin(2 * np.pi * np.cumsum(f) / SR) > .4) * .07
    return (eng + rasp) * np.minimum(1, t / .2) * np.clip((dur - t) / (dur * .6), 0, 1)
@mine('mappop')
def sfx_mappop(pitch=1.): return mx(tone(880 * pitch, .25, 12, .08, (1, .3)), noise_burst(.03, 1500, 5000, 100, .05))
@mine('glide')
def sfx_glide(dur=.8, up=1): return sweep(500, 900 if up else 350, dur, .05) + bp(rng.standard_normal(int(dur * SR)), 1500, 4000) * np.sin(np.pi * np.arange(int(dur * SR)) / (dur * SR)) * .02
@mine('popup')
def sfx_popup(dur=1.):                                # pop-up book unfolds (paper flaps)
    out = np.zeros(int(dur * SR))
    for k, d in enumerate((0, .15, .3, .46, .6)): put(out, mx(noise_burst(.07, 600, 4000, 55, .22), tone(260 + 70 * k, .1, 30, .08, (1,))), int(d * SR))
    return out
@mine('xray')
def sfx_xray(): return mx(sweep(300, 1400, .5, .05), tone(1760, .6, 6, .04, (1,)))
@mine('food')
def sfx_food(): return mx(lp(noise_burst(.1, 200, 1500, 30, .3), 1400), np.pad(lp(noise_burst(.05, 300, 1200, 50, .15), 1200), (int(.08 * SR), 0)))     # soft squish
@mine('bottle')
def sfx_bottle(): return mx(noise_burst(.04, 1200, 5000, 80, .25), tone(1250, .25, 18, .08, (1, .4, .2)), np.pad(tone(1600, .15, 25, .05, (1,)), (int(.05 * SR), 0)))  # hollow PET clonk
@mine('wrap')
def sfx_wrap(dur=.45): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 3000, 9000) * (rng.random(n) > .85) * .25 * _env(n, .02, .15)   # crinkle
@mine('gloves')
def sfx_gloves(n=3): out = np.zeros(int((n * .2 + .2) * SR)); [put(out, lp(noise_burst(.05, 300, 2500, 70, .18), 2400), int(k * .2 * SR)) for k in range(n)]; return out
@mine('intocompost')
def sfx_intocompost(): return mx(lp(noise_burst(.15, 60, 800, 25, .5), 700), np.pad(tone(180, .2, 18, .1, (1,)), (int(.02 * SR), 0)))
@mine('steam')
def sfx_steam(dur=1.4): n = int(dur * SR); return hp(lp(rng.standard_normal(n), 6000), 1500) * _env(n, .3, .6) * .015
@mine('intosack')
def sfx_intosack(): return mx(sfx_bottle(), np.pad(tone(1500, .2, 20, .06, (1,)), (int(.07 * SR), 0)), np.pad(lp(noise_burst(.08, 400, 3000, 40, .15), 3000), (int(.02 * SR), 0)))
@mine('intobin')
def sfx_intobin(): return mx(tone(220, .4, 9, .14, (1, .6, .4, .2)), noise_burst(.03, 1500, 6000, 150, .1), np.pad(sfx_wrap(.2) * .5, (int(.03 * SR), 0)))
@mine('roll')
def sfx_roll(dur=.8): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 300, 2500) * (1 + .6 * np.sin(2 * np.pi * 15 * t)) * _env(n, .1, .2) * .05
@mine('tick')
def sfx_tick(pitch=1.): out = np.zeros(int(.5 * SR)); put(out, tone(988 * pitch, .3, 10, .1, (1, .3)), 0); put(out, tone(1319 * pitch, .35, 9, .1, (1, .3)), int(.08 * SR)); return out
@mine('rewind')
def sfx_rewind(): n = int(.6 * SR); t = np.arange(n) / SR; f = 900 - 500 * t / .6; return np.sin(2 * np.pi * np.cumsum(f * (1 + .3 * np.sign(np.sin(2 * np.pi * 30 * t)))) / SR) * _env(n, .05, .1) * .06
@mine('smear')
def sfx_smear(): return lp(noise_burst(.3, 200, 1500, 8, .15), 1500)
@mine('wipe')
def sfx_wipe(n=3): out = np.zeros(int((n * .3 + .2) * SR)); [put(out, bp(rng.standard_normal(int(.2 * SR)), 1500, 5000) * np.sin(np.pi * np.arange(int(.2 * SR)) / (.2 * SR)) * .06, int(k * .3 * SR)) for k in range(n)]; return out
@mine('dots')
def sfx_dots(n=4, iv=.5): out = np.zeros(int((n * iv + .2) * SR)); [put(out, tone(700 + 40 * k, .08, 40, .05, (1,)), int(k * iv * SR)) for k in range(n)]; return out
@mine('sparkle')
def sfx_sparkle(): out = np.zeros(int(.8 * SR)); [put(out, tone(f, .3, 12, .05, (1,)), int(k * .07 * SR)) for k, f in enumerate((2093, 2637, 3136, 2637))]; return out
@mine('steptag')
def sfx_steptag(pitch=1.): return mx(noise_burst(.03, 1500, 5000, 120, .12), np.pad(tone(600 * pitch, .14, 20, .07, (1,)), (int(.02 * SR), 0)))
@mine('tip')
def sfx_tip(): return mx(sweep(300, 180, .5, .06), np.pad(sfx_dumpbags(.7) * .8, (int(.15 * SR), 0)))
@mine('dozer')
def sfx_dozer(dur=2.):                                # dozer: engine + track clanks
    n = int(dur * SR); t = np.arange(n) / SR
    e = lp(np.sign(np.sin(2 * np.pi * 26 * t)) * .5 + np.sin(2 * np.pi * 52 * t), 500) * .025 + bp(rng.standard_normal(n), 600, 2200) * (np.sin(2 * np.pi * 26 * t) > .5) * .05
    for d in np.arange(.05, dur - .1, .16): put(e, noise_burst(.02, 1500, 4000, 200, .06), int(d * SR))
    return e * _env(n, .2, .3)
@mine('compact')
def sfx_compact(n=3): out = np.zeros(int((n * .35 + .3) * SR)); [put(out, mx(lp(noise_burst(.12, 50, 500, 30, .5), 500), noise_burst(.03, 800, 3000, 100, .06)), int(k * .35 * SR)) for k in range(n)]; return out
@mine('soil')
def sfx_soil(dur=.9): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 1800) * np.sin(np.pi * t / dur) * .09
@mine('daydial')
def sfx_daydial(n=6): out = np.zeros(int((n * .12 + .3) * SR)); [put(out, noise_burst(.015, 2500, 7000, 300, .12), int(k * .12 * SR)) for k in range(n)]; put(out, tone(523, .4, 6, .05, (1, .3)), int(n * .12 * SR)); return out
@mine('dive')
def sfx_dive(dur=.8):                                 # into the heap: a muffled downward rush
    n = int(dur * SR); t = np.arange(n) / SR
    return lp(rng.standard_normal(n), 900) * np.sin(np.pi * t / dur) * (1 - .6 * t / dur) * .1 + sweep(500, 160, dur, .04)
@mine('o2')
def sfx_o2(n=5): out = np.zeros(int((n * .15 + .3) * SR)); [put(out, sweep(900 + 100 * k, 1500 + 100 * k, .06, .04), int(k * .15 * SR)) for k in range(n)]; return out
@mine('o2fade')
def sfx_o2fade(dur=1.2): out = np.zeros(int(dur * SR)); [put(out, sweep(1400 - 80 * k, 900 - 60 * k, .07, .035 * (1 - k / 9)), int(k * dur / 9 * SR)) for k in range(9)]; return out
@mine('calendar')
def sfx_calendar(n=5): out = np.zeros(int((n * .2 + .2) * SR)); [put(out, noise_burst(.05, 1500, 6000, 60, .1), int(k * .2 * SR)) for k in range(n)]; return out
@mine('microbes')
def sfx_microbes(dur=1.2): out = np.zeros(int(dur * SR)); [put(out, sweep(300 + 60 * (k % 4), 500 + 60 * (k % 3), .05, .04), int((k * .09 + .02 * np.sin(k)) * SR)) for k in range(int(dur / .09))]; return out
@mine('gas')
def sfx_gas(dur=1.6):                                 # slow soft bubbles rising (no boiling, no burst)
    out = np.zeros(int(dur * SR))
    for k in range(6): put(out, sweep(220 + 30 * k, 300 + 40 * k, .14, .035), int((k * .26 + .05 * np.sin(k * 2)) * SR))
    return out
@mine('metana')
def sfx_metana():                                     # methane marker motif: three airy rising notes, gentle
    out = np.zeros(int(1.2 * SR)); [put(out, tone(f, .6, 5, .06, (1, .2)), int(k * .16 * SR)) for k, f in enumerate((440, 554, 659))]; return out
@mine('raininto')
def sfx_raininto(dur=2.0): n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 1500, 8000) * .03 * _env(n, .4, .5); [put(x, noise_burst(.01, 3000, 8000, 400, .05), int(d * SR)) for d in np.arange(.05, dur, .07)]; return x
@mine('seep')
def sfx_seep(n=6): out = np.zeros(int((n * .22 + .3) * SR)); [put(out, tone(1200 - 60 * k, .1, 30, .05, (1,)), int(k * .22 * SR)) for k in range(n)]; return out
@mine('pool')
def sfx_pool(dur=1.0): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 500) * np.sin(np.pi * t / dur) * .06 + sweep(200, 160, dur, .02)
@mine('pipe')
def sfx_pipe(): return mx(tone(330, .5, 7, .1, (1, .7, .4)), noise_burst(.03, 1000, 4000, 120, .08), np.pad(lp(rng.standard_normal(int(.6 * SR)), 900) * .03, (int(.2 * SR), 0)))
@mine('handled')
def sfx_handled(): out = np.zeros(int(.7 * SR)); put(out, tone(659, .4, 7, .07, (1, .3)), 0); put(out, tone(880, .45, 6, .07, (1, .3)), int(.12 * SR)); return out
@mine('zoomout')
def sfx_zoomout(dur=1.2): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 1200) * np.sin(np.pi * t / dur) ** 2 * .1 + sweep(180, 300, dur, .03)
@mine('strike')
def sfx_strike():                                     # the delete key gets struck: marker scrape + a soft "boing" (light humour)
    n = int(.35 * SR); tt = np.arange(n) / SR
    return mx(bp(rng.standard_normal(n), 1500, 5000) * np.sin(np.pi * tt / .35) * .1, np.pad(np.sin(2 * np.pi * np.cumsum(260 + 120 * np.sin(2 * np.pi * 9 * np.arange(int(.4 * SR)) / SR)) / SR) * np.exp(-np.arange(int(.4 * SR)) / SR * 6) * .1, (int(.3 * SR), 0)))
@mine('ringpulse')
def sfx_ringpulse(pitch=1.): out = np.zeros(int(.8 * SR)); put(out, tone(1046 * pitch, .6, 6, .09, (1, .3, .1)), 0); put(out, tone(1568 * pitch, .5, 7, .06, (1, .2)), int(.07 * SR)); return out
@mine('options')
def sfx_options(pitch=1.): return mx(tone(523 * pitch, .3, 9, .07, (1, .3)), np.pad(tone(659 * pitch, .3, 9, .06, (1, .3)), (int(.08 * SR), 0)))
@mine('bubblepop')
def sfx_bubblepop(): return mx(sweep(400, 900, .12, .14), np.pad(tone(1500, .05, 60, .06, (1,)), (int(.14 * SR), 0)))
@mine('passby')
def sfx_passby(dur=1.6):                              # the pickup passes quickly: engine doppler + air
    n = int(dur * SR); t = np.arange(n) / SR; c = dur / 2; f = 46 * (1 + .12 * np.tanh((c - t) * 3))
    e = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 700) * .04 + bp(rng.standard_normal(n), 600, 2600) * (np.sin(2 * np.pi * np.cumsum(f) / SR) > .4) * .06
    return (e + lp(rng.standard_normal(n), 1500) * .04) * np.exp(-((t - c) / (dur / 3.2)) ** 2)
@mine('itemdest')
def sfx_itemdest(pitch=1.): return tone(784 * pitch, .5, 6, .08, (1, .3))
@mine('trail')
def sfx_trail(dur=1.5): out = np.zeros(int(dur * SR)); [put(out, tone(1175 + 80 * (k % 4), .3, 10, .03, (1,)), int(k * .12 * SR)) for k in range(int(dur / .12))]; return out

# ======================= EP10 "Sehari Tanpa Pohon" =======================
# ---------- ambience ----------
@mine('amb_night')
def amb_night(dur=4.):                                # night street: far traffic hush, a few soft insects (ground crickets), no birds
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 380) * .022
    for k in np.arange(.3, dur, .9):
        m = int(.18 * SR); tt = np.arange(m) / SR; ch = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 38 * tt) > 0) * np.sin(np.pi * tt / .18) * .006
        put(x, ch, int((k + .2 * np.sin(k)) * SR))
    return st(x * _env(n, .5, .5), .25)
@mine('amb_morning')
def amb_morning(dur=4.):                              # morning street: traffic hush, a motorbike far off, sparse distant birds
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 520) * .03 * (1 + .25 * np.sin(2 * np.pi * .13 * t)) + birds(dur, 3.6, .006)[:n]
    return st(x * _env(n, .5, .5), .25, .12)
@mine('amb_noon')
def amb_noon(dur=4.):                                 # noon street: denser traffic hush + a dry high air hiss (heat, not a sizzle)
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 600) * .034 + hp(lp(rng.standard_normal(n), 7000), 3500) * .006 * (1 + .3 * np.sin(2 * np.pi * .2 * t))
    return st(x * _env(n, .5, .5), .25)
@mine('amb_explain')
def amb_explain(dur=4.):                              # explainer space (tree / drain sections): soft air
    n = int(dur * SR); return st((lp(rng.standard_normal(n), 700) * .012 + lp(rng.standard_normal(n), 140) * .012) * _env(n), .05)
@mine('amb_room')
def amb_room(dur=4.):                                 # inside the house: still room, a fridge-like hum
    n = int(dur * SR); t = np.arange(n) / SR
    return st((lp(rng.standard_normal(n), 250) * .014 + np.sin(2 * np.pi * 110 * t) * .0025) * _env(n), .05)
@mine('amb_dusk')
def amb_dusk(dur=4.):                                 # afternoon → evening: traffic thinning, a far call to the evening, no words (just a low hum)
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 480) * .028 * (1 - .4 * t / dur) + birds(dur, 4.5, .004)[:n]
    return st(x * _env(n, .5, .5), .25)
@mine('amb_rain')
def amb_rain(dur=4.):                                 # steady rain on a street: broadband hiss + random drips
    n = int(dur * SR)
    x = bp(rng.standard_normal(n), 900, 9000) * .045 + lp(rng.standard_normal(n), 300) * .02
    for d in np.cumsum(rng.uniform(.03, .12, int(dur / .06))):
        if d < dur - .05: put(x, noise_burst(.012, 2500, 8000, 300, .04), int(d * SR))
    return st(x * _env(n, .6, .6), .3)

# ---------- SFX ----------
@mine('vanish')
def sfx_vanish(dur=1.4):                              # a canopy lifting away: leaf rustle rising + airy sparkle, gentle (no crash)
    n = int(dur * SR); t = np.arange(n) / SR
    r = bp(rng.standard_normal(n), 2000, 8000) * (np.abs(np.sin(2 * np.pi * 11 * t)) ** 2) * .07 * np.sin(np.pi * t / dur)
    out = r + sweep(600, 1400, dur, .03) * np.sin(np.pi * t / dur)
    for k, f in enumerate((1568, 2093, 2637)): put(out, tone(f, .5, 9, .035, (1,)), int((.35 + k * .18) * SR))
    return out
@mine('door')
def sfx_door(): return mx(noise_burst(.05, 300, 2500, 50, .2), np.pad(tone(180, .25, 14, .08, (1, .5)), (int(.02 * SR), 0)), np.pad(sweep(500, 380, .3, .02), (int(.1 * SR), 0)))
@mine('signding')
def sfx_signding(pitch=1.): return mx(tone(1175 * pitch, .6, 6, .09, (1, .4, .15)), np.pad(tone(1760 * pitch, .5, 7, .05, (1, .3)), (int(.06 * SR), 0)))
@mine('ghostin')
def sfx_ghostin(dur=.9):                              # memory outline appears: soft shimmer up
    out = np.zeros(int(dur * SR))
    for k, f in enumerate((784, 988, 1175, 1568)): put(out, tone(f, .6, 5, .03, (1, .2)), int(k * .09 * SR))
    return out + np.pad(sweep(400, 900, dur * .8, .015), (0, len(out) - int(dur * .8 * SR)))
@mine('ghostout')
def sfx_ghostout(dur=.9):
    out = np.zeros(int(dur * SR))
    for k, f in enumerate((1568, 1175, 988, 784)): put(out, tone(f, .5, 6, .028, (1, .2)), int(k * .09 * SR))
    return out
@mine('sunhit')
def sfx_sunhit(dur=1.0):                              # direct sun: warm bright swell (musical, not a burn sound)
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) for f in (523, 659, 784)) * .025 * np.minimum(1, t / .35) * np.exp(-np.maximum(0, t - .35) * 3)
    return x + hp(rng.standard_normal(n), 5000) * .01 * np.sin(np.pi * t / dur)
@mine('umbrella')
def sfx_umbrella():                                   # umbrella pops open: fabric whomp + spring click
    return mx(lp(noise_burst(.18, 150, 2500, 18, .35), 2500), np.pad(noise_burst(.02, 2000, 6000, 300, .12), (int(.02 * SR), 0)), np.pad(sweep(300, 180, .2, .05), (int(.05 * SR), 0)))
@mine('promote')
def sfx_promote(): out = np.zeros(int(.9 * SR)); [put(out, tone(f, .35, 8, .07, (1, .3)), int(k * .11 * SR)) for k, f in enumerate((784, 988, 1175))]; put(out, tone(1568, .5, 6, .06, (1, .3)), int(.33 * SR)); return out
@mine('rays')
def sfx_rays(dur=1.0): n = int(dur * SR); t = np.arange(n) / SR; return sweep(700, 1600, dur, .03) * np.sin(np.pi * t / dur) + hp(rng.standard_normal(n), 4000) * .012 * np.sin(np.pi * t / dur)
@mine('block')
def sfx_block(n=5):                                   # light meeting leaves: soft muted taps
    out = np.zeros(int((n * .09 + .3) * SR)); [put(out, tone(1300 + 120 * (k % 3), .12, 30, .05, (1,)), int(k * .09 * SR)) for k in range(n)]; return out
@mine('xylem')
def sfx_xylem(dur=1.6):                               # water climbing the trunk: rising bubbly plinks
    out = np.zeros(int(dur * SR)); m = int(dur / .1)
    for k in range(m): put(out, sweep(500 + 60 * k, 700 + 60 * k, .05, .035), int(k * .1 * SR))
    return out
@mine('vapor')
def sfx_vapor(dur=1.4): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 1500, 6000) * .04 * np.sin(np.pi * t / dur) ** 2 + sweep(900, 1300, dur, .012)
@mine('heatcool')
def sfx_heatcool(dur=1.3):                            # heat taken up: warm low tone gliding into a cool high airy tone
    n = int(dur * SR); t = np.arange(n) / SR; f = 300 * (1 + 1.6 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * .05 * np.sin(np.pi * t / dur) + bp(rng.standard_normal(n), 3000, 8000) * .012 * (t / dur)
@mine('jobpop')
def sfx_jobpop(pitch=1.): return mx(sweep(400 * pitch, 800 * pitch, .12, .12), np.pad(tone(1046 * pitch, .3, 9, .07, (1, .3)), (int(.1 * SR), 0)))
@mine('jobsoff')
def sfx_jobsoff():                                    # both jobs switch off: two soft descending notes + small power-down
    out = np.zeros(int(1.0 * SR)); put(out, tone(784, .4, 7, .08, (1, .3)), 0); put(out, tone(587, .5, 6, .08, (1, .3)), int(.16 * SR)); put(out, sweep(500, 140, .5, .05), int(.3 * SR)); return out
@mine('warmup')
def sfx_warmup(pitch=1.):                             # a surface warming: low warm swell (pitch per surface)
    n = int(.9 * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / .3) * np.exp(-np.maximum(0, t - .3) * 3.5)
    return (sum(np.sin(2 * np.pi * f * pitch * t) * w for f, w in ((196, 1), (294, .8), (588, .5), (880, .35))) * .04 + bp(rng.standard_normal(n), 1200, 3500) * .03) * e
@mine('uipop')
def sfx_uipop(): return mx(tone(880, .2, 18, .07, (1, .3)), np.pad(tone(1320, .25, 14, .05, (1,)), (int(.06 * SR), 0)), noise_burst(.02, 2000, 6000, 200, .05))
@mine('thermo')
def sfx_thermo(): out = np.zeros(int(.6 * SR)); put(out, tone(1400, .1, 40, .05, (1,)), 0); put(out, tone(1480, .12, 35, .045, (1,)), int(.25 * SR)); return out
@mine('sting')
def sfx_sting(dur=1.0):                               # "menyengat": quick bright pricks, musical, not harsh
    out = np.zeros(int(dur * SR))
    for k in range(6): put(out, mx(tone(2200 + 180 * (k % 3), .08, 40, .05, (1,)), noise_burst(.02, 4000, 9000, 250, .03)), int((k * .13 + .02 * np.sin(k)) * SR))
    return out
@mine('fanflap')
def sfx_fanflap(n=6, iv=.14):                         # paper fan flapping
    out = np.zeros(int((n * iv + .2) * SR)); [put(out, lp(noise_burst(.06, 300, 3000, 40, .12), 3000), int(k * iv * SR)) for k in range(n)]; return out
@mine('sweat')
def sfx_sweat(): return sweep(1400, 900, .12, .07)
@mine('acbeep')
def sfx_acbeep(): out = np.zeros(int(.6 * SR)); put(out, noise_burst(.015, 2000, 6000, 300, .08), 0); put(out, tone(2093, .18, 12, .07, (1,)), int(.12 * SR)); return out
@mine('acair')
def sfx_acair(dur=2.4): n = int(dur * SR); return st(lp(rng.standard_normal(n), 1500) * .045 * _env(n, .5, .6), .1)
@mine('fanspin')
def sfx_fanspin(dur=2.6): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 900) * (1 + .5 * np.sin(2 * np.pi * 22 * t)) * .04 * _env(n, .4, .5) + np.sin(2 * np.pi * 95 * t) * .01 * _env(n, .4, .5)
@mine('meter')
def sfx_meter(n=10, iv=.16): out = np.zeros(int((n * iv + .2) * SR)); [put(out, noise_burst(.012, 2500, 7000, 300, .07), int(k * iv * SR)) for k in range(n)]; return out
@mine('clocklapse')
def sfx_clocklapse(dur=2.0):                          # a clock running fast (time-lapse)
    out = np.zeros(int(dur * SR)); m = int(dur / .07)
    for k in range(m): put(out, tone(2400 if k % 2 else 2000, .03, 80, .035, (1,)), int(k * .07 * SR))
    return out
@mine('sunset')
def sfx_sunset(dur=2.0): n = int(dur * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) for f in (440, 554, 659)) * .02 * np.sin(np.pi * t / dur) * (1 - .4 * t / dur) + sweep(700, 400, dur, .015)
@mine('release')
def sfx_release(dur=2.0):                             # stored heat leaving slowly: airy upward breaths
    out = np.zeros(int(dur * SR))
    for k in range(4): put(out, bp(rng.standard_normal(int(.5 * SR)), 1200, 4000) * np.sin(np.pi * np.arange(int(.5 * SR)) / (.5 * SR)) * .035, int(k * .4 * SR)); put(out, sweep(500 + 80 * k, 800 + 80 * k, .4, .015), int(k * .4 * SR))
    return out
@mine('breeze')
def sfx_breeze(dur=2.0): n = int(dur * SR); t = np.arange(n) / SR; return st(bp(rng.standard_normal(n), 400, 2500) * .05 * np.sin(np.pi * t / dur) ** 2, .3)
@mine('rainstart')
def sfx_rainstart(dur=1.6):
    out = np.zeros(int(dur * SR))
    for d in np.sort(rng.uniform(0, dur - .05, 40)) ** 1.6 / dur ** .6: put(out, noise_burst(.015, 2000, 8000, 300, .06), int(d * SR))
    return out
@mine('leafdrops')
def sfx_leafdrops(n=6): out = np.zeros(int((n * .22 + .3) * SR)); [put(out, tone(1500 + 90 * (k % 4), .14, 25, .05, (1, .2)), int((k * .22 + .03 * np.sin(k)) * SR)) for k in range(n)]; return out
@mine('splash')
def sfx_splash(n=6): out = np.zeros(int((n * .12 + .3) * SR)); [put(out, noise_burst(.05, 1500, 7000, 60, .09), int((k * .12) * SR)) for k in range(n)]; return out
@mine('trickle')
def sfx_trickle(dur=1.8):
    out = np.zeros(int(dur * SR))
    for k in range(int(dur / .07)): put(out, sweep(700 + 300 * rng.random(), 900 + 400 * rng.random(), .05, .03), int(k * .07 * SR))
    return out
@mine('qpop')
def sfx_qpop(): return mx(tone(660, .2, 12, .08, (1, .3)), np.pad(tone(880, .3, 9, .07, (1, .3)), (int(.1 * SR), 0)))
@mine('drainflow')
def sfx_drainflow(dur=2.0): n = int(dur * SR); t = np.arange(n) / SR; return lp(rng.standard_normal(n), 1200) * (1 + .4 * np.sin(2 * np.pi * 3 * t)) * .05 * _env(n, .3, .5)
@mine('downpour')
def sfx_downpour(dur=1.8): n = int(dur * SR); t = np.arange(n) / SR; return bp(rng.standard_normal(n), 900, 9000) * .08 * np.sin(np.pi * t / dur) ** 1.5
@mine('layer')
def sfx_layer(pitch=1.): return mx(tone(659 * pitch, .6, 5, .07, (1, .3)), np.pad(tone(988 * pitch, .5, 6, .05, (1, .2)), (int(.07 * SR), 0)))
@mine('merge')
def sfx_merge(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) for f in (523, 659, 784, 1046)) * .02 * np.minimum(1, t / .2) * np.exp(-t * 1.8)
@mine('bubble3')
def sfx_bubble3(pitch=1.): return mx(sweep(400 * pitch, 900 * pitch, .12, .12), np.pad(tone(1320 * pitch, .25, 14, .06, (1,)), (int(.12 * SR), 0)))

if __name__ == '__main__':
    cues = json.load(open(sys.argv[1]))
    m = music_ep10(cues)
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
        src = f"`synth_ep10.py` → {ev['name']}" if ev['name'] in MINE else f"kit (`synth.py`/`sfx_base.py`) → {ev['name']}"
        rows.append(f"| {ev['t']:.2f}–{ev['t'] + len(x) / SR:.2f} · {ev.get('anchor', '')} | {ev.get('label', '')} | {cls} | {src} | {rms:.1f} dBFS RMS (trim {ev.get('trim', 0):+g}) | {ev.get('why', '')} | buatan sendiri (kode) |")
    wavfile.write('sfx.wav', SR, sfx.astype(np.float32))
    for k, v in tracks.items(): wavfile.write(f'sfx_{k}.wav' if k != 'amb' else 'amb.wav', SR, v.astype(np.float32))
    open(os.environ.get('CUE_OUT', 'CUE_SHEET.md'), 'w').write(cues.get('sheetHead', '') + '| Waktu (s) · anchor VO | Aksi | Kelas | Sumber / file | Level relatif (pre-mix) | Tujuan | Lisensi |\n|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    print('music', round(m.shape[0] / SR, 2), 's; sfx events', len(cues['sfx']))
