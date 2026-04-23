import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class Volcano extends World {
  constructor(index, total) {
    super();
    this.name = 'KRÓLESTWO WULKANU';
    this.icon = '🌋';
    this.portalColor = '#e63946';
    this.minimapBg = '#1a0500';
    this.mapSize = 50;
    this.worldType = 'volcano';
    this.xpReward = 90;
    this._index = index;
    this._total = total;
    this._embers = [];
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    // Deep red sky
    scene.background = new THREE.Color(0x1a0200);
    scene.fog = new THREE.FogExp2(0x330800, 0.04);

    // Ambient
    scene.add(new THREE.AmbientLight(0x3d0a00, 0.6));

    // "Lava glow" from below (red/orange upward lights)
    const lavaGlow1 = new THREE.PointLight(0xff3300, 4, 20);
    lavaGlow1.position.set(0, 0.5, 0);
    scene.add(lavaGlow1);
    const lavaGlow2 = new THREE.PointLight(0xff6600, 3, 15);
    lavaGlow2.position.set(-8, 0.3, -8);
    scene.add(lavaGlow2);
    const lavaGlow3 = new THREE.PointLight(0xff2200, 3, 15);
    lavaGlow3.position.set(8, 0.3, 8);
    scene.add(lavaGlow3);

    // Hemisphere light – lava floor / smoke sky
    const hemi = new THREE.HemisphereLight(0x330800, 0xff3300, 0.5);
    scene.add(hemi);

    // Materials
    const lavaTex = this.textureLoader.load('./textures/lava.png');
    lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
    lavaTex.repeat.set(2, 2);

    const lavaMat = new THREE.MeshStandardMaterial({
      map: lavaTex,
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 1.5,
      roughness: 0.6,
    });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 1, metalness: 0 });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x1a0e00, roughness: 1 });
    const hotRockMat = new THREE.MeshStandardMaterial({ 
      map: lavaTex,
      color: 0x3d1500, 
      emissive: 0x660800, 
      emissiveIntensity: 0.8, 
      roughness: 0.9 
    });

    // GROUND – cracked dark rock with lava shaders (use standard + strong emissive)
    const groundGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      gPos.setZ(i, (Math.random()-0.5)*0.3);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f0800, roughness: 1, emissive: 0x200500, emissiveIntensity: 0.4 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // LAVA RIVERS (flat glowing planes slightly elevated)
    const lavaRivers = [
      { x: 0, z: 5, w: 3, d: 20 },
      { x: -7, z: 0, w: 20, d: 2 },
      { x: 5, z: -8, w: 2, d: 12 },
    ];
    const lavaPlaneMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          float flow = sin(uv.x * 6.0 + uTime * 1.5) * 0.5 + sin(uv.y * 4.0 - uTime * 2.0) * 0.5;
          float heat = smoothstep(-0.2, 1.2, flow);
          vec3 lavaCol = mix(vec3(0.8, 0.0, 0.0), vec3(1.0, 0.5, 0.0), heat);
          lavaCol = mix(lavaCol, vec3(1.0, 0.9, 0.5), heat * heat * 0.6);
          gl_FragColor = vec4(lavaCol, 0.95);
        }
      `,
    });
    this._lavaMat = lavaPlaneMat;
    for (const r of lavaRivers) {
      const geo = new THREE.PlaneGeometry(r.w, r.d);
      const mesh = new THREE.Mesh(geo, lavaPlaneMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(r.x, 0.02, r.z);
      scene.add(mesh);
    }

    // VOLCANO CONE in back
    const coneGeo = new THREE.CylinderGeometry(0, 8, 14, 12);
    const cone = new THREE.Mesh(coneGeo, rockMat2);
    cone.position.set(0, 7, -22);
    scene.add(cone);
    // Lava at top
    const lavaTopGeo = new THREE.CircleGeometry(1.5, 16);
    const lavaTop = new THREE.Mesh(lavaTopGeo, lavaMat);
    lavaTop.rotation.x = -Math.PI / 2;
    lavaTop.position.set(0, 14.05, -22);
    scene.add(lavaTop);
    const lavaTopLight = new THREE.PointLight(0xff4400, 5, 20);
    lavaTopLight.position.set(0, 16, -22);
    scene.add(lavaTopLight);

    // Rock formations / pillars
    const pillarPositions = [
      [-12, -12], [12, -12], [-12, 12], [12, 12],
      [-6, -16], [6, -16], [-16, 0], [16, 0],
    ];
    for (const [px, pz] of pillarPositions) {
      const h = 2 + Math.random() * 4;
      this.addCylinder(scene, px, pz, 0.6 + Math.random() * 0.4, h, Math.random() > 0.5 ? hotRockMat : rockMat);
    }

    // Big rock boulders
    const boulderPositions = [
      [-5, -10], [5, -10], [-10, 0], [10, 5],
      [-8, 8], [8, -8], [3, 12], [-12, -5],
    ];
    for (const [bx, bz] of boulderPositions) {
      const r = 0.5 + Math.random() * 1.2;
      const geo = new THREE.SphereGeometry(r, 7, 5);
      const geo2Pos = geo.attributes.position;
      for (let i = 0; i < geo2Pos.count; i++) {
        geo2Pos.setX(i, geo2Pos.getX(i) + (Math.random()-0.5)*0.2*r);
        geo2Pos.setY(i, geo2Pos.getY(i) + (Math.random()-0.5)*0.2*r);
        geo2Pos.setZ(i, geo2Pos.getZ(i) + (Math.random()-0.5)*0.2*r);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, Math.random() > 0.3 ? rockMat : hotRockMat);
      mesh.position.set(bx, r * 0.8, bz);
      mesh.castShadow = true;
      scene.add(mesh);
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(bx-r, 0, bz-r),
        new THREE.Vector3(bx+r, r*2, bz+r)
      ));
    }

    // EMBER PARTICLES
    const emberGeo = new THREE.BufferGeometry();
    const emberCount = 300;
    const emberPos = new Float32Array(emberCount * 3);
    const emberPhase = new Float32Array(emberCount);
    const emberSpeed = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i*3]   = (Math.random()-0.5) * 40;
      emberPos[i*3+1] = Math.random() * 8;
      emberPos[i*3+2] = (Math.random()-0.5) * 40;
      emberPhase[i] = Math.random() * Math.PI * 2;
      emberSpeed[i] = 0.5 + Math.random() * 1.5;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xff5500, size: 0.07, transparent: true, opacity: 0.85 });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    // Smoke particles (dark grey rising)
    const smokeGeo = new THREE.BufferGeometry();
    const smokeCount = 150;
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i*3]   = (Math.random()-0.5)*8;
      smokePos[i*3+1] = 14 + Math.random()*10;
      smokePos[i*3+2] = -22 + (Math.random()-0.5)*4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({ color: 0x222222, size: 0.8, transparent: true, opacity: 0.25 });
    const smoke = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smoke);

    // State for final world wrap-around portal back to ruins
    this._lavaTop = lavaTopLight;

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      lavaPlaneMat.uniforms.uTime.value = t;

      // Ember rising
      const ep = embers.geometry.attributes.position.array;
      for (let i = 0; i < emberCount; i++) {
        ep[i*3+1] += emberSpeed[i] * delta;
        ep[i*3]   += Math.sin(t * 1.5 + emberPhase[i]) * 0.01;
        if (ep[i*3+1] > 12) {
          ep[i*3+1] = 0.1;
          ep[i*3]   = (Math.random()-0.5)*40;
          ep[i*3+2] = (Math.random()-0.5)*40;
        }
      }
      embers.geometry.attributes.position.needsUpdate = true;

      // Smoke rising from volcano
      const sp = smoke.geometry.attributes.position.array;
      for (let i = 0; i < smokeCount; i++) {
        sp[i*3+1] += 0.8 * delta;
        sp[i*3]   += Math.sin(t + i) * 0.005;
        if (sp[i*3+1] > 30) sp[i*3+1] = 14;
      }
      smoke.geometry.attributes.position.needsUpdate = true;

      // Pulsing lights
      lavaGlow1.intensity = 3.5 + Math.sin(t * 3) * 1.5;
      lavaGlow2.intensity = 2.5 + Math.sin(t * 2 + 1) * 1;
      this._lavaTop.intensity = 4 + Math.sin(t * 4) * 2;
    };
  }

  buildPortals() {
    // Back to Ice Cave
    const prev = createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#90e0ef',
      targetWorldIndex: 4,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    });
    this.portals.push(prev);

    // Wrap-around back to Ancient Ruins (makes loop)
    const next = createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#f4a261',
      targetWorldIndex: 1,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    });
    this.portals.push(next);

    // --- SECRET LOOP PORTAL (NG+) ---
    const secret = createPortal({
      position: new THREE.Vector3(18, 1.6, 0),
      color: '#000000', // Black hole look
      targetWorldIndex: 1,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    });
    secret.mesh.userData.isLoopPortal = true;
    // Add a glowing rim for the secret portal
    const rimGeo = new THREE.TorusGeometry(2.6, 0.05, 16, 100);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    secret.mesh.add(rim);

    this.portals.push(secret);

    // Add some rocks to "hide" it partially
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
    this.addBox(this.scene, 16, 0, 3, 3, 5, 2, rockMat);
    this.addBox(this.scene, 16, 0, -3, 3, 5, 2, rockMat);
  }
}
