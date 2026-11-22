# EP06 copy of the EP05 episode generators (shared SFX + class loudness matching).
# EP05 copy of the EP04 episode generators (shared SFX + class loudness matching). Self-contained so this episode does not depend on the EP04 folder.
"""Whyscape EP04 audio (derived from EP03 synth: same SFX generators + class loudness matching). Original EP03 docstring follows.
Whyscape EP03 audio — "Kenapa Semut Berbaris?" Music + episode SFX, built on the series generator (series/audio/synth.py).
Everything is synthesized by code (numpy/scipy); no samples, no third-party audio.
Usage (inside this folder):  python3 synth_ep03.py cues.json   -> music.wav + sfx.wav  (then series/audio/mix.py)

Music (small, nimble, investigative — not tense, not a kids' cartoon):
  100 BPM, A dorian. Pizzicato-style plucks in short "tiptoe" figures (a line of small steps), soft wood ticks,
  a felt pad. Regions from cues.json:
    hush   ("Padahal…"/before the reveal): pad only, lower
    inside (investigation layer): light plucks + glassy pings, no kick
    build  (trail gets stronger → long line): adds a second pluck voice, shaker and a soft kick, layer by layer
    thin   (experiment / reflection checks): pad + sparse plucks
    recede (food runs out): plucks thin out and drop an octave, no percussion
    end    (reflection + closing): warm major lift (D major colour), slow bells
New SFX: crumb (tiny crumbs landing), sense (antenna reads the trail), patter (tiny ant steps — never human footsteps),
         fadeaway (trail fading, soft descending shimmer).
"""
import json, os, sys, numpy as np
from scipy.io import wavfile
KIT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(KIT, 'series', 'audio'))
import synth as S
from synth import SR, add, marimba, pluck_bass, pad, tick, hat, kick, midi, lp, hp, bp

rng = np.random.default_rng(33)
MUSIC_TRIM_DB = -1.5          # EP04: the bed sits lower in the speech band than EP03's plucks → 2.5 dB up so it is present (VO stays ≥ 12 dB above)

def pizz(f, dur=.35, vel=1.):     # short plucked string: KS-like decay, filtered
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 30) + .2 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 45)) * np.exp(-t * 11)
    x[:int(.003 * SR)] *= np.linspace(0, 1, int(.003 * SR))
    return lp(x, 4200) * vel * .32
def ping(f, dur=.6, vel=1.):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 18)) * np.exp(-t * 6) * vel * .2
def wood(vel=1.):
    n = int(.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 120) + .3 * bp(rng.standard_normal(n), 1500, 4000) * np.exp(-t * 160)) * vel * .12
def shaker(vel=1.):
    n = int(.06 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 5000, 11000) * np.exp(-t * 80) * vel * .045

