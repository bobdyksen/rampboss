import type { Vec2, Waypoint } from "./types";

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

export function headingToward(from: Vec2, to: Vec2): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function moveToward(
  from: Vec2,
  to: Vec2,
  maxDistance: number,
): { position: Vec2; arrived: boolean } {
  const dist = distance(from, to);
  if (dist <= maxDistance || dist === 0) {
    return { position: { ...to }, arrived: true };
  }
  const t = maxDistance / dist;
  return { position: lerp(from, to, t), arrived: false };
}

export function findPath(
  waypoints: Map<string, Waypoint>,
  startId: string,
  endId: string,
): string[] {
  if (startId === endId) return [startId];
  const queue: string[] = [startId];
  const cameFrom = new Map<string, string | null>([[startId, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = waypoints.get(current);
    if (!node) continue;
    for (const next of node.neighbors) {
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, current);
      if (next === endId) {
        const path = [endId];
        let walk: string | null = current;
        while (walk) {
          path.unshift(walk);
          walk = cameFrom.get(walk) ?? null;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

export function nearestWaypoint(
  waypoints: Map<string, Waypoint>,
  point: Vec2,
  allowed?: Set<string>,
): string | null {
  let bestId: string | null = null;
  let best = Infinity;
  for (const [id, wp] of waypoints) {
    if (allowed && !allowed.has(id)) continue;
    const d = distance(point, wp.position);
    if (d < best) {
      best = d;
      bestId = id;
    }
  }
  return bestId;
}
