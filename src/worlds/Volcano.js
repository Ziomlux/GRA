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
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x120100);
    scene.fog = new THREE.FogExp2(0x2a0600, 0.038);

    // Ambient
    scene.add(new THREE.AmbientLight(0x2a0800, 0.5));
    scene.add(new THREE.HemisphereLight(0x440800, 0xff3300, 0.4));

    // Lava glows
    const lavaGlow1 = new THREE.PointLight(0xff3300, 5, 22);
    lavaGlow1.position.set(0, 0.5, 0);
    scene.add(lavaGlow1);
    const lavaGlow2 = new THREE.PointLight(0xff6600, 3, 15);
    lavaGlow2.position.set(-8, 0.3, -8);
    scene.add(lavaGlow2);
    const lavaGlow3 = new THREE.PointLight(0xff2200, 3, 15);
    lavaGlow3.position.set(8, 0.3, 8);
    scene.add(lavaGlow3);
    const dirFire = new THREE.DirectionalLight(0xff4400, 1.5);
    dirFire.position.set(0, 15, -20);
    scene.add(dirFire);

    // Materials
    const lavaTex = this.textureLoader.load('./textures/lava.png');
    lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
    lavaTex.repeat.set(2, 2);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 1 });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x1a0e00, roughness: 1 });
    const hotRockMat = new THREE.MeshStandardMaterial({
      map: lavaTex, color: 0x3d1500,
      emissive: 0x660800, emissiveIntensity: 1.0, roughness: 0.9,
    });

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const gP = groundGeo.attributes.position;
    for (let i = 0; i < gP.count; i++) gP.setZ(i, (Math.random() - 0.5) * 0.3);
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x1f0800, roughness: 1, emissive: 0x200500, emissiveIntensity: 0.4 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lava rivers (shader)
    const lavaPlaneMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
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
    for (const r of [{ x: 0, z: 5, w: 3, d: 20 }, { x: -7, z: 0, w: 20, d: 2 }, { x: 5, z: -8, w: 2, d: 12 }]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), lavaPlaneMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(r.x, 0.02, r.z);
      scene.add(m);
    }

    // Ground cracks with ember glow
    const crackMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 3,
      transparent: true, opacity: 0.6,
    });
    for (let i = 0; i < 8; i++) {
      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 2 + Math.random() * 3),
        crackMat
      );
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = Math.random() * Math.PI;
      crack.position.set((Math.random() - 0.5) * 30, 0.03, (Math.random() - 0.5) * 30);
      scene.add(crack);
    }

    // Volcano cone
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 8, 14, 12),
      rockMat2
    );
    cone.position.set(0, 7, -22);
    scene.add(cone);

    const lavaTopMat = new THREE.MeshStandardMaterial({
      color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 2.5,
    });
    const lavaTop = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), lavaTopMat);
    lavaTop.rotation.x = -Math.PI / 2;
    lavaTop.position.set(0, 14.05, -22);
    scene.add(lavaTop);
    const lavaTopLight = new THREE.PointLight(0xff4400, 6, 25);
    lavaTopLight.position.set(0, 16, -22);
    scene.add(lavaTopLight);

    // Eruption flash light (starts off)
    const eruptionLight = new THREE.PointLight(0xffaa00, 0, 60);
    eruptionLight.position.set(0, 20, -22);
    scene.add(eruptionLight);

    // Rock pillars
    for (const [px, pz] of [[-12,-12],[12,-12],[-12,12],[12,12],[-6,-16],[6,-16],[-16,0],[16,0]]) {
      const h = 2 + Math.random() * 4;
      this.addCylinder(scene, px, pz, 0.6 + Math.random() * 0.4, h, Math.random() > 0.5 ? hotRockMat : rockMat);
    }

    // Boulders
    for (const [bx, bz] of [[-5,-10],[5,-10],[-10,0],[10,5],[-8,8],[8,-8],[3,12],[-12,-5]]) {
      const r = 0.5 + Math.random() * 1.2;
      const geo = new THREE.SphereGeometry(r, 7, 5);
      const geoPos = geo.attributes.position;
      for (let i = 0; i < geoPos.count; i++) {
        geoPos.setX(i, geoPos.getX(i) + (Math.random() - 0.5) * 0.2 * r);
        geoPos.setY(i, geoPos.getY(i) + (Math.random() - 0.5) * 0.2 * r);
        geoPos.setZ(i, geoPos.getZ(i) + (Math.random() - 0.5) * 0.2 * r);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, Math.random() > 0.3 ? rockMat : hotRockMat);
      mesh.position.set(bx, r * 0.8, bz);
      mesh.castShadow = true;
      scene.add(mesh);
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(bx - r, 0, bz - r), new THREE.Vector3(bx + r, r * 2, bz + r)
      ));
    }

    // Embers
    const emberCount = 350;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberPhase = new Float32Array(emberCount);
    const emberSpeed = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3]     = (Math.random() - 0.5) * 40;
      emberPos[i * 3 + 1] = Math.random() * 8;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      emberPhase[i] = Math.random() * Math.PI * 2;
      emberSpeed[i] = 0.5 + Math.random() * 1.5;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xff5500, size: 0.07, transparent: true, opacity: 0.85 });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    // Smoke
    const smokeCount = 150;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3]     = (Math.random() - 0.5) * 8;
      smokePos[i * 3 + 1] = 14 + Math.random() * 10;
      smokePos[i * 3 + 2] = -22 + (Math.random() - 0.5) * 4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
      color: 0x222222, size: 0.8, transparent: true, opacity: 0.25,
    }));
    scene.add(smoke);

    // Ash particles (small, slow falling)
    const ashCount = 200;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    for (let i = 0; i < ashCount; i++) {
      ashPos[i * 3]     = (Math.random() - 0.5) * 50;
      ashPos[i * 3 + 1] = Math.random() * 15;
      ashPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    const ashMesh = new THREE.Points(ashGeo, new THREE.PointsMaterial({
      color: 0x444444, size: 0.04, transparent: true, opacity: 0.35,
    }));
    scene.add(ashMesh);

    // Eruption timer
    let eruptionTimer = 8 + Math.random() * 12;

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      lavaPlaneMat.uniforms.uTime.value = t;

      // Embers rising
      const ep = embers.geometry.attributes.position.array;
      for (let i = 0; i < emberCount; i++) {
        ep[i * 3 + 1] += emberSpeed[i] * delta;
        ep[i * 3]     += Math.sin(t * 1.5 + emberPhase[i]) * 0.01;
        if (ep[i * 3 + 1] > 12) {
          ep[i * 3 + 1] = 0.1;
          ep[i * 3]     = (Math.random() - 0.5) * 40;
          ep[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
      }
      embers.geometry.attributes.position.needsUpdate = true;

      // Smoke rising
      const sp = smoke.geometry.attributes.position.array;
      for (let i = 0; i < smokeCount; i++) {
        sp[i * 3 + 1] += 0.8 * delta;
        sp[i * 3]     += Math.sin(t + i) * 0.005;
        if (sp[i * 3 + 1] > 30) sp[i * 3 + 1] = 14;
      }
      smoke.geometry.attributes.position.needsUpdate = true;

      // Ash falling
      const ap = ashMesh.geometry.attributes.position.array;
      for (let i = 0; i < ashCount; i++) {
        ap[i * 3 + 1] -= delta * 0.3;
        ap[i * 3]     += Math.sin(t * 0.5 + i * 0.1) * 0.003;
        if (ap[i * 3 + 1] < 0) ap[i * 3 + 1] = 15;
      }
      ashMesh.geometry.attributes.position.needsUpdate = true;

      // Pulsing lights
      lavaGlow1.intensity = 3.5 + Math.sin(t * 3) * 2;
      lavaGlow2.intensity = 2.5 + Math.sin(t * 2 + 1) * 1;
      lavaTopLight.intensity = 4 + Math.sin(t * 4) * 2.5;

      // Ground crack pulse
      crackMat.emissiveIntensity = 2 + Math.sin(t * 2) * 1.5;

      // Periodic eruption flash
      eruptionTimer -= delta;
      if (eruptionTimer <= 0) {
        eruptionTimer = 10 + Math.random() * 15;
        eruptionLight.intensity = 12;
        lavaTopMat.emissiveIntensity = 6;
      }
      if (eruptionLight.intensity > 0) {
        eruptionLight.intensity -= delta * 8;
        if (eruptionLight.intensity < 0) eruptionLight.intensity = 0;
      }
      if (lavaTopMat.emissiveIntensity > 2.5) {
        lavaTopMat.emissiveIntensity -= delta * 4;
      }
    };
  }

  buildPortals() {
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#90e0ef',
      targetWorldIndex: 4,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    }));
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#f4a261',
      targetWorldIndex: 1,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    }));

    // Secret NG+ loop portal
    const secret = createPortal({
      position: new THREE.Vector3(18, 1.6, 0),
      color: '#000000',
      targetWorldIndex: 1,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    });
    secret.mesh.userData.isLoopPortal = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.05, 16, 100),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    secret.mesh.add(rim);
    this.portals.push(secret);

    // Rocks to partially hide secret portal
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x221100 });
    this.addBox(this.scene, 16, 0, 3, 3, 5, 2, hideMat);
    this.addBox(this.scene, 16, 0, -3, 3, 5, 2, hideMat);
  }
}
