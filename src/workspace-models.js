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

export function shadowTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, color + 'ce');
  gradient.addColorStop(.46, color + '92');
  gradient.addColorStop(1, color + '00');
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

export function addCharacter(world) {
  const student = groupAt(world, .91, 0, -1.62);
  student.rotation.y = -.13;

  cylinder(student, .23, .29, .065, '#554765', 0, .125, -.05);
  cylinder(student, .087, .10, .50, '#726185', 0, .39, -.05);
  box(student, .91, .14, .78, '#71608a', 0, .68, -.03, .09);
  box(student, .87, .78, .16, '#71608a', 0, 1.055, -.40, .125);
  box(student, .71, .65, .17, '#917aa8', 0, 1.07, -.29, .10);

  const hoodie = '#8e9690';
  const skin = '#bc8668';
  const pants = '#4c4967';
  box(student, .83, .73, .52, hoodie, 0, 1.11, -.01, .20);
  sphere(student, .38, .19, .27, '#657069', 0, 1.48, -.05);
  box(student, .42, .11, .04, '#66766b', 0, .97, .262, .021);
  for (const side of [-1, 1]) {
    const thigh = box(student, .29, .25, .63, pants, side * .22, .72, .29, .12);
    thigh.rotation.y = side * -.09;
    box(student, .24, .48, .24, pants, side * .25, .47, .56, .095);
    box(student, .25, .15, .40, '#d9cadc', side * .25, .22, .63, .071);
    box(student, .26, .05, .41, '#7b6a98', side * .25, .158, .63, .022);
    curve(student, [[side * .09, 1.46, .22], [side * .105, 1.28, .288], [side * .125, 1.22, .296]], .012, '#d5d9d1');
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

  return { root: student, head, eyes, arms, smile, mouth };
}

export function animateCharacter({ head, eyes, arms, smile, mouth }, elapsed, { wave = 0, speech = 0, facing = 0 } = {}) {
  const blink = Math.exp(-Math.pow((elapsed % 4.7 - 4.44) * 27, 2));
  eyes.scale.y = 1 - .94 * blink;
  head.rotation.y = -.10 + Math.sin(elapsed * .72) * .11 * (1 - facing) - facing * .075;
  head.rotation.x = .065 + Math.sin(elapsed * 1.37) * .036 - facing * .09 + speech * .035;
  arms[0].rotation.x = .028 + Math.sin(elapsed * 13.4) * .026;
  arms[1].rotation.x = .027 + Math.cos(elapsed * 12.1) * .028 - wave * .9;
  arms[1].rotation.z = wave * (-.38 + Math.sin(elapsed * 12) * .19);
  mouth.visible = speech > .055;
  smile.visible = !mouth.visible;
  mouth.scale.y = .14 + speech * .86;
}
