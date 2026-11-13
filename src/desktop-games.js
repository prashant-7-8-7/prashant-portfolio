function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label, action) {
  const control = element('button', label, 'desktop-control');
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

function toolbar(container, controls) {
  const row = element('div', '', 'arcade-actions');
  for (const [label, action] of controls) row.append(button(label, action));
  container.append(row);
}

function statusLine(container) {
  const status = element('p', '', 'arcade-status');
  status.setAttribute('role', 'status');
  container.append(status);
  return status;
}

const words = [
  ['model', 'A system trained to make predictions.'],
  ['token', 'A unit of text a language model processes.'],
  ['train', 'What you do to fit a model to data.'],
  ['query', 'A request sent to a database or retrieval system.'],
  ['label', 'A known answer used in supervised learning.'],
  ['epoch', 'One complete pass through the training data.'],
];

export function renderWordGuess(container) {
  container.append(element('p', 'Guess a five-letter AI or software term in six tries.', 'arcade-intro'));
  const status = statusLine(container);
  const board = element('ol', '', 'word-board');
  board.setAttribute('aria-label', 'Guesses');
  const hint = element('p', '', 'arcade-intro');
  hint.hidden = true;
  const form = element('form', '', 'arcade-form');
  const input = element('input');
  input.maxLength = 5;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Five-letter guess');
  const submit = element('button', 'Guess', 'desktop-control');
  submit.type = 'submit';
  form.append(input, submit);
  let index = -1;

  function reset() {
    index = (index + 1) % words.length;
    board.replaceChildren();
    input.disabled = submit.disabled = false;
    input.value = '';
    hint.textContent = words[index][1];
    hint.hidden = true;
    status.textContent = 'Six guesses left.';
  }

  toolbar(container, [['Show clue', () => { hint.hidden = !hint.hidden; }], ['New word', reset]]);
  container.append(hint, board, form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const guess = input.value.trim().toLowerCase();
    if (!/^[a-z]{5}$/.test(guess)) {
      status.textContent = 'Enter five letters.';
      return;
    }
    const [answer] = words[index];
    const states = [...guess].map((letter, position) => letter === answer[position] ? 'correct' : 'absent');
    const unused = [...answer].filter((_, position) => states[position] !== 'correct');
    for (let i = 0; i < guess.length; i++) {
      if (states[i] === 'correct') continue;
      const match = unused.indexOf(guess[i]);
      if (match < 0) continue;
      states[i] = 'present';
      unused.splice(match, 1);
    }
    const row = element('li');
    [...guess].forEach((letter, i) => {
      const tile = element('span', letter.toUpperCase(), 'word-tile');
      tile.dataset.state = states[i];
      tile.setAttribute('aria-label', letter + ', ' + states[i]);
      row.append(tile);
    });
    board.append(row);
    input.value = '';
    const won = guess === answer;
    const left = 6 - board.children.length;
    input.disabled = submit.disabled = won || left === 0;
    status.textContent = won ? 'Correct. The word is ' + answer.toUpperCase() + '.'
      : left ? left + (left === 1 ? ' guess left.' : ' guesses left.')
        : 'The word was ' + answer.toUpperCase() + '. Select New word to try again.';
  });
  reset();
}

const letterRacks = [
  { tiles: 'PLANETS', solutions: 'ALE ANT APE APT ATE EAT LAP LEA LET NAP NET PAL PAN PAT PEA PEN PET SAP SAT SEA SET SPA TAN TAP TEA TEN ALES ANTE ANTS APES EAST EATS LANE LAPS LAST LATE LEAN LEAP LENS LENT LEST LETS NAPS NEAP NEST NETS PALE PALS PANE PANS PANT PAST PATE PATS PEAL PEAS PEAT PELT PENS PEST PETS PLAN PLEA SALE SALT SANE SEAL SEAT SLAP SLAT SNAP SPAN SPAT STAN STEP TALE TAME TANS TAPE TAPS TEAL TEAS TENS LANCE LAPSE LEANS LEANT LEAPS LEAST LEPTA NEAPS PALEN PALES PANEL PANES PANTS PASTE PATES PEALS PEATS PELTS PENAL PETAL PLANE PLANS PLANT PLATE PLEAS SLANT SLATE SLEPT SPALE SPELT SPENT STALE STEAL TALES TAPES TEALS PLANTS PLANET PLATEN PLANES PLATES PANELS PETALS STAPLE PLANETS PLATENS'.split(' ') },
  { tiles: 'STREAM', solutions: 'ARE ARM ART ATE EAR EAT ERA MAR MAT MET RAM RAT SAT SEA SET TAR TEA ARMS ARTS EARS EAST EATS ERAS MARE MARS MART MAST MATE MATS MEAT MESA META RAMS RASE RATE RATS REAM REST SAME SATE SEAM SEAR SEAT STAR STEM TAME TARE TARS TEAM TEAR TEAS TRAM ASTER MARES MARTS MATER MATES MEATS RATES REAMS RESAT SMART SMEAR STARE STEAM TAMES TARES TEAMS TEARS TERMS TRAMS MASTER STREAM TAMERS'.split(' ') },
];

