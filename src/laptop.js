import { setupDesktop } from './desktop-windows.js';
import { appTitle } from './desktop-apps.js';
import { createWorkspaceAudio } from './workspace-audio.js';

const stage = document.querySelector('#room-stage');
const viewport = document.querySelector('#room-viewport');
const host = document.querySelector('#room-canvas');
const display = document.querySelector('#computer-display');
const desktop = document.querySelector('#portfolio-desktop');
const bootScreen = document.querySelector('#boot-screen');
const bootHeading = document.querySelector('#boot-heading');
const bootLog = document.querySelector('#boot-log');
const greetingPanel = document.querySelector('#room-power-panel');
const power = document.querySelector('#power-on');
const powerLabel = document.querySelector('#power-label');
const voice = document.querySelector('#greeting-play');
const greeting = document.querySelector('#greeting-audio');
const sound = document.querySelector('#workspace-sound');
const viewRoom = document.querySelector('#view-room');
const expand = document.querySelector('#expand-desktop');
const skip = document.querySelector('#skip-boot');
const motionToggle = document.querySelector('#room-motion');
const shutdownDialog = document.querySelector('#shutdown-dialog');
const help = document.querySelector('#room-help');
const status = document.querySelector('#room-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const audio = createWorkspaceAudio(greeting, playing => {
  voice.textContent = playing ? 'Pause greeting' : 'Hear greeting';
  greetingPanel.classList.toggle('is-speaking', playing);
  if (playing) room?.wave();
});
const apps = setupDesktop(display, { audio, onShutdown: confirmShutdown });
const openingViews = {
  work: 'projects', 'document-workspace': 'workspace',
};
const requested = location.hash.slice(1);
const entry = Object.hasOwn(openingViews, requested) ? openingViews[requested] : requested;
let pendingApp = appTitle(entry) ? entry : undefined;

let room;
let phase = 'room';
let expanded = false;
let motion = !reducedMotion.matches;
let bootTimer = 0;
let started = false;
let initializedDesktop = false;
let bootApp;
let greetingRequested = false;

function updateSound() {
  sound.textContent = audio.enabled ? 'Sound on' : 'Sound off';
  sound.setAttribute('aria-pressed', String(audio.enabled));
}

function setExpanded(value) {
  expanded = value;
  stage.classList.toggle('is-expanded', value);
  room?.expand(value);
  expand.textContent = value ? 'Fit to monitor' : 'Expand screen';
  expand.setAttribute('aria-pressed', String(value));
}

function finishBoot() {
  if (phase !== 'booting') return;
  clearTimeout(bootTimer);
  phase = 'desktop';
  started = true;
  bootScreen.hidden = true;
  desktop.hidden = false;
  skip.hidden = true;
  expand.hidden = !room;
  if (!room || viewport.clientWidth < 670) setExpanded(true);
  const route = bootApp || 'desktop';
  if (location.hash !== '#' + route) history.replaceState(history.state, '', '#' + route);
  help.textContent = 'Open an app from Start. Drag a title bar to move a window.';
  status.textContent = 'Workspace ready.';
  if (!initializedDesktop || bootApp) {
    initializedDesktop = true;
    apps.openApp(bootApp || 'showcase', null, false);
  } else apps.focus();
  bootApp = undefined;
}

function enterWorkspace({ immediate = false, userAction = false } = {}) {
  if (phase !== 'room') return;
  phase = 'booting';
  bootApp = pendingApp;
  pendingApp = undefined;
  if (userAction && audio.enabled) audio.unlock();
  audio.stopGreeting();
  audio.setComputer(true, true);
  greetingPanel.hidden = true;
  display.hidden = false;
  viewRoom.hidden = !room;
  desktop.hidden = true;
  bootScreen.hidden = false;
  bootHeading.textContent = 'WORKSPACE SYSTEM';
  bootLog.replaceChildren();
  room?.focusScreen(true, immediate);
  setExpanded(!room || viewport.clientWidth < 670);
  status.textContent = 'Starting the workspace computer.';

  const wasRunning = started;
  if (wasRunning || immediate || !motion) {
    finishBoot();
    if (!wasRunning && userAction) audio.play('ready');
    return;
  }

  audio.play('boot');
  const lines = [
    'Checking display… ready',
    'Mounting project files… 4 found',
    'Starting desktop applications… ready',
    'Opening My Showcase',
  ];
  let bootIndex = 0;
  skip.hidden = false;
  skip.focus({ preventScroll: true });
  function nextLine() {
    if (bootIndex === lines.length) {
      finishBoot();
      audio.play('ready');
      return;
    }
    const line = document.createElement('p');
    line.textContent = lines[bootIndex++];
    bootLog.append(line);
    audio.play('key');
    bootTimer = window.setTimeout(nextLine, 305);
  }
  nextLine();
}

