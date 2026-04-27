import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class AncientRuins extends World {
  constructor(index, total) {
    super();
    this.name = 'RUINY STAROŻYTNE';
    this.icon = '🏛️';
    this.portalColor = '#f4a261';
    this.minimapBg = '#1a0d00';
    this.mapSize = 50;
    this.worldType = 'ruins';
    this.xpReward = 10;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x1a0d00);
    scene.fog = new THREE.Fog(0x3d1f00, 12, 55);

    // Warm ambient
    scene.add(new THREE.AmbientLight(0xffcc88, 0.3));
    scene.add(new THREE.HemisphereLight(0xffaa66, 0x332200, 0.4));

    // Sun – warm orange with strong shadows
    const sun = new THREE.DirectionalLight(0xffa050, 2.8);
    sun.position.set(10, 20, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Cool fill (sky bounce)
    const fill = new THREE.DirectionalLight(0x4488ff, 0.2);
    fill.position.set(-5, 10, -10);
    scene.add(fill);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50, 24, 24);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setZ(i, (Math.random() - 0.5) * 0.18);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo,
      new THREE.MeshStandardMaterial({ color: 0xc9933a, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stone materials
    const stoneTex = this.textureLoader.load('./textures/stone.png');
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    stoneTex.repeat.set(2, 2);
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x9e8a70, roughness: 0.9 });
    const stone2Mat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x7a6a55, roughness: 0.85 });

    // Columns
    for (const [cx, cz] of [[-6,-6],[6,-6],[-6,6],[6,6],[-10,0],[10,0],[0,-10],[0,10]]) {
      this.addBox(scene, cx, 0, cz, 1.2, 0.5, 1.2, stone2Mat);
      this.addCylinder(scene, cx, cz, 0.5, 4.5, stoneMat);
      this.addBox(scene, cx, 4.5, cz, 1.3, 0.5, 1.3, stone2Mat);
    }

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: 0.9 });
    this.addBox(scene, -8, 0, -18, 6, 3, 0.8, wallMat);
    this.addBox(scene, 2, 0, -18, 4, 2, 0.8, wallMat);
    this.addBox(scene, 10, 0, -18, 5, 3.5, 0.8, wallMat);
    this.addBox(scene, -5, 0, 18, 8, 2.5, 0.8, wallMat);
    this.addBox(scene, 8, 0, 18, 4, 1.5, 0.8, wallMat);
    this.addBox(scene, -18, 0, 0, 0.8, 2, 10, wallMat);
    this.addBox(scene, 18, 0, -3, 0.8, 3, 8, wallMat);

    // Rubble
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1 });
    for (const [rx, rz] of [[-3,-14],[4,-13],[-12,5],[13,-7],[-7,14],[12,12],[-14,-12],[3,7],[-8,-8],[15,3]]) {
      const w = 0.4 + Math.random() * 0.8;
      this.addBox(scene, rx, 0, rz, w, 0.2 + Math.random() * 0.5, w * 0.8, rubbleMat);
    }

    // Altar
    this.addBox(scene, 0, 0, 0, 3, 0.4, 3, stone2Mat);
    this.addBox(scene, 0, 0.4, 0, 2, 0.4, 2, stoneMat);
    this.addBox(scene, 0, 0.8, 0, 1.2, 0.3, 1.2, stone2Mat);

    // Glowing gem
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf4a261, emissive: 0xf4a261, emissiveIntensity: 4,
        transparent: true, opacity: 0.85,
      })
    );
    gem.position.set(0, 1.5, 0);
    scene.add(gem);
    const gemLight = new THREE.PointLight(0xf4a261, 4, 10);
    gemLight.position.set(0, 1.5, 0);
    scene.add(gemLight);

    // Rune glow ring around altar
    const runeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.03, 8, 64),
      new THREE.MeshStandardMaterial({
        color: 0xf4a261, emissive: 0xf4a261, emissiveIntensity: 3,
        transparent: true, opacity: 0.6,
      })
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.set(0, 0.85, 0);
    scene.add(runeRing);

    // Torches with flicker
    const torchLights = [];
    for (const [tx, tz] of [[-5,-5],[5,-5],[-5,5],[5,5]]) {
      const torch = new THREE.PointLight(0xff6600, 3, 9);
      torch.position.set(tx, 2.5, tz);
      scene.add(torch);
      torchLights.push({ light: torch, phase: Math.random() * Math.PI * 2 });

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
      );
      stick.position.set(tx, 1.2, tz);
      scene.add(stick);

      // Flame mesh
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0xff5500, emissive: 0xff4400, emissiveIntensity: 4,
          transparent: true, opacity: 0.8,
        })
      );
      flame.position.set(tx, 2.3, tz);
      scene.add(flame);
    }

    // Dust particles
    const dustCount = 800;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustPhase = [];
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3]     = (Math.random() - 0.5) * 50;
      dustPos[i * 3 + 1] = Math.random() * 15 + 0.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
      dustPhase.push(Math.random() * Math.PI * 2);
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffcc88, size: 0.05, transparent: true, opacity: 0.4 });
    const dustMesh = new THREE.Points(dustGeo, dustMat);
    scene.add(dustMesh);

    // Sand drift particles (blowing wind effect)
    const sandCount = 200;
    const sandGeo = new THREE.BufferGeometry();
    const sandPos = new Float32Array(sandCount * 3);
    for (let i = 0; i < sandCount; i++) {
      sandPos[i * 3]     = (Math.random() - 0.5) * 40;
      sandPos[i * 3 + 1] = Math.random() * 0.5 + 0.1;
      sandPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3));
    const sandMat = new THREE.PointsMaterial({ color: 0xddbb77, size: 0.03, transparent: true, opacity: 0.3 });
    const sandMesh = new THREE.Points(sandGeo, sandMat);
    scene.add(sandMesh);

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      gem.rotation.y += delta * 1.2;
      gem.position.y = 1.5 + Math.sin(t * 2) * 0.15;
      gemLight.intensity = 3 + Math.sin(t * 3) * 1.5;
      runeRing.material.opacity = 0.3 + Math.sin(t * 2) * 0.3;
      runeRing.rotation.z += delta * 0.3;

      // Torch flicker
      for (const { light, phase } of torchLights) {
        light.intensity = 2.5 + Math.sin(t * 9 + phase) * 1.2 + Math.sin(t * 14 + phase) * 0.4;
      }

      // Dust drift
      const dp = dustMesh.geometry.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dp[i * 3] += Math.sin(t * 0.2 + dustPhase[i]) * 0.003;
        dp[i * 3 + 1] += Math.sin(t * 0.4 + dustPhase[i]) * 0.001;
      }
      dustMesh.geometry.attributes.position.needsUpdate = true;

      // Sand blowing
      const sp = sandMesh.geometry.attributes.position.array;
      for (let i = 0; i < sandCount; i++) {
        sp[i * 3] += delta * 2.5;
        if (sp[i * 3] > 20) sp[i * 3] = -20;
      }
      sandMesh.geometry.attributes.position.needsUpdate = true;
    };
  }

  buildPortals() {
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, 17),
      color: '#f4a261',
      targetWorldIndex: 0,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 13),
    }));
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, -17),
      color: '#52b788',
      targetWorldIndex: 2,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -13),
    }));
  }
}
