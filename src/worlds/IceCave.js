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
    this.mapSize = 44;
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x040d1a);
    scene.fog = new THREE.FogExp2(0x081832, 0.05);

    // Ambient – cold blue
    scene.add(new THREE.AmbientLight(0x2255aa, 0.5));
    // Ice glow lights
    const iceLight1 = new THREE.PointLight(0x88ddff, 3, 20);
    iceLight1.position.set(0, 5, 0);
    scene.add(iceLight1);
    const iceLight2 = new THREE.PointLight(0x4499cc, 2, 15);
    iceLight2.position.set(-8, 3, -8);
    scene.add(iceLight2);
    const iceLight3 = new THREE.PointLight(0xaaccff, 2, 15);
    iceLight3.position.set(8, 3, 8);
    scene.add(iceLight3);

    // Ground – ice
    const iceTex = this.textureLoader.load('./textures/ice.png');
    iceTex.wrapS = iceTex.wrapT = THREE.RepeatWrapping;
    iceTex.repeat.set(4, 4);

    const groundGeo = new THREE.PlaneGeometry(44, 44, 20, 20);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.random() - 0.5) * 0.08);
    }
    groundGeo.computeVertexNormals();
    const iceGroundMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      color: 0x99ccee,
      roughness: 0.05,
      metalness: 0.1,
      envMapIntensity: 1,
    });
    const ground = new THREE.Mesh(groundGeo, iceGroundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Ice crystal material (translucent blue)
    const crystalMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      color: 0x88ddff,
      emissive: 0x2266aa,
      emissiveIntensity: 0.5,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    const crystalMat2 = new THREE.MeshStandardMaterial({
      map: iceTex,
      color: 0xaaddff,
      emissive: 0x55aadd,
      emissiveIntensity: 0.8,
      roughness: 0.03,
      metalness: 0.05,
      transparent: true,
      opacity: 0.7,
    });

    // ICE CRYSTALS (custom geometry using ConeGeometry pairs)
    const makeCrystal = (x, z, height, lean = 0) => {
      const mat = Math.random() > 0.5 ? crystalMat : crystalMat2;
      const topGeo = new THREE.ConeGeometry(0.3 + Math.random() * 0.3, height, 5);
      const top = new THREE.Mesh(topGeo, mat);
      top.position.set(x, height/2, z);
      top.rotation.z = lean;
      top.rotation.y = Math.random() * Math.PI;
      top.castShadow = true;
      scene.add(top);
      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(x-0.5, 0, z-0.5),
        new THREE.Vector3(x+0.5, height, z+0.5)
      ));
      this.mapObjects.push({ x, z, w: 0.6, d: 0.6 });
    };

    const crystalClusters = [
      [-10, -10], [10, -10], [-10, 10], [10, 10],
      [-5, -14], [5, 14], [-14, 0], [14, 0],
      [-7, 7], [7, -7], [0, -16], [0, 16],
    ];
    for (const [cx, cz] of crystalClusters) {
      // Cluster of 3-5 crystals
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        makeCrystal(
          cx + (Math.random()-0.5)*2.5,
          cz + (Math.random()-0.5)*2.5,
          1 + Math.random() * 3,
          (Math.random()-0.5) * 0.3
        );
      }
    }

    // Ice walls (thick slabs)
    const iceSlab = new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.9 });
    this.addBox(scene, 0, 0, -20, 10, 4, 1.5, iceSlab);
    this.addBox(scene, -8, 0, -20, 5, 3, 1.5, iceSlab);
    this.addBox(scene, 10, 0, -20, 4, 2.5, 1.5, iceSlab);
    this.addBox(scene, 0, 0, 20, 10, 4, 1.5, iceSlab);
    this.addBox(scene, -10, 0, 20, 6, 3, 1.5, iceSlab);
    this.addBox(scene, 8, 0, 20, 5, 2, 1.5, iceSlab);
    this.addBox(scene, -20, 0, 0, 1.5, 4, 10, iceSlab);
    this.addBox(scene, 20, 0, 0, 1.5, 3, 8, iceSlab);

    // Frozen stalactites hanging from ceiling (inverted cones)
    const stalMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.75, roughness: 0.1 });
    const stalPositions = [
      [-4, -5], [4, 5], [-8, 8], [8, -8],
      [0, 0], [-12, -4], [12, 4], [-6, -12], [6, 12],
    ];
    for (const [sx, sz] of stalPositions) {
      const h = 1.5 + Math.random() * 3;
      const geo = new THREE.ConeGeometry(0.1 + Math.random()*0.2, h, 5);
      const mesh = new THREE.Mesh(geo, stalMat);
      mesh.rotation.z = Math.PI; // flip
      mesh.position.set(sx + (Math.random()-0.5), 6 - h/2, sz + (Math.random()-0.5));
      scene.add(mesh);
    }

    // Snow particles
    const snowGeo = new THREE.BufferGeometry();
    const snowCount = 600;
    const snowPos = new Float32Array(snowCount * 3);
    const snowVel = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i*3]   = (Math.random()-0.5)*44;
      snowPos[i*3+1] = Math.random() * 6;
      snowPos[i*3+2] = (Math.random()-0.5)*44;
      snowVel[i] = 0.3 + Math.random() * 0.5;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({ color: 0xeeeeff, size: 0.04, transparent: true, opacity: 0.9 });
    const snow = new THREE.Points(snowGeo, snowMat);
    scene.add(snow);

    // Center ice formation – large crystal spire
    const spireGeo = new THREE.ConeGeometry(0.8, 4, 6);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xaaffff, emissive: 0x44aacc, emissiveIntensity: 1.5, transparent: true, opacity: 0.85, roughness: 0.05 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(0, 2, 0);
    scene.add(spire);
    const spireLight = new THREE.PointLight(0x88ffff, 4, 10);
    spireLight.position.set(0, 3, 0);
    scene.add(spireLight);
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-0.9,0,-0.9), new THREE.Vector3(0.9,4,0.9)));
    this.mapObjects.push({ x: 0, z: 0, w: 1.6, d: 1.6 });

    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      // Snow falling
      const sp = snow.geometry.attributes.position.array;
      for (let i = 0; i < snowCount; i++) {
        sp[i*3+1] -= snowVel[i] * delta;
        sp[i*3]   += Math.sin(t + i) * 0.005;
        if (sp[i*3+1] < 0) sp[i*3+1] = 6;
      }
      snow.geometry.attributes.position.needsUpdate = true;
      // Spire pulse
      spireLight.intensity = 3 + Math.sin(t * 2) * 1.5;
      iceLight1.intensity = 2.5 + Math.sin(t * 1.5 + 1) * 0.8;
    };
  }

  buildPortals() {
    // Back to Space Station
    const prev = createPortal({
      position: new THREE.Vector3(0, 1.6, 18),
      color: '#4361ee',
      targetWorldIndex: 2,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, -16),
    });
    this.portals.push(prev);

    // Forward to Volcano
    const next = createPortal({
      position: new THREE.Vector3(0, 1.6, -18),
      color: '#e63946',
      targetWorldIndex: 4,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, 16),
    });
    this.portals.push(next);
  }
}
