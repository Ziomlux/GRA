'use strict';
import * as THREE from 'three';

// ============================================================
//  ENEMIES.JS v2 – AI + animowane postacie (nogi, ręce, broń)
// ============================================================
export const DETECT_RANGE  = 16;
export const ATTACK_RANGE  = 2.4;
export const ATK_COOLDOWN  = 1.5;
export const PLR_ATK_RANGE = 3.2;
export const PLR_ATK_CDN   = 0.45;
export const PLR_ATK_DMG   = 30;
export const PLR_INV_TIME  = 0.6;

// ── Mesh wroga z kończynami ───────────────────────────────────
export function createEnemyMesh(type) {
  const group = new THREE.Group();
  const T = {
    golem:     { bc:0x8a7560, ac:0x9a8570, ec:0xff7700, bh:1.3, bw:0.85, sphere:false, scale:1.0 },
    wraith:    { bc:0x330055, ac:0x2a0044, ec:0xcc00ff, bh:1.6, bw:0.38, sphere:false, scale:0.9 },
    drone:     { bc:0x1a2a44, ac:0x1a2a44, ec:0x00ffff, bh:0.6, bw:0.70, sphere:true,  scale:1.0 },
    elemental: { bc:0x224466, ac:0x1a3355, ec:0xaaeeff, bh:1.4, bw:0.48, sphere:false, scale:1.0 },
    imp:       { bc:0x550000, ac:0x440000, ec:0xff4400, bh:0.9, bw:0.38, sphere:false, scale:0.85 },
  };
  const c = T[type] || T.golem;
  group.scale.setScalar(c.scale);

  const bodyMat = new THREE.MeshStandardMaterial({ color:c.bc, roughness:0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color:c.ac, roughness:0.6 });
  const eyeMat  = new THREE.MeshStandardMaterial({ color:c.ec, emissive:c.ec, emissiveIntensity:3 });
  group.userData.bodyMat = bodyMat;

  // ── TUŁÓW ──
  const bodyGeo = c.sphere
    ? new THREE.SphereGeometry(c.bw*0.85, 10, 7)
    : new THREE.BoxGeometry(c.bw, c.bh, c.bw*0.75);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = c.bh / 2 + (type==='drone'?1.3:0);
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;
  group.userData.bh   = c.bh;

  // ── GŁOWA ──
  const headR = c.sphere ? 0.28 : 0.24;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 8, 6), accentMat);
  head.position.y = c.bh + (c.sphere ? 0.75 : 0.24);
  head.castShadow = true;
  group.add(head);
  group.userData.head = head;

  // ── OCZY ──
  [-0.09, 0.09].forEach(ox => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), eyeMat);
    eye.position.set(ox, c.bh + (c.sphere ? 0.78 : 0.27), c.sphere ? c.bw*0.85 : 0.21);
    group.add(eye);
  });

  // ── NOGI (brak u drona i ducha) ──
  if (!c.sphere && type !== 'wraith') {
    const legH  = c.bh * 0.52;
    const legW  = c.bw * 0.32;
    const legGeo = new THREE.BoxGeometry(legW, legH, legW * 0.9);
    ['leftLeg','rightLeg'].forEach((name, i) => {
      const leg = new THREE.Mesh(legGeo, accentMat);
      leg.position.set((i===0?-1:1) * c.bw*0.22, -(legH*0.5 + 0.02), 0);
      leg.castShadow = true;
      body.add(leg);                    // child of body for proper pivot
      group.userData[name] = leg;
    });
  }

  // ── RĘCE ──
  if (!c.sphere) {
    const armH  = c.bh * 0.48;
    const armW  = c.bw * 0.28;
    const armGeo = new THREE.BoxGeometry(armW, armH, armW * 0.85);
    ['leftArm','rightArm'].forEach((name, i) => {
      const arm = new THREE.Mesh(armGeo, accentMat);
      arm.position.set((i===0?-1:1) * (c.bw*0.5 + armW*0.5), c.bh*0.1, 0);
      arm.castShadow = true;
      body.add(arm);
      group.userData[name] = arm;
    });
  }

  // ── DRON: wirujące śmigła ──
  if (c.sphere) {
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.02, 0.08),
        new THREE.MeshStandardMaterial({ color:0x334455, metalness:0.9 })
      );
      const hub = new THREE.Group();
      hub.rotation.y = (i/4)*Math.PI*2;
      hub.add(blade);
      blade.position.x = 0.28;
      body.add(hub);
      group.userData['rotor'+i] = hub;
    }
  }

  // ── GLOW ──
  const glow = new THREE.PointLight(c.ec, 2, 4);
  glow.position.y = c.bh * 0.8;
  group.add(glow);
  group.userData.glow = glow;

  // ── PASEK HP (billboard) ──
  const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.09),
    new THREE.MeshBasicMaterial({ color:0x330000, side:THREE.DoubleSide, depthTest:false }));
  const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.08),
    new THREE.MeshBasicMaterial({ color:0x00cc44, side:THREE.DoubleSide, depthTest:false }));
  const hpBar  = new THREE.Group();
  hpBar.add(hpBg); hpBar.add(hpFill);
  hpFill.position.z = 0.002;
  hpBar.position.y = c.bh + 0.7;
  group.add(hpBar);
  group.userData.hpFill = hpFill;
  group.userData.hpBar  = hpBar;

  return group;
}