export function renderWordTiles(container) {
  container.append(element('p', 'Build words of at least three letters. Use each tile once per word.', 'arcade-intro'));
  const status = statusLine(container);
  const tiles = element('div', '', 'letter-rack');
  tiles.setAttribute('aria-label', 'Letter tiles');
  const form = element('form', '', 'arcade-form');
  const input = element('input');
  input.maxLength = 7;
  input.setAttribute('aria-label', 'Word to submit');
  input.autocomplete = 'off';
  const submit = element('button', 'Submit word', 'desktop-control');
  submit.type = 'submit';
  form.append(input, submit);
  const list = element('ul', '', 'tile-results');
  list.setAttribute('aria-label', 'Found words');
  const used = new Set();
  let index = -1;
  let points = 0;

  function reset() {
    index = (index + 1) % letterRacks.length;
    points = 0;
    used.clear();
    input.value = '';
    list.replaceChildren();
    tiles.replaceChildren(...[...letterRacks[index].tiles].map(letter => button(letter, () => {
      if (input.value.length < input.maxLength) input.value += letter;
    })));
    status.textContent = 'Score 0';
  }

  toolbar(container, [['New rack', reset], ['Clear word', () => { input.value = ''; }]]);
  container.append(tiles, form, list);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const word = input.value.trim().toUpperCase();
    const available = [...letterRacks[index].tiles];
    const fitsRack = [...word].every(letter => {
      const tile = available.indexOf(letter);
      if (tile < 0) return false;
      available.splice(tile, 1);
      return true;
    });
    if (word.length < 3 || !fitsRack || !letterRacks[index].solutions.includes(word)) {
      status.textContent = 'That word is outside this rack’s dictionary. Score ' + points + '.';
      return;
    }
    if (used.has(word)) {
      status.textContent = 'Already found ' + word + '. Score ' + points + '.';
      return;
    }
    used.add(word);
    const value = word.length * (word.length === 7 ? 2 : 1);
    points += value;
    list.append(element('li', word + ' · +' + value));
    input.value = '';
    status.textContent = 'Score ' + points;
  });
  reset();
}

const journey = [
  ['Campus station', 'Choose what to pack before setting out.'],
  ['Flooded access road', 'Taking the marked bypass uses extra food.'],
  ['Maintenance hut', 'There’s a place to stop and check your supplies.'],
  ['Signal crossing', 'The track-side path is clear.'],
  ['Last climb', 'One more stretch to the observation post.'],
  ['Observation post', 'The team has reached the destination.'],
];

export function renderTrail(container) {
  container.append(element('p', 'Reach the observation post with enough supplies for the crew.', 'arcade-intro'));
  const landmark = element('h3', '', 'arcade-landmark');
  const description = element('p', '', 'arcade-intro');
  container.append(landmark, description);
  const status = statusLine(container);
  const log = element('p', '', 'arcade-log');
  log.setAttribute('aria-live', 'polite');
  let position, food, stamina, rested, finished;

  function paint() {
    const [name, scene] = journey[position];
    landmark.textContent = name;
    description.textContent = scene;
    status.textContent = 'Stop ' + (position + 1) + '/' + journey.length + ' · Food ' + food + ' · Stamina ' + stamina;
    move.disabled = rest.disabled = finished;
    forage.disabled = finished || rested;
  }

  function reset() {
    position = 0;
    food = 12;
    stamina = 7;
    rested = finished = false;
    log.textContent = 'Ready to leave.';
    paint();
  }

  const move = button('Travel', () => {
    position++;
    food = Math.max(0, food - (position === 2 ? 4 : 2));
    stamina = Math.max(0, stamina - (position === 5 ? 2 : 1));
    rested = false;
    finished = food === 0 || stamina === 0 || position === journey.length - 1;
    log.textContent = food === 0 || stamina === 0 ? 'The team ran out of supplies or stamina. Restart the trip.'
      : finished ? 'You made it to the observation post.' : 'The team arrived at ' + journey[position][0] + '.';
    paint();
  });
  const forage = button('Gather supplies', () => {
    food += 4;
    stamina = Math.max(0, stamina - 1);
    rested = true;
    finished = stamina === 0;
    log.textContent = finished ? 'The team is exhausted. Restart the trip.' : 'You found four food supplies.';
    paint();
  });
  const rest = button('Rest', () => {
    food = Math.max(0, food - 2);
    stamina = Math.min(9, stamina + 3);
    finished = food === 0;
    log.textContent = finished ? 'The team ran out of food. Restart the trip.' : 'The team recovered stamina.';
    paint();
  });
  const actions = element('div', '', 'arcade-actions');
  actions.append(move, forage, rest, button('Restart', reset));
  container.append(actions, log);
  reset();
}

