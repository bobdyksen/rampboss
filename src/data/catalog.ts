import type { AircraftType, Airline, ServiceDef, VehicleDef, VehicleType } from "../sim/types";

export const AIRCRAFT: Record<string, AircraftType> = {
  rj70: {
    id: "rj70",
    name: "RJ-70",
    className: "regional_jet",
    length: 22,
    wingspan: 18,
    height: 5.2,
    passengers: 70,
    baggageUnits: 8,
    colorPrimary: "#2aa198",
    colorSecondary: "#f4f7fb",
    engineCount: 2,
    serviceOffsets: {
      l1: { x: -3.2, z: 10.0 },
      cargo: { x: -4.4, z: -1.4 },
      fuel: { x: 5.2, z: 1.2 },
      service: { x: -3.6, z: -5.2 },
      nose: { x: 0, z: 11.4 },
    },
  },
  nb320: {
    id: "nb320",
    name: "A-320N",
    className: "narrowbody",
    length: 32,
    wingspan: 28,
    height: 7.4,
    passengers: 160,
    baggageUnits: 16,
    colorPrimary: "#2f6fed",
    colorSecondary: "#f7fbff",
    engineCount: 2,
    serviceOffsets: {
      l1: { x: -4.0, z: 14.0 },
      cargo: { x: -5.2, z: -2.0 },
      fuel: { x: 6.4, z: 1.6 },
      service: { x: -4.2, z: -8.0 },
      nose: { x: 0, z: 16.4 },
    },
  },
};

export const AIRLINES: Record<string, Airline> = {
  swift: {
    id: "swift",
    name: "SwiftAir",
    callsign: "SWIFT",
    color: "#f39c12",
    style: "budget",
    delayPenalty: 1.4,
    payoutMultiplier: 0.9,
    durationScale: 0.92,
  },
  ridge: {
    id: "ridge",
    name: "RidgeLink",
    callsign: "RIDGE",
    color: "#2aa198",
    style: "regional",
    delayPenalty: 1.0,
    payoutMultiplier: 1.0,
    durationScale: 1.0,
  },
  horizon: {
    id: "horizon",
    name: "Horizon Pacific",
    callsign: "HORIZON",
    color: "#2f6fed",
    style: "legacy",
    delayPenalty: 1.15,
    payoutMultiplier: 1.2,
    durationScale: 1.08,
  },
};

const minutes = (n: number) => n * 60;

export const SERVICES: Record<string, ServiceDef> = {
  jet_bridge: {
    id: "jet_bridge",
    label: "Jet Bridge",
    shortLabel: "BRIDGE",
    playerAssigned: false,
    vehicleTypes: [],
    dependsOn: ["on_blocks"],
    durationSim: (ac) => (ac.className === "narrowbody" ? 60 : 45),
  },
  deplane: {
    id: "deplane",
    label: "Deplane",
    shortLabel: "DEPLANE",
    playerAssigned: true,
    vehicleTypes: [],
    dependsOn: ["jet_bridge"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(6) : minutes(3)) * airline.durationScale,
  },
  baggage_unload: {
    id: "baggage_unload",
    label: "Unload Bags",
    shortLabel: "UNLOAD",
    playerAssigned: true,
    vehicleTypes: ["belt_loader", "baggage_tractor"],
    dependsOn: ["on_blocks"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(7) : minutes(4)) * airline.durationScale,
  },
  fuel: {
    id: "fuel",
    label: "Fuel",
    shortLabel: "FUEL",
    playerAssigned: true,
    vehicleTypes: ["fuel_truck"],
    dependsOn: ["on_blocks"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(9) : minutes(5)) * airline.durationScale,
  },
  cleaning: {
    id: "cleaning",
    label: "Cleaning",
    shortLabel: "CLEAN",
    playerAssigned: true,
    vehicleTypes: ["cleaning_van"],
    dependsOn: ["deplane"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(6) : minutes(3.5)) * airline.durationScale,
  },
  baggage_load: {
    id: "baggage_load",
    label: "Load Bags",
    shortLabel: "LOAD",
    playerAssigned: true,
    vehicleTypes: ["belt_loader", "baggage_tractor"],
    dependsOn: ["baggage_unload"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(7) : minutes(4)) * airline.durationScale,
  },
  boarding: {
    id: "boarding",
    label: "Boarding",
    shortLabel: "BOARD",
    playerAssigned: true,
    vehicleTypes: [],
    dependsOn: ["cleaning", "jet_bridge"],
    durationSim: (ac, airline) =>
      (ac.className === "narrowbody" ? minutes(8) : minutes(5)) * airline.durationScale,
  },
  pushback: {
    id: "pushback",
    label: "Pushback",
    shortLabel: "PUSH",
    playerAssigned: true,
    vehicleTypes: ["pushback_tug"],
    dependsOn: ["boarding", "baggage_load", "fuel", "cleaning"],
    durationSim: (ac) => (ac.className === "narrowbody" ? 90 : 60),
  },
};

export const VEHICLES: Record<VehicleType, VehicleDef> = {
  belt_loader: {
    type: "belt_loader",
    name: "Belt Loader",
    color: "#e67e22",
    speed: 0.34,
    accel: 0.5,
  },
  baggage_tractor: {
    type: "baggage_tractor",
    name: "Bag Tractor",
    color: "#d35400",
    speed: 0.4,
    accel: 0.55,
  },
  fuel_truck: {
    type: "fuel_truck",
    name: "Fuel Truck",
    color: "#f1c40f",
    speed: 0.3,
    accel: 0.4,
  },
  cleaning_van: {
    type: "cleaning_van",
    name: "Cabin Crew",
    color: "#27ae60",
    speed: 0.38,
    accel: 0.5,
  },
  pushback_tug: {
    type: "pushback_tug",
    name: "Pushback Tug",
    color: "#c0392b",
    speed: 0.28,
    accel: 0.35,
  },
};

export const PLAYER_SERVICES = Object.values(SERVICES).filter((s) => s.playerAssigned);
