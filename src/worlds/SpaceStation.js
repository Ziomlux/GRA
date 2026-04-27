import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class SpaceStation extends World {
  constructor(index, total) {
    super();
    this.name = 'STACJA KOSMICZNA';
    this.icon = '🚀';
    this.portalColor = '#4361ee';
    this.minimapBg = '#05050f';
    this.mapSize = 80;
    this.worldType = 'space';
    this.xpReward = 40;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x010108);
    scene.fog = new THREE.Fog(0x060620, 18, 65);

    // Cold ambient
    scene.add(new THREE.AmbientLight(0x1a2244, 1.2));

    // Colored accent lights
    const redL = new THREE.PointLight(0xff2200, 3, 18);
    redL.position.set(-8, 4, -5);
    scene.add(redL);
    const cyanL = new THREE.PointLight(0x00ffff, 3, 18);
    cyanL.position.set(8, 4, 5);
    scene.add(cyanL);
    const topLight = new THREE.DirectionalLight(0x3355aa, 1.5);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // Emergency warning light
    const warnL = new THREE.PointLight(0xff0000, 0, 25);
    warnL.position.set(0, 5.5, 0);
    scene.add(warnL);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.8 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.4, metalness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.2, metalness: 0.9 });

    // Floor + grid
    const stFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    stFloor.rotation.x = -Math.PI / 2;
    scene.add(stFloor);
    scene.add(new THREE.GridHelper(40, 20, 0x003366, 0x001133));

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), wallMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 6;
    scene.add(ceil);

    // Boundary walls
    [{ p: [0, 3, -19], r: [0, 0, 0], w: 40, h: 6 },
     { p: [0, 3, 19], r: [0, Math.PI, 0], w: 40, h: 6 },
     { p: [-19, 3, 0], r: [0, Math.PI / 2, 0], w: 40, h: 6 },
     { p: [19, 3, 0], r: [0, -Math.PI / 2, 0], w: 40, h: 6 },
    ].forEach(({ p, r, w, h }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(...p);
      m.rotation.set(...r);
      scene.add(m);
    });
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 6, -18.5)),
      new THREE.Box3(new THREE.Vector3(-20, 0, 18.5), new THREE.Vector3(20, 6, 20)),
      new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(-18.5, 6, 20)),
      new THREE.Box3(new THREE.Vector3(18.5, 0, -20), new THREE.Vector3(20, 6, 20)),
    );

    // Neon strips
    const neon = (x, y, z, w, h, d, col) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 4 })
      );
      m.position.set(x, y, z);
      scene.add(m);
    };
    neon(0, 5.7, -18.9, 20, 0.08, 0.02, 0x00aaff);
    neon(0, 5.7, 18.9, 20, 0.08, 0.02, 0x00aaff);
    neon(-18.9, 1, 0, 0.02, 0.12, 40, 0xff2200);
    neon(18.9, 1, 0, 0.02, 0.12, 40, 0x00ff88);

    // Control panels & screens
    const screenMeshes = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const px = Math.cos(a) * 8;
      const pz = Math.sin(a) * 8;
      this.addBox(scene, px, 0, pz, 2, 1.2, 0.5, metalMat);
      const scCol = i % 2 ? 0x00ffff : 0x0066ff;
      const sc = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshStandardMaterial({
          color: scCol, emissive: scCol, emissiveIntensity: 2.5,
        })
      );
      sc.position.set(px, 0.85, pz - 0.28);
      scene.add(sc);
      screenMeshes.push(sc);
    }

    // Metal pillars with neon lines
    for (const [px, pz] of [[-12, -12], [12, -12], [12, 12], [-12, 12]]) {
      this.addBox(scene, px, 0, pz, 0.8, 6, 0.8, metalMat);
      const nl = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 6, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 4 })
      );
      nl.position.set(px + 0.4, 3, pz + 0.4);
      scene.add(nl);
    }

    // Stars
    const stGeo = new THREE.BufferGeometry();
    const stPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const r = 80 + Math.random() * 50;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      stPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      stPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      stPos[i * 3 + 2] = r * Math.cos(p);
    }
    stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
    scene.add(new THREE.Points(stGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.3, transparent: true, opacity: 0.7,
    })));

    // Holographic rings
    const holo1 = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.04, 8, 60),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 4,
        transparent: true, opacity: 0.7,
      })
    );
    holo1.position.set(0, 3, 0);
    scene.add(holo1);
    const holo2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.04, 8, 60),
      new THREE.MeshStandardMaterial({
        color: 0x4361ee, emissive: 0x4361ee, emissiveIntensity: 4,
        transparent: true, opacity: 0.6,
      })
    );
    holo2.position.set(0, 3, 0);
    holo2.rotation.x = Math.PI / 2;
    scene.add(holo2);

    // Electrical sparks near walls
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkPhase = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 36;
      sparkPos[i * 3 + 1] = Math.random() * 5 + 0.5;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      sparkPhase.push(Math.random() * Math.PI * 2);
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x44ddff, size: 0.05, transparent: true, opacity: 0.6,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;

      // Holographic rotation
      holo1.rotation.z += delta * 0.8;
      holo1.rotation.x += delta * 0.3;
      holo2.rotation.y += delta * 1.2;

      // Accent light pulse
      redL.intensity = 1.5 + Math.sin(t * 3) * 1;
      cyanL.intensity = 1.5 + Math.sin(t * 2 + 1) * 1;

      // Emergency warning pulse (slow)
      warnL.intensity = Math.max(0, Math.sin(t * 1.5)) * 2;

      // Screen flicker
      for (const sc of screenMeshes) {
        if (Math.random() < 0.003) {
          sc.material.emissiveIntensity = 0.2;
          setTimeout(() => { sc.material.emissiveIntensity = 2.5; }, 80);
        }
      }

      // Spark flicker
      sparkMat.opacity = 0.3 + Math.abs(Math.sin(t * 8)) * 0.5;
      const sp = sparks.geometry.attributes.position.array;
      for (let i = 0; i < sparkCount; i++) {
        sp[i * 3 + 1] += Math.sin(t * 5 + sparkPhase[i]) * 0.02;
      }
      sparks.geometry.attributes.position.needsUpdate = true;
    };
  }

  buildPortals() {
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#52b788',
      targetWorldIndex: 2,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 14),
    }));
    this.portals.push(createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#90e0ef',
      targetWorldIndex: 4,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -14),
    }));
  }
}