def music_ep04(cues):
    """EP04 bed: 96 BPM, C major/mixolydian. Warm comedic 'elevator-ish' rhodes-like plucks + walking bass for home/lobby,
    a lighter investigative layer (glassy pings, no kick) behind the portal, thin pad under the dense sensor explanation,
    a playful wobble in the imagination bubbles, and a warm resolution at the end."""
    dur = cues['duration']; bpm = 96; beat = 60 / bpm; bar = 4 * beat
    out = np.zeros((int(dur * SR) + SR, 2))
    inr = lambda t, key: any(a <= t < b for a, b in cues.get(key, []))
    warm = [(48, [64, 67, 71, 74]), (53, [65, 69, 72, 76]), (50, [65, 69, 72, 74]), (55, [65, 67, 71, 74])]   # Cmaj9 Fmaj7 Dm9 G7sus
    inv = [(45, [64, 67, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]                   # Am  F  G  Am (investigative)
    scale = [60, 62, 64, 65, 67, 69, 70, 72]                                                                  # C mixolydian (Bb = playful)
    figs = [[0, None, 2, 4, None, 5, 4, None], [7, None, 6, None, 4, 2, None, None], [2, 4, None, 5, None, 4, 2, None], [4, None, None, 2, 0, None, None, None]]
    t0, b = 0., 0
    while t0 < dur:
        hush, inside, thin, fant, end = (inr(t0, k) for k in ('hush', 'inside', 'thin', 'fantasy', 'end'))
        root, chord = (inv if inside or thin else warm)[b % 4]
        add(out, pad([midi(m) for m in chord], bar + .4, .45 if hush else 1.1 if (thin or end) else .7), t0, 0)
        if hush: t0 += bar; b += 1; continue
        if not thin:
            for k, d in enumerate([0, 7, 12, 7] if not inside else [0, 12]):
                add(out, pluck_bass(midi(root - 12 + d), .3, .7 if k == 0 else .45), t0 + k * (beat if not inside else 2 * beat), -.1)
        fig = figs[b % 4]
        for k, deg in enumerate(fig):
            if deg is None or (thin and k % 2) or (inside and k % 4 == 3): continue
            note = scale[deg % 8] + (12 if inside else 0)
            vel = (.55 if k else .66) * (.75 if thin else 1)
            add(out, (ping(midi(note), .5, .8) if inside else marimba(midi(note), .5, vel)), t0 + k * beat / 2 + (.04 if fant and k % 2 else 0), .3 if k % 2 else -.3)
        if fant:   # imagination: a little bouncing wobble on the off-beats
            for k in (1, 3): add(out, pizz(midi(scale[(b + k) % 8] + 12), .25, .45), t0 + k * beat + beat / 2, .5)
        if not (thin or inside or end or hush):
            for k in (1, 3): add(out, wood(.55), t0 + k * beat, -.4)
            if b >= 1: add(out, kick(.26), t0, 0)
        if end and b % 2 == 0: add(out, ping(midi(chord[(b // 2) % len(chord)] + 12), 1.2, .5), t0 + beat, .3)
        t0 += bar; b += 1
    out = out[:int(dur * SR)]
    f = int(cues.get('fade', 1.0) * SR); out[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
    fi = int(cues.get('fadeIn', 0) * SR)
    if fi: out[:fi] *= np.linspace(0, 1, fi)[:, None] ** 1.5
    return out

# ---------- episode SFX (candidates for the series library) ----------
def sfx_crumb(n=3, spacing=.11):
    out = np.zeros(int((n * spacing + .2) * SR))
    for i in range(n):
        m = int(.04 * SR); t = np.arange(m) / SR
        c = bp(rng.standard_normal(m), 900, 3500) * np.exp(-t * 110) * (.6 - .12 * i) + .3 * np.sin(2 * np.pi * (420 - 40 * i) * t) * np.exp(-t * 90)
        j = int(i * spacing * SR + rng.uniform(0, .02) * SR); out[j:j + m] += c
    return out * .55
def sfx_sense():                       # antenna reads the trail: soft upward glint
    n = int(.35 * SR); t = np.arange(n) / SR
    f = 1400 + 900 * t / t[-1]
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) * (1 - np.exp(-t * 300)) * .22
def sfx_patter(steps=6, rate=.055):    # tiny ant steps: very short high ticks, irregular — never a human footstep
    out = np.zeros(int((steps * rate + .1) * SR))
    for i in range(steps):
        m = int(.012 * SR); t = np.arange(m) / SR
        c = hp(rng.standard_normal(m), 4500) * np.exp(-t * 600) * (.5 + .3 * rng.random())
        j = int((i * rate + rng.uniform(-.008, .008)) * SR); j = max(0, j); out[j:j + m] += c[:len(out) - j]
    return out * .35
def sfx_fadeaway():                    # the trail fades: soft descending shimmer
    n = int(1.6 * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * (f0 * (1 - .35 * t / t[-1])) * t) * (.6 ** k) for k, f0 in enumerate([1760, 2217, 2637]))
    return x * np.exp(-t * 2.2) * (1 - np.exp(-t * 20)) * .12

# ---------- v2 (patch review): sounds chosen by FUNCTION, not more of the same ----------
def sfx_room(dur=4.0):                 # kitchen ambience: soft air + faint low hum, slow drift (very quiet bed)
    n = int(dur * SR); t = np.arange(n) / SR
    air = lp(hp(rng.standard_normal(n), 180), 1800) * .018 * (1 + .25 * np.sin(2 * np.pi * .13 * t))
    hum = (np.sin(2 * np.pi * 100 * t) + .4 * np.sin(2 * np.pi * 200 * t)) * .0035
    env = np.minimum(1, np.minimum(t / .6, (dur - t) / .6))
    return (air + hum) * env
def sfx_scuttle(dur=.9):               # explorer on tiles: tiny grainy scrape bursts (sand/tile), very soft
    n = int(dur * SR); out = np.zeros(n)
    for j in range(int(dur / .045)):
        m = int(.02 * SR); t = np.arange(m) / SR; k = int(j * .045 * SR + rng.uniform(0, .015) * SR)
        if k + m < n: out[k:k + m] += bp(rng.standard_normal(m), 2500, 7000) * np.exp(-t * 260) * (.3 + .3 * rng.random())
    return out * .5
def sfx_swish(dur=.32):                # gesture: head turn / magnifier lift — soft cloth swish
    n = int(dur * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 900, 3500) * np.sin(np.pi * t / dur) ** 2 * .12
def sfx_lens(dur=.45):                 # soft lens swish into the magnifier (not a loud whoosh)
    n = int(dur * SR); t = np.arange(n) / SR; f = 600 + 1800 * (t / dur) ** 2
    return (bp(rng.standard_normal(n), 1200, 5000) * .08 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .05) * np.sin(np.pi * t / dur) ** 2
def sfx_inv_on():                      # investigation layer switches on: light synthetic shimmer rising
    n = int(.9 * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * (1 + .25 * t) * t) * (.55 ** k) for k, f in enumerate([880, 1320, 1760]))
    return x * (1 - np.exp(-t * 14)) * np.exp(-t * 3.2) * .09
def sfx_inv_off():                     # back to the normal view: the same shimmer, falling and shorter
    n = int(.6 * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * (1 - .3 * t) * t) * (.55 ** k) for k, f in enumerate([1760, 1320, 880]))
    return x * (1 - np.exp(-t * 20)) * np.exp(-t * 5) * .08
def sfx_decide():                      # an ant chooses a branch: two short wooden plucks (different from 'sense')
    out = np.zeros(int(.4 * SR))
    for i, f in enumerate([587, 784]):
        m = int(.18 * SR); t = np.arange(m) / SR; j = int(i * .09 * SR)
        out[j:j + m] += (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2.01 * f * t)) * np.exp(-t * 28) * .16
    return out
def sfx_paperfun():                    # the "map" fantasy: quick paper flick + a tiny comic bounce, very short
    p = S.sfx_paper(); n = int(.35 * SR); t = np.arange(n) / SR
    b = np.sin(2 * np.pi * (300 + 260 * np.sin(np.pi * t / .35)) * t) * np.exp(-t * 9) * .07
    out = np.zeros(max(len(p), n)); out[:len(p)] += p * .8; out[:n] += b; return out
def sfx_track(dur=1.2, long=True):     # experiment: one ant running its track — light patter texture
    return sfx_patter(steps=int(dur / .06), rate=.06) * (1 if long else .8)
def sfx_grain():                       # the very last grain is lifted: a tiny dry "tik"
    n = int(.08 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2000, 6000) * np.exp(-t * 90) + np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 70) * .5) * .3
def sfx_renew():                       # "memperbaruinya bersama": warm two-note rise
    out = np.zeros(int(1.0 * SR))
    for i, f in enumerate([523, 659, 784]):
        m = int(.6 * SR); t = np.arange(m) / SR; j = int(i * .12 * SR)
        out[j:j + m] += np.sin(2 * np.pi * f * t) * np.exp(-t * 6) * (1 - np.exp(-t * 60)) * .09
    return out

S.SFX.update({'crumb': sfx_crumb, 'sense': sfx_sense, 'patter': sfx_patter, 'fadeaway': sfx_fadeaway,
              'room': sfx_room, 'scuttle': sfx_scuttle, 'swish': sfx_swish, 'lens': sfx_lens, 'inv_on': sfx_inv_on, 'inv_off': sfx_inv_off,
              'decide': sfx_decide, 'paperfun': sfx_paperfun, 'track': sfx_track, 'grain': sfx_grain, 'renew': sfx_renew})

# ---------- final patch: sounds spotted to visible actions ----------
def sfx_tap(pitch=1.):                 # tiny contact: antenna/jaw touches the crumb, an antenna tip touches a dab
    n = int(.05 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2200 * pitch, 6500) * np.exp(-t * 180) * .7 + np.sin(2 * np.pi * 2600 * pitch * t) * np.exp(-t * 140) * .4) * .5
