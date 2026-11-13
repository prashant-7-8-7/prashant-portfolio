import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The software renderer shares the perspective camera with WebGL.
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
    scene.traverse(object => {
      if (!object.isMesh) return;

      const geometry = simplify(object.geometry);
      const record = {
        object,
        positions: geometry.attributes.position.array,
        normals: geometry.attributes.normal.array,
        uv: geometry.attributes.uv?.array,
        indices: geometry.index?.array,
        projected: new Float32Array(geometry.attributes.position.count * 5),
        color: new Uint8Array(3),
        texture: getTexture(object.material.map),
        doubleSided: object.material.side === THREE.DoubleSide,
        lit: !object.material.isMeshBasicMaterial,
      };
      (object.material.transparent ? transparent : opaque).push(record);
    });
    return { opaque, transparent };
  }

  function project(record) {
    const { object, positions, normals, projected, lit } = record;
    const m = transform.multiplyMatrices(viewProjection, object.matrixWorld).elements;
    const n = normalTransform.getNormalMatrix(object.matrixWorld).elements;

    for (let i = 0, output = 0; i < positions.length; i += 3, output += 5) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      const inverse = w > .075 ? 1 / w : 0;
      projected[output] = (1 + (m[0] * x + m[4] * y + m[8] * z + m[12]) * inverse) * width * .5;
      projected[output + 1] = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) * inverse) * height * .5;
      projected[output + 2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * inverse;
      projected[output + 4] = inverse;

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
    const { projected: points, color, texture, uv, object, doubleSided } = record;
    const opacity = object.material.opacity;
    const ai = a * 5;
    const bi = b * 5;
    const ci = c * 5;
    const wa = points[ai + 4], wb = points[bi + 4], wc = points[ci + 4];
    if (!wa || !wb || !wc) return;
    const ax = points[ai];
    const ay = points[ai + 1];
    const bx = points[bi];
    const by = points[bi + 1];
    const cx = points[ci];
    const cy = points[ci + 1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < .035 || (area > 0 && !doubleSided)) return;

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
          const inv = 1 / (wa * w0 + wb * w1 + wc * w2);
          const u = (uv[a * 2] * wa * w0 + uv[b * 2] * wb * w1 + uv[c * 2] * wc * w2) * inv;
          const v = (uv[a * 2 + 1] * wa * w0 + uv[b * 2 + 1] * wb * w1 + uv[c * 2 + 1] * wc * w2) * inv;
          const tx = Math.min(texture.width - 1, Math.max(0, Math.round(u * (texture.width - 1))));
          const ty = Math.min(texture.height - 1, Math.max(0, Math.round((1 - v) * (texture.height - 1))));
          const index = (ty * texture.width + tx) * 4;
          r *= texture.data[index] / 255;
          g *= texture.data[index + 1] / 255;
          blue *= texture.data[index + 2] / 255;
          weight *= texture.data[index + 3] / 255;
        }

        if (alpha) {
          const background = pixels[offset + 3] / 255 * (1 - weight);
          const output = weight + background;
          if (!output) continue;
          pixels[offset] = (pixels[offset] * background + r * weight) / output;
          pixels[offset + 1] = (pixels[offset + 1] * background + g * weight) / output;
          pixels[offset + 2] = (pixels[offset + 2] * background + blue * weight) / output;
          pixels[offset + 3] = output * 255;
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
    const hex = record.object.material.color.getHex();
    record.color[0] = hex >> 16;
    record.color[1] = hex >> 8;
    record.color[2] = hex;
    project(record);
    const { indices, positions } = record;
    const count = indices?.length ?? positions.length / 3;
    for (let i = 0; i < count; i += 3) {
      if (indices) drawTriangle(record, indices[i], indices[i + 1], indices[i + 2], alpha);
      else drawTriangle(record, i, i + 1, i + 2, alpha);
    }
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
    },
  };
}
