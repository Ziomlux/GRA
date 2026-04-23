import * as THREE from 'three';
import { Player } from './Player.js';
import { HubIsland } from './worlds/HubIsland.js';
import { AncientRuins } from './worlds/AncientRuins.js';
import { MistyForest } from './worlds/MistyForest.js';
import { SpaceStation } from './worlds/SpaceStation.js';
import { IceCave } from './worlds/IceCave.js';
import { Volcano } from './worlds/Volcano.js';
import * as ENEMY from '../enemies.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.autoClear = false; // Required for weapon overlay
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // Simplified for stability
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x000000);

    this.clock = new THREE.Clock();
    this.running = false;
    this.transitioning = false;
    this.currentWorldIndex = 0;
    this.difficultyLoop = 0; // NG+ level
    this.inventoryOpen = false;

    // Build worlds list
    this.worldClasses = [HubIsland, AncientRuins, MistyForest, SpaceStation, IceCave, Volcano];
    this.worlds = [];

    // Player
    this.player = new Player(this);

    // Combat
    this.weaponScene = ENEMY.createWeaponScene();
    this.weaponCam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10);

    // Initial HUD update
    ENEMY.updateHPBar(this.player);

    // Minimap
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Portals hint
    this.portalHint = document.getElementById('portal-hint');

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  start() {
    // Instantiate all worlds
    this.worlds = this.worldClasses.map((WorldClass, i) => new WorldClass(i, this.worldClasses.length));

    this.loadWorld(0);
    this.player.enable();
    ENEMY.initPlayerCombat(this.player, this.canvas);
    this.setupUIListeners();
    this.running = true;
    this.animate();
  }

  setupUIListeners() {
    // Inventory tabs
    document.querySelectorAll('.inv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.inv-tab, .tab-pane').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Close btn
    document.getElementById('close-inv').addEventListener('click', () => this.toggleInventory());

    // Upgrade buttons
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.player.upgradeStat(btn.dataset.stat)) {
          this.updateStatsUI();
          ENEMY.updateHPBar(this.player);
          ENEMY.updateXPBar(this.player);
          // Visual feedback on button
          btn.style.background = '#00d4ff';
          setTimeout(() => btn.style.background = '', 200);
        }
      });
    });
  }

  loadWorld(index, fromPortalDir) {
    this.currentWorldIndex = index;
    const world = this.worlds[index];

    // Scene
    this.scene = world.scene;

    // Update HUD
    document.getElementById('world-icon').textContent = world.icon;
    document.getElementById('world-name').textContent = world.name;

    // Place player at world spawn (or opposite portal if coming through)
    const spawnPos = (fromPortalDir === 'prev')
      ? world.portals[0]?.exitPosition?.clone() || new THREE.Vector3(0, 1.7, 14)
      : world.portals[world.portals.length - 1]?.exitPosition?.clone() || new THREE.Vector3(0, 1.7, -14);

    spawnPos.y = 1.7;
    this.player.camera.position.copy(spawnPos);
    this.player.yaw = (fromPortalDir === 'prev') ? Math.PI : 0;
    this.player.pitch = 0;
    this.player.updateCamera();

    // --- Cleanup & Spawn enemies ---
    // Remove old enemies from scene to prevent duplication lag
    if (world.enemies && world.enemies.length > 0) {
      world.enemies.forEach(en => {
        if (en.mesh) {
          this.scene.remove(en.mesh);
          // Proper disposal
          en.mesh.traverse(obj => {
            if (obj.isMesh) {
              obj.geometry.dispose();
              if (obj.material.map) obj.material.map.dispose();
              obj.material.dispose();
            }
          });
        }
      });
    }

    world.enemies = ENEMY.spawnWorldEnemies(this.scene, world.worldType);
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused && !this.transitioning) {
      this.player.update(delta);
      this.worlds[this.currentWorldIndex].update(delta);
      const world = this.worlds[this.currentWorldIndex];
      ENEMY.updateEnemies(world.enemies, this.player, world, delta, this.difficultyLoop);
      ENEMY.handlePlayerAttack(world.enemies, this.player, world, delta, this.weaponScene);
      ENEMY.updateWeapon(this.weaponScene, this.player, delta, this.player._isMoving, this.player._wantsAttack);
      this.checkPortalCollisions();
      this.drawMinimap();
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.player.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.weaponScene.scene, this.weaponCam);
  }

  checkPortalCollisions() {
    const world = this.worlds[this.currentWorldIndex];
    const playerPos = this.player.camera.position;
    let nearAny = false;

    for (const portal of world.portals) {
      const dist = playerPos.distanceTo(portal.mesh.position);
      if (dist < 2.5) nearAny = true;
      if (dist < 1.4 && !this.transitioning) {
        if (portal.mesh.userData.isLoopPortal) {
          this.triggerNextLoop();
        } else {
          this.triggerPortalTransition(portal.targetWorldIndex, portal.direction);
        }
        return;
      }
    }

    this.portalHint.classList.toggle('hidden', !nearAny);
  }

  triggerPortalTransition(targetIndex, direction) {
    this.transitioning = true;
    const overlay = document.getElementById('portal-overlay');
    overlay.classList.add('active');

    // Set overlay color to match target world
    const world = this.worlds[targetIndex];
    overlay.style.background = `radial-gradient(circle at center, ${world.portalColor}, #000)`;

    setTimeout(() => {
      this.loadWorld(targetIndex, direction);
      setTimeout(() => {
        overlay.classList.remove('active');
        this.transitioning = false;
      }, 600);
    }, 500);
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    const w = 120, h = 120;
    const world = this.worlds[this.currentWorldIndex];
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = world.minimapBg || '#111';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    // Floor outline
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 100, 100);

    const scale = 90 / world.mapSize;
    const cx = w / 2;
    const cy = h / 2;

    // Draw portals on minimap
    for (const portal of world.portals) {
      const px = cx + portal.mesh.position.x * scale;
      const py = cy - portal.mesh.position.z * scale;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = portal.color || '#7b2fff';
      ctx.fill();
      ctx.shadowColor = portal.color || '#7b2fff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw obstacles
    if (world.mapObjects) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (const obj of world.mapObjects) {
        const ox = cx + obj.x * scale;
        const oy = cy - obj.z * scale;
        ctx.fillRect(ox - obj.w * scale / 2, oy - obj.d * scale / 2, obj.w * scale, obj.d * scale);
      }
    }

    // Player dot
    const ppx = cx + this.player.camera.position.x * scale;
    const ppy = cy - this.player.camera.position.z * scale;

    // Player direction arrow
    const angle = -this.player.yaw;
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(angle);
    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  onKeyDown(e) {
    if (e.code === 'Escape') {
      if (this.running) {
        this.paused ? this.resume() : this.pause();
      }
    }
    if (e.code === 'Tab' || e.code === 'KeyI') {
      if (this.running && !this.paused) {
        e.preventDefault();
        this.toggleInventory();
      }
    }
  }

  pause() {
    this.paused = true;
    document.getElementById('pause-screen').classList.remove('hidden');
    this.player.disable();
    document.exitPointerLock?.();
  }

  resume() {
    this.paused = false;
    document.getElementById('pause-screen').classList.add('hidden');
    if (!this.inventoryOpen) {
      this.player.enable();
      this.canvas.requestPointerLock();
    }
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    const inv = document.getElementById('inventory-overlay');
    if (this.inventoryOpen) {
      inv.classList.remove('hidden');
      this.player.disable();
      document.exitPointerLock?.();
      this.updateStatsUI();
    } else {
      inv.classList.add('hidden');
      this.player.enable();
      this.canvas.requestPointerLock();
    }
  }

  updateStatsUI() {
    const p = this.player;
    document.getElementById('st-level').textContent = p.level;
    document.getElementById('st-points').textContent = p.statPoints;
    document.getElementById('st-strength').textContent = p.strength.toFixed(1);
    document.getElementById('st-vitality').textContent = p.vitality;
    document.getElementById('st-agility').textContent = p.agility.toFixed(2);
    document.getElementById('st-hp').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    document.getElementById('st-xp').textContent = `${p.xp} / ${p.xpToNextLevel}`;
  }

  triggerNextLoop() {
    this.difficultyLoop++;
    const overlay = document.getElementById('portal-overlay');
    overlay.classList.add('active');
    this.transitioning = true;
    
    setTimeout(() => {
      this.loadWorld(0);
      overlay.classList.remove('active');
      this.transitioning = false;
      
      // HUD Loop indicators (optional)
      const ni = document.getElementById('world-name');
      ni.textContent += ` (LOOP ${this.difficultyLoop})`;
    }, 1200);
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.weaponCam.aspect = window.innerWidth / window.innerHeight;
    this.weaponCam.updateProjectionMatrix();
  }
}
