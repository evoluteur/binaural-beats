/*!
 * Binaural Beats - Web Audio engine and UI
 * https://github.com/evoluteur/binaural-beats
 * (c) 2026 Olivier Giulieri - MIT license
 *
 * The two carriers must reach the ears separately, so they are routed through
 * a ChannelMerger (one oscillator per channel) rather than a panner: the beat
 * only exists if nothing of the left tone leaks into the right ear.
 */

const FADE_IN = 4; // seconds
const FADE_OUT = 8; // seconds
const PEAK = 0.5; // headroom for the two carriers plus the noise bed

const elems = {};
const $ = (id) => {
  if (!elems[id]) {
    elems[id] = document.getElementById(id);
  }
  return elems[id];
};

let AudioContext = window.AudioContext || window.webkitAudioContext;
let context;
let master;
let oscL, oscR, toneGain;
let noiseSource, noiseGain;
let isPlaying = false;
let activeBtn, endTimer, tick;

let duration = 900; // 15 minutes
let volume = 0.7;
let noiseVolume = 0.25;
let noiseType = "none";
let carrier = 200;
let beat = 10;

const save = (k, v) => localStorage.setItem("bb-" + k, v);
const load = (k) => localStorage.getItem("bb-" + k);

const mmss = (s) => {
  const m = Math.floor(s / 60);
  return m + ":" + String(Math.floor(s % 60)).padStart(2, "0");
};

/* ------------------------------------------------------------- noise beds */

// Paul Kellet's pink filter, and a leaky integrator for brown. One 4 second
// buffer, looped - long enough that the loop point is inaudible.
const noiseBuffer = (kind) => {
  const len = context.sampleRate * 4;
  const buffer = context.createBuffer(1, len, context.sampleRate);
  const out = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      out[i] = last * 3.5;
    } else {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
};

/* ------------------------------------------------------------------ engine */

const envelope = (gain, peak, now, dur) => {
  const rise = Math.min(FADE_IN, dur / 4);
  const fall = Math.min(FADE_OUT, dur / 4);
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(0, now);
  gain.linearRampToValueAtTime(peak, now + rise);
  gain.setValueAtTime(peak, now + dur - fall);
  gain.linearRampToValueAtTime(0, now + dur);
};

const startNoise = (now) => {
  if (noiseType === "none") return;
  noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer(noiseType);
  noiseSource.loop = true;
  noiseGain = context.createGain();
  noiseSource.connect(noiseGain);
  noiseGain.connect(master);
  envelope(noiseGain.gain, noiseVolume, now, duration);
  noiseSource.start(now);
  noiseSource.stop(now + duration + 0.1);
};

const play = (btn, hz, base) => {
  if (activeBtn) activeBtn.className = "";
  activeBtn = btn || null;
  if (btn) btn.className = "active";
  stop(true);

  beat = hz;
  carrier = base;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") context.resume();
  if (!master) {
    master = context.createGain();
    master.connect(context.destination);
  }
  master.gain.value = volume;

  const now = context.currentTime;
  const merger = context.createChannelMerger(2);
  oscL = context.createOscillator();
  oscR = context.createOscillator();
  oscL.type = "sine";
  oscR.type = "sine";
  // split the beat around the carrier so the perceived pitch stays put
  oscL.frequency.value = base - hz / 2;
  oscR.frequency.value = base + hz / 2;
  oscL.connect(merger, 0, 0);
  oscR.connect(merger, 0, 1);
  toneGain = context.createGain();
  merger.connect(toneGain);
  toneGain.connect(master);
  envelope(toneGain.gain, PEAK, now, duration);
  oscL.start(now);
  oscR.start(now);
  oscL.stop(now + duration + 0.1);
  oscR.stop(now + duration + 0.1);
  startNoise(now);

  running(true);
};

const stop = (keepButton) => {
  clearTimeout(endTimer);
  clearInterval(tick);
  if (isPlaying && context) {
    const now = context.currentTime;
    [toneGain, noiseGain].forEach((g) => {
      if (!g) return;
      const v = g.gain.value;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(v, now);
      g.gain.linearRampToValueAtTime(0, now + 0.15);
    });
    [oscL, oscR, noiseSource].forEach((n) => n && n.stop(now + 0.2));
  }
  oscL = oscR = noiseSource = null;
  running(false);
  if (!keepButton && activeBtn) {
    activeBtn.className = "";
    activeBtn = null;
  }
};

