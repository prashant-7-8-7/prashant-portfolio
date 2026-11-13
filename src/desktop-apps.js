import { portfolioViewTitle, renderPortfolioView } from './portfolio-views.js';
import { renderEscape, renderTrail, renderWordGuess, renderWordTiles } from './desktop-games.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const games = {
  sweeper: { title: 'Signal Sweeper', description: 'Clear a field of hidden hazards.', render: renderSweeper },
  words: { title: 'Word Guess', description: 'Guess a five-letter AI or software term.', render: renderWordGuess },
  tiles: { title: 'Word Tiles', description: 'Build words from a rack of letters.', render: renderWordTiles },
  trail: { title: 'Field Expedition', description: 'Manage supplies on the way to an observation post.', render: renderTrail },
  escape: { title: 'Server Room Escape', description: 'Find the key in a first-person maze.', render: renderEscape },
};

const customTitles = {
  showcase: 'My Showcase', terminal: 'Terminal', games: 'Games', radio: 'Radio', credits: 'Credits',
};

export function appTitle(id) {
  if (Object.hasOwn(games, id)) return games[id].title;
  return Object.hasOwn(customTitles, id) ? customTitles[id] : portfolioViewTitle(id);
}

function renderShowcase(container, audio) {
  container.classList.add('showcase-app');
  const frame = element('iframe', '', 'showcase-browser');
  frame.title = 'Prashant Sharma’s portfolio';
  frame.src = './portfolio/?inside=desktop';
  frame.addEventListener('load', () => {
    const page = frame.contentDocument;
    if (!page) return;
    page.addEventListener('pointerdown', () => { if (audio.enabled) audio.unlock(); }, { once: true });
    page.addEventListener('keydown', () => { if (audio.enabled) audio.unlock(); }, { once: true });
    page.addEventListener('pointerdown', () => audio.play('mouse-down'));
    page.addEventListener('pointerup', () => audio.play('mouse-up'));
    page.addEventListener('keydown', event => {
      if (!event.repeat) audio.play('key');
    });
  });
  container.append(frame);
}

function renderTerminal(container, openApp) {
  container.classList.add('terminal-app');
  const output = element('div', '', 'terminal-output');
  output.setAttribute('role', 'log');
  const form = element('form', '', 'terminal-input-row');
  const label = element('label', 'portfolio:~ $', 'terminal-prompt');
  const input = element('input', '', 'terminal-input');
  label.htmlFor = 'desktop-command';
  input.id = 'desktop-command';
  input.type = 'text';
  input.maxLength = 120;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Terminal command');
  form.append(label, input);
  container.append(output, form);

  const history = [];
  let cursor = 0;
  const print = (line, style) => {
    output.append(element('p', line, style));
    if (output.children.length > 120) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  };
  print('Prashant Sharma · Portfolio terminal');
  print('Type help to see commands.');

  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;
    input.value = '';
    history.push(command);
    cursor = history.length;
    print('portfolio:~ $ ' + command, 'terminal-echo');
    const [verb, ...args] = command.toLowerCase().split(/\s+/);
    const subject = args.join(' ');

    if (verb === 'help') {
      print('help · ls · whoami · open <app> · clear');
      print('Try open projects, open research, open verifier, or open games.');
    } else if (verb === 'ls') {
      print('showcase  projects  research  gridpulse  workspace  railsetu  verifier  about  contact  games  radio  credits');
      print(Object.keys(games).join('  '));
    } else if (verb === 'whoami' || (verb === 'cat' && subject === 'about')) {
      print('Prashant Sharma · AI & ML undergraduate at MITS Gwalior.');
    } else if (verb === 'clear') {
      output.replaceChildren();
    } else if (verb === 'open' && appTitle(subject)) {
      print('Opening ' + appTitle(subject) + '…');
      openApp(subject, input);
    } else {
      print('Unknown command. Type help.');
    }
  });

  input.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    cursor = Math.max(0, Math.min(history.length, cursor + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[cursor] ?? '';
  });
}