// ── Konfiguracje wrogów ───────────────────────────────────────
const WORLD_ENEMIES = {
  ruins:   [
    {pos:[-8,0,-8],  type:'golem',     hp:90,  damage:12, speed:2.0},
    {pos:[10,0,-12], type:'golem',     hp:90,  damage:12, speed:2.0},
    {pos:[-12,0,5],  type:'golem',     hp:90,  damage:12, speed:2.0},
    {pos:[6,0,12],   type:'golem',     hp:90,  damage:12, speed:2.0},
    {pos:[0,0,-20],  type:'golem',     hp:90,  damage:14, speed:1.8},
    {pos:[-18,0,-5], type:'golem',     hp:90,  damage:14, speed:1.8},
  ],
  forest:  [
    {pos:[-5,0,5],   type:'wraith',    hp:50,  damage:8,  speed:3.8},
    {pos:[7,0,-6],   type:'wraith',    hp:50,  damage:8,  speed:3.8},
    {pos:[-10,0,-10],type:'wraith',    hp:50,  damage:8,  speed:3.8},
    {pos:[12,0,7],   type:'wraith',    hp:50,  damage:8,  speed:3.8},
    {pos:[0,0,10],   type:'wraith',    hp:50,  damage:9,  speed:4.0},
    {pos:[-15,0,10], type:'wraith',    hp:50,  damage:9,  speed:4.0},
    {pos:[15,0,-10], type:'wraith',    hp:50,  damage:9,  speed:4.0},
  ],
  space:   [
    {pos:[-7,0,7],   type:'drone',     hp:60,  damage:10, speed:3.2},
    {pos:[7,0,-7],   type:'drone',     hp:60,  damage:10, speed:3.2},
    {pos:[-7,0,-7],  type:'drone',     hp:60,  damage:10, speed:3.2},
    {pos:[7,0,7],    type:'drone',     hp:60,  damage:10, speed:3.2},
    {pos:[0,0,-12],  type:'drone',     hp:70,  damage:12, speed:3.5},
    {pos:[0,0,12],   type:'drone',     hp:70,  damage:12, speed:3.5},
  ],
  ice:     [
    {pos:[-8,0,6],   type:'elemental', hp:70,  damage:10, speed:2.5},
    {pos:[8,0,-6],   type:'elemental', hp:70,  damage:10, speed:2.5},
    {pos:[-7,0,-9],  type:'elemental', hp:70,  damage:10, speed:2.5},
    {pos:[7,0,9],    type:'elemental', hp:70,  damage:10, speed:2.5},
    {pos:[0,0,-18],  type:'elemental', hp:80,  damage:12, speed:2.8},
    {pos:[-18,0,0],  type:'elemental', hp:80,  damage:12, speed:2.8},
  ],
  volcano: [
    {pos:[-5,0,-5],  type:'imp',       hp:45,  damage:15, speed:4.5},
    {pos:[5,0,5],    type:'imp',       hp:45,  damage:15, speed:4.5},
    {pos:[-8,0,5],   type:'imp',       hp:45,  damage:15, speed:4.5},
    {pos:[8,0,-5],   type:'imp',       hp:45,  damage:15, speed:4.5},
    {pos:[0,0,-12],  type:'imp',       hp:50,  damage:18, speed:5.0},
    {pos:[-12,0,-8], type:'imp',       hp:50,  damage:18, speed:5.0},
    {pos:[12,0,8],   type:'imp',       hp:50,  damage:18, speed:5.0},
  ],
};

