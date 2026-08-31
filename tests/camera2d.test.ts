import { MapCamera } from "../src/render/camera2d";

describe("MapCamera pan", () => {
  it("drags the map with the finger instead of moving the camera the other way", () => {
    const camera = new MapCamera();
    camera.resize(800, 600);
    camera.zoom = 10;
    const startX = camera.x;
    const startZ = camera.z;
    camera.panScreen(20, 10);
    expect(camera.x).toBeLessThan(startX);
    expect(camera.z).toBeLessThan(startZ);
    expect(camera.x).toBeCloseTo(startX - 2);
    expect(camera.z).toBeCloseTo(startZ - 1);
  });
});
