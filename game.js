'use strict';
// ============================================================
//  PORTAL ADVENTURE – game.js
//  Requires Three.js loaded globally as window.THREE
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }

function addBox(scene, colliders, mapObjs, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push(new THREE.Box3(
    new THREE.Vector3(x - w/2, 0, z - d/2),
    new THREE.Vector3(x + w/2, h, z + d/2)));
  mapObjs.push({ x, z, w, d });
  return mesh;
}

function addCyl(scene, colliders, mapObjs, x, z, r, h, mat) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push(new THREE.Box3(
    new THREE.Vector3(x - r, 0, z - r),
    new THREE.Vector3(x + r, h, z + r)));
  mapObjs.push({ x, z, w: r*2, d: r*2 });
  return mesh;
}

// ── Portal factory ────────────────────────────────────────────
function makePortal(opts) {
  const { position, color, targetWorld, exitPos } = opts;
  const col = new THREE.Color(color);
  const group = new THREE.Group();
  group.position.copy(position);

  // Outer ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.12, 16, 80),
    new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3, roughness: 0.1, metalness: 0.9 }));
  group.add(ring);

  // Inner swirl plane
  const portalMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: col.clone() } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uTime;uniform vec3 uColor;varying vec2 vUv;
      void main(){
        vec2 uv=vUv-.5; float r=length(uv); float a=atan(uv.y,uv.x);
        float s1=sin(a*4.+uTime*2.+r*8.)*.5+.5;
        float s2=sin(a*2.-uTime*1.5+r*12.)*.5+.5;
        float edge=smoothstep(.5,.45,r);
        float center=1.-smoothstep(.0,.3,r);
        vec3 c=mix(uColor*.3,uColor*1.5,s1*.6+s2*.4);
        c=mix(c,vec3(1.),center*.4);
        gl_FragColor=vec4(c,edge*(.6+s1*.4));
      }`
  });
  const plane = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), portalMat);
  group.add(plane);

  // Point light
  const light = new THREE.PointLight(col, 4, 8);
  group.add(light);

  // Spark particles
  const N = 60;
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(N * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const phases = Array.from({ length: N }, () => rand(0, Math.PI * 2));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: col, size: 0.07, transparent: true, opacity: 0.85 }));
  group.add(sparks);

  let t = 0;
  group.userData.update = (dt) => {
    t += dt;
    portalMat.uniforms.uTime.value = t;
    ring.scale.set(1 + Math.sin(t * 3) * 0.03, 1 + Math.sin(t * 3) * 0.03, 1);
    light.intensity = 3 + Math.sin(t * 4) * 1.5;
    const pa = sparks.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ph = phases[i] + t * (1.2 + (i % 3) * 0.3);
      const rad = 1.5 + Math.sin(t * 2 + phases[i]) * 0.15;
      pa[i*3] = Math.cos(ph) * rad;
      pa[i*3+1] = Math.sin(ph) * rad;
      pa[i*3+2] = Math.sin(t * 3 + phases[i]) * 0.1;
    }
    sparks.geometry.attributes.position.needsUpdate = true;
  };

  return {
    mesh: group,
    targetWorld,
    color,
    exitPos: exitPos || new THREE.Vector3(0, 1.7, 0),
  };
}

// ── World builders ────────────────────────────────────────────

function buildAncientRuins(allWorlds) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0800);
  scene.fog = new THREE.Fog(0x3d1f00, 18, 60);
  scene.add(new THREE.AmbientLight(0xffcc88, 1.5));
  const sun = new THREE.DirectionalLight(0xffa050, 4.0);
  sun.position.set(10, 20, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xff8844, 1.0);
  fill.position.set(-5, 5, 10); scene.add(fill);

  const stoneMat  = new THREE.MeshStandardMaterial({ color: 0x9e8a70, roughness: 0.9 });
  const stone2Mat = new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 0.85 });
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: 0.9 });
  const colliders = [], mapObjs = [];

  // Ground
  const gGeo = new THREE.PlaneGeometry(50, 50, 20, 20);
  const gPos = gGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) gPos.setZ(i, rand(-0.12, 0.12));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0xc9933a, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Columns
  [[-6,-6],[6,-6],[-6,6],[6,6],[-10,0],[10,0],[0,-10],[0,10]].forEach(([cx,cz]) => {
    addBox(scene, colliders, mapObjs, cx, 0, cz, 1.2, 0.5, 1.2, stone2Mat);
    addCyl(scene, colliders, mapObjs, cx, cz, 0.5, 4.5, stoneMat);
    addBox(scene, colliders, mapObjs, cx, 4.5, cz, 1.3, 0.5, 1.3, stone2Mat);
  });

  // Walls
  [[-8,0,-18,6,3,0.8],[2,0,-18,4,2,0.8],[10,0,-18,5,3.5,0.8],
   [-5,0,18,8,2.5,0.8],[8,0,18,4,1.5,0.8],[-18,0,0,0.8,2,10],[18,0,-3,0.8,3,8]
  ].forEach(a => addBox(scene, colliders, mapObjs, ...a, wallMat));

  // Rubble
  [[-3,-14],[4,-13],[-12,5],[13,-7],[-7,14],[12,12],[-14,-12],[3,7],[-8,-8],[15,3]].forEach(([rx,rz]) => {
    addBox(scene, colliders, mapObjs, rx, 0, rz, rand(0.4,1.2), rand(0.2,0.7), rand(0.3,0.9), stone2Mat);
  });

  // Altar
  addBox(scene, colliders, mapObjs, 0, 0, 0, 3, 0.4, 3, stone2Mat);
  addBox(scene, colliders, mapObjs, 0, 0.4, 0, 2, 0.4, 2, stoneMat);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0xf4a261, emissive: 0xf4a261, emissiveIntensity: 3, transparent: true, opacity: 0.85 }));
  gem.position.set(0, 1.5, 0); scene.add(gem);
  const gemLight = new THREE.PointLight(0xf4a261, 3, 8);
  gemLight.position.set(0, 1.5, 0); scene.add(gemLight);

  // Torches
  [[-5,-5],[5,-5],[-5,5],[5,5]].forEach(([tx,tz]) => {
    const tl = new THREE.PointLight(0xff6600, 2.5, 8);
    tl.position.set(tx, 2.5, tz); scene.add(tl);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.5,6),
      new THREE.MeshStandardMaterial({color:0x5a3a1a}));
    stick.position.set(tx, 1.2, tz); scene.add(stick);
  });

  // Dust
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) { dPos[i*3]=rand(-25,25); dPos[i*3+1]=rand(0.5,15); dPos[i*3+2]=rand(-25,25); }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xffcc88, size: 0.05, transparent: true, opacity: 0.4 })));

  // Portals
  const portals = [
    makePortal({ position: new THREE.Vector3(0, 1.6, -42), color: '#52b788', targetWorld: 1, exitPos: new THREE.Vector3(0, 1.7, -38) }),
  ];
  portals.forEach(p => { scene.add(p.mesh); p.mesh.lookAt(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, 0)); });

  const onUpdate = (dt) => {
    const t = Date.now() * 0.001;
    gem.rotation.y += dt * 1.2;
    gem.position.y = 1.5 + Math.sin(t * 2) * 0.15;
    gemLight.intensity = 2.5 + Math.sin(t * 3) * 1;
    portals.forEach(p => p.mesh.userData.update(dt));
  };

  return { scene, portals, colliders, mapObjs, mapSize:100, minimapBg:'#2d1a0a', portalColor:'#f4a261',
    name:'RUINY STAROŻYTNE', icon:'🏛️', onUpdate,
    enemies: spawnWorldEnemies(scene, 'ruins') };
}

// ─────────────────────────────────────────────────────────────
function buildMistyForest() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a0d);
  scene.fog = new THREE.FogExp2(0x1a3d1f, 0.055);
  scene.add(new THREE.AmbientLight(0x4a8a5d, 2.0));
  const moon = new THREE.DirectionalLight(0xaaddbb, 2.5);
  moon.position.set(-8, 20, 10); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
  moon.shadow.camera.top = 30; moon.shadow.camera.bottom = -30;
  scene.add(moon);
  const moonFill = new THREE.DirectionalLight(0x224433, 1.0);
  moonFill.position.set(5, 5, -10); scene.add(moonFill);

  const barkMat  = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 1 });
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9 });
  const leafGlow = new THREE.MeshStandardMaterial({ color: 0x52b788, emissive: 0x52b788, emissiveIntensity: 0.3 });
  const colliders = [], mapObjs = [];

  // Ground
  const gGeo = new THREE.PlaneGeometry(50, 50, 20, 20);
  const gP = gGeo.attributes.position;
  for (let i = 0; i < gP.count; i++) gP.setZ(i, rand(-0.2, 0.2));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0x1e4d28, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Trees (avoid [0,-16] and [0,16] which block portal spawn points)
  [[-8,-8],[8,-8],[-6,6],[7,7],[-12,-2],[12,3],[-3,-14],[4,14],
   [-15,8],[15,-8],[-9,12],[9,-12],[-3,-16],[3,16]].forEach(([tx,tz]) => {
    const h = rand(4,8);
    addCyl(scene, colliders, mapObjs, tx, tz, rand(0.25,0.45), h, barkMat);
    for (let l = 0; l < 3; l++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(rand(1.1,1.9), 7, 5), l===1 ? leafGlow : leafMat);
      c.position.set(tx + rand(-0.8,0.8), h - 1 + l * 1.2, tz + rand(-0.8,0.8));
      c.castShadow = true; scene.add(c);
    }
  });

  // Mushrooms
  [[-3,-3],[3,3],[-5,2],[4,-4],[0,-7],[7,0],[-7,0],[0,7]].forEach(([mx,mz]) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.12,0.6,8),
      new THREE.MeshStandardMaterial({color:0xeeddcc}));
    stem.position.set(mx, 0.3, mz); scene.add(stem);
    const capCol = [0xff4466,0xff7700,0x44aaff][Math.floor(rand(0,3))];
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshStandardMaterial({color:capCol,emissive:capCol,emissiveIntensity:1.5}));
    cap.position.set(mx, 0.65, mz); scene.add(cap);
    const ml = new THREE.PointLight(capCol, 1.5, 4); ml.position.set(mx, 0.7, mz); scene.add(ml);
  });

  // Monoliths
  const monoMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.8 });
  [[-10,-10],[10,-10],[10,10],[-10,10]].forEach(([mx,mz]) =>
    addBox(scene, colliders, mapObjs, mx, 0, mz, 0.8, rand(2.5,3.5), 0.6, monoMat));

  // Fireflies
  const ffN = 180;
  const ffGeo = new THREE.BufferGeometry();
  const ffP = new Float32Array(ffN * 3);
  const ffPh = [];
  for (let i = 0; i < ffN; i++) {
    ffP[i*3] = rand(-20,20); ffP[i*3+1] = rand(0.3,4); ffP[i*3+2] = rand(-20,20);
    ffPh.push(rand(0, Math.PI*2));
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffP, 3));
  const ffMat = new THREE.PointsMaterial({ color: 0xaaffaa, size: 0.08, transparent: true, opacity: 0.9 });
  const ff = new THREE.Points(ffGeo, ffMat);
  scene.add(ff);

  // Portals
  const portals = [
    makePortal({ position: new THREE.Vector3(0, 1.6, 42),  color: '#f4a261', targetWorld: 0, exitPos: new THREE.Vector3(0, 1.7, 38) }),
    makePortal({ position: new THREE.Vector3(0, 1.6, -42), color: '#4361ee', targetWorld: 2, exitPos: new THREE.Vector3(0, 1.7,-38) }),
  ];
  portals.forEach(p => { scene.add(p.mesh); p.mesh.lookAt(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, 0)); });

  const onUpdate = (dt) => {
    const t = Date.now() * 0.001;
    const pa = ff.geometry.attributes.position.array;
    for (let i = 0; i < ffN; i++) {
      pa[i*3+1] = 0.3 + Math.abs(Math.sin(t * 0.7 + ffPh[i])) * 4;
      pa[i*3]   += Math.sin(t * 0.3 + ffPh[i]) * 0.007;
      pa[i*3+2] += Math.cos(t * 0.4 + ffPh[i]) * 0.007;
    }
    ff.geometry.attributes.position.needsUpdate = true;
    ffMat.opacity = 0.5 + Math.sin(t * 2) * 0.3;
    portals.forEach(p => p.mesh.userData.update(dt));
  };

  return { scene, portals, colliders, mapObjs, mapSize:100, minimapBg:'#0a1a0d', portalColor:'#52b788',
    name:'LAS MGŁY', icon:'🌲', onUpdate,
    enemies: spawnWorldEnemies(scene, 'forest') };
}

// ─────────────────────────────────────────────────────────────
function buildSpaceStation() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02020f);
  scene.fog = new THREE.Fog(0x0a0a2a, 20, 70);
  scene.add(new THREE.AmbientLight(0x223366, 2.0));
  const redL = new THREE.PointLight(0xff2200, 4, 18); redL.position.set(-8,4,-5); scene.add(redL);
  const cyanL = new THREE.PointLight(0x00ffff, 4, 18); cyanL.position.set(8,4,5); scene.add(cyanL);
  const topLight = new THREE.DirectionalLight(0x4466aa, 2.0); topLight.position.set(0,10,0); scene.add(topLight);
  const colliders = [], mapObjs = [];

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.8 });
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.4, metalness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.2, metalness: 0.9 });

  // Floor + grid
  const stFloor = new THREE.Mesh(new THREE.PlaneGeometry(40,40), floorMat);
  stFloor.rotation.x = -Math.PI/2;
  scene.add(stFloor);
  scene.add(new THREE.GridHelper(40, 20, 0x003366, 0x001133));

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40,40), wallMat);
  ceil.rotation.x = Math.PI/2; ceil.position.y = 6; scene.add(ceil);

  // Boundary walls
  [{ p:[0,3,-19], r:[0,0,0], w:40, h:6 },
   { p:[0,3,19],  r:[0,Math.PI,0], w:40, h:6 },
   { p:[-19,3,0], r:[0,Math.PI/2,0], w:40, h:6 },
   { p:[19,3,0],  r:[0,-Math.PI/2,0], w:40, h:6 }].forEach(({p,r,w,h}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), wallMat);
    m.position.set(...p); m.rotation.set(...r); scene.add(m);
  });
  colliders.push(
    new THREE.Box3(new THREE.Vector3(-20,0,-20),new THREE.Vector3(20,6,-18.5)),
    new THREE.Box3(new THREE.Vector3(-20,0,18.5),new THREE.Vector3(20,6,20)),
    new THREE.Box3(new THREE.Vector3(-20,0,-20),new THREE.Vector3(-18.5,6,20)),
    new THREE.Box3(new THREE.Vector3(18.5,0,-20),new THREE.Vector3(20,6,20)));

  // Neon strip helper
  const neon = (x,y,z,w,h,d,col) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:3}));
    m.position.set(x,y,z); scene.add(m);
  };
  neon(0,5.7,-18.9,20,0.08,0.02,0x00aaff); neon(0,5.7,18.9,20,0.08,0.02,0x00aaff);
  neon(-18.9,1,0,0.02,0.12,40,0xff2200); neon(18.9,1,0,0.02,0.12,40,0x00ff88);

  // Control panels & screens
  for (let i = 0; i < 4; i++) {
    const a = (i/4)*Math.PI*2, px = Math.cos(a)*8, pz = Math.sin(a)*8;
    addBox(scene, colliders, mapObjs, px, 0, pz, 2, 1.2, 0.5, metalMat);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.8),
      new THREE.MeshStandardMaterial({ color: i%2?0x00ffff:0x0066ff, emissive: i%2?0x00ffff:0x0066ff, emissiveIntensity:2 }));
    sc.position.set(px, 0.85, pz - 0.28); scene.add(sc);
  }

  // Metal pillars
  [[-12,-12],[12,-12],[12,12],[-12,12]].forEach(([px,pz]) => {
    addBox(scene, colliders, mapObjs, px, 0, pz, 0.8, 6, 0.8, metalMat);
    const nl = new THREE.Mesh(new THREE.BoxGeometry(0.05,6,0.05),
      new THREE.MeshStandardMaterial({color:0x00aaff,emissive:0x00aaff,emissiveIntensity:3}));
    nl.position.set(px+0.4, 3, pz+0.4); scene.add(nl);
  });

  // Stars
  const stGeo = new THREE.BufferGeometry();
  const stP = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const r=80+rand(0,50), t=rand(0,Math.PI*2), p=Math.acos(2*Math.random()-1);
    stP[i*3]=r*Math.sin(p)*Math.cos(t); stP[i*3+1]=r*Math.sin(p)*Math.sin(t); stP[i*3+2]=r*Math.cos(p);
  }
  stGeo.setAttribute('position', new THREE.BufferAttribute(stP, 3));
  scene.add(new THREE.Points(stGeo, new THREE.PointsMaterial({ color:0xffffff, size:0.3, transparent:true, opacity:0.7 })));

  // Holographic rings
  const holo1 = new THREE.Mesh(new THREE.TorusGeometry(2,0.04,8,60),
    new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x00ffff,emissiveIntensity:3,transparent:true,opacity:0.7}));
  holo1.position.set(0,3,0); scene.add(holo1);
  const holo2 = new THREE.Mesh(new THREE.TorusGeometry(1.5,0.04,8,60),
    new THREE.MeshStandardMaterial({color:0x4361ee,emissive:0x4361ee,emissiveIntensity:3,transparent:true,opacity:0.6}));
  holo2.position.set(0,3,0); holo2.rotation.x = Math.PI/2; scene.add(holo2);

  // Portals
  const portals = [
    makePortal({ position: new THREE.Vector3(0,1.6,36),  color:'#52b788', targetWorld:1, exitPos:new THREE.Vector3(0,1.7,32) }),
    makePortal({ position: new THREE.Vector3(0,1.6,-36), color:'#90e0ef', targetWorld:3, exitPos:new THREE.Vector3(0,1.7,-32) }),
  ];
  portals.forEach(p => { scene.add(p.mesh); p.mesh.lookAt(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, 0)); });

  const onUpdate = (dt) => {
    const t = Date.now() * 0.001;
    holo1.rotation.z += dt * 0.8; holo1.rotation.x += dt * 0.3;
    holo2.rotation.y += dt * 1.2;
    redL.intensity = 1.5 + Math.sin(t * 3) * 0.8;
    cyanL.intensity = 1.5 + Math.sin(t * 2 + 1) * 0.8;
    portals.forEach(p => p.mesh.userData.update(dt));
  };

  return { scene, portals, colliders, mapObjs, mapSize:80, minimapBg:'#05050f', portalColor:'#4361ee',
    name:'STACJA KOSMICZNA', icon:'🚀', onUpdate,
    enemies: spawnWorldEnemies(scene, 'space') };
}

// ─────────────────────────────────────────────────────────────
function buildIceCave() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040d1a);
  scene.fog = new THREE.FogExp2(0x081832, 0.05);
  scene.add(new THREE.AmbientLight(0x4488cc, 2.0));
  const il1 = new THREE.PointLight(0x88ddff, 5, 25); il1.position.set(0,5,0); scene.add(il1);
  const il2 = new THREE.PointLight(0x4499cc, 3, 18); il2.position.set(-8,3,-8); scene.add(il2);
  const il3 = new THREE.DirectionalLight(0x6699cc, 1.5); il3.position.set(0,10,5); scene.add(il3);
  const colliders = [], mapObjs = [];

  // Ground – icy
  const gGeo = new THREE.PlaneGeometry(44,44,20,20);
  const gP = gGeo.attributes.position;
  for (let i = 0; i < gP.count; i++) gP.setZ(i, rand(-0.07,0.07));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({color:0x99ccee,roughness:0.05,metalness:0.1}));
  ground.rotation.x = -Math.PI/2; scene.add(ground);

  const crystalMat = new THREE.MeshStandardMaterial({color:0x88ddff,emissive:0x2266aa,emissiveIntensity:0.5,roughness:0.05,transparent:true,opacity:0.82});
  const crystalMat2 = new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x55aadd,emissiveIntensity:0.8,roughness:0.03,transparent:true,opacity:0.7});

  // Crystal clusters
  [[-10,-10],[10,-10],[-10,10],[10,10],[-5,-14],[5,14],[-14,0],[14,0],
   [-7,7],[7,-7],[0,-16],[0,16]].forEach(([cx,cz]) => {
    const cnt = 3 + Math.floor(rand(0,3));
    for (let i = 0; i < cnt; i++) {
      const h = rand(1,4), r = rand(0.2,0.5);
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(r,h,5), Math.random()>.5?crystalMat:crystalMat2);
      mesh.position.set(cx+rand(-1.5,1.5), h/2, cz+rand(-1.5,1.5));
      mesh.rotation.z = rand(-0.25,0.25); mesh.rotation.y = rand(0,Math.PI); mesh.castShadow = true;
      scene.add(mesh);
      colliders.push(new THREE.Box3(new THREE.Vector3(cx-0.6,0,cz-0.6),new THREE.Vector3(cx+0.6,h,cz+0.6)));
      mapObjs.push({x:cx,z:cz,w:1,d:1});
    }
  });

  // Ice walls
  const iceSlab = new THREE.MeshStandardMaterial({color:0x6699bb,roughness:0.1,transparent:true,opacity:0.9});
  [[0,0,-20,10,4,1.5],[-8,0,-20,5,3,1.5],[10,0,-20,4,2.5,1.5],
   [0,0,20,10,4,1.5],[-10,0,20,6,3,1.5],[8,0,20,5,2,1.5],
   [-20,0,0,1.5,4,10],[20,0,0,1.5,3,8]].forEach(a => addBox(scene,colliders,mapObjs,...a,iceSlab));

  // Stalactites
  const stalMat = new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.75,roughness:0.1});
  [[-4,-5],[4,5],[-8,8],[8,-8],[0,0],[-12,-4],[12,4],[-6,-12],[6,12]].forEach(([sx,sz]) => {
    const h = rand(1.5,4);
    const m = new THREE.Mesh(new THREE.ConeGeometry(rand(0.1,0.3),h,5), stalMat);
    m.rotation.z = Math.PI; m.position.set(sx+rand(-0.5,0.5), 6-h/2, sz+rand(-0.5,0.5)); scene.add(m);
  });

  // Center spire
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.8,4,6),
    new THREE.MeshStandardMaterial({color:0xaaffff,emissive:0x44aacc,emissiveIntensity:1.5,transparent:true,opacity:0.85,roughness:0.05}));
  spire.position.set(0,2,0); scene.add(spire);
  const spireL = new THREE.PointLight(0x88ffff,4,10); spireL.position.set(0,3,0); scene.add(spireL);
  colliders.push(new THREE.Box3(new THREE.Vector3(-0.9,0,-0.9),new THREE.Vector3(0.9,4,0.9)));

  // Snow
  const snN = 500, snGeo = new THREE.BufferGeometry();
  const snP = new Float32Array(snN*3), snV = new Float32Array(snN);
  for (let i = 0; i < snN; i++) {
    snP[i*3]=rand(-22,22); snP[i*3+1]=rand(0,6); snP[i*3+2]=rand(-22,22);
    snV[i] = rand(0.3,0.8);
  }
  snGeo.setAttribute('position', new THREE.BufferAttribute(snP, 3));
  const snMesh = new THREE.Points(snGeo, new THREE.PointsMaterial({color:0xeeeeff,size:0.04,transparent:true,opacity:0.9}));
  scene.add(snMesh);

  // Portals
  const portals = [
    makePortal({ position: new THREE.Vector3(0,1.6,40),  color:'#4361ee', targetWorld:2, exitPos:new THREE.Vector3(0,1.7,36) }),
    makePortal({ position: new THREE.Vector3(0,1.6,-40), color:'#e63946', targetWorld:4, exitPos:new THREE.Vector3(0,1.7,-36) }),
  ];
  portals.forEach(p => { scene.add(p.mesh); p.mesh.lookAt(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, 0)); });

  const onUpdate = (dt) => {
    const t = Date.now() * 0.001;
    const pa = snMesh.geometry.attributes.position.array;
    for (let i = 0; i < snN; i++) {
      pa[i*3+1] -= snV[i] * dt;
      pa[i*3]   += Math.sin(t+i)*0.004;
      if (pa[i*3+1] < 0) { pa[i*3+1]=6; pa[i*3]=rand(-22,22); pa[i*3+2]=rand(-22,22); }
    }
    snMesh.geometry.attributes.position.needsUpdate = true;
    spireL.intensity = 3 + Math.sin(t*2)*1.5;
    il1.intensity = 2.5 + Math.sin(t*1.5+1)*0.8;
    portals.forEach(p => p.mesh.userData.update(dt));
  };

  return { scene, portals, colliders, mapObjs, mapSize:90, minimapBg:'#050d1a', portalColor:'#90e0ef',
    name:'LODOWA JASKINIA', icon:'❄️', onUpdate,
    enemies: spawnWorldEnemies(scene, 'ice') };
}

// ─────────────────────────────────────────────────────────────
function buildVolcano() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0200);
  scene.fog = new THREE.FogExp2(0x330800, 0.04);
  scene.add(new THREE.AmbientLight(0x5a1500, 2.0));
  scene.add(new THREE.HemisphereLight(0x440800, 0xff4400, 1.5));
  const lg1 = new THREE.PointLight(0xff3300, 6, 25); lg1.position.set(0,0.5,0); scene.add(lg1);
  const lg2 = new THREE.PointLight(0xff6600, 4, 18); lg2.position.set(-8,0.3,-8); scene.add(lg2);
  const dirFire = new THREE.DirectionalLight(0xff4400, 2.0); dirFire.position.set(0,15,-20); scene.add(dirFire);
  const colliders = [], mapObjs = [];

  // Ground
  const gGeo = new THREE.PlaneGeometry(50,50,30,30);
  const gP = gGeo.attributes.position;
  for (let i = 0; i < gP.count; i++) gP.setZ(i, rand(-0.25,0.25));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({color:0x1f0800,roughness:1,emissive:0x200500,emissiveIntensity:0.4}));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  // Lava shader
  const lavaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uTime;varying vec2 vUv;
      void main(){
        vec2 uv=vUv;
        float f=sin(uv.x*6.+uTime*1.5)*.5+sin(uv.y*4.-uTime*2.)*.5;
        float h=smoothstep(-.2,1.2,f);
        vec3 c=mix(vec3(.8,0.,0.),vec3(1.,.5,0.),h);
        c=mix(c,vec3(1.,.9,.5),h*h*.6);
        gl_FragColor=vec4(c,.95);
      }`
  });
  [{ x:0,z:5,w:3,d:20 },{ x:-7,z:0,w:20,d:2 },{ x:5,z:-8,w:2,d:12 }].forEach(({x,z,w,d}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,d), lavaMat);
    m.rotation.x = -Math.PI/2; m.position.set(x,0.02,z); scene.add(m);
  });

  // Volcano cone
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0,8,14,12),
    new THREE.MeshStandardMaterial({color:0x1a0e00,roughness:1}));
  cone.position.set(0,7,-22); scene.add(cone);
  const lavaTop = new THREE.Mesh(new THREE.CircleGeometry(1.5,16),
    new THREE.MeshStandardMaterial({color:0xff3300,emissive:0xff2200,emissiveIntensity:1.5}));
  lavaTop.rotation.x = -Math.PI/2; lavaTop.position.set(0,14.05,-22); scene.add(lavaTop);
  const topL = new THREE.PointLight(0xff4400,5,20); topL.position.set(0,16,-22); scene.add(topL);

  // Pillars & boulders
  const rockMat = new THREE.MeshStandardMaterial({color:0x2a1a0a,roughness:1});
  const hotMat  = new THREE.MeshStandardMaterial({color:0x3d1500,emissive:0x660800,emissiveIntensity:0.8,roughness:0.9});
  [[-12,-12],[12,-12],[-12,12],[12,12],[-6,-16],[6,-16],[-16,0],[16,0]].forEach(([px,pz]) => {
    addCyl(scene,colliders,mapObjs,px,pz,rand(0.5,1),rand(2,6),Math.random()>.5?hotMat:rockMat);
  });
  [[-5,-10],[5,-10],[-10,0],[10,5],[-8,8],[8,-8],[3,12],[-12,-5]].forEach(([bx,bz]) => {
    const r=rand(0.5,1.3);
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,7,5),Math.random()>.3?rockMat:hotMat);
    m.position.set(bx,r*.8,bz); m.castShadow=true; scene.add(m);
    colliders.push(new THREE.Box3(new THREE.Vector3(bx-r,0,bz-r),new THREE.Vector3(bx+r,r*2,bz+r)));
  });

  // Embers
  const emN=280, emGeo=new THREE.BufferGeometry();
  const emP=new Float32Array(emN*3), emPh=new Float32Array(emN), emSp=new Float32Array(emN);
  for (let i=0;i<emN;i++){
    emP[i*3]=rand(-20,20);emP[i*3+1]=rand(0,8);emP[i*3+2]=rand(-20,20);
    emPh[i]=rand(0,Math.PI*2);emSp[i]=rand(0.5,2);
  }
  emGeo.setAttribute('position',new THREE.BufferAttribute(emP,3));
  const emMesh=new THREE.Points(emGeo,new THREE.PointsMaterial({color:0xff5500,size:0.07,transparent:true,opacity:0.85}));
  scene.add(emMesh);

  // Portals
  const portals = [
    makePortal({ position: new THREE.Vector3(0,1.6,42),  color:'#90e0ef', targetWorld:3, exitPos:new THREE.Vector3(0,1.7,38) }),
    makePortal({ position: new THREE.Vector3(0,1.6,-42), color:'#f4a261', targetWorld:0, exitPos:new THREE.Vector3(0,1.7,-38) }),
  ];
  portals.forEach(p => { scene.add(p.mesh); p.mesh.lookAt(new THREE.Vector3(p.mesh.position.x, p.mesh.position.y, 0)); });

  const onUpdate = (dt) => {
    const t = Date.now() * 0.001;
    lavaMat.uniforms.uTime.value = t;
    const pa = emMesh.geometry.attributes.position.array;
    for (let i=0;i<emN;i++){
      pa[i*3+1]+=emSp[i]*dt;
      pa[i*3]+=Math.sin(t*1.5+emPh[i])*0.01;
      if (pa[i*3+1]>12){pa[i*3+1]=0.1;pa[i*3]=rand(-20,20);pa[i*3+2]=rand(-20,20);}
    }
    emMesh.geometry.attributes.position.needsUpdate=true;
    lg1.intensity=3.5+Math.sin(t*3)*1.5;
    topL.intensity=4+Math.sin(t*4)*2;
    portals.forEach(p=>p.mesh.userData.update(dt));
  };

  return { scene, portals, colliders, mapObjs, mapSize:100, minimapBg:'#1a0500', portalColor:'#e63946',
    name:'KRÓLESTWO WULKANU', icon:'🌋', onUpdate,
    enemies: spawnWorldEnemies(scene, 'volcano') };
}

