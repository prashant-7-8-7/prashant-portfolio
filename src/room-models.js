import * as THREE from 'three';
import { matte, mesh, box, sphere, cylinder, curve, groupAt, shadowTexture, floorShadow, addCharacter } from './workspace-models.js';

const plastic = '#d4d0c7';
const lightPlastic = '#e7e4dc';
const metal = '#747575';

function texture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: result, toneMapped: false });
}

function printedSheet(parent, x, y, z, angle = 0) {
  const paper = box(parent, .58, .012, .42, '#e7e6df', x, y, z, .006);
  paper.rotation.y = angle;
  const ink = texture(256, 180, (ctx, w, h) => {
    ctx.fillStyle = '#e9e8e2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a0a1a0';
    ctx.fillRect(24, 21, 100, 5);
    for (let line = 0; line < 8; line++) {
      ctx.fillStyle = line % 3 ? '#c4c4bf' : '#b3b4af';
      ctx.fillRect(24, 42 + line * 12, 164 - (line * 23 % 58), 2);
    }
  });
  const top = mesh(parent, new THREE.PlaneGeometry(.566, .408), ink, x, y + .008, z);
  top.rotation.set(-Math.PI / 2, 0, angle);
}

function paperStack(parent, x, y, z, count) {
  for (let i = 0; i < count; i++) {
    const sheet = box(parent, .58, .029, .43, i % 2 ? '#e5e4df' : '#d5d4d0',
      x + (i % 3 - 1) * .009, y + i * .029, z + (i % 2) * .009, .005);
    sheet.rotation.y = (i % 3 - 1) * .018;
  }
}

function addPaperTrays(room) {
  const trays = groupAt(room, -1.57, 1.21, -.38);
  const tray = '#948775';
  for (const level of [.026, .205]) {
    box(trays, .67, .03, .49, '#756b5d', 0, level, 0, .006);
    box(trays, .037, .165, .49, tray, -.32, level + .078, 0, .008);
    box(trays, .037, .165, .49, tray, .32, level + .078, 0, .008);
    box(trays, .66, .129, .033, tray, 0, level + .066, -.23, .006);
    for (const x of [-.236, .236]) box(trays, .19, .066, .025, tray, x, level + .045, .238, .007);
    box(trays, .31, .028, .025, tray, 0, level + .024, .238, .006);
  }
  paperStack(trays, 0, .245, -.014, 6);
  paperStack(room, -.91, 1.23, -.48, 5);
  printedSheet(room, -1.20, 1.222, .29, -.23);
}

function buildDesk(room) {
  box(room, 4.40, .132, 1.67, '#393633', 0, 1.153, -.055, .014);
  box(room, 3.97, .43, .071, '#696764', 0, .842, -.78, .005);
  for (const x of [-2.06, 2.06]) {
    for (const z of [-.78, .66]) box(room, .102, 1.085, .108, metal, x, .544, z, .008);
  }
  box(room, .91, .626, 1.37, '#8f8e89', -1.51, .791, -.15, .013);
  for (const y of [.655, .96]) {
    box(room, .867, .271, .039, '#a8a6a0', -1.51, y, .553, .01);
    curve(room, [[-1.65, y + .055, .58], [-1.61, y + .049, .617],
      [-1.41, y + .049, .617], [-1.37, y + .055, .58]], .014, '#3d3d3c');
  }
  addPaperTrays(room);
}