export function spawnWorldEnemies(scene, worldType) {
  return (WORLD_ENEMIES[worldType] || []).map(cfg => {
    const mesh = createEnemyMesh(cfg.type);
    mesh.position.set(cfg.pos[0], 0, cfg.pos[2]);
    scene.add(mesh);
    return {
      mesh, hp:cfg.hp, maxHp:cfg.hp, speed:cfg.speed, damage:cfg.damage, type:cfg.type,
      spawnPos: new THREE.Vector3(cfg.pos[0], 0, cfg.pos[2]),
      state:'patrol', attackCooldown:0, _walkPhase:Math.random()*Math.PI*2,
      _attackAnim:0, _idlePhase:Math.random()*Math.PI*2,
      patrolTarget: new THREE.Vector3(cfg.pos[0], 0, cfg.pos[2]),
      patrolTimer:Math.random()*3, deathTimer:0, hitFlash:0, alive:true,
    };
  });
}

// ── Aktualizacja kończyn ──────────────────────────────────────
function animateLimbs(en, dt, moving) {
  const ud = en.mesh.userData;
  const t  = Date.now() * 0.001;

  if (en.type === 'drone') {
    // Obracające się śmigła
    for (let i = 0; i < 4; i++) {
      const r = ud['rotor'+i];
      if (r) r.rotation.y += dt * (28 + i*3);
    }
    // Unoszenie
    ud.body.position.y = (en.mesh.userData.bh/2 + 1.3) + Math.sin(t*1.5)*0.12;
    return;
  }

  if (en.type === 'wraith') {
    // Duch: faluje
    if (ud.body) ud.body.rotation.z = Math.sin(t*2 + en._idlePhase)*0.06;
    if (ud.head) ud.head.rotation.y = Math.sin(t*1.5 + en._idlePhase)*0.25;
    en.mesh.position.y = Math.sin(t*2.5 + en._idlePhase)*0.18;
    if (ud.leftArm)  ud.leftArm.rotation.z  = -0.4 + Math.sin(t*2)*0.3;
    if (ud.rightArm) ud.rightArm.rotation.z =  0.4 - Math.sin(t*2)*0.3;
    return;
  }

  if (moving) {
    en._walkPhase += dt * en.speed * 3.5;
    const sw = Math.sin(en._walkPhase);
    if (ud.leftLeg)  ud.leftLeg.rotation.x  =  sw * 0.5;
    if (ud.rightLeg) ud.rightLeg.rotation.x = -sw * 0.5;
    if (ud.leftArm)  ud.leftArm.rotation.x  = -sw * 0.4;
    if (ud.rightArm) ud.rightArm.rotation.x =  sw * 0.4;
    // Kołysanie tułowia
    if (ud.body) {
      ud.body.rotation.z = sw * 0.04;
      ud.body.position.y = ud.bh/2 + Math.abs(Math.sin(en._walkPhase*2))*0.05;
    }
  } else if (en.state === 'attack') {
    // Atak: wyciągnięcie ramienia
    en._attackAnim += dt * 8;
    const atkSw = Math.sin(en._attackAnim) * 0.7;
    if (ud.rightArm) ud.rightArm.rotation.x = -1.0 + atkSw;
    if (ud.leftArm)  ud.leftArm.rotation.x  =  0.2;
    if (ud.body)     ud.body.rotation.x      = Math.sin(en._attackAnim)*0.08;
  } else {
    // Oddech / idle
    const idleSw = Math.sin(t*1.2 + en._idlePhase)*0.04;
    if (ud.body)     ud.body.position.y = ud.bh/2 + idleSw;
    if (ud.head)     ud.head.rotation.y = Math.sin(t*0.8 + en._idlePhase)*0.15;
    // Reset kończyn
    ['leftLeg','rightLeg','leftArm','rightArm'].forEach(k => {
      if (ud[k]) { ud[k].rotation.x *= 0.88; ud[k].rotation.z *= 0.88; }
    });
  }
}