def sfx_crumb1(pitch=1.):              # one small crumb landing close: dry, light (not a heavy object)
    n = int(.09 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 700 * pitch, 3200 * pitch) * np.exp(-t * 75) + .35 * np.sin(2 * np.pi * 380 * pitch * t) * np.exp(-t * 60)) * .55
def sfx_brush(n=2, gap=.16):           # two very short antenna sweeps over the surface
    out = np.zeros(int((n * gap + .12) * SR))
    for i in range(n):
        m = int(.07 * SR); t = np.arange(m) / SR
        x = bp(rng.standard_normal(m), 3000 + 800 * i, 9000) * np.sin(np.pi * t / t[-1]) ** 2
        j = int(i * gap * SR); out[j:j + m] += x * .5
    return out
def sfx_found():                       # "found the clue": warm short rise (different from the '?' pop and from 'decide')
    out = np.zeros(int(.5 * SR))
    for i, f in enumerate([784, 1175]):
        m = int(.35 * SR); t = np.arange(m) / SR; j = int(i * .07 * SR)
        out[j:j + m] += (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 20)) * np.exp(-t * 9) * (1 - np.exp(-t * 400)) * .18
    return out
def sfx_qpop(pitch=1.):                # elastic pop when a '?' appears
    n = int(.16 * SR); t = np.arange(n) / SR; f = 420 * pitch * (1 + 1.2 * (1 - np.exp(-t * 60)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * (1 - np.exp(-t * 600)) * .4
def sfx_swirl(dur=.7, up=True):        # light sweep that circles an object (ring around the bend / the crumb)
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    noise = rng.standard_normal(n); seg = int(.02 * SR)
    for i in range(0, n - seg, seg):
        k = i / n; fc = 1200 + 2600 * (k if up else 1 - k)
        out[i:i + seg] = bp(noise[i:i + seg], fc * .7, fc * 1.4)
    return out * np.sin(np.pi * t / dur) ** 2 * .28
def sfx_split():                       # one path becomes two: two tones bending apart
    n = int(.45 * SR); t = np.arange(n) / SR
    a = np.sin(2 * np.pi * np.cumsum(660 * (1 + .25 * t / t[-1])) / SR); b = np.sin(2 * np.pi * np.cumsum(660 * (1 - .2 * t / t[-1])) / SR)
    return (a + b) * np.exp(-t * 5) * (1 - np.exp(-t * 300)) * .11
def sfx_flick():                       # short paper flick (the map is crossed out)
    n = int(.12 * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 2500) * np.exp(-t * 45) * np.sin(np.pi * np.minimum(1, t / .02)) * .45
def sfx_vanish():                      # soft disappearance of the imagination bubble
    n = int(.45 * SR); t = np.arange(n) / SR
    sw = bp(rng.standard_normal(n), 2000, 8000) * (t / t[-1]) ** 2 * np.exp(-((t - .38) / .06) ** 2) * .25
    sp = np.sin(2 * np.pi * np.cumsum(2400 - 1400 * t / t[-1]) / SR) * np.exp(-t * 8) * .06
    return sw + sp
def sfx_thought():                     # a memory bubble appears: low soft bloop
    n = int(.25 * SR); t = np.arange(n) / SR; f = 300 + 220 * (1 - np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * (1 - np.exp(-t * 300)) * .3
def sfx_step1(bright=1.):              # one micro footfall at macro scale: a 6 ms dry tick (stylised, never a shoe)
    n = int(.03 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 2500 * bright, 9000) * np.exp(-t * 500) * (.6 + .4 * rng.random())
def sfx_steps(dur=1., iv=.2, bright=1.):   # a walking ant at macro scale: one micro tick per tripod landing (interval from stride/speed)
    n = int(dur * SR) + int(.05 * SR); out = np.zeros(n); t = 0.
    while t < dur:
        x = sfx_step1(bright); j = int((t + rng.uniform(-.006, .006)) * SR); j = max(0, j); out[j:j + len(x)] += x[:n - j]; t += iv
    return out
def sfx_swarm(dur=2., d0=.3, d1=1.):   # wide shot: many tiny steps blend into a soft texture; density d0 → d1
    n = int(dur * SR); out = np.zeros(n); t = 0.
    while t < dur - .03:
        k = t / dur; dens = d0 + (d1 - d0) * k; step = .09 / max(.15, dens)
        x = sfx_step1(.8) * (.35 + .3 * rng.random()); j = int(t * SR); out[j:j + len(x)] += x[:n - j]; t += step * (.6 + .8 * rng.random())
    env = np.minimum(1, np.minimum(np.arange(n) / (.3 * SR), (n - np.arange(n)) / (.3 * SR)))
    return lp(out, 6000) * env
def sfx_slide(dur=.9):                 # the crumb is moved across the tile: light dry scrape
    n = int(dur * SR); t = np.arange(n) / SR
    g = bp(rng.standard_normal(n), 500, 2200) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 23 * t))) * np.sin(np.pi * t / dur) ** 1.5
    return g * .3
