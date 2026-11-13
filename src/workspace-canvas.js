import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The workspace uses an orthographic camera. That lets this small software
// renderer interpolate depth, lighting, and texture coordinates in screen space.
export function createCanvasRenderer(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas unavailable');

  let width = 0;
  let height = 0;
  let image;
  let depth;
  let objects;
  const viewProjection = new THREE.Matrix4();
  const transform = new THREE.Matrix4();
  const frustum = new THREE.Frustum();
  const normalTransform = new THREE.Matrix3();
  const projectedPoint = new THREE.Vector3();
  const geometryCache = new Map();
  const textureCache = new Map();
  const light = new THREE.Vector3(-.42, .82, .42).normalize();
  const rim = new THREE.Vector3(.62, .44, -.6).normalize();

  function simplify(source) {
    if (geometryCache.has(source)) return geometryCache.get(source);
    const p = source.parameters;
    let geometry = source;
    if (source.type === 'RoundedBoxGeometry') {
      const broadFace = Math.max(p.width, p.height, p.depth) >= .5 && p.radius >= .035;
      geometry = broadFace
        ? new RoundedBoxGeometry(p.width, p.height, p.depth, 1, p.radius)
        : new THREE.BoxGeometry(p.width, p.height, p.depth);
    } else if (source.type === 'SphereGeometry') {
      geometry = new THREE.SphereGeometry(p.radius, 13, 9, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    } else if (source.type === 'CylinderGeometry') {
      geometry = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, Math.min(13, p.radialSegments));
    } else if (source.type === 'TorusGeometry') {
      geometry = new THREE.TorusGeometry(p.radius, p.tube, 5, 22);
    } else if (source.type === 'TubeGeometry') {
      geometry = new THREE.TubeGeometry(p.path, 9, p.radius, 5, p.closed);
    }
    geometryCache.set(source, geometry);
    return geometry;
  }

  function getTexture(map) {
    const source = map?.image;
    if (!source?.getContext) return null;
    if (!textureCache.has(map)) {
      textureCache.set(map, source.getContext('2d').getImageData(0, 0, source.width, source.height));
    }
    return textureCache.get(map);
  }

  function collect(scene) {
    const opaque = [];
    const transparent = [];
    const decorations = [];
    scene.traverse(object => {
      if (object.isLine || object.isPoints) {
        decorations.push(object);
        return;
      }
      if (!object.isMesh) return;

      const geometry = simplify(object.geometry);
      const color = object.material.color.getHex();
      const record = {
        object,
        positions: geometry.attributes.position.array,
        normals: geometry.attributes.normal.array,
        uv: geometry.attributes.uv?.array,
        indices: geometry.index?.array,
        projected: new Float32Array(geometry.attributes.position.count * 4),
        color: [(color >> 16) & 255, (color >> 8) & 255, color & 255],
        texture: getTexture(object.material.map),
        opacity: object.material.opacity,
        lit: !object.material.isMeshBasicMaterial,
      };
      (object.material.transparent ? transparent : opaque).push(record);
    });
    return { opaque, transparent, decorations };
  }

  function project(record) {
    const { object, positions, normals, projected, lit } = record;
    const m = transform.multiplyMatrices(viewProjection, object.matrixWorld).elements;
    const n = normalTransform.getNormalMatrix(object.matrixWorld).elements;

    for (let i = 0, output = 0; i < positions.length; i += 3, output += 4) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      projected[output] = (1 + m[0] * x + m[4] * y + m[8] * z + m[12]) * width * .5;
      projected[output + 1] = (1 - m[1] * x - m[5] * y - m[9] * z - m[13]) * height * .5;
      projected[output + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];

      let brightness = 1;
      if (lit) {
        const nx = n[0] * normals[i] + n[3] * normals[i + 1] + n[6] * normals[i + 2];
        const ny = n[1] * normals[i] + n[4] * normals[i + 1] + n[7] * normals[i + 2];
        const nz = n[2] * normals[i] + n[5] * normals[i + 1] + n[8] * normals[i + 2];
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const diffuse = Math.max(0, (nx * light.x + ny * light.y + nz * light.z) / length);
        const backlight = Math.max(0, (nx * rim.x + ny * rim.y + nz * rim.z) / length);
        brightness = .52 + .59 * diffuse + .18 * backlight;
      }
      projected[output + 3] = brightness;
    }
  }

  function drawTriangle(record, a, b, c, alpha) {
    const { projected: points, color, texture, uv, opacity } = record;
    const ai = a * 4;
    const bi = b * 4;
    const ci = c * 4;
    const ax = points[ai];
    const ay = points[ai + 1];
    const bx = points[bi];
    const by = points[bi + 1];
    const cx = points[ci];
    const cy = points[ci + 1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area >= -.035) return;

    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    const w0x = (by - cy) / area;
    const w0y = (cx - bx) / area;
    const w1x = (cy - ay) / area;
    const w1y = (ax - cx) / area;
    const pixels = image.data;
    const za = points[ai + 2];
    const zb = points[bi + 2];
    const zc = points[ci + 2];
    const lightA = points[ai + 3];
    const lightB = points[bi + 3];
    const lightC = points[ci + 3];

    for (let y = minY; y <= maxY; y++) {
      let w0 = w0x * (minX + .5 - cx) + w0y * (y + .5 - cy);
      let w1 = w1x * (minX + .5 - cx) + w1y * (y + .5 - cy);
      for (let x = minX; x <= maxX; x++, w0 += w0x, w1 += w1x) {
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const pixel = y * width + x;
        const z = za * w0 + zb * w1 + zc * w2;
        if (z >= depth[pixel]) continue;

        const offset = pixel * 4;
        let r = color[0];
        let g = color[1];
        let blue = color[2];
        let weight = opacity;
        if (texture && uv) {
          const u = uv[a * 2] * w0 + uv[b * 2] * w1 + uv[c * 2] * w2;
          const v = uv[a * 2 + 1] * w0 + uv[b * 2 + 1] * w1 + uv[c * 2 + 1] * w2;
          const tx = Math.min(texture.width - 1, Math.max(0, Math.round(u * (texture.width - 1))));
          const ty = Math.min(texture.height - 1, Math.max(0, Math.round((1 - v) * (texture.height - 1))));
          const index = (ty * texture.width + tx) * 4;
          r *= texture.data[index] / 255;
          g *= texture.data[index + 1] / 255;
          blue *= texture.data[index + 2] / 255;
          weight *= texture.data[index + 3] / 255;
        }

        if (alpha) {
          if (pixels[offset + 3] === 0) continue;
          pixels[offset] = pixels[offset] * (1 - weight) + r * weight;
          pixels[offset + 1] = pixels[offset + 1] * (1 - weight) + g * weight;
          pixels[offset + 2] = pixels[offset + 2] * (1 - weight) + blue * weight;
        } else {
          const shade = lightA * w0 + lightB * w1 + lightC * w2;
          pixels[offset] = r * shade;
          pixels[offset + 1] = g * shade;
          pixels[offset + 2] = blue * shade;
          pixels[offset + 3] = 255;
          depth[pixel] = z;
        }
      }
    }
  }

  function drawObject(record, alpha) {
    for (let object = record.object; object; object = object.parent) {
      if (!object.visible) return;
    }
    if (!frustum.intersectsObject(record.object)) return;
    project(record);
    const { indices, positions } = record;
    const count = indices?.length ?? positions.length / 3;
    for (let i = 0; i < count; i += 3) {
      if (indices) drawTriangle(record, indices[i], indices[i + 1], indices[i + 2], alpha);
      else drawTriangle(record, i, i + 1, i + 2, alpha);
    }
  }

  function pixelPoint(object, index) {
    const position = object.geometry.attributes.position;
    projectedPoint.fromBufferAttribute(position, index);
    projectedPoint.applyMatrix4(object.matrixWorld).applyMatrix4(viewProjection);
    return [(projectedPoint.x + 1) * .5 * width, (1 - projectedPoint.y) * .5 * height, projectedPoint.z];
  }

  function visibleAt(x, y, z) {
    const px = Math.round(x);
    const py = Math.round(y);
    return px >= 0 && py >= 0 && px < width && py < height && z < depth[py * width + px];
  }

  function drawDecoration(object) {
    if (!object.visible) return;
    const count = object.geometry.attributes.position.count;
    if (object.isPoints) {
      const palette = ['#cebefc', '#b5dfff', '#d9f5a4', '#d19cd5'];
      context.globalAlpha = .67;
      for (let i = 0; i < count; i++) {
        const [x, y, z] = pixelPoint(object, i);
        if (!visibleAt(x, y, z)) continue;
        context.fillStyle = palette[i % palette.length];
        context.beginPath();
        context.arc(x, y, .68 + (i % 5) * .105, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      context.fillStyle = '#dfcfff';
      context.globalAlpha = .53;
      let phase = 0;
      for (let i = 1; i < count; i++) {
        const [x0, y0, z0] = pixelPoint(object, i - 1);
        const [x1, y1, z1] = pixelPoint(object, i);
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let step = 0; step < steps; step++, phase++) {
          if (phase % 9 > 4) continue;
          const fraction = step / steps;
          const x = x0 + (x1 - x0) * fraction;
          const y = y0 + (y1 - y0) * fraction;
          const z = z0 + (z1 - z0) * fraction;
          if (visibleAt(x, y, z)) context.fillRect(x, y, 1.2, 1.2);
        }
      }
    }
    context.globalAlpha = 1;
  }

  return {
    setSize(cssWidth, cssHeight) {
      const scale = Math.min(1, 760 / cssWidth, 500 / cssHeight);
      width = Math.max(1, Math.round(cssWidth * scale));
      height = Math.max(1, Math.round(cssHeight * scale));
      canvas.width = width;
      canvas.height = height;
      image = context.createImageData(width, height);
      depth = new Float32Array(width * height);
    },
    render(scene, camera) {
      scene.updateMatrixWorld(true);
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      objects ??= collect(scene);
      image.data.fill(0);
      depth.fill(Infinity);
      for (const record of objects.opaque) drawObject(record, false);
      for (const record of objects.transparent) drawObject(record, true);
      context.putImageData(image, 0, 0);
      for (const object of objects.decorations) drawDecoration(object);
    },
  };
}
