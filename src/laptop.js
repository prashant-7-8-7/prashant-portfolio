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
const enter = document.querySelector('#power-on');
const computer = document.querySelector('#enter-monitor');
const voice = document.querySelector('#greeting-play');
const greeting = document.querySelector('#greeting-audio');
const sound = document.querySelector('#workspace-sound');
const traySound = document.querySelector('#desktop-mute');
const lookAround = document.querySelector('#view-room');
const freeCamera = document.querySelector('#free-camera');
const expand = document.querySelector('#expand-desktop');
const skip = document.querySelector('#skip-boot');
const motionToggle = document.querySelector('#room-motion');
const shutdownDialog = document.querySelector('#shutdown-dialog');
const help = document.querySelector('#room-help');
const status = document.querySelector('#room-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const narrowViewport = window.matchMedia('(max-width: 680px)');
const aliases = { work: 'projects', 'document-workspace': 'workspace' };
const requested = location.hash.slice(1);
const entry = Object.hasOwn(aliases, requested) ? aliases[requested] : requested;
let nextApp = appTitle(entry) ? entry : undefined;
let room;
let view = 'intro';
let phase = 'off';
let expanded = false;
let motion = !reducedMotion.matches;
let bootTimer = 0;
let greetingRequested = false;

const audio = createWorkspaceAudio(greeting, playing => {
  voice.textContent = playing ? 'Pause greeting' : 'Hear greeting';
  if (playing) room?.wave();
});
const apps = setupDesktop(display, { audio, onShutdown: confirmShutdown });

function updateSound() {
  sound.textContent = audio.enabled ? 'Sound on' : 'Sound off';
  sound.setAttribute('aria-pressed', String(audio.enabled));
  const label = audio.enabled ? 'Mute sound' : 'Enable sound';
  traySound.title = label;
  traySound.setAttribute('aria-label', label);
  traySound.textContent = audio.enabled ? '♪' : '×';
}

function setExpanded(value) {
  expanded = value;
  stage.classList.toggle('is-expanded', value);
  room?.expand(value);
  expand.textContent = value ? 'Fit to monitor' : 'Expand screen';
  expand.setAttribute('aria-pressed', String(value));
}

function updateView(next, immediate = false) {
  view = next;
  stage.dataset.view = view;
  const inRoom = view !== 'monitor';
  room?.setView(view, immediate);
  if (inRoom) setExpanded(false);
  greetingPanel.hidden = view !== 'intro';
  computer.hidden = view !== 'desk' && view !== 'orbit';
  help.hidden = computer.hidden;
  freeCamera.hidden = !room || view === 'intro' || view === 'monitor';
  freeCamera.textContent = view === 'orbit' ? 'Desk view' : 'Free camera';
  freeCamera.setAttribute('aria-pressed', String(view === 'orbit'));
  lookAround.hidden = inRoom;
  expand.hidden = !room || inRoom || phase !== 'desktop';
  display.hidden = phase === 'off' || view === 'intro';
  display.inert = inRoom || phase !== 'desktop';
  audio.setComputer(phase !== 'off' && phase !== 'shutdown', !inRoom);
}

function finishBoot() {
  if (phase !== 'booting') return;
  clearTimeout(bootTimer);
  phase = 'desktop';
  bootScreen.hidden = true;
  desktop.hidden = false;
  skip.hidden = true;
  updateView('monitor');
  const route = nextApp || 'desktop';
  history.replaceState(history.state, '', '#' + route);
  status.textContent = 'Workspace ready.';
  apps.openApp(nextApp || 'showcase', null, false);
  nextApp = undefined;
  audio.play('ready');
}

function openComputer({ immediate = false, userAction = false } = {}) {
  if (view === 'monitor') return;
  if (userAction && audio.enabled) audio.unlock();
  audio.stopGreeting();
  const wasRunning = phase === 'desktop';
  if (!wasRunning) {
    phase = 'booting';
    desktop.hidden = true;
    bootScreen.hidden = false;
    bootHeading.textContent = 'PRASHANT WORKSPACE BIOS';
    bootLog.replaceChildren();
    room?.setPower(true);
  }
  updateView('monitor', immediate);
  setExpanded(!room || narrowViewport.matches);
  if (wasRunning) {
    apps.focus();
    status.textContent = 'Computer view.';
    return;
  }
  status.textContent = 'Starting the computer.';
  if (immediate || !motion) {
    finishBoot();
    return;
  }
  audio.play('boot');
  const lines = [
    'Checking display ........ OK',
    'Checking memory ......... OK',
    'Mounting project files .. 4 found',
    'Starting desktop ........',
  ];
  skip.hidden = false;
  skip.focus({ preventScroll: true });
  let index = 0;
  function printLine() {
    if (index === lines.length) {
      finishBoot();
      return;
    }
    const line = document.createElement('p');
    line.textContent = lines[index++];
    bootLog.append(line);
    audio.play('key');
    bootTimer = window.setTimeout(printLine, 285);
  }
  printLine();
}

function enterWorkspace() {
  if (audio.enabled) audio.unlock();
  audio.stopGreeting();
  if (!room || narrowViewport.matches) {
    openComputer({ userAction: true });
  } else {
    updateView('desk');
    status.textContent = 'Workspace entered.';
    computer.focus({ preventScroll: true });
  }
}

function showDesk() {
  if (phase === 'shutdown') return;
  if (phase === 'booting') finishBoot();
  updateView('desk');
  status.textContent = 'Desk view.';
  computer.focus({ preventScroll: true });
}

function confirmShutdown() {
  shutdownDialog.returnValue = '';
  shutdownDialog.showModal();
}

function shutDown() {
  if (phase !== 'desktop') return;
  phase = 'shutdown';
  display.inert = true;
  audio.play('shutdown');
  audio.setComputer(false);
  room?.setPower(false);
  apps.reset();
  desktop.hidden = true;
  lookAround.hidden = true;
  expand.hidden = true;
  bootHeading.textContent = 'It is now safe to turn off your computer.';
  bootLog.replaceChildren();
  bootScreen.hidden = false;

  function returnToIntro() {
    phase = 'off';
    history.replaceState(history.state, '', location.pathname + location.search);
    updateView('intro');
    status.textContent = 'Computer shut down.';
    enter.focus({ preventScroll: true });
  }
  if (motion) bootTimer = window.setTimeout(returnToIntro, 710);
  else returnToIntro();
}

function useFallback() {
  room = null;
  host.replaceChildren();
  stage.classList.remove('is-rendered');
  freeCamera.hidden = true;
  motionToggle.hidden = true;
  expand.hidden = true;
  help.textContent = 'Open the computer to browse the portfolio.';
  if (view === 'monitor') setExpanded(true);
}

function setMotion(value) {
  motion = value;
  room?.setMotion(value);
  motionToggle.textContent = value ? 'Pause motion' : 'Resume motion';
  motionToggle.setAttribute('aria-pressed', String(!value));
  if (!value && phase === 'booting') finishBoot();
}

function toggleSound() {
  audio.setEnabled(!audio.enabled);
}

for (const control of [enter, voice, sound]) control.hidden = false;
updateSound();
audio.onSoundChange(updateSound);
enter.addEventListener('click', enterWorkspace);
computer.addEventListener('click', () => openComputer({ userAction: true }));
voice.addEventListener('click', async () => {
  greetingRequested = true;
  if (!greeting.paused) audio.stopGreeting();
  else if (!await audio.sayHello()) status.textContent = 'The greeting audio is unavailable. Its text is shown above.';
});
sound.addEventListener('click', toggleSound);
traySound.addEventListener('click', toggleSound);
document.addEventListener('pointerdown', () => { if (audio.enabled) audio.unlock(); }, { capture: true, once: true });
document.addEventListener('keydown', () => { if (audio.enabled) audio.unlock(); }, { capture: true, once: true });
greeting.addEventListener('error', () => {
  voice.disabled = true;
  voice.textContent = 'Greeting audio unavailable';
});
lookAround.addEventListener('click', showDesk);
freeCamera.addEventListener('click', () => updateView(view === 'orbit' ? 'desk' : 'orbit'));
expand.addEventListener('click', () => setExpanded(!expanded));
skip.addEventListener('click', finishBoot);
motionToggle.addEventListener('click', () => setMotion(!motion));
reducedMotion.addEventListener('change', event => setMotion(!event.matches));
narrowViewport.addEventListener('change', event => {
  if (event.matches && view === 'monitor') setExpanded(true);
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && view === 'monitor' && !event.defaultPrevented && !shutdownDialog.open) showDesk();
});
shutdownDialog.addEventListener('close', () => {
  if (shutdownDialog.returnValue === 'shutdown') shutDown();
  else apps.focus();
});

async function loadRoom() {
  try {
    const { createRoomScene } = await import('./room-scene.js');
    room = await createRoomScene({
      stage: viewport, host, display, reducedMotion: !motion,
      onPower: () => openComputer({ userAction: true }),
      onRadio: () => audio.tune(),
      onOrbit: () => updateView('orbit'),
      onLost: useFallback,
      mouth: audio.mouth,
    });
    stage.classList.add('is-rendered');
    room.setView(view, true);
    room.setPower(phase === 'desktop' || phase === 'booting');
    if (view === 'monitor' && !narrowViewport.matches) setExpanded(false);
    motionToggle.hidden = false;
    updateView(view, true);
    setMotion(motion);
  } catch (error) {
    useFallback();
    console.warn('Workspace scene:', error);
  }
}

loadRoom().then(() => {
  if (entry === 'desktop' || nextApp) openComputer({ immediate: true });
  else if (view === 'intro' && audio.enabled && !greetingRequested) greeting.play().catch(() => {});
});

