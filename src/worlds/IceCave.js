import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class IceCave extends World {
  constructor(index, total) {
    super();
    this.name = 'LODOWA JASKINIA';
    this.icon = '❄️';
    this.portalColor = '#90e0ef';
    this.minimapBg = '#050d1a';
    this.mapSize = 90;
    this.worldType = 'ice';
    this.xpReward = 60;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x030a14);
    scene.fog = new THREE.FogExp2(0x061628, 0.045);

    // Cold ambient
    scene.add(new THREE.AmbientLight(0x3366aa, 1.2));
    const il1 = new THREE.PointLight(0x88ddff, 4, 25);
    il1.position.set(0, 5, 0);
    scene.add(il1);
    const il2 = new THREE.PointLight(0x3388bb, 2.5, 18);
    il2.position.set(-8, 3, -8);
    scene.add(il2);
    const il3 = new THREE.DirectionalLight(0x5588aa, 1.0);
    il3.position.set(0, 10, 5);
    scene.add(il3);

    // Icy ground
    const gGeo = new THREE.PlaneGeometry(44, 44, 20, 20);
    const gP = gGeo.attributes.position;
    for (let i = 0; i < gP.count; i++) gP.setZ(i, (Math.random() - 0.5) * 0.1);
    gGeo.computeVertexNormals();
    const ground = new THREE.Mesh(gGeo,
      new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.03, metalness: 0.15 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Crystal materials
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x88ddff, emissive: 0x2266aa, emissiveIntensity: 0.6,
      roughness: 0.03, transparent: true, opacity: 0.82,
    });
    const crystalMat2 = new THREE.MeshStandardMaterial({
      color: 0xaaddff, emissive: 0x55aadd, emissiveIntensity: 1.0,
      roughness: 0.02, transparent: true, opacity: 0.7,
    });

    // Crystal clusters
    const crystalLights = [];
    for (const [cx, cz] of [[-10,-10],[10,-10],[-10,10],[10,10],[-5,-14],[5,14],[-14,0],[14,0],[-7,7],[7,-7],[0,-16],[0,16]]) {
      const cnt = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < cnt; i++) {
        const h = 1 + Math.random() * 3;
        const r = 0.2 + Math.random() * 0.3;
        const mesh = new THREE.Mesh(
          new THREE.ConeGeometry(r, h, 5),
          Math.random() > 0.5 ? crystalMat : crystalMat2
        );
        mesh.position.set(cx + (Math.random() - 0.5) * 3, h / 2, cz + (Math.random() - 0.5) * 3);
        mesh.rotation.z = (Math.random() - 0.5) * 0.25;
        mesh.rotation.y = Math.random() * Math.PI;
        mesh.castShadow = true;
        scene.add(mesh);
      }
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(cx - 0.6, 0, cz - 0.6),
        new THREE.Vector3(cx + 0.6, 4, cz + 0.6)
      ));
      this.mapObjects.push({ x: cx, z: cz, w: 1, d: 1 });

      // Crystal glow light
      const cl = new THREE.PointLight(0x66ccff, 1.5, 6);
      cl.position.set(cx, 2, cz);
      scene.add(cl);
      crystalLights.push({ light: cl, phase: Math.random() * Math.PI * 2 });
    }

    // Ice walls
    const iceSlab = new THREE.MeshStandardMaterial({ color: 0x5588aa, roughness: 0.08, transparent: true, opacity: 0.9 });
    for (const args of [
      [0, 0, -20, 10, 4, 1.5], [-8, 0, -20, 5, 3, 1.5], [10, 0, -20, 4, 2.5, 1.5],
      [0, 0, 20, 10, 4, 1.5], [-10, 0, 20, 6, 3, 1.5], [8, 0, 20, 5, 2, 1.5],
      [-20, 0, 0, 1.5, 4, 10], [20, 0, 0, 1.5, 3, 8],
    ]) {
      this.addBox(scene, ...args, iceSlab);
    }

    // Stalactites
    const stalMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.75, roughness: 0.08,
      emissive: 0x334466, emissiveIntensity: 0.2,
    });
    for (const [sx, sz] of [[-4,-5],[4,5],[-8,8],[8,-8],[0,0],[-12,-4],[12,4],[-6,-12],[6,12]]) {
      const h = 1.5 + Math.random() * 2.5;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.15 + Math.random() * 0.15, h, 5), stalMat);
      m.rotation.z = Math.PI;
      m.position.set(sx + (Math.random() - 0.5), 6 - h / 2, sz + (Math.random() - 0.5));
      scene.add(m);
    }

    // Center spire
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 4, 6),
      new THREE.MeshStandardMaterial({
        color: 0xaaffff, emissive: 0x44aacc, emissiveIntensity: 2,
        transparent: true, opacity: 0.85, roughness: 0.03,
      })
    );
    spire.position.set(0, 2, 0);
    scene.add(spire);
    const spireL = new THREE.PointLight(0x88ffff, 5, 12);
    spireL.position.set(0, 3, 0);
    scene.add(spireL);
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(-0.9, 0, -0.9), new THREE.Vector3(0.9, 4, 0.9)
    ));

    // Snow particles
    const snCount = 600;
    const snGeo = new THREE.BufferGeometry();
    const snPos = new Float32Array(snCount * 3);
    const snVel = new Float32Array(snCount);
    for (let i = 0; i < snCount; i++) {
      snPos[i * 3]     = (Math.random() - 0.5) * 44;
      snPos[i * 3 + 1] = Math.random() * 6;
      snPos[i * 3 + 2] = (Math.random() - 0.5) * 44;
      snVel[i] = 0.3 + Math.random() * 0.6;
    }
    snGeo.setAttribute('position', new THREE.BufferAttribute(snPos, 3));
    const snowMesh = new THREE.Points(snGeo, new THREE.PointsMaterial({
      color: 0xeeeeff, size: 0.04, transparent: true, opacity: 0.85,
    }));
    scene.add(snowMesh);

    // Frozen breath particles (near-camera effect)
    const breathCount = 30;
    const breathGeo = new THREE.BufferGeometry();
    const breathPos = new Float32Array(breathCount * 3);
    breathGeo.setAttribute('position', new THREE.BufferAttribute(breathPos, 3));
    const breathMat = new THREE.PointsMaterial({
      color: 0xccddff, size: 0.06, transparent: true, opacity: 0.0,
    });
    const breathMesh = new THREE.Points(breathGeo, breathMat);
    scene.add(breathMesh);

    this._breathTimer = 0;

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;

      // Snow falling
      const sp = snowMesh.geometry.attributes.position.array;
      for (let i = 0; i < snCount; i++) {
        sp[i * 3 + 1] -= snVel[i] * delta;
        sp[i * 3]     += Math.sin(t + i) * 0.003;
        if (sp[i * 3 + 1] < 0) {
          sp[i * 3 + 1] = 6;
          sp[i * 3] = (Math.random() - 0.5) * 44;
          sp[i * 3 + 2] = (Math.random() - 0.5) * 44;
        }
      }
      snowMesh.geometry.attributes.position.needsUpdate = true;

      // Crystal pulsing
      for (const { light, phase } of crystalLights) {
        light.intensity = 1.0 + Math.sin(t * 1.5 + phase) * 0.8;
      }

      // Spire pulse
      spireL.intensity = 3.5 + Math.sin(t * 2) * 2;
      il1.intensity = 2.5 + Math.sin(t * 1.5 + 1) * 0.8;

      // Frozen breath effect (periodic)
      this._breathTimer += delta;
      if (this._breathTimer > 3.5) {
        this._breathTimer = 0;
        breathMat.opacity = 0.4;
      }
      if (breathMat.opacity > 0) {
        breathMat.opacity -= delta * 0.15;
      }
    };
  }

  buildPortals() {
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#4361ee',
      targetWorldIndex: 3,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    }));
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#e63946',
      targetWorldIndex: 5,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    }));
  }
}
