export function setupPortrait(canvas, motionPreference, { gather = false } = {}) {
  const frame = canvas.parentElement;
  const context = canvas.getContext('2d');
  if (!context) return;

  const stencil = document.createElement('canvas');
  const stamp = stencil.getContext('2d', { willReadFrequently: true });
  if (!stamp) return;

  let width = 0;
  let height = 0;
  let points = [];
  let formationStart = 0;
  let visible = false;
  let animation = 0;
  let paused = motionPreference.matches;
  const pointer = { x: 0, y: 0, active: false };

  function sampleMonogram() {
    width = Math.round(frame.clientWidth);
    height = Math.round(frame.clientHeight);
    if (!width || !height) return;

    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    stencil.width = width;
    stencil.height = height;

    const fontSize = Math.min(width * .59, height * .86);
    stamp.font = 'italic ' + fontSize + 'px "Instrument Serif", Georgia, serif';
    stamp.textAlign = 'center';
    stamp.textBaseline = 'middle';
    stamp.fillStyle = '#fff';
    stamp.fillText('ps.', width * .48, height * .48);
    const pixels = stamp.getImageData(0, 0, width, height).data;

    points = [];
    const spacing = width < 360 ? 4 : 5;
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        if (pixels[(y * width + x) * 4 + 3] < 120) continue;
        points.push({
          x, y,
          radius: 1 + (x * 7 + y * 11) % 19 / 20,
          phase: (x + y) * .033,
          accent: (x * 13 + y * 7) % 10 < 3,
        });
      }
    }
    formationStart = performance.now();
    frame.classList.toggle('is-rendered', points.length > 0);
    draw(formationStart);
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const motion = !paused;
    for (const point of points) {
      let x = point.x;
      let y = point.y;
      if (motion) {
        if (gather && time) {
          const progress = Math.min(1, Math.max(0, (time - formationStart) / 1250));
          const remaining = (1 - progress) ** 3;
          x += Math.cos(point.phase * 4.61) * width * .31 * remaining;
          y += Math.sin(point.phase * 6.23) * height * .37 * remaining;
        }
        y += Math.sin(time * .0017 + point.phase) * 1.25;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const displacement = Math.max(0, 1 - distance / 72) * .27;
          x += dx * displacement;
          y += dy * displacement;
        }
      }
      context.fillStyle = point.accent ? '#daf4a8' : '#c9b3fa';
      context.beginPath();
      context.arc(x, y, point.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(time) {
    animation = 0;
    draw(time);
    updateLoop();
  }

  function updateLoop() {
    const running = visible && !document.hidden && !paused;
    if (running && !animation) animation = requestAnimationFrame(animate);
    if (!running && animation) {
      cancelAnimationFrame(animation);
      animation = 0;
      draw(0);
    }
  }

  frame.addEventListener('pointermove', event => {
    const bounds = frame.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
  });
  frame.addEventListener('pointerleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', updateLoop);

  new ResizeObserver(sampleMonogram).observe(frame);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateLoop();
  }).observe(frame);
  document.fonts.ready.then(sampleMonogram);

  return {
    setPaused(value) {
      paused = value;
      updateLoop();
      if (paused) draw(0);
    },
  };
}
