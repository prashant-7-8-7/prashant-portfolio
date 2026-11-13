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
  renderer.toneMappingExposure = 1.05;
  return { renderer, hardware: true };
}

export function lightScene(scene) {
  scene.add(new THREE.HemisphereLight('#f9f9ff', '#69605b', 1.42));
  const key = new THREE.DirectionalLight('#fff5e5', 2.35);
  key.position.set(-5, 10, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#f0f2fa', .92);
  rim.position.set(6, 5, -7);
  scene.add(rim);
}
