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
    this.mapSize = 40;
    this.worldType = 'space';
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    scene.background = new THREE.Color(0x02020f);
    scene.fog = new THREE.Fog(0x0a0a2a, 20, 70);

    // Ambient – very dim blue
    scene.add(new THREE.AmbientLight(0x0a0a2a, 0.6));

    // Overhead strip lights (cyan and blue)
    const strip1 = new THREE.RectAreaLight(0x00aaff, 8, 20, 0.5);
    strip1.position.set(0, 5.5, 0);
    strip1.rotation.x = -Math.PI / 2;
    scene.add(strip1);

    // Emergency red
    const redLight = new THREE.PointLight(0xff2200, 2, 15);
    redLight.position.set(-8, 4, -5);
    scene.add(redLight);
    const cyanLight = new THREE.PointLight(0x00ffff, 2, 15);
    cyanLight.position.set(8, 4, 5);
    scene.add(cyanLight);

    // Materials
    const floorMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.8 });
    const wallMat   = new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.4, metalness: 0.7 });
    const metalMat  = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.2, metalness: 0.9 });
    const glowBlueMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: 0x0044ff, emissiveIntensity: 2 });
    const glowCyanMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 });
    const glowRedMat  = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2 });

    // Floor with grid lines
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines on floor
    const gridHelper = new THREE.GridHelper(40, 20, 0x003366, 0x001133);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 6;
    scene.add(ceiling);

    // Walls
    const wallPositions = [
      { pos: [0, 3, -19], rot: [0,0,0], w: 40, h: 6 },
      { pos: [0, 3, 19],  rot: [0, Math.PI, 0], w: 40, h: 6 },
      { pos: [-19, 3, 0], rot: [0, Math.PI/2, 0], w: 40, h: 6 },
      { pos: [19, 3, 0],  rot: [0, -Math.PI/2, 0], w: 40, h: 6 },
    ];
    for (const w of wallPositions) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w.w, w.h), wallMat);
      wall.position.set(...w.pos);
      wall.rotation.set(...w.rot);
      scene.add(wall);
    }
    // Boundary colliders
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 6, -18.5)),
      new THREE.Box3(new THREE.Vector3(-20, 0, 18.5), new THREE.Vector3(20, 6, 20)),
      new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(-18.5, 6, 20)),
      new THREE.Box3(new THREE.Vector3(18.5, 0, -20), new THREE.Vector3(20, 6, 20)),
    );

    // Neon strips on walls
    const neonStrip = (x, y, z, w, h, col) => {
      const geo = new THREE.BoxGeometry(w, h, 0.05);
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
    };
    neonStrip(0, 5.5, -18.5, 20, 0.1, 0x00aaff);
    neonStrip(0, 5.5, 18.5, 20, 0.1, 0x00aaff);
    neonStrip(-18.5, 5.5, 0, 0.1, 0.1, 0x00aaff);
    neonStrip(18.5, 5.5, 0, 0.1, 0.1, 0x00aaff);
    neonStrip(-18.5, 1, 0, 0.05, 0.15, 40, 0xff2200);  // danger stripe
    neonStrip(18.5, 1, 0, 0.05, 0.15, 40, 0x00ff88);

    // Control panels
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const px = Math.cos(angle) * 8;
      const pz = Math.sin(angle) * 8;
      this.addBox(scene, px, 0, pz, 2, 1.2, 0.5, metalMat);
      // Screen glow
      const screenGeo = new THREE.PlaneGeometry(1.6, 0.8);
      const screenMat = new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x00ffff : 0x0066ff,
        emissive: i % 2 ? 0x00ffff : 0x0066ff,
        emissiveIntensity: 2,
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(px, 1.0, pz - 0.28);
      screen.position.y = 0.85;
      scene.add(screen);
    }

    // Pillars
    for (let i = 0; i < 4; i++) {
      const px = (i < 2 ? -1 : 1) * 12;
      const pz = (i % 2 ? -1 : 1) * 12;
      this.addBox(scene, px, 0, pz, 0.8, 6, 0.8, metalMat);
      // Neon line on pillar
      const nlGeo = new THREE.BoxGeometry(0.05, 6, 0.05);
      const nlMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 3 });
      const nl = new THREE.Mesh(nlGeo, nlMat);
      nl.position.set(px + 0.4, 3, pz + 0.4);
      scene.add(nl);
    }

    // Stars visible through "window" – particle field
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Hologram spinning ring in center
    const holoGeo = new THREE.TorusGeometry(2, 0.04, 8, 60);
    const holoMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 3, transparent: true, opacity: 0.7 });
    this._holoRing = new THREE.Mesh(holoGeo, holoMat);
    this._holoRing.position.set(0, 3, 0);
    scene.add(this._holoRing);

    const holo2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.04, 8, 60),
      new THREE.MeshStandardMaterial({ color: 0x4361ee, emissive: 0x4361ee, emissiveIntensity: 3, transparent: true, opacity: 0.6 })
    );
    holo2.position.set(0, 3, 0);
    holo2.rotation.x = Math.PI / 2;
    scene.add(holo2);
    this._holo2 = holo2;

    // Animate
    this._onUpdate = (delta) => {
      const t = Date.now() * 0.001;
      this._holoRing.rotation.z += delta * 0.8;
      this._holoRing.rotation.x += delta * 0.3;
      this._holo2.rotation.y += delta * 1.2;
      redLight.intensity = 1.5 + Math.sin(t * 3) * 0.8;
      cyanLight.intensity = 1.5 + Math.sin(t * 2 + 1) * 0.8;
    };
  }

  buildPortals() {
    // Back to Misty Forest
    const prev = createPortal({
      position: new THREE.Vector3(0, 1.6, 17),
      color: '#52b788',
      targetWorldIndex: 1,
      direction: 'next',
      exitPosition: new THREE.Vector3(0, 1.7, 13),
    });
    this.portals.push(prev);

    // Forward to Ice Cave
    const next = createPortal({
      position: new THREE.Vector3(0, 1.6, -17),
      color: '#90e0ef',
      targetWorldIndex: 3,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -13),
    });
    this.portals.push(next);
  }
}
