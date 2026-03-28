/**
 * R3F Custom Utilities — Extended geometries & shader materials
 *
 * BentPlaneGeometry — curved plane for 3D card/image displays
 * MeshSineMaterial  — animated sine-wave distortion material
 * GradientTexture   — procedural gradient texture generator
 *
 * These extend Three.js via R3F's `extend()` API so they can be
 * used as JSX elements: <bentPlaneGeometry />, <meshSineMaterial />
 */

import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// ═══════════════════════════════════════════════
// BentPlaneGeometry — curved card geometry
// Used for carousel cards, image galleries
// ═══════════════════════════════════════════════
export class BentPlaneGeometry extends THREE.PlaneGeometry {
  constructor(radius: number, width: number, height: number, widthSegments: number, heightSegments: number) {
    super(width, height, widthSegments, heightSegments);
    const p = this.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      // Bend the plane along a circular arc
      const angle = x / radius;
      p.setXYZ(i, Math.sin(angle) * radius, p.getY(i), Math.cos(angle) * radius - radius);
    }
    p.needsUpdate = true;
    this.computeVertexNormals();
  }
}

// ═══════════════════════════════════════════════
// MeshSineMaterial — sine wave scrolling distortion
// Extends MeshBasicMaterial with animated wave effect
// ═══════════════════════════════════════════════
export class MeshSineMaterial extends THREE.MeshBasicMaterial {
  _time: { value: number };

  constructor(parameters: THREE.MeshBasicMaterialParameters & { time?: number } = {}) {
    super(parameters);
    this.setValues(parameters);
    this._time = { value: parameters.time || 0 };
  }

  get time() {
    return this._time;
  }

  onBeforeCompile(shader: { uniforms: Record<string, { value: any }>; vertexShader: string; fragmentShader: string }) {
    shader.uniforms.time = this._time;

    shader.vertexShader = `
      uniform float time;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position.x, position.y + sin(time + uv.x * PI * 4.0) * 0.02, position.z);`,
    );

    // Add PI constant
    shader.vertexShader = shader.vertexShader.replace(
      'uniform float time;',
      `uniform float time;\n#define PI 3.14159265359`,
    );
  }
}

// ═══════════════════════════════════════════════
// WaveShaderMaterial — full custom shader for animated waves
// ═══════════════════════════════════════════════
export class WaveShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#0ea5e9') },
        uColor2: { value: new THREE.Color('#8b5cf6') },
        uColor3: { value: new THREE.Color('#ec4899') },
        uAmplitude: { value: 0.3 },
        uFrequency: { value: 2.0 },
        uSpeed: { value: 1.0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uSpeed;
        uniform vec2 uMouse;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Wave displacement
          float wave1 = sin(pos.x * uFrequency + uTime * uSpeed) * uAmplitude;
          float wave2 = sin(pos.y * uFrequency * 0.8 + uTime * uSpeed * 0.6) * uAmplitude * 0.5;
          float wave3 = cos(pos.x * uFrequency * 1.5 + pos.y * uFrequency + uTime * uSpeed * 0.8) * uAmplitude * 0.3;

          // Mouse influence
          float dist = length(vec2(pos.x - uMouse.x * 5.0, pos.y - uMouse.y * 5.0));
          float mouseWave = sin(dist * 3.0 - uTime * 4.0) * 0.15 * max(0.0, 1.0 - dist * 0.3);

          pos.z += wave1 + wave2 + wave3 + mouseWave;
          vElevation = pos.z;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uTime;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          // Mix 3 colors based on elevation and UV
          float mixFactor1 = smoothstep(-0.3, 0.3, vElevation);
          float mixFactor2 = smoothstep(0.0, 1.0, vUv.x + sin(uTime * 0.2) * 0.3);
          vec3 color = mix(uColor1, uColor2, mixFactor1);
          color = mix(color, uColor3, mixFactor2 * 0.5);

          // Add subtle shimmer
          float shimmer = sin(vUv.x * 50.0 + uTime) * 0.02 + sin(vUv.y * 50.0 - uTime * 0.7) * 0.02;
          color += shimmer;

          gl_FragColor = vec4(color, 0.85);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false,
    });
  }
}

// ═══════════════════════════════════════════════
// ParticleFieldMaterial — custom particles with mouse interaction
// ═══════════════════════════════════════════════
export class ParticleFieldMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uSize: { value: 3.0 },
        uColor1: { value: new THREE.Color('#06b6d4') },
        uColor2: { value: new THREE.Color('#a855f7') },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uMouse;
        uniform float uSize;
        attribute float aScale;
        attribute float aSpeed;
        varying float vDistance;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Float animation
          pos.y += sin(uTime * aSpeed + pos.x * 2.0) * 0.3;
          pos.x += cos(uTime * aSpeed * 0.5 + pos.z) * 0.2;

          // Mouse repulsion
          vec3 toMouse = pos - uMouse;
          float dist = length(toMouse);
          if (dist < 2.0) {
            pos += normalize(toMouse) * (2.0 - dist) * 0.5;
          }

          vDistance = dist;
          vAlpha = smoothstep(15.0, 0.0, length(pos));

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying float vDistance;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          vec3 color = mix(uColor1, uColor2, sin(vDistance + uTime) * 0.5 + 0.5);

          gl_FragColor = vec4(color, glow * vAlpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}

// ═══════════════════════════════════════════════
// Procedural Gradient Texture
// ═══════════════════════════════════════════════
export function createGradientTexture(
  colors: string[] = ['#0ea5e9', '#8b5cf6', '#ec4899'],
  size = 512,
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, size, 0);
  colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ═══════════════════════════════════════════════
// Register custom elements with R3F
// ═══════════════════════════════════════════════
extend({
  BentPlaneGeometry,
  MeshSineMaterial,
  WaveShaderMaterial,
  ParticleFieldMaterial,
});

// TypeScript JSX declarations
declare module '@react-three/fiber' {
  interface ThreeElements {
    bentPlaneGeometry: any;
    meshSineMaterial: any;
    waveShaderMaterial: any;
    particleFieldMaterial: any;
  }
}
