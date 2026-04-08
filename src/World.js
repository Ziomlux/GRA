import * as THREE from 'three';

/**
 * Base World class – subclasses override buildScene() and configure properties.
 */
export class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.portals = [];
    this.colliders = [];
    this.mapObjects = [];
    this.mapSize = 40;
    this.minimapBg = '#111';
    this.portalColor = '#7b2fff';
    this.enemies = [];
    this.worldType = 'ruins'; // Default type for enemy spawning
    
    this.textureLoader = new THREE.TextureLoader();
    
    // Add default ambient light as a safety baseline
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  }

  build() {
    this.buildScene();
    this.buildPortals();
    this._addPortalsToScene();
  }

  buildScene() {}
  buildPortals() {}

  _addPortalsToScene() {
    for (const portal of this.portals) {
      this.scene.add(portal.mesh);
      // Face portals toward center (Z axis)
      portal.mesh.lookAt(new THREE.Vector3(
        portal.mesh.position.x,
        portal.mesh.position.y,
        0
      ));
    }
  }

  update(delta) {
    for (const portal of this.portals) {
      if (portal.mesh?.userData?.update) {
        portal.mesh.userData.update(delta);
      }
    }
    if (this._onUpdate) this._onUpdate(delta);
  }

  /** Helper: create a box mesh + collider */
  addBox(scene, x, y, z, w, h, d, material) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, 0, z - d / 2),
      new THREE.Vector3(x + w / 2, h, z + d / 2)
    ));
    this.mapObjects.push({ x, z, w, d });
    return mesh;
  }

  /** Helper: create cylinder */
  addCylinder(scene, x, z, radius, height, material) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 12);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - radius, 0, z - radius),
      new THREE.Vector3(x + radius, height, z + radius)
    ));
    this.mapObjects.push({ x, z, w: radius * 2, d: radius * 2 });
    return mesh;
  }
}
