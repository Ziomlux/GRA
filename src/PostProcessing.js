import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ── Combined Shader: Vignette + Color Grading + Film Grain ────
const CombinedShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteIntensity: { value: 0.4 },
    uVignetteSoftness: { value: 0.35 },
    uGrainIntensity: { value: 0.03 },
    uBrightness: { value: 0.0 },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignetteIntensity;
    uniform float uVignetteSoftness;
    uniform float uGrainIntensity;
    uniform float uBrightness;
    uniform float uContrast;
    uniform float uSaturation;
    uniform vec3 uTint;
    varying vec2 vUv;

    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      vec3 c = texColor.rgb;

      // Brightness & Contrast
      c = (c - 0.5) * uContrast + 0.5 + uBrightness;

      // Saturation
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(lum), c, uSaturation);

      // Tint
      c *= uTint;

      // Vignette
      vec2 uv = vUv - 0.5;
      float dist = length(uv) * 1.414;
      float vig = smoothstep(1.0, 1.0 - uVignetteSoftness, dist);
      c *= mix(1.0, vig, uVignetteIntensity);

      // Film grain
      float noise = fract(sin(dot(vUv * 1000.0 + uTime * 137.0, vec2(12.9898, 78.233))) * 43758.5453);
      c += (noise - 0.5) * uGrainIntensity;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), texColor.a);
    }
  `,
};

// ── Per-World Visual Profiles ─────────────────────────────────
const PROFILES = {
  hub: {
    bloomStrength: 0.3, bloomRadius: 0.4, bloomThreshold: 0.78,
    vignetteIntensity: 0.25, vignetteSoftness: 0.45,
    grainIntensity: 0.015,
    brightness: 0.02, contrast: 1.05, saturation: 1.15,
    tint: [1.0, 0.97, 0.92],
  },
  ruins: {
    bloomStrength: 0.4, bloomRadius: 0.35, bloomThreshold: 0.7,
    vignetteIntensity: 0.5, vignetteSoftness: 0.32,
    grainIntensity: 0.04,
    brightness: -0.02, contrast: 1.1, saturation: 0.9,
    tint: [1.05, 0.95, 0.8],
  },
  forest: {
    bloomStrength: 0.5, bloomRadius: 0.5, bloomThreshold: 0.6,
    vignetteIntensity: 0.65, vignetteSoftness: 0.28,
    grainIntensity: 0.03,
    brightness: -0.05, contrast: 1.15, saturation: 0.85,
    tint: [0.85, 1.05, 0.9],
  },
  space: {
    bloomStrength: 0.6, bloomRadius: 0.4, bloomThreshold: 0.5,
    vignetteIntensity: 0.4, vignetteSoftness: 0.35,
    grainIntensity: 0.03,
    brightness: -0.03, contrast: 1.2, saturation: 1.0,
    tint: [0.85, 0.9, 1.1],
  },
  ice: {
    bloomStrength: 0.45, bloomRadius: 0.45, bloomThreshold: 0.65,
    vignetteIntensity: 0.45, vignetteSoftness: 0.35,
    grainIntensity: 0.02,
    brightness: 0.0, contrast: 1.1, saturation: 0.95,
    tint: [0.88, 0.95, 1.1],
  },
  volcano: {
    bloomStrength: 0.55, bloomRadius: 0.5, bloomThreshold: 0.55,
    vignetteIntensity: 0.55, vignetteSoftness: 0.28,
    grainIntensity: 0.05,
    brightness: -0.03, contrast: 1.2, saturation: 1.1,
    tint: [1.15, 0.9, 0.75],
  },
};

// ── PostProcessing Class ──────────────────────────────────────
export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.enabled = true;

    // Create composer
    this.composer = new EffectComposer(renderer);

    // Render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Bloom pass
    const res = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(res, 0.4, 0.4, 0.7);
    this.composer.addPass(this.bloomPass);

    // Combined pass (vignette + color grading + film grain)
    this.combinedPass = new ShaderPass(CombinedShader);
    this.composer.addPass(this.combinedPass);

    // Camera shake state
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffset = new THREE.Vector3();
  }

  setScene(scene, camera) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.camera = camera;
  }

  setProfile(profileName) {
    const p = PROFILES[profileName] || PROFILES.hub;
    this.bloomPass.strength = p.bloomStrength;
    this.bloomPass.radius = p.bloomRadius;
    this.bloomPass.threshold = p.bloomThreshold;

    const u = this.combinedPass.uniforms;
    u.uVignetteIntensity.value = p.vignetteIntensity;
    u.uVignetteSoftness.value = p.vignetteSoftness;
    u.uGrainIntensity.value = p.grainIntensity;
    u.uBrightness.value = p.brightness;
    u.uContrast.value = p.contrast;
    u.uSaturation.value = p.saturation;
    u.uTint.value.set(p.tint[0], p.tint[1], p.tint[2]);
  }

  triggerShake(intensity = 0.12, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }

  update(delta) {
    this.combinedPass.uniforms.uTime.value = performance.now() * 0.001;

    // Calculate shake offset
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeTimer < this.shakeDuration) {
      this.shakeTimer += delta;
      const decay = 1 - (this.shakeTimer / this.shakeDuration);
      const i = this.shakeIntensity * decay;
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * i,
        (Math.random() - 0.5) * 2 * i,
        0
      );
    }
  }

  render() {
    if (!this.enabled) {
      this.renderer.render(this.renderPass.scene, this.camera);
      return;
    }
    // Apply shake offset temporarily
    this.camera.position.add(this.shakeOffset);
    this.composer.render();
    this.camera.position.sub(this.shakeOffset);
  }

  onResize(w, h) {
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  setEnabled(on) {
    this.enabled = on;
  }
}
