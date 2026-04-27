import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class HubIsland extends World {
  constructor(index, total) {
    super();
    this.name = 'WYSPA HUB';
    this.icon = '🏝️';
    this.portalColor = '#f4a261';
    this.minimapBg = '#0a1a2e';
    this.mapSize = 60;
    this.worldType = 'hub';
    this.xpReward = 0;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    // Sky – deep twilight blue
    scene.background = new THREE.Color(0x06182e);
    scene.fog = new THREE.FogExp2(0x06182e, 0.014);

    // Lighting – golden hour warmth
    scene.add(new THREE.AmbientLight(0x5a8ab5, 0.35));
    const sun = new THREE.DirectionalLight(0xffcc77, 2.2);
    sun.position.set(15, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    sun.shadow.camera.far = 100;
    scene.add(sun);

    // Warm rim light
    const rimLight = new THREE.DirectionalLight(0xff9944, 0.4);
    rimLight.position.set(-20, 8, -15);
    scene.add(rimLight);

    // Cool sky fill
    const skyFill = new THREE.HemisphereLight(0x3366aa, 0x224422, 0.3);
    scene.add(skyFill);

    // ── OCEAN ──
    const oceanGeo = new THREE.PlaneGeometry(300, 300, 80, 80);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0055aa,
      roughness: 0.04,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.5,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.3;
    scene.add(ocean);

    // Ocean glow
    const oceanLight = new THREE.PointLight(0x0066cc, 1.5, 40);
    oceanLight.position.set(0, -1, 0);
    scene.add(oceanLight);

    // ── ISLAND BASE ──
    const islandGeo = new THREE.CylinderGeometry(22, 24, 1.2, 48);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xe8c98a, roughness: 0.95 });
    const island = new THREE.Mesh(islandGeo, sandMat);
    island.position.y = -0.6;
    island.receiveShadow = true;
    scene.add(island);

    // ── GRASS PLATEAU ──
    const grassGeo = new THREE.CylinderGeometry(16, 18, 0.6, 48);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2a7a28, roughness: 0.9 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0.3;
    grass.receiveShadow = true;
    scene.add(grass);

    // ── CENTRAL PLAZA ──
    const plazaGeo = new THREE.CylinderGeometry(6, 6.2, 0.25, 32);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xb0a090, roughness: 0.7 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.y = 0.72;
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Stone border ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const sx = Math.cos(angle) * 6.8;
      const sz = Math.sin(angle) * 6.8;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9 })
      );
      stone.position.set(sx, 0.72, sz);
      stone.rotation.y = angle;
      scene.add(stone);
    }

    // ── PALM TREES ──
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
    const palmPositions = [
      [-14, -6], [14, -6], [-13, 7], [13, 8],
      [-8, -15], [9, -15], [-16, 1], [16, 2],
      [-5, 13], [6, 14], [0, -17], [-18, -3],
    ];

    for (const [px, pz] of palmPositions) {
      const trunkH = 4 + Math.random() * 2.5;
      this.addCylinder(scene, px, pz, 0.15, trunkH, barkMat);

      const frondMat = new THREE.MeshStandardMaterial({
        color: 0x2d7a1a, roughness: 0.9, side: THREE.DoubleSide,
      });
      const tipY = 0.6 + trunkH;
      for (let f = 0; f < 7; f++) {
        const fAngle = (f / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 2 + Math.random() * 0.8, 5),
          frondMat
        );
        frond.position.set(px, tipY, pz);
        frond.rotation.x = Math.PI / 2.2;
        frond.rotation.y = fAngle;
        frond.rotation.z = -Math.PI / 6;
        frond.castShadow = true;
        scene.add(frond);
      }
    }

    // ── ROCKS ──
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x706050, roughness: 0.95 });
    const rockPositions = [
      [-18, 12, 1.0], [18, -10, 0.8], [-10, -18, 1.2],
      [12, 15, 0.7], [-15, 15, 0.9], [0, 20, 1.1],
    ];
    for (const [rx, rz, rs] of rockPositions) {
      this.addBox(scene, rx, 0.3, rz, rs * 2, rs * 1.5, rs * 2, rockMat);
    }

    // ── NPCs ──
    // Magik
    const npcMagikPos = { x: -4, z: 4 };
    this.addBox(scene, npcMagikPos.x, 0.7, npcMagikPos.z, 0.6, 1.6, 0.6,
      new THREE.MeshStandardMaterial({ color: 0x7b2fff }));
    const magLight = new THREE.PointLight(0x7b2fff, 2, 5);
    magLight.position.set(npcMagikPos.x, 2.5, npcMagikPos.z);
    scene.add(magLight);
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    hat.position.set(npcMagikPos.x, 2.7, npcMagikPos.z);
    scene.add(hat);

    // Bob
    const npcBobPos = { x: -3.5, z: -4 };
    this.addBox(scene, npcBobPos.x, 0.7, npcBobPos.z, 0.7, 1.7, 0.7,
      new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
    const bobHat = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xff8800 })
    );
    bobHat.position.set(npcBobPos.x, 2.5, npcBobPos.z);
    scene.add(bobHat);

    // Bankier
    const npcBankierPos = { x: 4, z: 0 };
    this.addBox(scene, npcBankierPos.x, 0.7, npcBankierPos.z, 0.6, 1.8, 0.6,
      new THREE.MeshStandardMaterial({ color: 0x00aa44 }));
    const bHat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    bHat.position.set(npcBankierPos.x, 2.6, npcBankierPos.z);
    scene.add(bHat);

    // ── OCEAN WAVE DATA ──
    const waveVerts = oceanGeo.attributes.position;
    const waveData = [];
    for (let i = 0; i < waveVerts.count; i++) {
      waveData.push({ ox: waveVerts.getX(i), oz: waveVerts.getZ(i), phase: Math.random() * Math.PI * 2 });
    }

    // ── STARS ──
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 120 + Math.random() * 30;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 20;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8,
    })));

    // Moon
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffdd, emissiveIntensity: 0.6 })
    );
    moon.position.set(-40, 50, -80);
    scene.add(moon);
    const moonLight = new THREE.PointLight(0xccddff, 1.5, 200);
    moonLight.position.set(-40, 50, -80);
    scene.add(moonLight);

    // ── TORCHES ──
    const torchAngle = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const torchLights = [];
    for (const ta of torchAngle) {
      const tx = Math.cos(ta) * 5.5;
      const tz = Math.sin(ta) * 5.5;
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 1.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a2c0a })
      );
      stick.position.set(tx, 1.7, tz);
      scene.add(stick);

      const tLight = new THREE.PointLight(0xff8822, 3, 7);
      tLight.position.set(tx, 2.7, tz);
      scene.add(tLight);
      torchLights.push({ light: tLight, phase: Math.random() * Math.PI * 2 });

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 3,
          transparent: true, opacity: 0.9,
        })
      );
      flame.position.set(tx, 2.7, tz);
      scene.add(flame);
    }

    // ── ATMOSPHERIC: Floating pollen / dust particles ──
    const pollenCount = 300;
    const pollenGeo = new THREE.BufferGeometry();
    const pollenPos = new Float32Array(pollenCount * 3);
    const pollenPhase = [];
    for (let i = 0; i < pollenCount; i++) {
      pollenPos[i * 3]     = (Math.random() - 0.5) * 50;
      pollenPos[i * 3 + 1] = Math.random() * 8 + 0.5;
      pollenPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      pollenPhase.push(Math.random() * Math.PI * 2);
    }
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
    const pollenMat = new THREE.PointsMaterial({
      color: 0xffeecc, size: 0.04, transparent: true, opacity: 0.5,
    });
    const pollen = new THREE.Points(pollenGeo, pollenMat);
    scene.add(pollen);

    // ── Update loop ──
    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;

      // NPC
      hat.position.y = 2.7 + Math.sin(t * 3) * 0.1;
      magLight.intensity = 1.5 + Math.sin(t * 4) * 0.5;

      // Torch flicker
      for (const { light, phase } of torchLights) {
        light.intensity = 2.5 + Math.sin(t * 8 + phase) * 1 + Math.sin(t * 13 + phase) * 0.5;
      }

      // Ocean waves
      const pos = oceanGeo.attributes.position;
      for (let i = 0; i < waveData.length; i++) {
        const d = waveData[i];
        pos.setY(i,
          Math.sin(t * 0.6 + d.ox * 0.15 + d.phase) * 0.3 +
          Math.cos(t * 0.4 + d.oz * 0.12) * 0.2
        );
      }
      oceanGeo.attributes.position.needsUpdate = true;
      oceanMat.color.setHSL(0.57, 0.85, 0.18 + Math.sin(t * 0.3) * 0.03);

      // Pollen drift
      const pp = pollen.geometry.attributes.position.array;
      for (let i = 0; i < pollenCount; i++) {
        pp[i * 3]     += Math.sin(t * 0.2 + pollenPhase[i]) * 0.005;
        pp[i * 3 + 1] += Math.sin(t * 0.5 + pollenPhase[i]) * 0.002;
        pp[i * 3 + 2] += Math.cos(t * 0.3 + pollenPhase[i]) * 0.005;
      }
      pollen.geometry.attributes.position.needsUpdate = true;
      pollenMat.opacity = 0.3 + Math.sin(t * 0.8) * 0.15;
    };
  }

  buildPortals() {
    const toRuins = createPortal({
      position: new THREE.Vector3(0, 1.6, -12),
      color: '#f4a261',
      targetWorldIndex: 1,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    });
    this.portals.push(toRuins);
  }
}