// ── Player ────────────────────────────────────────────────────
function createPlayer(canvas) {
  const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 500);
  camera.position.set(0, 1.7, 8);
  let yaw = 0, pitch = 0, _bobPhase = 0;
  const keys = {};
  let _isMoving = false;

  const updateCam = () => {
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
    const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), pitch);
    camera.quaternion.copy(qY).multiply(qP);
  };

  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== canvas) return;
    yaw   -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch  = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, pitch));
    updateCam();
  });
  document.addEventListener('click', () => { if (!document.pointerLockElement) canvas.requestPointerLock(); });
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });

  const update = (dt, world) => {
    const sprint = keys['ShiftLeft']||keys['ShiftRight'];
    const spd = sprint ? 12 : 6;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const mv = new THREE.Vector3();
    if (keys['KeyW']||keys['ArrowUp'])    mv.add(fwd);
    if (keys['KeyS']||keys['ArrowDown']) mv.sub(fwd);
    if (keys['KeyA']||keys['ArrowLeft']) mv.sub(rgt);
    if (keys['KeyD']||keys['ArrowRight']) mv.add(rgt);

    _isMoving = mv.lengthSq() > 0;

    if (_isMoving) {
      mv.normalize().multiplyScalar(spd * dt);
      const np = camera.position.clone().add(mv);
      const half = world.mapSize/2 - 1.5;
      np.x = Math.max(-half, Math.min(half, np.x));
      np.z = Math.max(-half, Math.min(half, np.z));
      const pBox = b => new THREE.Box3(new THREE.Vector3(b.x-.4,0,b.z-.4),new THREE.Vector3(b.x+.4,2,b.z+.4));
      const hits = b => world.colliders.some(c => pBox({x:b.x,z:b.z}).intersectsBox(c));
      if (!hits(np)) { camera.position.x = np.x; camera.position.z = np.z; }
      else {
        const nx = {x:np.x, z:camera.position.z};
        const nz = {x:camera.position.x, z:np.z};
        if (!hits(nx)) camera.position.x = np.x;
        if (!hits(nz)) camera.position.z = np.z;
      }
    }

    // Kamera – bob głowy
    _bobPhase += _isMoving ? spd * dt * 0.65 : dt * 2;
    const bobAmt = _isMoving ? (sprint ? 0.09 : 0.055) : 0.014;
    camera.position.y = 1.7 + Math.sin(_bobPhase * 2) * bobAmt;
    updateCam();
  };

  return { camera, keys, update,
    get yaw()      { return yaw; },
    set yaw(v)     { yaw = v; updateCam(); },
    set pitch(v)   { pitch = v; updateCam(); },
    get _isMoving(){ return _isMoving; }
  };
}