function renderSweeper(container) {
  const side = 8;
  const mineCount = 10;
  const cells = Array.from({ length: side * side }, () => ({ mine: false, opened: false, flag: false, count: 0 }));
  const description = element('p', 'Clear safe tiles and flag the 10 hazards. Right-click a tile or turn on Flag mode.', 'sweeper-description');
  const toolbar = element('div', '', 'sweeper-toolbar');
  const reset = element('button', 'Restart', 'desktop-control');
  const flagMode = element('button', 'Flag mode', 'desktop-control');
  reset.type = flagMode.type = 'button';
  flagMode.setAttribute('aria-pressed', 'false');
  const status = element('p', '', 'sweeper-status');
  status.setAttribute('role', 'status');
  const grid = element('div', '', 'sweeper-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Signal Sweeper board');
  toolbar.append(reset, flagMode);
  container.append(description, toolbar, status, grid);

  let started = false;
  let finished = false;
  let flagging = false;
  let opened = 0;
  let flagged = 0;
  const buttons = [];

  function neighbors(index) {
    const row = Math.floor(index / side);
    const col = index % side;
    const result = [];
    for (let y = Math.max(0, row - 1); y <= Math.min(side - 1, row + 1); y++) {
      for (let x = Math.max(0, col - 1); x <= Math.min(side - 1, col + 1); x++) {
        const tile = y * side + x;
        if (tile !== index) result.push(tile);
      }
    }
    return result;
  }

  function seed(first) {
    const safe = new Set([first, ...neighbors(first)]);
    const choices = cells.map((_, index) => index).filter(index => !safe.has(index));
    for (let i = 0; i < mineCount; i++) {
      const choice = Math.floor(Math.random() * choices.length);
      cells[choices.splice(choice, 1)[0]].mine = true;
    }
    cells.forEach((cell, index) => { cell.count = neighbors(index).filter(tile => cells[tile].mine).length; });
    started = true;
  }

  function paint() {
    cells.forEach((cell, index) => {
      const showMine = finished && cell.mine;
      const button = buttons[index];
      button.textContent = showMine ? '×' : cell.flag ? 'F' : cell.opened && cell.count ? String(cell.count) : '';
      button.dataset.state = showMine ? 'mine' : cell.flag ? 'flag' : cell.opened ? 'open' : 'closed';
      button.setAttribute('aria-label', 'Row ' + (Math.floor(index / side) + 1) + ', column ' + (index % side + 1) +
        (showMine ? ', hazard' : cell.flag ? ', flagged' : cell.opened ? ', ' + cell.count + ' adjacent hazards' : ', hidden'));
    });
    status.textContent = finished
      ? opened === cells.length - mineCount ? 'All safe tiles cleared.' : 'You hit a hazard. Restart to try again.'
      : flagged + '/' + mineCount + ' flagged';
  }

  function act(index, flag) {
    const cell = cells[index];
    if (finished || cell.opened) return;
    if (flag) {
      cell.flag = !cell.flag;
      flagged += cell.flag ? 1 : -1;
    } else if (!cell.flag) {
      if (!started) seed(index);
      if (cell.mine) finished = true;
      else {
        const queue = [index];
        for (let i = 0; i < queue.length; i++) {
          const tile = cells[queue[i]];
          if (tile.opened || tile.flag || tile.mine) continue;
          tile.opened = true;
          opened++;
          if (tile.count === 0) queue.push(...neighbors(queue[i]));
        }
        finished = opened === cells.length - mineCount;
      }
    }
    paint();
  }

  cells.forEach((_, index) => {
    const button = element('button', '', 'sweeper-tile');
    button.type = 'button';
    button.tabIndex = index ? -1 : 0;
    button.addEventListener('click', () => act(index, flagging));
    button.addEventListener('contextmenu', event => { event.preventDefault(); act(index, true); });
    button.addEventListener('focus', () => { buttons.forEach(tile => { tile.tabIndex = tile === button ? 0 : -1; }); });
    button.addEventListener('keydown', event => {
      const directions = { ArrowUp: -side, ArrowDown: side, ArrowLeft: -1, ArrowRight: 1 };
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); act(index, true); }
      if (!Object.hasOwn(directions, event.key)) return;
      event.preventDefault();
      buttons[(index + directions[event.key] + cells.length) % cells.length].focus();
    });
    grid.append(button);
    buttons.push(button);
  });

  flagMode.addEventListener('click', () => {
    flagging = !flagging;
    flagMode.setAttribute('aria-pressed', String(flagging));
  });
  reset.addEventListener('click', () => {
    for (const cell of cells) Object.assign(cell, { mine: false, opened: false, flag: false, count: 0 });
    started = finished = false;
    opened = flagged = 0;
    paint();
  });
  paint();
}

function renderGames(container) {
  const list = element('div', '', 'window-projects');
  for (const [id, game] of Object.entries(games)) {
    const button = element('button', '', 'window-project');
    button.type = 'button';
    button.dataset.app = id;
    button.append(element('strong', game.title), element('span', game.description));
    list.append(button);
  }
  container.append(list);
}

function renderRadio(container, audio) {
  const track = element('p', '', 'radio-track');
  track.setAttribute('role', 'status');
  const controls = element('div', '', 'arcade-actions');
  const toggle = element('button', 'Play', 'desktop-control');
  for (const [label, step] of [['Previous track', -1], ['Next track', 1]]) {
    const button = element('button', label, 'desktop-control');
    button.type = 'button';
    button.addEventListener('click', () => audio.tune(step));
    controls.append(button);
  }
  toggle.type = 'button';
  toggle.addEventListener('click', () => audio.tune());
  controls.insertBefore(toggle, controls.lastChild);
  container.append(element('p', 'Workbench radio', 'eyebrow'), track, controls);
  return audio.subscribeRadio((title, playing) => {
    track.textContent = title;
    toggle.textContent = playing ? 'Pause' : 'Play';
  });
}

function renderCredits(container) {
  container.append(element('p', 'Built around Prashant Sharma’s AI and ML projects.', 'project-lead'));
  for (const [title, url, description] of [
    ['David Heckhoff', 'https://david-hckh.com/', 'Animated developer and workbench'],
    ['Henry Heffernan', 'https://henryheffernan.com/', 'Retro computer, windowed desktop, games, and sound design'],
  ]) {
    const row = element('p', '', 'detail-section');
    const link = element('a', title, 'text-link');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    row.append(description + ' · ', link);
    container.append(row);
  }
  container.append(element('p', 'The models, sound effects, music, and games were made for this workspace. The introduction uses a synthetic voice.', 'detail-section'));
}

export function renderDesktopApp(container, id, openApp, audio) {
  if (id === 'showcase') renderShowcase(container, audio);
  else if (id === 'terminal') renderTerminal(container, openApp);
  else if (id === 'games') renderGames(container);
  else if (id === 'credits') renderCredits(container);
  else if (id === 'radio') return renderRadio(container, audio);
  else if (Object.hasOwn(games, id)) games[id].render(container);
  else renderPortfolioView(container, id, { desktop: true });
}
