import * as THREE from 'three';
import { World } from '../World.js';
import { createPortal } from '../Portal.js';

export class AncientRuins extends World {
  constructor(index, total) {
    super();
    this.name = 'RUINY STAROŻYTNE';
    this.icon = '🏛️';
    this.portalColor = '#f4a261';
    this.minimapBg = '#2d1a0a';
    this.mapSize = 50;
    this.worldType = 'ruins';
    this._index = index;
    this._total = total;
    this.build();
  }

  buildScene() {
    const scene = this.scene;

    // Sky – warm gradient via fog + background
    scene.background = new THREE.Color(0x1a0d00);
    scene.fog = new THREE.Fog(0x3d1f00, 15, 60);

    // Ambient
    scene.add(new THREE.AmbientLight(0xffcc88, 0.4));

    // Sun (warm orange)
    const sun = new THREE.DirectionalLight(0xffa050, 2.5);
    sun.position.set(10, 20, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    scene.add(sun);

    // Secondary fill light (blue sky bounce)
    const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
    fill.position.set(-5, 10, -10);
    scene.add(fill);

    // --- GROUND – Sandy ---
    const groundGeo = new THREE.PlaneGeometry(50, 50, 20, 20);
    // Slightly perturb vertices for terrain feel
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setZ(i, (Math.random() - 0.5) * 0.15);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc9933a, roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stone material
    const stoneTex = this.textureLoader.load('./textures/stone.png');
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    stoneTex.repeat.set(2, 2);
    
    const stoneMat  = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x9e8a70, roughness: 0.9, metalness: 0.05 });
    const stone2Mat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x7a6a55, roughness: 0.85, metalness: 0.05 });

    // --- COLUMNS (circle arrangement) ---
    const columnPositions = [
      [-6, -6], [6, -6], [-6, 6], [6, 6],
      [-10, 0], [10, 0], [0, -10], [0, 10],
    ];
    for (const [cx, cz] of columnPositions) {
      // Base
      this.addBox(scene, cx, 0, cz, 1.2, 0.5, 1.2, stone2Mat);
      // Shaft
      this.addCylinder(scene, cx, cz, 0.5, 4.5, stoneMat);
      // Capital
      this.addBox(scene, cx, 4.5, cz, 1.3, 0.5, 1.3, stone2Mat);
    }

    // --- BROKEN WALLS ---
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: 0.9 });
    // North wall segments
    this.addBox(scene, -8, 0, -18, 6, 3, 0.8, wallMat);
    this.addBox(scene, 2,  0, -18, 4, 2, 0.8, wallMat);
    this.addBox(scene, 10, 0, -18, 5, 3.5, 0.8, wallMat);
    // South partial
    this.addBox(scene, -5, 0, 18, 8, 2.5, 0.8, wallMat);
    this.addBox(scene, 8, 0, 18, 4, 1.5, 0.8, wallMat);
    // Side
    this.addBox(scene, -18, 0, 0, 0.8, 2, 10, wallMat);
    this.addBox(scene, 18, 0, -3, 0.8, 3, 8, wallMat);

    // --- RUBBLE (random small boxes) ---
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1 });
    const rubblePositions = [
      [-3, -14], [4, -13], [-12, 5], [13, -7], [-7, 14], [12, 12],
      [-14, -12], [3, 7], [-8, -8], [15, 3]
    ];
    for (const [rx, rz] of rubblePositions) {
      const w = 0.4 + Math.random() * 0.8;
      const h = 0.2 + Math.random() * 0.5;
      this.addBox(scene, rx, 0, rz, w, h, w * 0.8, rubbleMat);
    }

    // --- ALTAR in the center ---
    this.addBox(scene, 0, 0, 0, 3, 0.4, 3, stone2Mat);
    this.addBox(scene, 0, 0.4, 0, 2, 0.4, 2, stoneMat);
    this.addBox(scene, 0, 0.8, 0, 1.2, 0.3, 1.2, stone2Mat);

    // Altar glowing gem
    const gemGeo = new THREE.OctahedronGeometry(0.3, 0);
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, emissive: 0xf4a261, emissiveIntensity: 3, transparent: true, opacity: 0.85 });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 1.5, 0);
    scene.add(gem);
    const gemLight = new THREE.PointLight(0xf4a261, 3, 8);
    gemLight.position.set(0, 1.5, 0);
    scene.add(gemLight);

    // Animate gem
    this._onUpdate = (delta) => {
      gem.rotation.y += delta * 1.2;
      gem.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.15;
      gemLight.intensity = 2.5 + Math.sin(Date.now() * 0.003) * 1;
    };

    // Torches (point lights with orange glow)
    const torchPositions = [[-5, -5], [5, -5], [-5, 5], [5, 5]];
    for (const [tx, tz] of torchPositions) {
      const torch = new THREE.PointLight(0xff6600, 2.5, 8);
      torch.position.set(tx, 2.5, tz);
      scene.add(torch);
      // Torch stick
      const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(tx, 1.2, tz);
      scene.add(stick);
    }

    // Stars / dust particles
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 800;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3]     = (Math.random() - 0.5) * 50;
      dustPos[i * 3 + 1] = Math.random() * 15 + 0.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffcc88, size: 0.05, transparent: true, opacity: 0.4 });
    scene.add(new THREE.Points(dustGeo, dustMat));
  }

  buildPortals() {
    // Portal to next world (MistyForest), placed on north side
    const next = createPortal({
      position: new THREE.Vector3(0, 1.6, -17),
      color: '#52b788',
      targetWorldIndex: 1,
      direction: 'prev',
      exitPosition: new THREE.Vector3(0, 1.7, -13),
    });
    this.portals.push(next);
  }
}
