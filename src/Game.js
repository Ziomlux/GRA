import * as THREE from 'three';
import { Player } from './Player.js';
import { AncientRuins } from './worlds/AncientRuins.js';
import { MistyForest } from './worlds/MistyForest.js';
import { SpaceStation } from './worlds/SpaceStation.js';
import { IceCave } from './worlds/IceCave.js';
import { Volcano } from './worlds/Volcano.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.clock = new THREE.Clock();
    this.running = false;
    this.transitioning = false;
    this.currentWorldIndex = 0;

    // Build worlds list
    this.worldClasses = [AncientRuins, MistyForest, SpaceStation, IceCave, Volcano];
    this.worlds = [];

    // Player
    this.player = new Player(this);

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
    this.running = true;
    this.animate();
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
      ? world.portals[world.portals.length - 1]?.exitPosition?.clone() || new THREE.Vector3(0, 1.7, -8)
      : world.portals[0]?.exitPosition?.clone() || new THREE.Vector3(0, 1.7, 8);

    spawnPos.y = 1.7;
    this.player.camera.position.copy(spawnPos);
    this.player.yaw = (fromPortalDir === 'prev') ? Math.PI : 0;
    this.player.pitch = 0;
    this.player.updateCamera();
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused && !this.transitioning) {
      this.player.update(delta);
      this.worlds[this.currentWorldIndex].update(delta);
      this.checkPortalCollisions();
      this.drawMinimap();
    }

    this.renderer.render(this.scene, this.player.camera);
  }

  checkPortalCollisions() {
    const world = this.worlds[this.currentWorldIndex];
    const playerPos = this.player.camera.position;
    let nearAny = false;

    for (const portal of world.portals) {
      const dist = playerPos.distanceTo(portal.mesh.position);
      if (dist < 2.5) nearAny = true;
      if (dist < 1.4 && !this.transitioning) {
        this.triggerPortalTransition(portal.targetWorldIndex, portal.direction);
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
    this.player.enable();
    this.canvas.requestPointerLock();
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
  }
}
