import { appTitle, renderDesktopApp } from './desktop-apps.js';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
const iconClasses = { showcase: 'app-showcase', trail: 'app-trail', escape: 'app-escape', tiles: 'app-tiles', words: 'app-words', credits: 'app-credits' };

export function setupDesktop(display, { audio, onShutdown }) {
  const area = display.querySelector('.desktop-area');
  const layer = display.querySelector('.desktop-windows');
  const tasks = display.querySelector('.task-items');
  const start = display.querySelector('#desktop-start');
  const menu = display.querySelector('#desktop-menu');
  const clock = display.querySelector('#desktop-clock');
  const windows = new Map();
  let order = 1;
  let active = null;

  function bounds() {
    return { width: area.clientWidth, height: area.clientHeight };
  }

  function layOut(record) {
    const { width, height } = bounds();
    if (!width || !height) return;
    const rect = record.rect;
    if (record.maximized) {
      Object.assign(record.panel.style, { left: '6px', top: '6px', width: (width - 12) + 'px', height: (height - 12) + 'px' });
      return;
    }
    rect.width = clamp(rect.width, Math.min(270, width - 14), width - 14);
    rect.height = clamp(rect.height, Math.min(200, height - 14), height - 14);
    rect.x = clamp(rect.x, 7, width - rect.width - 7);
    rect.y = clamp(rect.y, 7, height - rect.height - 7);
    Object.assign(record.panel.style, {
      left: rect.x + 'px', top: rect.y + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
    });
  }

  function activate(record, focus = true) {
    record.panel.hidden = false;
    record.panel.style.zIndex = ++order;
    active = record;
    for (const item of windows.values()) {
      item.panel.classList.toggle('is-active', item === record);
      item.task.setAttribute('aria-pressed', String(item === record));
    }
    if (focus) (record.panel.querySelector('.terminal-input') ?? record.heading).focus({ preventScroll: true });
  }

  function focusRemaining() {
    const remaining = [...windows.values()].filter(record => !record.panel.hidden);
    remaining.sort((a, b) => Number(b.panel.style.zIndex) - Number(a.panel.style.zIndex));
    if (remaining[0]) activate(remaining[0]);
    else active = null;
  }

  function minimize(record) {
    record.panel.hidden = true;
    record.task.setAttribute('aria-pressed', 'false');
    record.panel.classList.remove('is-active');
    if (active === record) {
      focusRemaining();
      if (!active) record.task.focus();
    }
  }

  function close(record) {
    record.dispose?.();
    windows.delete(record.id);
    record.panel.remove();
    record.task.remove();
    if (active !== record) return;
    focusRemaining();
    if (!active) {
      if (record.origin?.isConnected && !record.origin.closest('[hidden]')) record.origin.focus();
      else start.focus();
    }
  }

  function control(text, label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'window-control';
    button.textContent = text;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', action);
    return button;
  }

  function setMenu(open) {
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('button').focus();
  }

  function dragWindow(record, handle, resize) {
    let pointer = null;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || record.maximized || event.target.closest('button') || pointer) return;
      const view = area.getBoundingClientRect();
      if (!view.width || !view.height) return;
      pointer = {
        id: event.pointerId, x: event.clientX, y: event.clientY, rect: { ...record.rect },
        scaleX: area.clientWidth / view.width, scaleY: area.clientHeight / view.height,
      };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
      activate(record, false);
    });
    handle.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer?.id) return;
      const dx = (event.clientX - pointer.x) * pointer.scaleX;
      const dy = (event.clientY - pointer.y) * pointer.scaleY;
      const rect = pointer.rect;
      if (resize) {
        record.rect.width = rect.width + dx;
        record.rect.height = rect.height + dy;
      } else {
        record.rect.x = rect.x + dx;
        record.rect.y = rect.y + dy;
      }
      layOut(record);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      handle.addEventListener(name, event => { if (event.pointerId === pointer?.id) pointer = null; });
    }
  }

  function openApp(id, origin, sound = true) {
    const title = appTitle(id);
    if (!title) return;
    setMenu(false);
    if (sound) audio.play('window');
    if (windows.has(id)) {
      activate(windows.get(id));
      return;
    }

    const panel = document.createElement('section');
    panel.className = 'os-window';
    panel.dataset.appWindow = id;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'app-title-' + id);
    const titlebar = document.createElement('header');
    titlebar.className = 'os-titlebar';
    const heading = document.createElement('h2');
    heading.id = 'app-title-' + id;
    heading.tabIndex = -1;
    heading.textContent = id === 'showcase' ? 'Prashant Sharma - Showcase 2026' : title;
    const icon = document.createElement('span');
    icon.className = 'app-icon title-icon ' + (iconClasses[id] || 'app-showcase');
    icon.setAttribute('aria-hidden', 'true');
    heading.prepend(icon);
    const buttons = document.createElement('div');
    buttons.className = 'os-window-controls';
    const content = document.createElement('div');
    content.className = 'os-window-content';
    const footer = document.createElement('footer');
    footer.className = 'window-statusbar';
    const notice = document.createElement('span');
    notice.textContent = id === 'showcase' ? '© 2026 Prashant Sharma' : 'Ready';
    footer.append(notice, document.createElement('span'));
    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'window-resize';
    resizeHandle.setAttribute('aria-hidden', 'true');
    const task = document.createElement('button');
    task.type = 'button';
    task.className = 'desktop-task';
    task.textContent = title;
    const { width, height } = bounds();
    const size = {
      showcase: [width - (width < 650 ? 14 : 86), height - (width < 650 ? 20 : 79)],
      terminal: [610, 400], sweeper: [405, 485],
      words: [420, 565], tiles: [465, 565], trail: [550, 445], escape: [560, 540],
    }[id] ?? [590, 450];
    const offset = windows.size % 4 * 22;
    const record = { id, panel, task, heading, origin, maximized: false,
      rect: {
        x: (width - size[0]) / 2 + offset,
        y: id === 'showcase' ? (width < 650 ? 7 : 21) : (height - size[1]) / 2 + offset,
        width: size[0], height: size[1],
      } };

    const maximize = control('□', 'Maximize window', () => {
      record.maximized = !record.maximized;
      maximize.textContent = record.maximized ? '▣' : '□';
      const label = record.maximized ? 'Restore window' : 'Maximize window';
      maximize.title = label;
      maximize.setAttribute('aria-label', label);
      resizeHandle.hidden = record.maximized;
      layOut(record);
    });
    buttons.append(control('–', 'Minimize window', () => minimize(record)), maximize,
      control('×', 'Close window', () => close(record)));
    titlebar.append(heading, buttons);
    panel.append(titlebar, content, footer, resizeHandle);
    layer.append(panel);
    tasks.append(task);
    windows.set(id, record);
    layOut(record);
    record.dispose = renderDesktopApp(content, id, openApp, audio);
    for (const link of content.querySelectorAll('a[href^="https:"]:not([target])')) {
      if (link.origin === location.origin) continue;
      link.target = '_blank';
      link.rel = 'noopener';
    }
    dragWindow(record, titlebar, false);
    dragWindow(record, resizeHandle, true);
    panel.addEventListener('pointerdown', () => { if (active !== record) activate(record, false); });
    panel.addEventListener('focusin', () => { if (active !== record) activate(record, false); });
    task.addEventListener('click', () => {
      if (active === record && !record.panel.hidden) minimize(record);
      else activate(record);
    });
    activate(record);
  }

  start.addEventListener('click', () => setMenu(menu.hidden));
  display.querySelector('#desktop-shutdown').addEventListener('click', () => {
    setMenu(false);
    onShutdown();
  });
  display.addEventListener('pointerdown', () => audio.play('mouse-down'));
  display.addEventListener('pointerup', () => audio.play('mouse-up'));
  display.addEventListener('click', event => {
    const app = event.target.closest('[data-app], [data-view]');
    if (app && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
      event.preventDefault();
      openApp(app.dataset.app ?? app.dataset.view, app);
    } else if (!event.target.closest('#desktop-start, #desktop-menu')) setMenu(false);
  });
  display.addEventListener('keydown', event => {
    if (!event.repeat) audio.play('key');
    if (event.key !== 'Escape') return;
    if (!menu.hidden) {
      event.preventDefault();
      setMenu(false);
      start.focus();
    } else if (active && event.target.closest('.os-window')) {
      event.preventDefault();
      close(active);
    }
  });

  function updateClock() {
    clock.textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date());
  }
  updateClock();
  window.setInterval(updateClock, 15000);
  new ResizeObserver(() => { for (const record of windows.values()) layOut(record); }).observe(area);

  return {
    openApp,
    focus() { start.focus({ preventScroll: true }); },
    reset() {
      for (const record of windows.values()) record.dispose?.();
      layer.replaceChildren();
      tasks.replaceChildren();
      windows.clear();
      active = null;
      order = 1;
      setMenu(false);
    },
  };
}
