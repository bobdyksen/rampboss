import { waypointMap } from "../src/data/waypoints";
import { findPath, distance } from "../src/sim/pathfinding";

describe("waypoint pathfinding", () => {
  const waypoints = waypointMap();

  it("finds a path from fuel staging to gate 2 approach", () => {
    const path = findPath(waypoints, "fuel_staging", "g2_approach");
    expect(path[0]).toBe("fuel_staging");
    expect(path.at(-1)).toBe("g2_approach");
    expect(path.length).toBeGreaterThan(2);
  });

  it("returns a single node when start equals end", () => {
    expect(findPath(waypoints, "g1_stand", "g1_stand")).toEqual(["g1_stand"]);
  });

  it("connects taxi entry to both stands", () => {
    expect(findPath(waypoints, "entry", "g1_stand").at(-1)).toBe("g1_stand");
    expect(findPath(waypoints, "entry", "g2_stand").at(-1)).toBe("g2_stand");
  });

  it("computes a positive distance between gates", () => {
    const a = waypoints.get("g1_stand")!.position;
    const b = waypoints.get("g2_stand")!.position;
    expect(distance(a, b)).toBeGreaterThan(20);
  });
});