function addComputer(room) {
  const computer = groupAt(room, 0, 1.21, -.42);
  const base = box(computer, 1.41, .31, .95, plastic, 0, .155, 0, .041);
  box(computer, 1.34, .255, .026, '#b9b5ac', 0, .145, .474, .028);
  box(computer, .45, .123, .020, '#9c9890', .343, .15, .491, .011);
  box(computer, .397, .031, .020, '#474743', .343, .175, .506, .004);
  box(computer, .376, .025, .014, '#beb9ad', .343, .142, .514, .004);
  sphere(computer, .028, .028, .011, '#dfdbd3', -.50, .158, .495);
  sphere(computer, .015, .015, .009, '#94ab65', -.50, .158, .506);

  box(computer, .97, .046, .70, '#8e8b83', 0, .326, -.065, .022);
  cylinder(computer, .42, .39, .148, '#b5b1a6', 0, .408, -.065, 24);
  const monitor = groupAt(computer, 0, .485, -.065);
  monitor.rotation.x = -.022;
  const body = box(monitor, 1.40, 1.15, .82, plastic, 0, .591, -.055, .091);
  box(monitor, 1.21, .96, .156, '#8f8e85', 0, .614, .386, .077);
  box(monitor, 1.132, .911, .04, '#4f514a', 0, .613, .474, .036);
  const screenMaterial = texture(800, 640, (ctx, w, h) => {
    const dark = ctx.createLinearGradient(0, 0, w, h);
    dark.addColorStop(0, '#272b2b');
    dark.addColorStop(.62, '#111516');
    dark.addColorStop(1, '#1e2020');
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a9b0a80b';
    for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 1);
  });
  const screen = mesh(monitor, new THREE.PlaneGeometry(1.083, .8664), screenMaterial, 0, .613, .499);
  const trim = texture(384, 50, (ctx, w, h) => {
    ctx.fillStyle = '#c6c3b9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5c5b55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(21, 25, 13, 0, Math.PI * 2);
    ctx.ellipse(21, 25, 5, 13, 0, 0, Math.PI * 2);
    ctx.moveTo(8, 25);
    ctx.lineTo(34, 25);
    ctx.stroke();
    ctx.fillStyle = '#595a56';
    ctx.font = 'bold 24px serif';
    ctx.fillText('Sharma', 43, 31);
  });
  mesh(monitor, new THREE.PlaneGeometry(.64, .083), trim, -.296, .091, .365);
  const led = sphere(monitor, .012, .012, .010, '#43433e', .582, .089, .373);
  led.material = new THREE.MeshBasicMaterial({ color: '#55554f', toneMapped: false });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      box(monitor, .008, .112, .020, '#a5a198', side * .702, .50, -.195 + i * .043, .004);
    }
  }

  const keyboard = groupAt(room, -.03, 1.238, .423);
  keyboard.rotation.x = .055;
  box(keyboard, 1.54, .052, .408, plastic, 0, .016, 0, .032);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 19; col++) {
      if (row === 4 && col >= 3 && col <= 8) continue;
      const x = (col - 9) * .076 + (col > 13 ? .024 : 0);
      box(keyboard, .061, .024, .055, (row + col) % 11 === 0 ? '#bbb8af' : lightPlastic,
        x, .056, (row - 2) * .067, .006);
    }
  }
  box(keyboard, .438, .022, .055, lightPlastic, -.269, .056, .134, .006);
  const mouse = groupAt(room, 1.00, 1.228, .455);
  box(mouse, .254, .090, .30, plastic, 0, .055, 0, .045);
  for (const side of [-1, 1]) box(mouse, .105, .019, .13, lightPlastic, side * .058, .102, -.059, .014);
  curve(room, [[.99, 1.235, .312], [1.035, 1.229, .18], [1.048, 1.23, -.17], [.85, 1.233, -.79], [.52, 1.34, -.91]], .010, '#252524');
  curve(room, [[-.53, 1.25, .24], [-.64, 1.23, .062], [-.73, 1.22, -.27], [-.59, 1.31, -.78]], .009, '#262625');
  return { base, body, screen, led };
}

function addBinders(room) {
  for (let i = 0; i < 2; i++) {
    const binder = groupAt(room, .98 + i * .20, 1.22, -.62);
    binder.rotation.y = i ? -.14 : .21;
    box(binder, .157, .72, .415, '#4d3830', 0, .36, 0, .008);
    box(binder, .115, .684, .38, '#cdc8bc', 0, .363, -.023, .007);
    for (const x of [-.075, .075]) box(binder, .020, .734, .427, '#513b30', x, .369, 0, .007);
    box(binder, .16, .733, .037, '#48342c', 0, .367, .203, .006);
    sphere(binder, .042, .042, .011, '#858078', 0, .133, .228);
    sphere(binder, .032, .032, .008, '#292824', 0, .133, .236);
  }
}

function addMug(room) {
  const mug = groupAt(room, 1.47, 1.213, .052);
  cylinder(mug, .125, .105, .251, '#e3dfd3', 0, .126, 0, 24);
  cylinder(mug, .104, .104, .010, '#565047', 0, .253, 0, 24);
  const lip = new THREE.TorusGeometry(.113, .011, 8, 24);
  mesh(mug, lip, matte('#e8e6dc'), 0, .255, 0).rotation.x = Math.PI / 2;
  const handle = new THREE.TorusGeometry(.073, .017, 8, 22);
  mesh(mug, handle, matte('#e3dfd3'), .125, .132, -.011).rotation.y = -.12;
  const steam = Array.from({ length: 5 }, (_, i) => {
    const puff = sphere(mug, .045, .09, .038, '#dddcd5', 0, .27 + i * .055, 0);
    puff.material = new THREE.MeshBasicMaterial({ color: '#f5f4ed', transparent: true, depthWrite: false, opacity: .12 });
    return puff;
  });
  return steam;
}

function addRadio(room) {
  const radio = groupAt(room, 1.72, 1.21, -.51);
  radio.rotation.y = -.14;
  const radioBody = box(radio, .38, .20, .24, '#464844', 0, .11, 0, .025);
  box(radio, .335, .155, .027, '#62645e', 0, .113, .122, .009);
  for (let i = 0; i < 5; i++) box(radio, .155, .010, .011, '#343632', -.058, .071 + i * .018, .139, .002);
  sphere(radio, .042, .042, .023, '#c2c0b5', .103, .105, .145);
  sphere(radio, .018, .018, .008, '#95a765', .108, .159, .139);
  return radioBody;
}