function showRoom() {
  clearTimeout(bootTimer);
  phase = 'room';
  display.hidden = true;
  greetingPanel.hidden = false;
  viewRoom.hidden = true;
  expand.hidden = true;
  skip.hidden = true;
  setExpanded(false);
  room?.focusScreen(false);
  audio.setComputer(started, false);
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  powerLabel.textContent = started ? 'Resume workspace' : 'Enter workspace';
  help.textContent = room ? 'Click the monitor to enter. Drag to look around.' : 'Enter the workspace to explore projects and demos.';
  status.textContent = 'Room view.';
  power.focus({ preventScroll: true });
}

function confirmShutdown() {
  shutdownDialog.returnValue = '';
  shutdownDialog.showModal();
}

function shutDown() {
  if (phase !== 'desktop') return;
  phase = 'shutdown';
  audio.play('shutdown');
  audio.setComputer(false);
  apps.reset();
  initializedDesktop = false;
  started = false;
  desktop.hidden = true;
  expand.hidden = true;
  viewRoom.hidden = true;
  bootHeading.textContent = 'WORKSPACE POWERED OFF';
  bootLog.replaceChildren();
  bootScreen.hidden = false;
  if (motion) bootTimer = window.setTimeout(showRoom, 630);
  else showRoom();
}

function useFallback() {
  room = null;
  host.replaceChildren();
  stage.classList.remove('is-rendered');
  motionToggle.hidden = true;
  viewRoom.hidden = phase !== 'desktop';
  expand.hidden = true;
  help.textContent = 'Enter the workspace to explore projects and demos.';
  if (phase === 'booting') finishBoot();
  if (phase === 'desktop') setExpanded(true);
}

function setMotion(value) {
  motion = value;
  room?.setMotion(value);
  motionToggle.textContent = value ? 'Pause motion' : 'Resume motion';
  motionToggle.setAttribute('aria-pressed', String(!value));
  if (!value && phase === 'booting') {
    finishBoot();
    audio.play('ready');
  }
  if (!value && phase === 'shutdown') showRoom();
}

for (const control of [power, voice, sound]) control.hidden = false;
updateSound();
power.addEventListener('click', () => enterWorkspace({ userAction: true }));
voice.addEventListener('click', async () => {
  greetingRequested = true;
  if (!greeting.paused) audio.stopGreeting();
  else if (!await audio.sayHello()) status.textContent = 'The greeting audio is unavailable. The transcript is shown above.';
  updateSound();
});
sound.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  updateSound();
});
document.addEventListener('pointerdown', () => { if (audio.enabled) audio.unlock(); }, { capture: true, once: true });
document.addEventListener('keydown', () => { if (audio.enabled) audio.unlock(); }, { capture: true, once: true });
audio.onSoundChange(updateSound);
greeting.addEventListener('error', () => {
  voice.disabled = true;
  voice.textContent = 'Greeting audio unavailable';
});
viewRoom.addEventListener('click', showRoom);
expand.addEventListener('click', () => setExpanded(!expanded));
skip.addEventListener('click', () => { finishBoot(); audio.play('ready'); });
motionToggle.addEventListener('click', () => setMotion(!motion));
reducedMotion.addEventListener('change', event => setMotion(!event.matches));
shutdownDialog.addEventListener('close', () => {
  if (shutdownDialog.returnValue === 'shutdown') shutDown();
  else apps.focus();
});

async function loadRoom() {
  try {
    const { createRoomScene } = await import('./room-scene.js');
    room = await createRoomScene({
      stage: viewport, host, display, reducedMotion: !motion,
      onPower: () => enterWorkspace({ userAction: true }),
      onRadio: () => audio.tune(),
      onLost: useFallback,
      mouth: audio.mouth,
    });
    stage.classList.add('is-rendered');
    room.focusScreen(phase !== 'room');
    if (phase === 'booting' && viewport.clientWidth >= 670) setExpanded(false);
    else room.expand(expanded);
    if (phase !== 'room') {
      viewRoom.hidden = false;
      expand.hidden = phase !== 'desktop';
    }
    motionToggle.hidden = false;
    setMotion(motion);
  } catch (error) {
    useFallback();
    console.warn('Workspace scene:', error);
  }
}

if (entry === 'desktop' || pendingApp) {
  loadRoom().then(() => enterWorkspace({ immediate: true }));
} else {
  loadRoom().then(() => {
    if (phase === 'room' && audio.enabled && !greetingRequested) {
      greeting.play().catch(() => {});
    }
  });
}

