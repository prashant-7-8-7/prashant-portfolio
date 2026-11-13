import * as THREE from 'three';
import { buildRoomModels } from './room-models.js';
import { animateCharacter } from './workspace-models.js';
import { createSceneRenderer, fitOrthographicCamera, lightScene } from './scene-renderer.js';

const { clamp, lerp, damp } = THREE.MathUtils;

export async function createRoomScene({ stage, host, display, reducedMotion, onPower, onRadio, onLost, mouth }) {
  const canvas = document.createElement('canvas');
  const { renderer, hardware } = await createSceneRenderer(canvas);
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 65);
  lightScene(scene);
  const models = buildRoomModels(scene);
  scene.updateMatrixWorld(true);
  const center = models.screen.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(models.screen.getWorldQuaternion(new THREE.Quaternion()));
  const monitorCamera = center.clone().addScaledVector(normal, 12);
  const viewTarget = new THREE.Vector3();
  const roomCamera = new THREE.Vector3();
  const roomTarget = new THREE.Vector3(0, 1.25, -.27);
  const greetingTarget = new THREE.Vector3(.90, 1.53, -.72);
  const roomAim = new THREE.Vector3();
  const screenWidth = models.screen.geometry.parameters.width;
  const screenHeight = models.screen.geometry.parameters.height;
  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let width = 0;
  let height = 0;
  let angle = .54;
  let desiredAngle = angle;
  let last = 0;
  let frame = 0;
  let elapsed = 0;
  let focus = 0;
  let focused = false;
  let expanded = false;
  let paused = reducedMotion;
  let lost = false;
  let waveUntil = reducedMotion ? 0 : 1.85;
  let characterFacing = 0;
  let visible = true;
  let drag = null;
  let dirty = true;

  function queue() {
    if (!frame && !lost && !expanded && visible && !document.hidden) {
      frame = requestAnimationFrame(draw);
    }
  }

  function redraw() {
    dirty = true;
    queue();
  }

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    redraw();
  }

  function projectDisplay() {
    vertices[0].set(-screenWidth / 2, screenHeight / 2, .007);
    vertices[1].set(screenWidth / 2, screenHeight / 2, .007);
    vertices[2].set(-screenWidth / 2, -screenHeight / 2, .007);
    for (const vertex of vertices) {
      models.screen.localToWorld(vertex);
      vertex.project(camera);
      vertex.x = (vertex.x + 1) * width / 2;
      vertex.y = (1 - vertex.y) * height / 2;
    }

    const [topLeft, topRight, bottomLeft] = vertices;
    const logicalWidth = display.offsetWidth;
    const logicalHeight = display.offsetHeight;
    if (!logicalWidth || !logicalHeight) return;
    const matrix = [
      (topRight.x - topLeft.x) / logicalWidth, (topRight.y - topLeft.y) / logicalWidth,
      (bottomLeft.x - topLeft.x) / logicalHeight, (bottomLeft.y - topLeft.y) / logicalHeight,
      topLeft.x, topLeft.y,
    ];
    display.style.transform = 'matrix(' + matrix.map(value => value.toFixed(5)).join(',') + ')';
  }

  function draw(now) {
    frame = 0;
    if (expanded || lost || !width || !height) return;
    const animating = (!paused && !focused) || drag || Math.abs(Number(focused) - focus) > .001;
    if (!dirty && now - last < (hardware ? 24 : 49)) {
      if (animating) queue();
      return;
    }

    const delta = last ? Math.min((now - last) / 1000, .12) : 1 / 30;
    last = now;
    angle = paused ? desiredAngle : damp(angle, desiredAngle, 7, delta);
    focus = paused ? Number(focused) : damp(focus, Number(focused), 5.4, delta);
    if (!paused && !focused) {
      elapsed += delta;
      const wave = clamp((waveUntil - elapsed) * 1.35, 0, 1);
      const speech = mouth();
      characterFacing = damp(characterFacing, speech === null ? wave : 1, 7, delta);
      animateCharacter(models.character, elapsed, { wave, speech: speech ?? 0, facing: characterFacing });
      models.particles.rotation.y = elapsed * .027;
      models.steam.forEach((puff, index) => {
        const rise = (elapsed * .47 + index / models.steam.length) % 1;
        puff.position.set(Math.sin(elapsed * 2.1 + index) * .042, 1.42 + rise * .37, -.34 - rise * .045);
        puff.material.opacity = Math.sin(rise * Math.PI) * .19;
      });
    }
    roomCamera.set(Math.sin(angle) * 12, 6.27, Math.cos(angle) * 12);
    camera.position.lerpVectors(roomCamera, monitorCamera, focus);
    roomAim.lerpVectors(roomTarget, greetingTarget, characterFacing * .4);
    viewTarget.lerpVectors(roomAim, center, focus);
    const aspect = width / height;
    const roomHeight = Math.max(6.52, 10.1 / aspect);
    const screenView = Math.max(screenHeight * 1.125, screenWidth * 1.105 / aspect);
    fitOrthographicCamera(camera, width, height, lerp(roomHeight * (1 - .07 * characterFacing), screenView, focus));
    camera.lookAt(viewTarget);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    if (!display.hidden) projectDisplay();
    dirty = false;
    if (animating) queue();
  }

  function hitObject(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects([models.screen, models.body, models.radio], false)[0]?.object;
  }

  canvas.addEventListener('pointerdown', event => {
    if (focused || event.button !== 0 || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: desiredAngle };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) {
      canvas.style.cursor = !focused && hitObject(event) ? 'pointer' : 'grab';
      return;
    }
    if (event.pointerId !== drag.id) return;
    desiredAngle = clamp(drag.angle - (event.clientX - drag.x) * .0065, -.11, 1.03);
    redraw();
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.id) return;
    const tap = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5;
    drag = null;
    const hit = tap && hitObject(event);
    if (hit === models.radio) onRadio();
    else if (hit) onPower();
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, event => { if (event.pointerId === drag?.id) drag = null; });
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    onLost();
  }, { once: true });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) redraw();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    last = 0;
    if (!document.hidden) redraw();
  });

  resize();
  cancelAnimationFrame(frame);
  draw(performance.now());

  return {
    focusScreen(value, immediate = false) {
      focused = value;
      if (immediate) focus = Number(value);
      redraw();
    },
    expand(value) {
      expanded = value;
      last = 0;
      if (value) {
        cancelAnimationFrame(frame);
        frame = 0;
        display.style.removeProperty('transform');
      } else redraw();
    },
    setMotion(value) {
      paused = !value;
      if (paused) {
        characterFacing = 0;
        animateCharacter(models.character, elapsed);
      }
      redraw();
    },
    wave() { waveUntil = elapsed + 1.65; redraw(); },
  };
}
