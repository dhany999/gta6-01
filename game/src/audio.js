// Synthesized sound only: WebAudio oscillators and noise buffers, no files.
import { G } from './state.js';

let ctx = null;
let engineOsc = null, engineGain = null, engineFilter = null;
let sirenOsc = null, sirenGain = null, sirenTimer = null;
let noiseBuf = null;

function ensureCtx() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function blip(freq, dur, type, vol, slideTo) {
  const c = ensureCtx();
  if (c.state === 'suspended') c.resume();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur);
}

function noise(dur, vol, filterFreq) {
  const c = ensureCtx();
  if (c.state === 'suspended') c.resume();
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(); src.stop(c.currentTime + dur);
}

export function initAudio() {
  G.audio = {
    unlock() { ensureCtx(); },
    gunshot() { noise(0.16, 0.5, 1800); blip(160, 0.1, 'square', 0.25, 60); },
    punch() { noise(0.1, 0.35, 500); },
    pickup() { blip(660, 0.12, 'sine', 0.3); setTimeout(() => blip(880, 0.18, 'sine', 0.3), 110); },
    crash() { noise(0.3, 0.5, 700); },
    alarm() { blip(1200, 0.15, 'square', 0.12, 900); setTimeout(() => blip(1200, 0.15, 'square', 0.12, 900), 220); },
    engine(on, speed) {
      if (!ctx) return;
      const c = ctx;
      if (!on) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      if (!engineOsc) {
        engineOsc = c.createOscillator(); engineOsc.type = 'sawtooth';
        engineFilter = c.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 500;
        engineGain = c.createGain(); engineGain.gain.value = 0;
        engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(c.destination);
        engineOsc.start();
      }
      if (c.state === 'suspended') c.resume();
      engineOsc.frequency.value = 55 + Math.abs(speed) * 5.5;
      engineGain.gain.value = 0.05 + Math.min(0.08, Math.abs(speed) * 0.003);
    },
    siren(on) {
      if (!on) {
        if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }
      if (!ctx) return;
      const c = ctx;
      if (!sirenOsc) {
        sirenOsc = c.createOscillator(); sirenOsc.type = 'sine';
        sirenGain = c.createGain(); sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain); sirenGain.connect(c.destination);
        sirenOsc.start();
      }
      if (c.state === 'suspended') c.resume();
      sirenGain.gain.value = 0.05;
      if (!sirenTimer) {
        let hi = false;
        sirenTimer = setInterval(() => {
          if (!sirenOsc) return;
          hi = !hi;
          sirenOsc.frequency.value = hi ? 920 : 700;
        }, 380);
      }
    },
  };
}