function addChair(room) {
  const chair = groupAt(room, 1.64, 0, 1.31);
  chair.rotation.y = .94;
  cylinder(chair, .057, .064, .42, '#4c4b47', 0, .315, 0, 12);
  for (let i = 0; i < 5; i++) {
    const leg = groupAt(chair, 0, 0, 0);
    leg.rotation.y = i * Math.PI * 2 / 5;
    box(leg, .082, .058, .410, '#4a4b4a', 0, .138, .186, .012);
    cylinder(leg, .061, .061, .05, '#393a39', 0, .075, .39, 12).rotation.z = Math.PI / 2;
  }
  box(chair, .85, .19, .79, '#8b552f', 0, .619, -.015, .094);
  box(chair, .77, .057, .72, '#51463e', 0, .508, .005, .029);
  for (const x of [-.26, .26]) {
    curve(chair, [[x, .55, .18], [x, .62, .348], [x, .88, .43], [x, 1.065, .433]], .033, '#585957');
  }
  const back = box(chair, .82, .61, .20, '#985e32', 0, 1.205, .427, .092);
  back.rotation.x = .11;
  const shell = box(chair, .665, .475, .101, '#4b443e', 0, 1.208, .526, .054);
  shell.rotation.x = .11;
  box(chair, .235, .17, .13, '#484a48', 0, 1.087, .588, .042);
}

function addPlant(room) {
  const plant = groupAt(room, 2.62, 0, -.50);
  cylinder(plant, .30, .238, .45, '#9f9d91', 0, .225, 0, 19);
  cylinder(plant, .313, .31, .058, '#b8b4a6', 0, .452, 0, 19);
  cylinder(plant, .264, .264, .017, '#51483b', 0, .481, 0, 18);
  const veins = [
    [[-.11, .48, 0], [-.17, .90, .13], [-.39, 1.52, .17], [-.52, 1.85, .20]],
    [[.02, .48, .01], [.09, 1.17, .07], [.17, 1.89, .03], [.09, 2.17, -.05]],
    [[.07, .48, -.03], [.15, .83, -.16], [.33, 1.31, -.28], [.54, 1.65, -.39]],
    [[-.04, .48, .09], [-.02, .78, .27], [.18, 1.13, .42], [.47, 1.37, .47]],
    [[-.02, .48, -.04], [-.17, .66, -.12], [-.35, .86, -.21], [-.58, 1.10, -.25]],
  ];
  for (let i = 0; i < veins.length; i++) {
    const stem = veins[i];
    curve(plant, stem, .018, '#44794d');
    const leaf = groupAt(plant, ...stem[3]);
    leaf.rotation.set(.58 - i * .15, i * .79 - .4, -.88 + i * .39);
    const outline = [[0,0], [-.108,.10], [-.23,.205], [-.19,.277], [-.259,.353],
      [-.192,.391], [-.174,.5], [0,.61], [.14,.51], [.18,.444], [.245,.426],
      [.183,.344], [.231,.288], [.152,.213], [.091,.085]];
    const coords = [];
    for (let j = 0; j < outline.length; j++) {
      const [x1, y1] = outline[j];
      const [x2, y2] = outline[(j + 1) % outline.length];
      coords.push(0, .294, .049, x1, y1, 0, x2, y2, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    geometry.computeVertexNormals();
    const color = i % 2 ? '#6f9d66' : '#558658';
    mesh(leaf, geometry, new THREE.MeshStandardMaterial({ color, roughness: .82, side: THREE.DoubleSide }), 0, 0, 0);
    curve(leaf, [[0, 0, .005], [0, .21, .041], [0, .40, .03], [0, .58, .004]], .006, '#78a273');
  }
}

export function buildRoomModels(scene) {
  const room = groupAt(scene, 0, 0, 0);
  const shadows = shadowTexture('#343235');
  floorShadow(room, shadows, -.02, .12, 5.91, 3.20, .72).position.y = .004;
  floorShadow(room, shadows, 1.64, 1.40, 1.75, 1.38, .58).position.y = .008;
  floorShadow(room, shadows, 2.62, -.51, 1.53, 1.19, .54).position.y = .006;
  buildDesk(room);
  const computer = addComputer(room);
  addBinders(room);
  const steam = addMug(room);
  const radio = addRadio(room);
  addChair(room);
  addPlant(room);
  const character = addCharacter(room);
  character.root.position.set(1.96, .22, -.94);
  character.root.rotation.y = -.51;
  return { ...computer, character, radio, steam };
}