// ── AI wrogów ─────────────────────────────────────────────────
export function updateEnemies(enemies, player, world, dt) {
  const pp   = player.camera.position;
  const half = (world.mapSize || 40) / 2 - 2;

  enemies.forEach(en => {
    if (!en.alive) {
      en.deathTimer += dt;
      en.mesh.rotation.z = Math.min(Math.PI/2, en.deathTimer*3);
      en.mesh.position.y -= dt * (0.15 + en.deathTimer*0.08);
      if (en.deathTimer > 2.5) en.mesh.visible = false;
      return;
    }

    // HP bar – billboard
    const ud = en.mesh.userData;
    if (ud.hpFill) {
      const pct = en.hp / en.maxHp;
      ud.hpFill.scale.x = Math.max(0.01, pct);
      ud.hpFill.position.x = -(0.425 * (1 - pct));
      ud.hpFill.material.color.setHex(pct>0.5 ? 0x00cc44 : pct>0.25 ? 0xffaa00 : 0xff2200);
      if (ud.hpBar) ud.hpBar.lookAt(pp);
    }

    // Hit flash
    const bm = ud.bodyMat;
    if (en.hitFlash > 0) {
      en.hitFlash -= dt;
      if (bm) { bm.emissive = new THREE.Color(1,1,1); bm.emissiveIntensity = 5; }
    } else {
      if (bm) bm.emissiveIntensity = 0;
    }

    if (en.attackCooldown > 0) en.attackCooldown -= dt;
    const dist = en.mesh.position.distanceTo(pp);

    // Stany  
    if (dist < ATTACK_RANGE)          en.state = 'attack';
    else if (dist < DETECT_RANGE)     en.state = 'chase';
    else if (dist > DETECT_RANGE*1.4) en.state = 'patrol';

    let moving = false;

    if (en.state === 'patrol') {
      en.patrolTimer -= dt;
      if (en.patrolTimer <= 0) {
        const a = Math.random()*Math.PI*2, r = 3+Math.random()*7;
        en.patrolTarget.set(
          THREE.MathUtils.clamp(en.spawnPos.x+Math.cos(a)*r,-half,half), 0,
          THREE.MathUtils.clamp(en.spawnPos.z+Math.sin(a)*r,-half,half));
        en.patrolTimer = 2.5 + Math.random()*4;
      }
      const dir = new THREE.Vector3().subVectors(en.patrolTarget, en.mesh.position); dir.y=0;
      if (dir.length() > 0.5) {
        const step = dir.clone().normalize().multiplyScalar(en.speed*0.4*dt);
        en.mesh.position.add(step);
        en.mesh.lookAt(en.mesh.position.x+step.x, en.mesh.position.y, en.mesh.position.z+step.z);
        moving = true;
      }
    } else if (en.state === 'chase') {
      const dir = new THREE.Vector3().subVectors(pp, en.mesh.position); dir.y=0; dir.normalize();
      en.mesh.lookAt(pp.x, en.mesh.position.y, pp.z);
      en.mesh.position.addScaledVector(dir, en.speed*dt);
      en.mesh.position.x = THREE.MathUtils.clamp(en.mesh.position.x,-half,half);
      en.mesh.position.z = THREE.MathUtils.clamp(en.mesh.position.z,-half,half);
      moving = true;
    } else if (en.state === 'attack') {
      en.mesh.lookAt(pp.x, en.mesh.position.y, pp.z);
      if (en.attackCooldown <= 0) {
        en.attackCooldown = ATK_COOLDOWN;
        if (dist < ATTACK_RANGE+0.6) damagePlayer(player, en.damage);
      }
    }

    animateLimbs(en, dt, moving);
  });
}