// ── Minimap ───────────────────────────────────────────────────
function drawMinimap(ctx, world, player) {
  const W=120, H=120, scale=90/world.mapSize, cx=W/2, cy=H/2;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = world.minimapBg || '#111';
  ctx.beginPath(); ctx.roundRect(0,0,W,H,6); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=1; ctx.strokeRect(8,8,104,104);

  // Map objects
  ctx.fillStyle='rgba(255,255,255,.12)';
  (world.mapObjs || []).forEach(o => {
    ctx.fillRect(cx+o.x*scale-o.w*scale/2, cy-o.z*scale-o.d*scale/2, o.w*scale, o.d*scale);
  });

  // Portals
  world.portals.forEach(p => {
    const px=cx+p.mesh.position.x*scale, py=cy-p.mesh.position.z*scale;
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle=p.color||'#7b2fff';
    ctx.shadowColor=p.color||'#7b2fff'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0;
  });

  // Player arrow
  const ppx=cx+player.camera.position.x*scale, ppy=cy-player.camera.position.z*scale;
  ctx.save(); ctx.translate(ppx,ppy); ctx.rotate(-player.yaw);
  ctx.fillStyle='#00d4ff'; ctx.shadowColor='#00d4ff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(4,4); ctx.lineTo(0,2); ctx.lineTo(-4,4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Main Game ─────────────────────────────────────────────────
(function initGame() {
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const clock = new THREE.Clock();
  const mmCtx = document.getElementById('minimap-canvas').getContext('2d');
  const overlay = document.getElementById('portal-overlay');
  const hintEl  = document.getElementById('portal-hint');
  const wNameEl = document.getElementById('world-name');
  const wIconEl = document.getElementById('world-icon');
  const wCntEl  = document.getElementById('world-counter');
  const pauseEl = document.getElementById('pause-screen');

  // Broń – osobna scena (render overlay)
  const weapon    = createWeaponScene();
  const weaponCam = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.01, 5);
  renderer.autoClear = false;

  let worlds, currentIdx, player, transitioning=false, paused=false, started=false;

  // ── Load world ──────────────────────────────────────────────
  function loadWorld(idx, fromDir) {
    currentIdx = idx;
    const w = worlds[idx];
    wNameEl.textContent = w.name;
    wIconEl.textContent = w.icon;
    wCntEl.textContent  = `${idx+1} / ${worlds.length}`;

    const sp = (fromDir==='prev')
      ? (w.portals[w.portals.length-1]?.exitPos?.clone() || new THREE.Vector3(0,1.7,-8))
      : (w.portals[0]?.exitPos?.clone() || new THREE.Vector3(0,1.7,8));
    sp.y = 1.7;
    player.camera.position.copy(sp);
    player.yaw   = (fromDir==='prev') ? Math.PI : 0;
    player.pitch = 0;
  }

  // ── Portal transition ───────────────────────────────────────
  function triggerTransition(targetIdx, dir) {
    transitioning = true;
    // Clear all held keys so player doesn't slide after transition
    Object.keys(player.keys).forEach(k => { player.keys[k] = false; });
    const w = worlds[targetIdx];
    overlay.style.background = `radial-gradient(circle at center, ${w.portalColor}, #000)`;
    overlay.classList.add('active');
    setTimeout(() => {
      loadWorld(targetIdx, dir);
      setTimeout(() => {
        overlay.classList.remove('active');
        transitioning = false;
        // Re-acquire pointer lock after transition
        canvas.requestPointerLock();
      }, 600);
    }, 500);
  }

  // ── Portal collision ────────────────────────────────────────
  function checkPortals() {
    const w = worlds[currentIdx];
    let near = false;
    for (const p of w.portals) {
      const d = player.camera.position.distanceTo(p.mesh.position);
      if (d < 2.5) near = true;
      if (d < 1.4 && !transitioning) { triggerTransition(p.targetWorld, p.direction || 'next'); return; }
    }
    hintEl.classList.toggle('hidden', !near);
  }

  // ── Loop ────────────────────────────────────────────────────
  function loop() {
    requestAnimationFrame(loop);
    if (!started) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!paused && !transitioning) {
      const w = worlds[currentIdx];
      player.update(dt, w);
      w.onUpdate(dt);
      updateEnemies(w.enemies, player, w, dt);
      handlePlayerAttack(w.enemies, player, dt, weapon);
      checkPortals();
      drawMinimap(mmCtx, w, player);
      updateWeapon(weapon, player, dt, player._isMoving, false);
    }
    renderer.clear();
    renderer.render(worlds[currentIdx].scene, player.camera);
    renderer.clearDepth();
    renderer.render(weapon.scene, weaponCam);
  }

  // ── Start ───────────────────────────────────────────────────
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');

    worlds = [
      buildAncientRuins(),
      buildMistyForest(),
      buildSpaceStation(),
      buildIceCave(),
      buildVolcano(),
    ];
    player = createPlayer(canvas);
    initPlayerCombat(player, canvas);
    loadWorld(0, 'next');
    started = true;
    clock.start();
    canvas.requestPointerLock();
  });

  // ── Pause ───────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    // Ignore ESC during transitions (browser may fire it on pointerlock release)
    if (e.code === 'Escape' && started && !transitioning) {
      paused ? resume() : pause();
    }
  });

  function pause() {
    paused = true;
    pauseEl.classList.remove('hidden');
    document.exitPointerLock?.();
  }
  function resume() {
    paused = false;
    pauseEl.classList.add('hidden');
    canvas.requestPointerLock();
  }

  document.getElementById('resume-btn').addEventListener('click', resume);
  document.getElementById('menu-btn').addEventListener('click', () => location.reload());

  // ── Resize ──────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    if (player) { player.camera.aspect = innerWidth/innerHeight; player.camera.updateProjectionMatrix(); }
    weaponCam.aspect = innerWidth/innerHeight;
    weaponCam.updateProjectionMatrix();
  });

  loop();
})();
