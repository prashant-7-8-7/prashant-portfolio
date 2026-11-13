import mouthFrames from './greeting-mouth.json';
import { readSaved, saveState } from './browser-storage.js';

const soundURL = file => import.meta.env.BASE_URL + 'sound/' + file + '.mp3';
const preference = 'ps-workspace-sound';
const tracks = [
  { file: 'night-shift', title: 'Night Shift' },
  { file: 'first-light', title: 'First Light' },
];

export function createWorkspaceAudio(greeting, onGreetingChange) {
  const radio = new Audio();
  radio.loop = true;
  radio.preload = 'none';
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  let enabled = readSaved(preference, true) === true;
  let activated = false;
  let context, master, office, noise, fanLevel;
  let powered = false;
  let inside = false;
  let trackIndex = 0;
  let tuning = 0;
  const soundListeners = new Set();

  function refreshMix() {
    greeting.muted = !enabled;
    radio.volume = inside ? .23 : .37;
    radio.muted = !enabled || !activated;
    if (!context) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(enabled && activated ? .68 : 0, now, .03);
    office.frequency.setTargetAtTime(inside ? 265 : 980, now, .24);
    fanLevel.gain.setTargetAtTime(powered ? (inside ? .038 : .017) : 0, now, .18);
  }

  function unlock() {
    activated = true;
    if (AudioContextClass && !context) {
      try {
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        let filtered = 0;
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          filtered = filtered * .87 + (Math.random() * 2 - 1) * .13;
          samples[i] = filtered * Math.min(1, i / 480, (samples.length - 1 - i) / 480);
        }
        const roomNoise = context.createBufferSource();
        roomNoise.buffer = noise;
        roomNoise.loop = true;
        office = context.createBiquadFilter();
        office.type = 'lowpass';
        const roomLevel = context.createGain();
        roomLevel.gain.value = .081;
        roomNoise.connect(office).connect(roomLevel).connect(master);
        roomNoise.start();

        const fan = context.createOscillator();
        const fanFilter = context.createBiquadFilter();
        fanLevel = context.createGain();
        fanLevel.gain.value = 0;
        fan.type = 'triangle';
        fan.frequency.value = 59;
        fanFilter.type = 'lowpass';
        fanFilter.frequency.value = 175;
        fan.connect(fanFilter).connect(fanLevel).connect(master);
        fan.start();
      } catch {
        context = undefined;
      }
    }
    if (context?.state !== 'running') context?.resume().catch(() => {});
    refreshMix();
  }

  function tone(frequency, duration, volume, wait = 0, type = 'sine') {
    const start = context.currentTime + wait;
    const oscillator = context.createOscillator();
    const level = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    level.gain.setValueAtTime(.0001, start);
    level.gain.exponentialRampToValueAtTime(volume, start + .014);
    level.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(level).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + .015);
  }

  function tick(frequency, volume, side) {
    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const level = context.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .78;
    level.gain.setValueAtTime(volume, now);
    level.gain.exponentialRampToValueAtTime(.0001, now + .067);
    source.connect(filter).connect(level);
    if (context.createStereoPanner) {
      const pan = context.createStereoPanner();
      pan.pan.value = side;
      level.connect(pan).connect(master);
    } else level.connect(master);
    source.start(now, .08 + Math.random() * 2.5, .08);
  }

  const chimes = {
    boot: [[196,.3,.064,0], [293.66,.36,.059,.085]],
    ready: [[261.63,.65,.079,0], [392,.66,.056,.09], [523.25,.84,.06,.20], [659.25,.7,.029,.30]],
    shutdown: [[523.25,.26,.05,0], [392,.28,.041,.1], [261.63,.41,.052,.2]],
    window: [[520,.12,.031,0], [740,.105,.019,.055]],
    radio: [[326,.12,.048,0], [482,.11,.026,.04]],
  };

  function play(kind) {
    if (!enabled || !context || !activated || context.state === 'closed') return;
    if (kind === 'key') tick(1500 + Math.random() * 980, .67, -.16);
    else if (kind === 'mouse-down') tick(2320, .53, .24);
    else if (kind === 'mouse-up') tick(3380, .29, .24);
    else for (const note of chimes[kind] ?? []) tone(...note, 'triangle');
  }

  function setEnabled(value) {
    enabled = value;
    saveState(preference, value);
    if (enabled) unlock();
    else {
      tuning++;
      radio.pause();
      greeting.pause();
      refreshMix();
    }
    for (const listener of soundListeners) listener(enabled);
    return enabled;
  }

  function sayHello() {
    radio.pause();
    setEnabled(true);
    greeting.currentTime = 0;
    return greeting.play().then(() => true).catch(() => false);
  }

  for (const name of ['play', 'pause', 'ended']) greeting.addEventListener(name, () => onGreetingChange(!greeting.paused && !greeting.ended));

  function setComputer(value, focused = inside) {
    powered = value;
    inside = focused;
    refreshMix();
  }

  async function tune(step = 0) {
    const request = ++tuning;
    greeting.pause();
    if (step || !radio.src) {
      trackIndex = (trackIndex + step + tracks.length) % tracks.length;
      radio.src = soundURL(tracks[trackIndex].file);
    } else if (!radio.paused) {
      radio.pause();
      return;
    }
    setEnabled(true);
    try {
      await radio.play();
      if (request === tuning) play('radio');
    } catch {
      if (request === tuning) radio.pause();
    }
  }

  function subscribeRadio(listener) {
    const notify = () => listener(tracks[trackIndex].title, !radio.paused);
    radio.addEventListener('play', notify);
    radio.addEventListener('pause', notify);
    radio.addEventListener('loadstart', notify);
    notify();
    return () => {
      radio.removeEventListener('play', notify);
      radio.removeEventListener('pause', notify);
      radio.removeEventListener('loadstart', notify);
    };
  }

  return {
    unlock, play, setEnabled, sayHello, setComputer, tune, subscribeRadio,
    onSoundChange(listener) { soundListeners.add(listener); },
    get enabled() { return enabled; },
    stopGreeting() { greeting.pause(); },
    mouth() {
      if (greeting.paused || greeting.ended) return null;
      return mouthFrames[Math.floor(greeting.currentTime * 30)] ?? 0;
    },
  };
}
