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
    this.xpReward = 20;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x060f08);
    scene.fog = new THREE.FogExp2(0x0d2614, 0.055);

    // Eerie moonlight
    scene.add(new THREE.AmbientLight(0x1a3d2a, 0.5));
    const moon = new THREE.DirectionalLight(0x77bbaa, 1.0);
    moon.position.set(-8, 25, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
    moon.shadow.camera.top = 30; moon.shadow.camera.bottom = -30;
    scene.add(moon);

    // Eerie green underglow
    const underglow = new THREE.HemisphereLight(0x224422, 0x001100, 0.3);
    scene.add(underglow);

    // Scattered colored lights from mushrooms
    const eerie1 = new THREE.PointLight(0x22ff66, 1.5, 15);
    eerie1.position.set(-8, 1, -5);
    scene.add(eerie1);
    const eerie2 = new THREE.PointLight(0x6644ff, 1.2, 12);
    eerie2.position.set(6, 1.5, 8);
    scene.add(eerie2);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const gp = groundGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setZ(i, (Math.random() - 0.5) * 0.3);
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo,
      new THREE.MeshStandardMaterial({ color: 0x152d18, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Materials
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 1 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9, transparent: true, opacity: 0.95 });
    const leavesGlowMat = new THREE.MeshStandardMaterial({
      color: 0x52b788, emissive: 0x52b788, emissiveIntensity: 0.4,
      roughness: 0.8, transparent: true, opacity: 0.8,
    });

    // Trees
    const treePositions = [
      [-8,-8],[8,-8],[-6,6],[7,7],[-12,-2],[12,3],[-3,-14],[4,14],
      [-15,8],[15,-8],[-9,12],[9,-12],[-4,4],[5,-5],[-13,-13],[13,13],
    ];
    for (const [tx, tz] of treePositions) {
      const height = 4 + Math.random() * 4;
      this.addCylinder(scene, tx, tz, 0.25 + Math.random() * 0.2, height, barkMat);
      for (let l = 0; l < 3; l++) {
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1.2 + Math.random() * 0.8, 8, 6),
          l === 1 ? leavesGlowMat : leavesMat
        );
        crown.position.set(
          tx + (Math.random() - 0.5) * 1.2,
          height - 1 + l * 1.2,
          tz + (Math.random() - 0.5) * 1.2
        );
        crown.castShadow = true;
        scene.add(crown);
      }
    }

    // Glowing mushrooms
    const mushLights = [];
    for (const [mx, mz] of [[-3,-3],[3,3],[-5,2],[4,-4],[0,-7],[7,0],[-7,0],[0,7]]) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xeeddcc })
      );
      stem.position.set(mx, 0.3, mz);
      scene.add(stem);

      const capColor = [0xff4466, 0xff7700, 0x44aaff][Math.floor(Math.random() * 3)];
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: capColor, emissive: capColor, emissiveIntensity: 2,
          roughness: 0.4,
        })
      );
      cap.position.set(mx, 0.65, mz);
      scene.add(cap);

      const ml = new THREE.PointLight(capColor, 1.8, 5);
      ml.position.set(mx, 0.7, mz);
      scene.add(ml);
      mushLights.push({ light: ml, phase: Math.random() * Math.PI * 2 });
    }

    // Monoliths
    const monoMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a, roughness: 0.8,
      emissive: 0x112211, emissiveIntensity: 0.3,
    });
    for (const [mx, mz] of [[-10,-10],[10,-10],[10,10],[-10,10]]) {
      this.addBox(scene, mx, 0, mz, 0.8, 2.5 + Math.random(), 0.6, monoMat);
    }

    // Fireflies
    const ffCount = 250;
    const ffGeo = new THREE.BufferGeometry();
    const ffPos = new Float32Array(ffCount * 3);
    const ffPhase = [];
    for (let i = 0; i < ffCount; i++) {
      ffPos[i * 3]     = (Math.random() - 0.5) * 40;
      ffPos[i * 3 + 1] = Math.random() * 4 + 0.3;
      ffPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      ffPhase.push(Math.random() * Math.PI * 2);
    }
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({
      color: 0xaaffaa, size: 0.09, transparent: true, opacity: 0.9,
    });
    const fireflies = new THREE.Points(ffGeo, ffMat);
    scene.add(fireflies);

    // Ground fog layers (flat semi-transparent planes)
    const fogPlanes = [];
    for (let i = 0; i < 8; i++) {
      const fogGeo = new THREE.PlaneGeometry(15 + Math.random() * 10, 15 + Math.random() * 10);
      const fogMat = new THREE.MeshBasicMaterial({
        color: 0x88aacc, transparent: true, opacity: 0.04,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const fogPlane = new THREE.Mesh(fogGeo, fogMat);
      fogPlane.position.set(
        (Math.random() - 0.5) * 30,
        0.3 + Math.random() * 0.8,
        (Math.random() - 0.5) * 30
      );
      fogPlane.rotation.x = -Math.PI / 2;
      fogPlane.rotation.z = Math.random() * Math.PI;
      scene.add(fogPlane);
      fogPlanes.push({ mesh: fogPlane, phase: Math.random() * Math.PI * 2 });
    }

    // Moon rays (light shafts through canopy)
    for (let i = 0; i < 4; i++) {
      const rayGeo = new THREE.CylinderGeometry(0.3, 1.5, 12, 6, 1, true);
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0x88ccaa, transparent: true, opacity: 0.025,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(
        (Math.random() - 0.5) * 20,
        6,
        (Math.random() - 0.5) * 20
      );
      ray.rotation.z = (Math.random() - 0.5) * 0.3;
      scene.add(ray);
    }

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;

      // Fireflies
      const pos = fireflies.geometry.attributes.position.array;
      for (let i = 0; i < ffCount; i++) {
        pos[i * 3 + 1] = 0.3 + Math.abs(Math.sin(t * 0.7 + ffPhase[i])) * 4;
        pos[i * 3]     += Math.sin(t * 0.3 + ffPhase[i]) * 0.008;
        pos[i * 3 + 2] += Math.cos(t * 0.4 + ffPhase[i] + 1) * 0.008;
      }
      fireflies.geometry.attributes.position.needsUpdate = true;
      ffMat.opacity = 0.4 + Math.sin(t * 2) * 0.35;

      // Mushroom light pulse
      for (const { light, phase } of mushLights) {
        light.intensity = 1.2 + Math.sin(t * 2.5 + phase) * 0.8;
      }

      // Eerie lights wander
      eerie1.intensity = 1.2 + Math.sin(t * 1.5) * 0.6;
      eerie2.intensity = 0.8 + Math.sin(t * 2 + 1) * 0.5;

      // Ground fog drift
      for (const { mesh, phase } of fogPlanes) {
        mesh.position.x += Math.sin(t * 0.15 + phase) * 0.005;
        mesh.position.z += Math.cos(t * 0.12 + phase) * 0.005;
        mesh.material.opacity = 0.02 + Math.sin(t * 0.5 + phase) * 0.02;
      }
    };
  }

  buildPortals() {
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#f4a261',
      targetWorldIndex: 1,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    }));
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#4361ee',
      targetWorldIndex: 3,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    }));
  }
}
