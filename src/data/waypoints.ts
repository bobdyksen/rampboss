import type { GateDef, Vec2, VehicleType, Waypoint } from "../sim/types";

export const WAYPOINTS: Waypoint[] = [
  { id: "entry", position: { x: 46, z: 40 }, neighbors: ["taxi_east"] },
  { id: "taxi_east", position: { x: 28, z: 40 }, neighbors: ["entry", "taxi_mid", "g2_taxi"] },
  { id: "taxi_mid", position: { x: 0, z: 40 }, neighbors: ["taxi_east", "taxi_west"] },
  { id: "taxi_west", position: { x: -28, z: 40 }, neighbors: ["taxi_mid", "exit", "g1_taxi"] },
  { id: "exit", position: { x: -46, z: 40 }, neighbors: ["taxi_west"] },
  { id: "g1_taxi", position: { x: -16, z: 28 }, neighbors: ["taxi_west", "g1_stand"] },
  { id: "g1_stand", position: { x: -16, z: 6 }, neighbors: ["g1_taxi"] },
  { id: "g2_taxi", position: { x: 16, z: 28 }, neighbors: ["taxi_east", "g2_stand"] },
  { id: "g2_stand", position: { x: 16, z: 6 }, neighbors: ["g2_taxi"] },
  { id: "fuel_staging", position: { x: -24, z: 24 }, neighbors: ["road_west"] },
  { id: "bag_staging", position: { x: -8, z: 24 }, neighbors: ["road_mid"] },
  { id: "clean_staging", position: { x: 8, z: 24 }, neighbors: ["road_mid"] },
  { id: "tug_staging", position: { x: 24, z: 24 }, neighbors: ["road_east"] },
  { id: "road_west", position: { x: -24, z: 18 }, neighbors: ["fuel_staging", "road_mid", "g1_approach"] },
  { id: "road_mid", position: { x: 0, z: 18 }, neighbors: ["road_west", "road_east", "bag_staging", "clean_staging"] },
  { id: "road_east", position: { x: 24, z: 18 }, neighbors: ["road_mid", "tug_staging", "g2_approach"] },
  { id: "g1_approach", position: { x: -16, z: 16 }, neighbors: ["road_west"] },
  { id: "g2_approach", position: { x: 16, z: 16 }, neighbors: ["road_east"] },
];

export const GATES: GateDef[] = [
  {
    id: "g1",
    name: "Gate 1",
    stand: { x: -16, z: 6 },
    heading: Math.PI,
    taxiHold: "g1_taxi",
    taxiStand: "g1_stand",
    taxiExit: "exit",
    approach: "g1_approach",
  },
  {
    id: "g2",
    name: "Gate 2",
    stand: { x: 16, z: 6 },
    heading: Math.PI,
    taxiHold: "g2_taxi",
    taxiStand: "g2_stand",
    taxiExit: "exit",
    approach: "g2_approach",
  },
];

export const VEHICLE_GRAPH = new Set([
  "fuel_staging",
  "bag_staging",
  "clean_staging",
  "tug_staging",
  "road_west",
  "road_mid",
  "road_east",
  "g1_approach",
  "g2_approach",
]);

export const STAGING: Record<VehicleType, string> = {
  fuel_truck: "fuel_staging",
  belt_loader: "bag_staging",
  baggage_tractor: "bag_staging",
  cleaning_van: "clean_staging",
  pushback_tug: "tug_staging",
};

export function rotateOffset(offset: Vec2, heading: number): Vec2 {
  const s = Math.sin(heading);
  const c = Math.cos(heading);
  return {
    x: offset.x * c + offset.z * s,
    z: -offset.x * s + offset.z * c,
  };
}

export function serviceWorldPoint(
  stand: Vec2,
  heading: number,
  offset: Vec2,
): Vec2 {
  const rotated = rotateOffset(offset, heading);
  return { x: stand.x + rotated.x, z: stand.z + rotated.z };
}

export function waypointMap(): Map<string, Waypoint> {
  return new Map(WAYPOINTS.map((wp) => [wp.id, wp]));
}