const maze = [
  '#########',
  '#..#...E#',
  '##.#.#.##',
  '#..#.#..#',
  '#.##.##.#',
  '#...K...#',
  '#.###.#.#',
  '#S....#.#',
  '#########',
];

export function renderEscape(container) {
  container.append(element('p', 'Find the key and reach the green exit. Use arrow keys or the direction buttons.', 'arcade-intro'));
  const status = statusLine(container);
  const canvas = element('canvas', '', 'escape-canvas');
  canvas.width = 400;
  canvas.height = 236;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'First-person maze. Use arrow keys to move.');
  const context = canvas.getContext('2d');
  const directions = [[0,-1], [1,0], [0,1], [-1,0]];
  let x, y, facing, hasKey, won;

  function cell(dx, dy) {
    return maze[y + dy]?.[x + dx] ?? '#';
  }

  function paint() {
    context.fillStyle = '#201c32';
    context.fillRect(0, 0, 400, 118);
    context.fillStyle = '#30243c';
    context.fillRect(0, 118, 400, 118);
    const [dx, dy] = directions[facing];
    let distance = 1;
    while (distance < 7 && cell(dx * distance, dy * distance) !== '#') distance++;
    const edges = [0, 28, 60, 95, 125, 146, 159, 169];
    const end = edges[distance];
    context.fillStyle = '#55476f';
    context.fillRect(end, end * .59, 400 - 2 * end, 236 - 2 * end * .59);
    for (let i = distance - 1; i >= 0; i--) {
      const edge = edges[i];
      const next = edges[i + 1];
      const top = edge * .59;
      const nextTop = next * .59;
      for (const side of [-1, 1]) {
        if (cell(dx * i - dy * side, dy * i + dx * side) !== '#') continue;
        const nearX = side === -1 ? edge : 400 - edge;
        const farX = side === -1 ? next : 400 - next;
        context.fillStyle = side === -1 ? '#645483' : '#4e426b';
        context.strokeStyle = '#392f53';
        context.beginPath();
        context.moveTo(nearX, top);
        context.lineTo(farX, nextTop);
        context.lineTo(farX, 236 - nextTop);
        context.lineTo(nearX, 236 - top);
        context.closePath();
        context.fill();
        context.stroke();
      }
      const room = cell(dx * i, dy * i);
      if ((room === 'K' && !hasKey) || room === 'E') {
        context.fillStyle = room === 'K' ? '#f1c675' : '#bde797';
        const size = Math.max(13, 35 - i * 4);
        context.fillRect(200 - size / 2, 145 - i * 3, size, size / 2);
      }
    }
    const mapSize = 5;
    for (let row = 0; row < maze.length; row++) {
      for (let col = 0; col < maze[row].length; col++) {
        const tile = maze[row][col];
        context.fillStyle = col === x && row === y ? '#fff2e5'
          : tile === '#' ? '#473c5d' : tile === 'E' ? '#a5d68f' : tile === 'K' && !hasKey ? '#e6bd70' : '#7a6d97';
        context.fillRect(10 + col * mapSize, 10 + row * mapSize, mapSize - 1, mapSize - 1);
      }
    }
  }

  function reset() {
    x = 1; y = 7; facing = 1;
    hasKey = won = false;
    status.textContent = 'Find the key.';
    paint();
  }

  function action(name) {
    if (won) return;
    if (name === 'left' || name === 'right') facing = (facing + (name === 'right' ? 1 : 3)) % 4;
    else {
      const [dx, dy] = directions[facing];
      const sign = name === 'back' ? -1 : 1;
      const next = cell(dx * sign, dy * sign);
      if (next === '#' || (next === 'E' && !hasKey)) {
        status.textContent = next === '#' ? 'A wall blocks that direction.' : 'The exit is locked. Find the key.';
        return;
      }
      x += dx * sign;
      y += dy * sign;
      if (next === 'K') hasKey = true;
      won = next === 'E';
    }
    status.textContent = won ? 'You escaped the server room.' : hasKey ? 'Key collected. Find the green exit.' : 'Find the key.';
    paint();
  }

  canvas.addEventListener('keydown', event => {
    const moves = { ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right' };
    if (!Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    action(moves[event.key]);
  });
  container.append(canvas);
  toolbar(container, [['Turn left', () => action('left')], ['Forward', () => action('forward')], ['Turn right', () => action('right')], ['Back', () => action('back')], ['Restart', reset]]);
  reset();
}
