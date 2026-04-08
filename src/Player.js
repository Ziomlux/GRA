import * as THREE from 'three';

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.7, 8);

    this.yaw = 0;
    this.pitch = 0;
    this.speed = 6;
    this.sprintSpeed = 12;
    this.keys = {};
    this.velocity = new THREE.Vector3();

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  enable() {
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick);
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  disable() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick);
  }

  _onClick() {
    // Request pointer lock on click (needed for mouse look)
    if (!document.pointerLockElement) {
      this.game.canvas.requestPointerLock();
    }
  }

  _onMouseMove(e) {
    if (document.pointerLockElement !== this.game.canvas) return;
    const sensitivity = 0.002;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    this.updateCamera();
  }

  updateCamera() {
    const qYaw = new THREE.Quaternion();
    const qPitch = new THREE.Quaternion();
    qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    qPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.camera.quaternion.copy(qYaw).multiply(qPitch);
  }

  update(delta) {
    if (!this.game.scene) return;

    const sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const spd = sprint ? this.sprintSpeed : this.speed;

    // Forward/back direction based on yaw only (no pitch)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(spd * delta);
      const newPos = this.camera.position.clone().add(move);

      // Basic boundary clamping
      const world = this.game.worlds[this.game.currentWorldIndex];
      const half = world.mapSize / 2 - 1.5;
      newPos.x = Math.max(-half, Math.min(half, newPos.x));
      newPos.z = Math.max(-half, Math.min(half, newPos.z));

      // Simple obstacle collision (AABB)
      if (world.colliders) {
        const playerBox = new THREE.Box3(
          new THREE.Vector3(newPos.x - 0.4, 0, newPos.z - 0.4),
          new THREE.Vector3(newPos.x + 0.4, 2, newPos.z + 0.4)
        );
        let blocked = false;
        for (const box of world.colliders) {
          if (playerBox.intersectsBox(box)) { blocked = true; break; }
        }
        if (!blocked) {
          this.camera.position.x = newPos.x;
          this.camera.position.z = newPos.z;
        } else {
          // Try sliding X
          const newPosX = new THREE.Vector3(newPos.x, newPos.y, this.camera.position.z);
          const boxX = new THREE.Box3(
            new THREE.Vector3(newPosX.x - 0.4, 0, newPosX.z - 0.4),
            new THREE.Vector3(newPosX.x + 0.4, 2, newPosX.z + 0.4)
          );
          let blockedX = false;
          for (const b of world.colliders) { if (boxX.intersectsBox(b)) { blockedX = true; break; } }
          if (!blockedX) this.camera.position.x = newPosX.x;

          // Try sliding Z
          const newPosZ = new THREE.Vector3(this.camera.position.x, newPos.y, newPos.z);
          const boxZ = new THREE.Box3(
            new THREE.Vector3(newPosZ.x - 0.4, 0, newPosZ.z - 0.4),
            new THREE.Vector3(newPosZ.x + 0.4, 2, newPosZ.z + 0.4)
          );
          let blockedZ = false;
          for (const b of world.colliders) { if (boxZ.intersectsBox(b)) { blockedZ = true; break; } }
          if (!blockedZ) this.camera.position.z = newPosZ.z;
        }
      } else {
        this.camera.position.x = newPos.x;
        this.camera.position.z = newPos.z;
      }
    }

    // Lock height to ground
    this.camera.position.y = 1.7;
    this.updateCamera();
  }
}
