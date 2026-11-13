import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geometryCache = new Map();
const materialCache = new Map();
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);

export function matte(color) {
  if (!materialCache.has(color)) {
    materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: .78 }));
  }
  return materialCache.get(color);
}

export function mesh(parent, geometry, material, x, y, z) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function box(parent, w, h, d, color, x, y, z, radius = .04) {
  const key = [w, h, d, radius].join(',');
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)));
  }
  return mesh(parent, geometryCache.get(key), typeof color === 'string' ? matte(color) : color, x, y, z);
}

export function sphere(parent, sx, sy, sz, color, x, y, z) {
  const object = mesh(parent, sphereGeometry, matte(color), x, y, z);
  object.scale.set(sx, sy, sz);
  return object;
}

export function cylinder(parent, top, bottom, height, color, x, y, z, segments = 24) {
  return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), matte(color), x, y, z);
}

export function torus(parent, radius, thickness, color, x, y, z) {
  return mesh(parent, new THREE.TorusGeometry(radius, thickness, 9, 36), matte(color), x, y, z);
}

export function curve(parent, coords, radius, color) {
  const path = new THREE.CatmullRomCurve3(coords.map(point => new THREE.Vector3(...point)));
  return mesh(parent, new THREE.TubeGeometry(path, 14, radius, 7, false), matte(color), 0, 0, 0);
}

export function groupAt(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(.25, '#ffffff9e');
  gradient.addColorStop(1, '#ffffff00');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, '#0a081bea');
  gradient.addColorStop(.5, '#100b2980');
  gradient.addColorStop(1, '#100b2900');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function floorShadow(parent, map, x, z, width, depth, opacity = .75) {
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false });
  const shadow = mesh(parent, new THREE.PlaneGeometry(width, depth), material, x, .105, z);
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

function screenTexture(powered = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, 512, 384);
  background.addColorStop(0, '#33452e');
  background.addColorStop(1, '#0a1817');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = '#b8ff861e';
  for (let y = 0; y < 384; y += 8) ctx.fillRect(0, y, 512, 1);

  if (!powered) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  ctx.strokeStyle = '#97c77488';
  ctx.lineWidth = 3;
  ctx.strokeRect(25, 25, 462, 334);
  ctx.fillStyle = '#d9f5a4';
  ctx.font = 'bold 25px monospace';
  ctx.fillText('PRASHANT / DESKTOP', 47, 69);
  ctx.font = 'italic 151px Georgia';
  ctx.fillText('ps.', 135, 233);
  ctx.font = 'bold 21px monospace';
  ctx.fillText('> OPEN PROJECTS', 49, 307);
  ctx.fillRect(267, 286, 14, 23);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function addPlant(parent, x, y, z, scale = 1) {
  const plant = groupAt(parent, x, y, z);
  plant.scale.setScalar(scale);
  cylinder(plant, .26, .19, .3, '#b87e76', 0, .15, 0);
  cylinder(plant, .27, .27, .06, '#d1a195', 0, .28, 0);
  cylinder(plant, .225, .225, .025, '#40372d', 0, .32, 0);
  for (let index = 0; index < 7; index++) {
    const angle = index * 2.399;
    const leaf = sphere(plant, .085, .235 + index % 3 * .047, .14, index % 2 ? '#799764' : '#abbe76',
      Math.cos(angle) * .14, .51 + index % 3 * .07, Math.sin(angle) * .14);
    leaf.rotation.z = -Math.cos(angle) * .62;
    leaf.rotation.x = Math.sin(angle) * .62;
  }
}

