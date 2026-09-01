/** Screen-space map camera. World X → screen X, world Z → screen Y. */

export class MapCamera {
  x = 0;
  z = 14;
  zoom = 10;
  width = 800;
  height = 600;
  private focusX = 0;
  private focusZ = 14;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Drag the map so it follows the finger (Google Maps / 2D city-builder). */
  panScreen(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.z -= dy / this.zoom;
    this.focusX = this.x;
    this.focusZ = this.z;
    this.clamp();
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(28, Math.max(6, this.zoom * factor));
    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.z += before.z - after.z;
    this.focusX = this.x;
    this.focusZ = this.z;
    this.clamp();
  }

  zoomBy(delta: number): void {
    this.zoomAt(this.width / 2, this.height / 2, delta > 0 ? 0.94 : 1.06);
  }

  focusOn(x: number, z: number): void {
    this.focusX = x;
    this.focusZ = z;
  }

  update(dt: number): void {
    const t = 1 - Math.pow(0.0004, dt);
    this.x += (this.focusX - this.x) * t;
    this.z += (this.focusZ - this.z) * t;
    this.clamp();
  }

  worldToScreen(wx: number, wz: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom + this.width / 2,
      y: (wz - this.z) * this.zoom + this.height / 2,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; z: number } {
    return {
      x: (sx - this.width / 2) / this.zoom + this.x,
      z: (sy - this.height / 2) / this.zoom + this.z,
    };
  }

  private clamp(): void {
    this.x = Math.min(42, Math.max(-42, this.x));
    this.z = Math.min(44, Math.max(-8, this.z));
    this.focusX = Math.min(42, Math.max(-42, this.focusX));
    this.focusZ = Math.min(44, Math.max(-8, this.focusZ));
  }
}