// ── Broń gracza (viewmodel) ───────────────────────────────────
export function createWeaponScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 3));
  const dirL = new THREE.DirectionalLight(0xffffff, 2);
  dirL.position.set(1, 2, 1); scene.add(dirL);

  const weaponGroup = new THREE.Group();

  // Ostrze
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.58, 0.028),
    new THREE.MeshStandardMaterial({ color:0xddeeff, metalness:0.95, roughness:0.05 }));
  blade.position.y = 0.29;
  weaponGroup.add(blade);

  // Glowia (poświata)
  const glowBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.60, 0.035),
    new THREE.MeshStandardMaterial({ color:0x8866ff, emissive:0x6644ff, emissiveIntensity:1.5, transparent:true, opacity:0.35 }));
  glowBlade.position.y = 0.29;
  weaponGroup.add(glowBlade);

  // Jelec
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.04, 0.04),
    new THREE.MeshStandardMaterial({ color:0xddaa22, metalness:0.8, roughness:0.2 }));
  guard.position.y = 0.0;
  weaponGroup.add(guard);

  // Rękojeść
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.038, 0.2, 0.038),
    new THREE.MeshStandardMaterial({ color:0x8b4513, roughness:0.85 }));
  handle.position.y = -0.1;
  weaponGroup.add(handle);

  // Pommel
  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 6, 5),
    new THREE.MeshStandardMaterial({ color:0xccaa00, metalness:0.9 }));
  pommel.position.y = -0.22;
  weaponGroup.add(pommel);

  // Bazowa pozycja (dolny prawy róg widoku)
  weaponGroup.position.set(0.28, -0.28, -0.52);
  weaponGroup.rotation.set(0.15, -0.08, 0.07);
  scene.add(weaponGroup);

  return { scene, mesh: weaponGroup };
}

// ── Animacja broni ────────────────────────────────────────────
let _wpnBob = 0, _wpnAttackAnim = 0, _wpnAttacking = false;
let _wpnSwayX = 0, _wpnSwayY = 0;
let _prevMouseDX = 0, _prevMouseDY = 0;

export function updateWeapon(weapon, player, dt, isMoving, isAttacking) {
  const t = Date.now() * 0.001;
  const base = weapon.mesh;

  if (isAttacking && !_wpnAttacking) {
    _wpnAttacking = true; _wpnAttackAnim = 0;
  }

  // Bob podczas chodzenia
  if (isMoving) {
    _wpnBob += dt * 9;
  } else {
    _wpnBob += dt * 2.5; // wolniejszy idle bob
  }
  const bobAmt = isMoving ? 0.018 : 0.006;
  const bobY   = Math.sin(_wpnBob) * bobAmt;
  const bobX   = Math.sin(_wpnBob * 0.5) * bobAmt * 0.5;

  // Sway (kołysanie za kamerą)
  _wpnSwayX = THREE.MathUtils.lerp(_wpnSwayX, 0, dt*6);
  _wpnSwayY = THREE.MathUtils.lerp(_wpnSwayY, 0, dt*6);

  // Animacja ataku
  let attackOffsetZ = 0, attackOffsetY = 0, attackRot = 0;
  if (_wpnAttacking) {
    _wpnAttackAnim += dt * 14;
    const p = _wpnAttackAnim;
    attackOffsetZ = -Math.sin(p * 0.8) * 0.18;
    attackOffsetY =  Math.sin(p * 0.8) * 0.06;
    attackRot     = -Math.sin(p * 0.8) * 0.5;
    if (_wpnAttackAnim > Math.PI) _wpnAttacking = false;
  }

  base.position.set(
    0.28 + bobX + _wpnSwayX * 0.04,
    -0.28 + bobY + _wpnSwayY * 0.04 + attackOffsetY,
    -0.52 + attackOffsetZ
  );
  base.rotation.set(
    0.15 + attackRot,
    -0.08 + _wpnSwayX * 0.05,
    0.07 + _wpnSwayY * 0.05
  );
}

export function triggerWeaponAttack() {
  _wpnAttacking = true;
  _wpnAttackAnim = 0;
}

// ── Walka gracza ──────────────────────────────────────────────
export function initPlayerCombat(player, canvas) {
  player.hp = 100; player.maxHp = 100;
  player.attackCooldown = 0; player.invincible = 0;
  player.kills = 0; player._wantsAttack = false;
  player._isMoving = false;

  canvas.addEventListener('mousedown', e => {
    if (e.button===0 && document.pointerLockElement===canvas) player._wantsAttack = true;
  });
  window.addEventListener('keydown', e => {
    if (e.code==='KeyE') player._wantsAttack = true;
  });
}