export function addDesk(world, powered = true) {
  box(world, 4.72, .18, 1.88, '#cfa69f', 0, 1.05, -.33, .075);
  box(world, 4.62, .08, 1.77, '#a57783', 0, .94, -.33);
  for (const x of [-2.04, 2.04]) {
    for (const z of [-.98, .31]) box(world, .13, .84, .15, '#807293', x, .50, z);
    box(world, .15, .12, 1.40, '#6f6389', x, .25, -.33);
  }
  box(world, .74, .8, 1.12, '#8d789e', 1.72, .48, -.30, .07);
  for (const y of [.30, .57, .78]) {
    box(world, .61, .19, .055, '#a899b5', 1.72, y, .278);
    box(world, .17, .03, .045, '#584d70', 1.72, y, .324, .014);
  }

  const monitor = groupAt(world, -1.13, 1.15, -.43);
  monitor.rotation.y = -.08;
  box(monitor, 1.19, .09, .80, '#b2a2c4', 0, .05, 0);
  box(monitor, .43, .16, .42, '#9e8ab2', 0, .14, -.06);
  const body = box(monitor, 1.79, 1.36, .85, '#cbb9dc', 0, .86, -.02, .14);
  box(monitor, 1.53, 1.13, .14, '#635673', 0, .91, .432, .105);
  box(monitor, 1.43, 1.04, .05, '#303239', 0, .92, .513, .08);
  const screen = mesh(monitor, new THREE.PlaneGeometry(1.34, .96), new THREE.MeshBasicMaterial({
    map: screenTexture(powered), toneMapped: false,
  }), 0, .92, .544);
  sphere(monitor, .034, .034, .022, '#d4eb98', .69, .265, .425);
  for (let index = 0; index < 5; index++) {
    box(monitor, .025, .24, .27, '#9c8ab5', .899, .91, -.15 + index * .056, .008);
  }

  const keyboard = groupAt(world, -1.11, 1.16, .28);
  keyboard.rotation.y = -.08;
  box(keyboard, 1.39, .063, .46, '#a995b9', 0, 0, 0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 13; column++) {
      if (row === 3 && column > 3 && column < 9) continue;
      box(keyboard, .078, .031, .066, (row + column) % 8 === 0 ? '#9d83c7' : '#e7d7e5',
        (column - 6) * .10, .043, (row - 1.5) * .093, .011);
    }
  }
  box(keyboard, .48, .031, .066, '#e7d7e5', 0, .043, .14, .011);
  sphere(world, .105, .042, .15, '#d9c8de', -.18, 1.16, .30);

  const laptop = groupAt(world, .93, 1.16, -.11);
  laptop.rotation.y = -.12;
  box(laptop, 1.05, .065, .64, '#665780', 0, 0, -.13);
  box(laptop, .87, .012, .25, '#413650', 0, .04, -.20);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 9; column++) {
      box(laptop, .065, .01, .05, '#9686b0', (column - 4) * .092, .052, -.29 + row * .073, .005);
    }
  }
  const lid = groupAt(laptop, 0, .022, .14);
  lid.rotation.x = .19;
  box(lid, 1.04, .68, .072, '#8b76a9', 0, .34, 0, .058);
  box(lid, .91, .55, .02, '#2e3149', 0, .34, -.043, .029);
  box(lid, .14, .14, .018, '#d9f5a4', 0, .36, .045, .018).rotation.z = Math.PI / 4;

  const mug = groupAt(world, .0, 1.14, -.34);
  cylinder(mug, .14, .12, .23, '#d2a876', 0, .115, 0);
  cylinder(mug, .114, .114, .013, '#533d3a', 0, .23, 0);
  torus(mug, .073, .027, '#d2a876', .149, .118, 0);
  addPlant(world, -2.03, 1.15, -.79, .62);

  const lamp = groupAt(world, 2.11, 1.15, -.86);
  cylinder(lamp, .22, .24, .07, '#b1a1ce', 0, .035, 0);
  curve(lamp, [[0, .05, 0], [0, .8, 0], [.06, 1.11, 0], [-.02, 1.19, .05]], .037, '#a793ce');
  cylinder(lamp, .12, .24, .24, '#9b85ca', -.02, 1.07, .05);
  const lampLight = new THREE.MeshBasicMaterial({ color: '#fff1c1' });
  mesh(lamp, new THREE.CircleGeometry(.19, 22), lampLight, -.02, .945, .05).rotation.x = Math.PI / 2;

  const books = [['#8570ae', 0], ['#96aa76', .085], ['#c68683', .166]];
  for (const [color, y] of books) {
    const book = box(world, .50, .075, .36, color, 1.93, 1.182 + y, .33, .016);
    book.rotation.y = -.15 + y;
    box(world, .42, .039, .021, '#e2cfc1', 1.93, 1.182 + y, .51, .008);
  }

  return { screen, body };
}