def sfx_arena():                       # a test arena becomes active: soft paper-on-wood set down
    n = int(.22 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 300, 2400) * np.exp(-t * 35) * .5 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) * .35) * .7
def sfx_note(pitch=1.):                # small musical accent (the distance difference becomes readable) — not a win/lose sting
    return marimba(midi(76) * pitch, .5, .5) * .7

S.SFX.update({'tap': sfx_tap, 'crumb1': sfx_crumb1, 'brush': sfx_brush, 'found': sfx_found, 'qpop': sfx_qpop, 'swirl': sfx_swirl, 'split': sfx_split,
              'flick': sfx_flick, 'vanish': sfx_vanish, 'thought': sfx_thought, 'step1': sfx_step1, 'steps': sfx_steps, 'swarm': sfx_swarm, 'slide': sfx_slide, 'arena': sfx_arena, 'note': sfx_note})

# ---------- EP04 sounds (all synthesized here; no samples) ----------
def sfx_footstep(surface='street', n=1, iv=.36):   # Mpi's shoe: soft heel+toe; 'street' = gritty, 'lobby' = clean tile click
    out = np.zeros(int((n * iv + .2) * SR))
    for i in range(n):
        m = int(.08 * SR); t = np.arange(m) / SR
        if surface == 'street': x = bp(rng.standard_normal(m), 300, 2500) * np.exp(-t * 55) + .3 * np.sin(2 * np.pi * 110 * t) * np.exp(-t * 60)
        else: x = (bp(rng.standard_normal(m), 1200, 6000) * np.exp(-t * 90) + .5 * np.sin(2 * np.pi * 900 * t) * np.exp(-t * 80)) * .8
        j = int((i * iv + rng.uniform(-.01, .01)) * SR); j = max(0, j); out[j:j + m] += x[:len(out) - j] * (.8 + .2 * rng.random())
    return out * .5
