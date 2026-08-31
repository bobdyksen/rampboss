import * as THREE from "three";

export class IsoCamera {
  readonly camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3(0, 0, 12);
  distance = 58;
  azimuth = 0.55;
  polar = 0.92;
  private focus = new THREE.Vector3(0, 0, 12);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 400);
    this.apply();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  pan(dx: number, dz: number): void {
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));
    const forward = new THREE.Vector3(Math.sin(this.azimuth), 0, Math.cos(this.azimuth));
    this.target.addScaledVector(right, dx);
    this.target.addScaledVector(forward, dz);
    this.target.x = THREE.MathUtils.clamp(this.target.x, -40, 40);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -10, 42);
  }

  zoom(delta: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, 28, 90);
  }

  focusOn(x: number, z: number): void {
    this.focus.set(x, 0, z);
  }

  update(dt: number): void {
    this.target.lerp(this.focus, 1 - Math.pow(0.001, dt));
    this.apply();
  }

  private apply(): void {
    const x = this.target.x + Math.sin(this.azimuth) * Math.sin(this.polar) * this.distance;
    const y = this.target.y + Math.cos(this.polar) * this.distance;
    const z = this.target.z + Math.cos(this.azimuth) * Math.sin(this.polar) * this.distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}
