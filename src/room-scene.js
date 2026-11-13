import * as THREE from 'three';
import { buildRoomModels } from './room-models.js';
import { animateCharacter } from './workspace-models.js';
import { createSceneRenderer, lightScene } from './scene-renderer.js';

const { clamp, damp, degToRad } = THREE.MathUtils;

export function poseRoomCamera(camera, models, width, height, {
  framing = 0, focus = 0, angle = -.57, elevation = .36, panX = 0, panY = 0,
} = {}) {
  const aspect = width / height;
  const narrow = Math.max(1, 1.27 / aspect);
  const wideTarget = new THREE.Vector3(.18, 1.16, .15);
  const deskTarget = new THREE.Vector3(.03 + panX * .13, 1.82 + panY * .09, 0);
  const wideDistance = 10.3 * narrow;
  const widePosition = new THREE.Vector3(
    wideTarget.x + Math.sin(angle) * wideDistance,
    wideTarget.y + Math.tan(elevation) * wideDistance,
    wideTarget.z + Math.cos(angle) * wideDistance,
  );
  const deskPosition = new THREE.Vector3(panX * .51, 2.85 + panY * .20, 6.17 * narrow);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(models.screen.matrixWorld);
  const screenCenter = new THREE.Vector3().setFromMatrixPosition(models.screen.matrixWorld);
  const screen = models.screen.geometry.parameters;
  const vertical = Math.max(screen.height / .86, screen.width / (.91 * aspect));
  const monitorDistance = vertical / (2 * Math.tan(degToRad(camera.fov / 2)));
  const monitorPosition = screenCenter.clone().addScaledVector(normal, monitorDistance);

  camera.aspect = aspect;
  camera.position.lerpVectors(widePosition, deskPosition, framing).lerp(monitorPosition, focus);
  camera.lookAt(wideTarget.lerp(deskTarget, framing).lerp(screenCenter, focus));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function projectScreen(display, corners, width, height) {
  const [a, b, c, d] = corners;
  const dx = a.x - b.x + c.x - d.x;
  const dy = a.y - b.y + c.y - d.y;
  const bx = b.x - c.x, by = b.y - c.y;
  const cx = d.x - c.x, cy = d.y - c.y;
  const det = bx * cy - cx * by;
  if (Math.abs(det) < .001) return;
  const g = (dx * cy - cx * dy) / det;
  const h = (bx * dy - dx * by) / det;
  const matrix = [
    (b.x - a.x + g * b.x) / width, (b.y - a.y + g * b.y) / width, 0, g / width,
    (d.x - a.x + h * d.x) / height, (d.y - a.y + h * d.y) / height, 0, h / height,
    0, 0, 1, 0,
    a.x, a.y, 0, 1,
  ];
  display.style.transform = 'matrix3d(' + matrix.map(n => n.toFixed(9)).join(',') + ')';
}

export async function createRoomScene({
  stage, host, display, reducedMotion, onPower, onRadio, onOrbit, onLost, mouth,
}) {
  const canvas = document.createElement('canvas');
  const { renderer, hardware } = await createSceneRenderer(canvas);
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .075, 120);
  const models = buildRoomModels(scene);
  lightScene(scene);
  scene.updateMatrixWorld(true);
  const { width: screenWidth, height: screenHeight } = models.screen.geometry.parameters;
  const corners = Array.from({ length: 4 }, () => new THREE.Vector3());
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = [models.screen, models.body, models.base, models.radio];

  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let focus = 0;
  let framing = 0;
  let angle = -.57;
  let elevation = .36;
  let desiredAngle = angle;
  let desiredElevation = elevation;
  let panX = 0;
  let panY = 0;
  let aimedX = 0;
  let aimedY = 0;
  let view = 'intro';
  let powered = false;
  let expanded = false;
  let paused = reducedMotion;
  let lost = false;
  let waveUntil = reducedMotion ? 0 : 1.55;
  let visible = true;
  let drag = null;
  let dirty = true;

  function queue() {
    if (!frame && !lost && !expanded && visible && !document.hidden) frame = requestAnimationFrame(draw);
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

  function draw(now) {
    frame = 0;
    if (expanded || lost || !width || !height) return;
    const focusGoal = view === 'monitor' ? 1 : 0;
    const framingGoal = view === 'monitor' || view === 'desk' ? 1 : 0;
    const animated = !paused && view !== 'monitor';
    const moving = Math.abs(focusGoal - focus) > .002 || Math.abs(framingGoal - framing) > .002;
    if (!dirty && now - last < (hardware ? 17 : 47)) {
      if (animated || moving || drag) queue();
      return;
    }
    const delta = last ? Math.min((now - last) / 1000, .11) : 1 / 30;
    last = now;
    focus = paused ? focusGoal : damp(focus, focusGoal, 5.8, delta);
    framing = paused ? framingGoal : damp(framing, framingGoal, 4.9, delta);
    if (Math.abs(focusGoal - focus) < .002) focus = focusGoal;
    if (Math.abs(framingGoal - framing) < .002) framing = framingGoal;
    angle = paused ? desiredAngle : damp(angle, desiredAngle, 8, delta);
    elevation = paused ? desiredElevation : damp(elevation, desiredElevation, 8, delta);
    panX = paused ? 0 : damp(panX, aimedX, 5, delta);
    panY = paused ? 0 : damp(panY, aimedY, 5, delta);

    if (animated) {
      elapsed += delta;
      if (view === 'intro') {
        const speech = mouth();
        const wave = clamp((waveUntil - elapsed) * 1.5, 0, 1);
        animateCharacter(models.character, elapsed, { wave, speech: speech ?? 0, facing: speech === null ? wave : 1 });
      }
      models.steam.forEach((puff, index) => {
        const rise = (elapsed * .51 + index / models.steam.length) % 1;
        puff.position.set(Math.sin(elapsed * 2 + index) * .037, .265 + rise * .35, -rise * .077);
        puff.material.opacity = Math.sin(rise * Math.PI) * .17;
      });
    }

    // The desk and monitor both use perspective. The HTML surface follows all four projected corners.
    const drift = view === 'intro' && !paused && !drag ? Math.sin(elapsed * .20) * .065 : 0;
    poseRoomCamera(camera, models, width, height, { framing, focus, angle: angle + drift, elevation, panX, panY });
    renderer.render(scene, camera);
    if (!display.hidden) {
      corners[0].set(-screenWidth / 2, screenHeight / 2, .006);
      corners[1].set(screenWidth / 2, screenHeight / 2, .006);
      corners[2].set(screenWidth / 2, -screenHeight / 2, .006);
      corners[3].set(-screenWidth / 2, -screenHeight / 2, .006);
      for (const corner of corners) {
        models.screen.localToWorld(corner);
        corner.project(camera);
        corner.set((corner.x + 1) * width / 2, (1 - corner.y) * height / 2, corner.z);
      }
      const interactive = view === 'monitor' && focus === 1;
      display.classList.toggle('monitor-active', interactive);
      projectScreen(display, corners, display.offsetWidth, display.offsetHeight);
    }
    dirty = false;
    if (animated || moving || drag) queue();
  }

  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false)[0]?.object;
  }

  canvas.addEventListener('pointerdown', event => {
    if (view === 'monitor' || event.button !== 0 || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: desiredAngle, elevation: desiredElevation };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) {
      const rect = canvas.getBoundingClientRect();
      aimedX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      aimedY = clamp(1 - (event.clientY - rect.top) / rect.height * 2, -1, 1);
      canvas.style.cursor = view !== 'monitor' && hit(event) ? 'pointer' : 'grab';
      return;
    }
    if (event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (view === 'desk' && Math.hypot(dx, dy) > 6) onOrbit();
    desiredAngle = clamp(drag.angle - dx * .006, -1.43, 1.43);
    desiredElevation = clamp(drag.elevation + dy * .004, .10, .84);
    redraw();
  });
  canvas.addEventListener('pointerleave', () => { aimedX = 0; aimedY = 0; });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.id) return;
    const tap = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5;
    drag = null;
    if (!tap) return;
    const object = hit(event);
    if (object === models.radio) onRadio();
    else if (object) onPower();
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
    setView(value, immediate = false) {
      view = value;
      models.character.root.visible = view === 'intro';
      if (value === 'intro') {
        desiredAngle = -.57;
        desiredElevation = .36;
        waveUntil = paused ? 0 : elapsed + 1.55;
      }
      if (immediate) {
        focus = Number(view === 'monitor');
        framing = Number(view === 'monitor' || view === 'desk');
      }
      redraw();
    },
    setPower(value) {
      powered = value;
      models.led.material.color.set(powered ? '#89b548' : '#55554f');
      redraw();
    },
    expand(value) {
      expanded = value;
      last = 0;
      if (value) {
        cancelAnimationFrame(frame);
        frame = 0;
        display.style.removeProperty('transform');
        display.classList.add('monitor-active');
      } else redraw();
    },
    setMotion(value) {
      paused = !value;
      if (paused) animateCharacter(models.character, elapsed);
      redraw();
    },
    wave() { waveUntil = elapsed + 1.65; redraw(); },
  };
}