def sfx_street(dur=3.0):              # street ambience: distant traffic rumble + leaves in the wind
    n = int(dur * SR); t = np.arange(n) / SR
    rumble = lp(rng.standard_normal(n), 220) * .06 * (1 + .3 * np.sin(2 * np.pi * .2 * t))
    leaves = bp(rng.standard_normal(n), 2500, 7000) * .012 * (1 + np.sin(2 * np.pi * .5 * t)) ** 2
    env = np.minimum(1, np.minimum(t / .5, (dur - t) / .5)); return (rumble + leaves) * env
def sfx_carpass(dur=2.2):             # a car passes (soft doppler swell)
    n = int(dur * SR); t = np.arange(n) / SR; f = 90 * (1.15 - .3 * t / dur)
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + lp(rng.standard_normal(n), 900) * .6) * np.exp(-((t - dur / 2) / (dur / 4)) ** 2)
    return x * .3
def sfx_lobbytone(dur=4.0):           # lobby room tone: airy, a faint far chatter band, very quiet
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(hp(rng.standard_normal(n), 200), 2200) * .015 + bp(rng.standard_normal(n), 400, 1200) * .006 * (1 + .5 * np.sin(2 * np.pi * .7 * t))
    env = np.minimum(1, np.minimum(t / .5, (dur - t) / .5)); return x * env
def sfx_cabinhum(dur=4.0):            # inside the cabin while moving: low motor hum + faint air (doors closed → street gone)
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 58 * t) + .5 * np.sin(2 * np.pi * 116 * t) + .2 * np.sin(2 * np.pi * 174 * t)) * .02 + lp(rng.standard_normal(n), 500) * .02
    env = np.minimum(1, np.minimum(t / .6, (dur - t) / .6)); return x * env
