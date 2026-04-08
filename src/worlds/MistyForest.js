import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class MistyForest extends World {
  constructor(index, total) {
    super();
    this.name = 'LAS MGŁY';
    this.icon = '🌲';
    this.portalColor = '#52b788';
    this.minimapBg = '#0a1a0d';
    this.mapSize = 50;
    this.worldType = 'forest';
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x0a1a0d);
    scene.fog = new THREE.FogExp2(0x1a3d1f, 0.06);

    // Ambient – cool green
    scene.add(new THREE.AmbientLight(0x2d5a3d, 0.8));
    // Moon light
    const moon = new THREE.DirectionalLight(0x88ccaa, 1.2);
    moon.position.set(-8, 20, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
    moon.shadow.camera.top = 30; moon.shadow.camera.bottom = -30;
    scene.add(moon);

    // Ground – mossy green
    const groundGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.random() - 0.5) * 0.3);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e4d28, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Materials
    const barkMat  = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 1 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9, transparent: true, opacity: 0.95 });
    const leavesGlowMat = new THREE.MeshStandardMaterial({ color: 0x52b788, emissive: 0x52b788, emissiveIntensity: 0.3, roughness: 0.8, transparent: true, opacity: 0.8 });

    // Trees
    const treePositions = [
      [-8, -8], [8, -8], [-6, 6], [7, 7],
      [-12, -2], [12, 3], [-3, -14], [4, 14],
      [-15, 8], [15, -8], [-9, 12], [9, -12],
      [-4, 4], [5, -5], [-13, -13], [13, 13],
    ];

    for (const [tx, tz] of treePositions) {
      const height = 4 + Math.random() * 4;
      const radius = 0.25 + Math.random() * 0.2;
      // Trunk
      this.addCylinder(scene, tx, tz, radius, height, barkMat);
      // Crown (multiple spheres for lush look)
      for (let l = 0; l < 3; l++) {
        const crownGeo = new THREE.SphereGeometry(1.2 + Math.random() * 0.8, 8, 6);
        const crownMesh = new THREE.Mesh(crownGeo, l === 1 ? leavesGlowMat : leavesMat);
        crownMesh.position.set(
          tx + (Math.random() - 0.5) * 1.2,
          height - 1 + l * 1.2,
          tz + (Math.random() - 0.5) * 1.2
        );
        crownMesh.castShadow = true;
        scene.add(crownMesh);
      }
    }

    // Mushrooms (glowing)
    const mushPatternPositions = [[-3,-3],[3,3],[-5,2],[4,-4],[0,-7],[7,0],[-7,0],[0,7]];
    for (const [mx, mz] of mushPatternPositions) {
      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(mx, 0.3, mz);
      scene.add(stem);
      // Cap
      const capGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const capColor = [0xff4466, 0xff7700, 0x44aaff][Math.floor(Math.random() * 3)];
      const capMat = new THREE.MeshStandardMaterial({
        color: capColor, emissive: capColor, emissiveIntensity: 1.5,
        roughness: 0.4,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(mx, 0.65, mz);
      scene.add(cap);
      // Glow light
      const mLight = new THREE.PointLight(capColor, 1.5, 4);
      mLight.position.set(mx, 0.7, mz);
      scene.add(mLight);
    }

    // Fireflies (particles)
    const ffGeo = new THREE.BufferGeometry();
    const ffCount = 200;
    const ffPos = new Float32Array(ffCount * 3);
    const ffPhase = [];
    for (let i = 0; i < ffCount; i++) {
      ffPos[i*3]   = (Math.random() - 0.5) * 40;
      ffPos[i*3+1] = Math.random() * 4 + 0.3;
      ffPos[i*3+2] = (Math.random() - 0.5) * 40;
      ffPhase.push(Math.random() * Math.PI * 2);
    }
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({ color: 0xaaffaa, size: 0.08, transparent: true, opacity: 0.9 });
    const fireflies = new THREE.Points(ffGeo, ffMat);
    scene.add(fireflies);

    // Ancient stones / monoliths
    const monoMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.8 });
    const monoPosArr = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
    for (const [mx, mz] of monoPosArr) {
      this.addBox(scene, mx, 0, mz, 0.8, 2.5 + Math.random(), 0.6, monoMat);
    }

    // Fog wisps (large transparent planes)
    const wispGeo = new THREE.PlaneGeometry(10, 2);
    const wispMat = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
    for (let w = 0; w < 5; w++) {
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      wisp.position.set((Math.random()-0.5)*30, 0.5 + Math.random(), (Math.random()-0.5)*30);
      wisp.rotation.y = Math.random() * Math.PI;
      scene.add(wisp);
    }

    // Animate fireflies
    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      const pos = fireflies.geometry.attributes.position.array;
      for (let i = 0; i < ffCount; i++) {
        pos[i*3+1] = 0.3 + Math.abs(Math.sin(t * 0.7 + ffPhase[i])) * 4;
        pos[i*3]   += Math.sin(t * 0.3 + ffPhase[i]) * 0.01;
        pos[i*3+2] += Math.cos(t * 0.4 + ffPhase[i] + 1) * 0.01;
      }
      fireflies.geometry.attributes.position.needsUpdate = true;
      ffMat.opacity = 0.5 + Math.sin(t * 2) * 0.3;
    };
  }

  buildPortals() {
    // Back to Ancient Ruins
    const prev = createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#f4a261',
      targetWorldIndex: 0,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    });
    this.portals.push(prev);

    // Forward to Space Station
    const next = createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#4361ee',
      targetWorldIndex: 2,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    });
    this.portals.push(next);
  }
}