export function handlePlayerAttack(enemies, player, dt, weapon) {
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.invincible > 0)     player.invincible -= dt;
  if (!player._wantsAttack) return;
  player._wantsAttack = false;

  if (player.attackCooldown > 0) { showAttackFeedback('cooldown'); return; }
  player.attackCooldown = PLR_ATK_CDN;

  if (weapon) triggerWeaponAttack();

  const pp  = player.camera.position;
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  let hit = false;

  enemies.forEach(en => {
    if (!en.alive) return;
    const dist = en.mesh.position.distanceTo(pp);
    if (dist > PLR_ATK_RANGE) return;
    const toEn = new THREE.Vector3().subVectors(en.mesh.position, pp); toEn.y=0; toEn.normalize();
    if (fwd.dot(toEn) < 0.2) return;

    en.hp -= PLR_ATK_DMG; en.hitFlash = 0.25; hit = true;
    spawnDmgNumber(PLR_ATK_DMG);

    if (en.hp <= 0) {
      en.alive=false; en.state='dead'; en.deathTimer=0;
      player.kills++;
      player.hp = Math.min(player.maxHp, player.hp+8);
      updateKillCount(player.kills);
    }
  });

  showAttackFeedback(hit?'hit':'miss');
  updateHPBar(player);
  flashCrosshair(hit);
}

export function damagePlayer(player, dmg) {
  if (player.invincible>0) return;
  player.invincible = PLR_INV_TIME;
  player.hp = Math.max(0, player.hp-dmg);
  updateHPBar(player);
  const ov = document.getElementById('damage-overlay');
  if (ov) { ov.style.opacity='0.45'; setTimeout(()=>ov.style.opacity='0', 350); }
  if (player.hp<=0) {
    player.hp = Math.ceil(player.maxHp*0.5);
    updateHPBar(player);
    const ds = document.getElementById('death-screen');
    if (ds) { ds.classList.remove('hidden'); setTimeout(()=>ds.classList.add('hidden'), 2500); }
  }
}

export function updateHPBar(player) {
  const fill = document.getElementById('hp-fill');
  const text = document.getElementById('hp-text');
  if (!fill) return;
  const pct = player.hp / player.maxHp * 100;
  fill.style.width = pct+'%';
  fill.style.background = pct>60?'#00cc44':pct>30?'#ffaa00':'#ff2200';
  if (text) text.textContent = Math.ceil(player.hp)+' HP';
}

export function updateKillCount(kills) {
  const el = document.getElementById('kill-counter');
  if (!el) return;
  el.textContent='☠ '+kills;
  el.style.transform='scale(1.5)';
  setTimeout(()=>el.style.transform='scale(1)', 250);
}

export function showAttackFeedback(type) {
  const el = document.getElementById('attack-indicator');
  if (!el) return;
  el.textContent = type==='hit'?'⚔ HIT!':type==='miss'?'✗ MISS':'⏳';
  el.style.color  = type==='hit'?'#ff8800':type==='miss'?'#666':'#4488aa';
  el.style.opacity='1';
  setTimeout(()=>el.style.opacity='0', 600);
}

export function flashCrosshair(hit) {
  const el = document.getElementById('crosshair');
  if (!el) return;
  el.style.color = hit?'#ff4400':'rgba(255,255,255,0.8)';
  el.style.transform = hit?'translate(-50%,-50%) scale(1.7)':'translate(-50%,-50%)';
  setTimeout(()=>{ el.style.color='rgba(255,255,255,0.8)'; el.style.transform='translate(-50%,-50%)'; }, 200);
}

export function spawnDmgNumber(amount) {
  const el = document.createElement('div');
  el.textContent = '-'+amount;
  el.style.cssText = `position:fixed;left:${42+Math.random()*16}%;top:${35+Math.random()*12}%;`
    +`font-family:Orbitron,sans-serif;font-size:22px;font-weight:900;`
    +`color:#ff6600;text-shadow:0 0 12px #ff4400;pointer-events:none;z-index:300;`
    +`animation:dmgFloat 0.8s ease forwards;`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 800);
}