def sfx_button(pitch=1.):             # a lift button: plastic click + tiny confirm beep
    n = int(.18 * SR); t = np.arange(n) / SR
    click = bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 300) * .7
    beep = np.sin(2 * np.pi * 1320 * pitch * t) * np.exp(-t * 18) * (t > .02) * .25
    return click + beep
def sfx_ding(pitch=1.):               # the arrival "ting": two soft bell partials
    n = int(1.6 * SR); t = np.arange(n) / SR; f = 1046 * pitch
    return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + .2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)) * np.exp(-t * 2.6) * (1 - np.exp(-t * 500)) * .32
def sfx_doors(dur=.8, closing=True):  # sliding lift doors: rumble + soft end thump (closing) / soft start (opening)
    n = int(dur * SR); t = np.arange(n) / SR
    roll = lp(rng.standard_normal(n), 700) * .25 * np.sin(np.pi * np.minimum(1, t / dur)) ** .8
    thump = (np.sin(2 * np.pi * 95 * (t - dur * .9)) * np.exp(-np.maximum(0, t - dur * .9) * 40) * (t > dur * .9) * .4) if closing else 0
    return roll + thump
def sfx_start(dur=1.2):               # the cabin starts moving: low swell + slight pitch rise
    n = int(dur * SR); t = np.arange(n) / SR; f = 55 + 20 * t / dur
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + lp(rng.standard_normal(n), 300) * .5
    mid = bp(rng.standard_normal(n), 500, 2200) * .35 + np.sin(2 * np.pi * np.cumsum(f * 6) / SR) * .12   # audible on a phone speaker too
    return (low + mid) * np.sin(np.pi * t / dur) ** 1.2 * .35
def sfx_slowdown2(dur=1.4):           # the cabin slows: low tone falling, gently
    n = int(dur * SR); t = np.arange(n) / SR; f = 80 - 30 * t / dur
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + lp(rng.standard_normal(n), 250) * .4
    mid = np.sin(2 * np.pi * np.cumsum(f * 7) / SR) * .16 + bp(rng.standard_normal(n), 600, 2000) * .25
    return (low + mid) * np.exp(-t * 1.6) * (1 - np.exp(-t * 20)) * .35
def sfx_settle():                     # stop level with the floor: soft low thunk
    n = int(.3 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) + lp(rng.standard_normal(n), 400) * np.exp(-t * 30) * .4
            + bp(rng.standard_normal(n), 700, 2600) * np.exp(-t * 45) * .5 + np.sin(2 * np.pi * 620 * t) * np.exp(-t * 35) * .25) * .5
def sfx_count(pitch=1.):              # imagination: a counted floor — bouncy cartoon blip
    n = int(.22 * SR); t = np.arange(n) / SR; f = 700 * pitch * (1 + .5 * np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * (1 - np.exp(-t * 500)) * .35
def sfx_board():                      # the tiny guard taps his clipboard
    n = int(.1 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 800, 4000) * np.exp(-t * 90) + np.sin(2 * np.pi * 520 * t) * np.exp(-t * 70) * .4) * .45
def sfx_bubblepop():                  # the imagination bubble pops
    n = int(.25 * SR); t = np.arange(n) / SR; f = 900 + 1500 * t / .25
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * .5 + hp(rng.standard_normal(n), 3000) * np.exp(-t * 60) * .4) * .5
def sfx_bubblein():                   # the bubble appears: soft rising bloop
    n = int(.35 * SR); t = np.arange(n) / SR; f = 300 + 500 * (1 - np.exp(-t * 12))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * (1 - np.exp(-t * 300)) * .35
def sfx_signalrun(dur=1.6):           # a signal travelling along the wire: a soft rising data chirp train
    n = int(dur * SR); out = np.zeros(n)
    for i in range(int(dur / .09)):
        m = int(.04 * SR); t = np.arange(m) / SR; f = 1800 + 900 * i / (dur / .09)
        j = int(i * .09 * SR); out[j:j + m] += np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * .3
    return out * np.linspace(.6, 1, n)
