import * as THREE from 'three';

export async function createSceneRenderer(canvas) {
  const context = canvas.getContext('webgl2', {
    alpha: true, antialias: true, powerPreference: 'low-power',
  });

  if (!context) {
    const { createCanvasRenderer } = await import('./workspace-canvas.js');
    return { renderer: createCanvasRenderer(canvas), hardware: false };
  }

  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor('#000000', 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  return { renderer, hardware: true };
}

export function lightScene(scene) {
  scene.add(new THREE.HemisphereLight('#ece5ff', '#4a395a', 1.95));
  const key = new THREE.DirectionalLight('#fff0d8', 2.7);
  key.position.set(-5, 10, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#a9bcff', 1.4);
  rim.position.set(6, 5, -7);
  scene.add(rim);
}

export function fitOrthographicCamera(camera, width, height, visibleHeight) {
  const halfHeight = visibleHeight / 2;
  const halfWidth = halfHeight * width / height;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.updateProjectionMatrix();
}