const running = (on) => {
  isPlaying = on;
  $("header").className = on ? "" : "w-nav";
  $("title").innerHTML = on
    ? `${beat} Hz <small>${bandOf(beat).name}</small>`
    : "Binaural Beats";
  const p = $("progress");
  p.style.transition = "";
  p.style.width = 0;
  $("remain").textContent = "";
  if (!on) return;
  setTimeout(() => {
    p.style.transition = `width ${duration}s linear`;
    p.style.width = "100%";
  }, 0);
  let left = duration;
  $("remain").textContent = mmss(left);
  tick = setInterval(() => {
    left -= 1;
    $("remain").textContent = left > 0 ? mmss(left) : "";
  }, 1000);
  endTimer = setTimeout(() => stop(), duration * 1000 + 300);
};

/* ---------------------------------------------------------------- controls */

const playCustom = (btn) => play(btn, beat, carrier);

const setBeat = (input) => {
  beat = parseFloat(input.value);
  const band = bandOf(beat);
  $("beatVal").textContent = beat.toFixed(1);
  $("beatBand").textContent = band.name + " - " + band.state;
  $("beatBand").style.color = band.color;
  save("beat", beat);
  if (isPlaying && oscL) {
    const now = context.currentTime;
    oscL.frequency.linearRampToValueAtTime(carrier - beat / 2, now + 0.4);
    oscR.frequency.linearRampToValueAtTime(carrier + beat / 2, now + 0.4);
    $("title").innerHTML = `${beat} Hz <small>${band.name}</small>`;
  }
};

const setCarrier = (input) => {
  carrier = parseInt(input.value);
  $("carrierVal").textContent = carrier;
  save("carrier", carrier);
  if (isPlaying && oscL) {
    const now = context.currentTime;
    oscL.frequency.linearRampToValueAtTime(carrier - beat / 2, now + 0.4);
    oscR.frequency.linearRampToValueAtTime(carrier + beat / 2, now + 0.4);
  }
};

const setVolume = (input) => {
  volume = parseInt(input.value) / 100;
  $("volumeVal").textContent = input.value + "%";
  save("volume", input.value);
  if (master) master.gain.value = volume;
};

const setNoiseVolume = (input) => {
  noiseVolume = parseInt(input.value) / 100;
  $("noisevolVal").textContent = input.value + "%";
  save("noisevol", input.value);
  if (noiseGain) noiseGain.gain.value = noiseVolume;
};

const setNoise = (select) => {
  noiseType = select.value;
  save("noise", noiseType);
  if (!isPlaying) return;
  if (noiseSource) {
    noiseSource.stop(context.currentTime + 0.05);
    noiseSource = null;
    noiseGain = null;
  }
  if (noiseType !== "none") {
    // match what is left of the running session
    const now = context.currentTime;
    noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer(noiseType);
    noiseSource.loop = true;
    noiseGain = context.createGain();
    noiseSource.connect(noiseGain);
    noiseGain.connect(master);
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(noiseVolume, now + 1);
    noiseSource.start(now);
  }
};

const setDuration = (select) => {
  duration = parseInt(select.value);
  save("duration", duration);
};

const init = () => {
  const num = (k, d) => (load(k) === null ? d : parseFloat(load(k)));
  duration = num("duration", duration);
  volume = num("volume", volume * 100) / 100;
  noiseVolume = num("noisevol", noiseVolume * 100) / 100;
  noiseType = load("noise") || noiseType;
  carrier = num("carrier", carrier);
  beat = num("beat", beat);

  $("duration").value = duration;
  $("volume").value = Math.round(volume * 100);
  $("noisevol").value = Math.round(noiseVolume * 100);
  $("noise").value = noiseType;
  $("carrier").value = carrier;
  $("beat").value = beat;
  setBeat($("beat"));
  setCarrier($("carrier"));
  setVolume($("volume"));
  setNoiseVolume($("noisevol"));

  // a preset can be handed over from the brainwave chart page
  const q = new URLSearchParams(location.search);
  if (q.has("beat")) {
    $("beat").value = q.get("beat");
    setBeat($("beat"));
    if (q.has("carrier")) {
      $("carrier").value = q.get("carrier");
      setCarrier($("carrier"));
    }
    $("custom").scrollIntoView();
  }
};