def sfx_wheel(dur=2.0, rate=.07):     # the measuring wheel turning: regular soft ratchet ticks
    n = int(dur * SR); out = np.zeros(n); k = 0
    while k * rate < dur - .02:
        m = int(.015 * SR); t = np.arange(m) / SR; j = int(k * rate * SR)
        out[j:j + m] += bp(rng.standard_normal(m), 2500, 8000) * np.exp(-t * 400) * (.6 + .2 * (k % 2)); k += 1
    return out * .5
def sfx_mark():                       # a floor-zone marker is read: short magnetic blip
    n = int(.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1600 * t) * np.exp(-t * 40) + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 60) * .5) * .3

S.SFX.update({'footstep': sfx_footstep, 'street': sfx_street, 'carpass': sfx_carpass, 'lobbytone': sfx_lobbytone, 'cabinhum': sfx_cabinhum, 'button': sfx_button,
              'ding': sfx_ding, 'doors': sfx_doors, 'start': sfx_start, 'slowdown2': sfx_slowdown2, 'settle': sfx_settle, 'count': sfx_count, 'board': sfx_board,
              'bubblepop': sfx_bubblepop, 'bubblein': sfx_bubblein, 'signalrun': sfx_signalrun, 'wheel': sfx_wheel, 'mark': sfx_mark})

# perceived-loudness matching BEFORE the mix: every cue is scaled to its class target (RMS of its active part), then the
# cue's own trim (dB) is applied. id = series identity sounds (left as designed).
CLASS_RMS = {'key': -20.0, 'detail': -21.5, 'texture': -21.0, 'amb': -40.0, 'hero': -20.0, 'movement': -21.5, 'ambience': -38.0}
def normalise(x, cls):
    if cls not in CLASS_RMS or not len(x): return x
    a = np.abs(x); thr = a.max() * .1; act = x[a > thr] if (a > thr).sum() > 20 else x
    rms = np.sqrt(np.mean(act ** 2)) + 1e-12
    return x * (10 ** (CLASS_RMS[cls] / 20) / rms)

if __name__ == '__main__':
    cues = json.load(open(sys.argv[1]))
    m = music_ep04(cues)
    wavfile.write('music.wav', SR, (m / (np.abs(m).max() + 1e-9) * .8 * 10 ** (MUSIC_TRIM_DB / 20)).astype(np.float32))
    sfx = np.zeros((int(cues['duration'] * SR), 2))
    rows = []
    N = int(cues['duration'] * SR)
    tracks = {k: np.zeros((N, 2)) for k in ('key', 'detail', 'amb')}            # key / detail(+texture) / ambience → separate files
    for ev in cues['sfx']:
        cls = ev.get('cls', 'detail')
        x = S.SFX[ev['name']](**ev.get('args', {}))
        x = normalise(x, cls) * 10 ** (ev.get('trim', 0) / 20) if cls in CLASS_RMS else x * ev.get('gain', 1.)
        tr = tracks['amb' if cls in ('amb', 'ambience') else 'key' if cls in ('key', 'id', 'hero') else 'detail']
        add(tr, x, ev['t'], ev.get('pan', 0.))
        if cls not in ('amb', 'ambience'): add(sfx, x, ev['t'], ev.get('pan', 0.))
        rms = 20 * np.log10(np.sqrt(np.mean(x[np.abs(x) > np.abs(x).max() * .1] ** 2)) + 1e-9)
        rows.append(f"| {ev['t']:.2f} | {ev['t'] + len(x) / SR:.2f} | {ev.get('label', '')} | {ev['name']} | {len(x) / SR:.2f} s | {cls} · {rms:.1f} dBFS RMS pre-mix | {ev.get('pan', 0):+.1f} | {'amb' if cls in ('amb', 'ambience') else 'sfx'} | {ev.get('why', '')} |")
    wavfile.write('sfx.wav', SR, sfx.astype(np.float32))
    for k, v in tracks.items(): wavfile.write(f'sfx_{k}.wav' if k != 'amb' else 'amb.wav', SR, v.astype(np.float32))
    open(os.environ.get('CUE_OUT', 'CUE_SHEET.md'), 'w').write(cues.get('sheetHead', '') + '| Mulai (s) | Selesai | Aksi / objek di layar | Bunyi | Panjang | Kelas · level | Pan | Stem | Alasan |\n|---|---|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    print('music', round(m.shape[0] / SR, 2), 's; sfx events', len(cues['sfx']))
