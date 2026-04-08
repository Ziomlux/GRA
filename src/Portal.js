import * as THREE from 'three';

/**
 * Creates a glowing animated portal mesh.
 * @param {object} opts
 */
export function createPortal(opts = {}) {
  const {
    position = new THREE.Vector3(0, 0, 0),
    color = '#7b2fff',
    targetWorldIndex = 0,
    direction = 'next',
    label = '',
    exitPosition = null,
  } = opts;

  const group = new THREE.Group();
  group.position.copy(position);

  const col = new THREE.Color(color);

  // --- Outer ring glow ---
  const ringGeo = new THREE.TorusGeometry(1.6, 0.12, 16, 80);
  const ringMat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 3,
    roughness: 0.1,
    metalness: 0.9,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  // --- Inner shader plane (swirling effect via ShaderMaterial) ---
  const portalGeo = new THREE.CircleGeometry(1.5, 64);
  const portalMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv);
        float angle = atan(uv.y, uv.x);

        // Swirl
        float swirl = sin(angle * 4.0 + uTime * 2.0 + r * 8.0) * 0.5 + 0.5;
        float swirl2 = sin(angle * 2.0 - uTime * 1.5 + r * 12.0) * 0.5 + 0.5;

        // Edge fade
        float edge = smoothstep(0.5, 0.45, r);
        float center = 1.0 - smoothstep(0.0, 0.3, r);

        vec3 col = mix(uColor * 0.3, uColor * 1.5, swirl * 0.6 + swirl2 * 0.4);
        col = mix(col, vec3(1.0), center * 0.4);

        float alpha = edge * (0.6 + swirl * 0.4);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const portalPlane = new THREE.Mesh(portalGeo, portalMat);
  group.add(portalPlane);

  // --- Point light inside portal ---
  const light = new THREE.PointLight(col, 4, 8);
  group.add(light);

  // --- Particle sparks ---
  const sparkCount = 60;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkPhase = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    sparkPhase[i] = Math.random() * Math.PI * 2;
    // initial position
    sparkPos[i * 3] = 0; sparkPos[i * 3 + 1] = 0; sparkPos[i * 3 + 2] = 0;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: col, size: 0.06, transparent: true, opacity: 0.8 });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparks);

  // --- Update function ---
  let time = 0;
  group.userData.update = (delta) => {
    time += delta;
    portalPlane.material.uniforms.uTime.value = time;

    // Pulsing ring scale
    const pulse = 1 + Math.sin(time * 3) * 0.03;
    ring.scale.set(pulse, pulse, 1);

    // Light pulse
    light.intensity = 3 + Math.sin(time * 4) * 1.5;

    // Spark animation - orbit around ring
    const positions = sparks.geometry.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      const phase = sparkPhase[i] + time * (1.2 + (i % 3) * 0.3);
      const radius = 1.5 + Math.sin(time * 2 + sparkPhase[i]) * 0.15;
      positions[i * 3]     = Math.cos(phase) * radius;
      positions[i * 3 + 1] = Math.sin(phase) * radius;
      positions[i * 3 + 2] = Math.sin(time * 3 + sparkPhase[i]) * 0.1;
    }
    sparks.geometry.attributes.position.needsUpdate = true;
  };

  return {
    mesh: group,
    targetWorldIndex,
    direction,
    color,
    exitPosition: exitPosition || position.clone().add(new THREE.Vector3(0, 0, 2)),
  };
}
