"""Synthesize the original campus sound palette using only the standard library."""
from array import array
from math import sin, pi, exp
from pathlib import Path
from random import Random
import wave

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)

def write_wav(name, samples):
    pcm = array('h', (round(min(.98, max(-.98, x)) * 32767) for x in samples))
    with wave.open(str(OUT / (name + '.wav')), 'wb') as f:
        f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        f.writeframes(pcm.tobytes())

def track(name, seconds, notes=()):
    samples = [0.0] * round(seconds * RATE)
    for start, freq, duration, amp in notes:
        offset = int(start * RATE)
        for i in range(min(int(duration * RATE), len(samples) - offset)):
            t = i / RATE
            env = min(1, t / .011) * exp(-4.6 * t / duration) * min(1,(duration-t)/.035)
            phase = 2*pi*freq*t
            samples[offset+i] += amp * env * (sin(phase) + .23*sin(phase*2.006) + .12*sin(phase*3.003))
    write_wav(name, samples)

def sneaker_step(name, seed, toe_delay, peak):
    rng = Random(seed)
    seconds = .16
    grain = body = bass = 0.0
    samples = []
    for i in range(round(seconds * RATE)):
        t = i / RATE
        grain += .32 * (rng.uniform(-1, 1) - grain)
        body += .10 * (grain - body)
        bass += .022 * (body - bass)

        # The heel compresses first, then the sole brushes the pavement.
        heel = min(1, t / .012) * exp(-t / .024)
        toe_time = max(0, t - toe_delay)
        toe = min(1, toe_time / .016) * exp(-toe_time / .022)
        contact = (body - bass) * (heel + .50 * toe)
        brush = (grain - body) * .15 * toe
        fade = min(1, (seconds - t) / .016)
        samples.append((contact + brush) * fade)
    scale = peak / max(map(abs, samples))
    write_wav(name, (sample * scale for sample in samples))

sneaker_step('step', seed=92, toe_delay=.031, peak=.220)
sneaker_step('step-right', seed=317, toe_delay=.037, peak=.212)
track('tap',.13,[(0,570,.12,.15)])
track('open',.28,[(0,493.88,.18,.15),(.07,659.25,.20,.1)])
track('success',.66,[(0,523.25,.28,.17),(.1,659.25,.35,.15),(.2,783.99,.46,.12)])
for name,f in [('gong',523.25),('jue',659.25),('zhi',783.99)]: track(name,1.2,[(0,f,1.18,.4)])
phrase=[(0,261.63),(.8,392),(2.1,440),(3.5,329.63),(5.3,293.66),(6.1,392),(8.3,329.63),(9.6,261.63),(12,220),(13.4,329.63),(15.1,392),(16.7,293.66)]
track('campus',20,[(s,f,2.8,.13) for s,f in phrase]+[(s,f/2,3.5,.09) for s,f in phrase[::3]])
track('birds',12,[(s+i*.032,f+i*44,.075,.035) for s,f in [(1,1940),(1.51,2150),(6.1,1780),(8.28,2040)] for i in range(6)])
