import * as THREE from 'three';
import {
  matte, mesh, box, sphere, cylinder, curve, groupAt, shadowTexture,
  floorShadow, addPlant, addDesk, addCharacter, addParticles,
} from './workspace-models.js';

function nightWindow() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 440;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, 440);
  sky.addColorStop(0, '#252448');
  sky.addColorStop(.7, '#5e557c');
  sky.addColorStop(1, '#b58391');
  context.fillStyle = sky;
  context.fillRect(0, 0, 768, 440);
  context.fillStyle = '#f4d8c8';
  context.beginPath();
  context.arc(560, 116, 41, 0, Math.PI * 2);
  context.fill();
  for (let i = 0; i < 48; i++) {
    context.fillStyle = i % 5 ? '#d9d6f2' : '#fbe8b8';
    context.fillRect(i * 37 % 760 + 4, i * 79 % 267 + 10, i % 5 ? 1.5 : 2.6, i % 5 ? 1.5 : 2.6);
  }
  for (let i = 0; i < 27; i++) {
    const x = i * 30;
    const top = 297 + i * 19 % 78;
    context.fillStyle = i % 2 ? '#383248' : '#474058';
    context.fillRect(x, top, 28, 440 - top);
    context.fillStyle = '#a694ab';
    for (let row = top + 10; row < 427; row += 21) {
      for (let col = x + 6; col < x + 25; col += 10) {
        if ((row + col + i) % 5 > 1) context.fillRect(col, row, 3, 5);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function artTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 560;
  const context = canvas.getContext('2d');
  context.fillStyle = '#222139';
  context.fillRect(0, 0, 440, 560);
  context.strokeStyle = '#63558b';
  context.lineWidth = 1.2;
  for (let y = 45; y < 520; y += 29) {
    context.beginPath();
    context.moveTo(28, y);
    context.lineTo(412, y);
    context.stroke();
  }
  const nodes = [[82, 168], [82, 324], [218, 117], [218, 249], [218, 380], [351, 186], [351, 317]];
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 7; b++) {
      if (nodes[b][0] - nodes[a][0] !== 136 && nodes[b][0] - nodes[a][0] !== 133) continue;
      context.strokeStyle = '#af9ce5';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(...nodes[a]);
      context.lineTo(...nodes[b]);
      context.stroke();
    }
  }
  for (const [index, [x, y]] of nodes.entries()) {
    context.fillStyle = index % 2 ? '#cab7f4' : '#d9f5a4';
    context.beginPath();
    context.arc(x, y, 14, 0, Math.PI * 2);
    context.fill();
  }
  context.font = '28px monospace';
  context.fillStyle = '#b3a8c9';
  context.fillText('Neural network', 48, 478);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bookshelf(room) {
  const shelf = groupAt(room, -3.65, 0, -1.60);
  shelf.rotation.y = Math.PI / 2;
  box(shelf, .97, 2.28, .51, '#725d7c', 0, 1.29, -.1, .067);
  box(shelf, .89, 2.14, .063, '#574965', 0, 1.29, .166, .025);
  const colors = ['#b08db5', '#d6a98f', '#a5b9a0', '#8b9ebc'];
  for (let row = 0; row < 4; row++) {
    const y = .33 + row * .56;
    box(shelf, .97, .071, .52, '#ad8f9f', 0, y, .03);
    for (let book = 0; book < 6; book++) {
      const height = .29 + (book * 17 + row * 13) % 11 * .012;
      const object = box(shelf, .082, height, .24, colors[(book + row) % 4], (book - 2.5) * .123, y + height / 2 + .042, .26, .009);
      object.rotation.z = (book % 3 - 1) * .065;
    }
  }
}

export function buildRoomModels(scene) {
  const room = groupAt(scene, 0, 0, 0);
  box(room, 8.65, .42, 6.20, '#3e334c', 0, -.17, -.2, .12);
  box(room, 8.58, .11, 6.12, '#99849c', 0, .042, -.2, .042);

  for (let row = 0; row < 13; row++) {
    const tone = ['#b59190', '#af8790', '#bc9a95'][row % 3];
    box(room, 8.45, .038, .454, tone, 0, .098, row * .463 - 2.986, .015);
  }
  box(room, 8.62, 3.87, .14, '#8a819f', 0, 2.02, -3.21, .051);
  box(room, .15, 3.87, 6.17, '#736c90', -4.23, 2.02, -.19, .044);
  box(room, 8.52, .14, .16, '#b2a2ba', 0, .19, -3.11);
  box(room, .16, .14, 6.02, '#a692b1', -4.13, .19, -.20);

  const windowFrame = groupAt(room, 1.10, 2.55, -3.11);
  box(windowFrame, 3.32, 1.82, .136, '#b8aec5', 0, 0, 0, .043);
  box(windowFrame, 3.11, 1.61, .08, '#665b79', 0, 0, .08);
  mesh(windowFrame, new THREE.PlaneGeometry(3.01, 1.51),
    new THREE.MeshBasicMaterial({ map: nightWindow(), toneMapped: false }), 0, 0, .126);
  box(windowFrame, .075, 1.58, .059, '#a89ab6', 0, 0, .152);
  box(windowFrame, 3.06, .068, .063, '#a89ab6', 0, -.06, .156);
  box(windowFrame, 3.40, .13, .37, '#c0a8bd', 0, -.94, .095);
  for (let slat = 0; slat < 3; slat++) {
    box(windowFrame, 3.34, .095, .12, '#a18aa9', 0, .90 - slat * .121, .20);
  }

  box(room, .95, 1.17, .083, '#ad95b4', -2.70, 2.61, -3.08, .034);
  mesh(room, new THREE.PlaneGeometry(.80, 1.01),
    new THREE.MeshBasicMaterial({ map: artTexture(), toneMapped: false }), -2.70, 2.61, -3.03);

  box(room, 4.73, .033, 2.77, '#66587b', .05, .128, .90, .03);
  box(room, 4.59, .025, 2.64, '#86779f', .05, .147, .90, .023);
  for (const x of [-2.12, 2.20]) box(room, .055, .009, 2.52, '#b29cbd', x, .168, .90, .004);
  bookshelf(room);
  addPlant(room, 3.24, .12, -.97, 1.66);
  addPlant(room, -3.15, .12, -2.54, .93);

  const desk = addDesk(room, false);
  const character = addCharacter(room);
  const shadows = shadowTexture();
  floorShadow(room, shadows, -.24, -.49, 6.42, 3.69, .79).position.y = .172;
  floorShadow(room, shadows, 3.20, -.99, 1.65, 1.37, .75).position.y = .145;
  box(room, .72, 1.02, .76, '#82718f', -2.68, .664, -.34, .087);
  box(room, .61, .89, .06, '#504762', -2.68, .66, .065, .045);
  box(room, .37, .11, .02, '#aca0ba', -2.68, .92, .101, .025);
  for (const y of [.47, .55, .63]) box(room, .37, .018, .019, '#a18ead', -2.68, y, .11, .006);
  sphere(room, .036, .036, .018, '#c3dba2', -2.51, .78, .118);
  curve(room, [[-2.68, .62, -.72], [-2.57, .25, -1.26], [-1.64, .35, -1.22], [-1.18, 1.80, -.86]], .029, '#4c3c58');

  const wallLight = box(room, .64, .18, .15, new THREE.MeshBasicMaterial({ color: '#f3cda1' }), 3.37, 3.16, -3.075, .045);
  box(room, .69, .082, .19, '#93829e', 3.37, 3.26, -3.064, .034);
  const radio = groupAt(room, -2.06, 1.14, .28);
  radio.rotation.y = -.19;
  const radioBody = box(radio, .48, .32, .27, '#514458', 0, .18, 0, .045);
  box(radio, .37, .23, .031, '#e0a777', 0, .185, .142, .02);
  for (let line = 0; line < 4; line++) box(radio, .15, .014, .014, '#64516a', -.071, .127 + line * .041, .163, .005);
  sphere(radio, .053, .053, .028, '#725876', .119, .17, .169);
  sphere(radio, .022, .022, .013, '#d9f5a4', .111, .247, .166);
  curve(radio, [[-.17, .32, -.075], [-.20, .48, -.089], [-.29, .64, -.13]], .014, '#bfaac5');

  const steam = Array.from({ length: 3 }, (_, i) => {
    const puff = sphere(room, .043, .076, .044, '#e1cbe4', 0, 1.42 + i * .07, -.34);
    puff.material = new THREE.MeshBasicMaterial({ color: '#ecd9eb', transparent: true, depthWrite: false, opacity: .17 });
    return puff;
  });
  return { ...desk, character, wallLight, radio: radioBody, steam, particles: addParticles(scene, 6.6, 110) };
}