export function addCharacter(world) {
  const student = groupAt(world, .91, 0, -1.62);
  student.rotation.y = -.13;

  cylinder(student, .23, .29, .065, '#554765', 0, .125, -.05);
  cylinder(student, .087, .10, .50, '#726185', 0, .39, -.05);
  box(student, .91, .14, .78, '#71608a', 0, .68, -.03, .09);
  box(student, .87, .78, .16, '#71608a', 0, 1.055, -.40, .125);
  box(student, .71, .65, .17, '#917aa8', 0, 1.07, -.29, .10);

  const hoodie = '#9281c6';
  const skin = '#bc8668';
  const pants = '#4c4967';
  box(student, .83, .73, .52, hoodie, 0, 1.11, -.01, .20);
  sphere(student, .38, .19, .27, '#7465a5', 0, 1.48, -.05);
  box(student, .42, .11, .04, '#796aac', 0, .97, .262, .021);
  for (const side of [-1, 1]) {
    const thigh = box(student, .29, .25, .63, pants, side * .22, .72, .29, .12);
    thigh.rotation.y = side * -.09;
    box(student, .24, .48, .24, pants, side * .25, .47, .56, .095);
    box(student, .25, .15, .40, '#d9cadc', side * .25, .22, .63, .071);
    box(student, .26, .05, .41, '#7b6a98', side * .25, .158, .63, .022);
    curve(student, [[side * .09, 1.46, .22], [side * .105, 1.28, .288], [side * .125, 1.22, .296]], .012, '#ded3f5');
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = groupAt(student, side * .36, 1.34, .03);
    curve(arm, [[0, 0, 0], [side * .105, -.17, .24], [side * -.08, -.12, .60], [side * -.13, -.145, .84]], .115, hoodie);
    sphere(arm, .115, .065, .145, skin, side * -.13, -.148, .93);
    arms.push(arm);
  }

  const head = groupAt(student, 0, 1.93, -.005);
  sphere(head, .40, .43, .37, skin, 0, 0, 0);
  sphere(head, .15, .14, .14, skin, 0, -.37, -.06);
  for (const side of [-1, 1]) {
    sphere(head, .082, .121, .086, skin, side * .391, -.04, 0);
    sphere(head, .044, .077, .041, '#a76f5b', side * .421, -.043, .027);
  }

  const hair = '#292433';
  const cap = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, 1.59);
  mesh(head, cap, matte(hair), 0, .098, -.015).scale.set(.414, .378, .383);
  sphere(head, .345, .25, .255, hair, -.03, .085, -.169);
  for (let index = 0; index < 5; index++) {
    const tuft = sphere(head, .154, .094 + index * .006, .22, index % 2 ? '#36303d' : hair,
      -.215 + index * .093, .269 + index * .016, .215 - index * .015);
    tuft.rotation.z = -.36;
  }

  const eyes = groupAt(head, 0, -.012, .335);
  for (const side of [-1, 1]) {
    const eye = groupAt(eyes, side * .151, 0, 0);
    sphere(eye, .074, .050, .028, '#f5e8e1', 0, 0, 0);
    sphere(eye, .030, .037, .019, '#2b2133', .004, -.003, .028);
    sphere(eye, .011, .012, .008, '#fff7ed', -.005, .01, .045);
    torus(head, .104, .014, '#332d42', side * .152, -.011, .372).scale.y = .90;
    const eyebrow = box(head, .125, .026, .022, hair, side * .145, .095, .349, .012);
    eyebrow.rotation.z = side * -.09;
  }
  box(head, .105, .022, .023, '#332d42', 0, -.008, .376, .009);
  sphere(head, .057, .058, .065, '#c79070', 0, -.071, .357);
  const smile = curve(head, [[-.073, -.173, .323], [0, -.191, .342], [.07, -.166, .325]], .012, '#694247');
  const mouth = groupAt(head, 0, -.175, .336);
  sphere(mouth, .077, .061, .018, '#51303e', 0, 0, 0);
  sphere(mouth, .043, .012, .006, '#cb8078', 0, -.026, .014);
  mouth.visible = false;

  return { head, eyes, arms, smile, mouth };
}

export function addParticles(scene, radius = 6, count = 210) {
  const positions = [];
  const colors = [];
  const choices = ['#cebefc', '#b5dfff', '#d9f5a4', '#d19cd5'].map(value => new THREE.Color(value));
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963;
    const distance = radius * (.66 + (i * 29 % 103) / 180);
    positions.push(Math.cos(angle) * distance, -.15 + (i * 13 % 105) / 24 * radius / 6, Math.sin(angle) * distance * .81);
    const color = choices[i % choices.length];
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    map: glowTexture(), size: 3.2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  return particles;
}

export function animateCharacter({ head, eyes, arms, smile, mouth }, elapsed, { wave = 0, speech = 0, facing = 0 } = {}) {
  const blink = Math.exp(-Math.pow((elapsed % 4.7 - 4.44) * 27, 2));
  eyes.scale.y = 1 - .94 * blink;
  head.rotation.y = -.10 + Math.sin(elapsed * .72) * .11 + wave * .22 + facing * .48;
  head.rotation.x = .065 + Math.sin(elapsed * 1.37) * .036 - facing * .09 + speech * .035;
  arms[0].rotation.x = .028 + Math.sin(elapsed * 13.4) * .026;
  arms[1].rotation.x = .027 + Math.cos(elapsed * 12.1) * .028 - wave * .9;
  arms[1].rotation.z = wave * (-.38 + Math.sin(elapsed * 12) * .19);
  mouth.visible = speech > .055;
  smile.visible = !mouth.visible;
  mouth.scale.y = .14 + speech * .86;
}
