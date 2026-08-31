export type ServiceId =
  | "jet_bridge"
  | "deplane"
  | "baggage_unload"
  | "fuel"
  | "cleaning"
  | "baggage_load"
  | "boarding"
  | "pushback";

export type VehicleType =
  | "belt_loader"
  | "baggage_tractor"
  | "fuel_truck"
  | "cleaning_van"
  | "pushback_tug";

export type TaskState =
  | "locked"
  | "available"
  | "assigned"
  | "in_progress"
  | "complete";

export type FlightPhase =
  | "scheduled"
  | "inbound"
  | "taxiing"
  | "parking"
  | "on_blocks"
  | "ready"
  | "pushing"
  | "departed";

export type VehicleState = "idle" | "traveling" | "servicing" | "returning";

export type SpeedSetting = 0 | 1 | 2;

export type ScheduleColor = "green" | "yellow" | "orange" | "red";

export interface Vec2 {
  x: number;
  z: number;
}

export interface AircraftType {
  id: string;
  name: string;
  className: "regional_jet" | "narrowbody";
  length: number;
  wingspan: number;
  height: number;
  passengers: number;
  baggageUnits: number;
  colorPrimary: string;
  colorSecondary: string;
  engineCount: 2;
  serviceOffsets: Record<string, Vec2>;
}

export interface Airline {
  id: string;
  name: string;
  callsign: string;
  color: string;
  style: "budget" | "regional" | "legacy";
  delayPenalty: number;
  payoutMultiplier: number;
  durationScale: number;
}

export interface ServiceDef {
  id: ServiceId;
  label: string;
  shortLabel: string;
  playerAssigned: boolean;
  vehicleTypes: VehicleType[];
  dependsOn: Array<ServiceId | "on_blocks">;
  durationSim: (aircraft: AircraftType, airline: Airline) => number;
}

export interface VehicleDef {
  type: VehicleType;
  name: string;
  color: string;
  speed: number;
  accel: number;
}

export interface Waypoint {
  id: string;
  position: Vec2;
  neighbors: string[];
}

export interface GateDef {
  id: string;
  name: string;
  stand: Vec2;
  heading: number;
  taxiHold: string;
  taxiStand: string;
  taxiExit: string;
  approach: string;
}

export interface FlightPlan {
  id: string;
  flightNumber: string;
  airlineId: string;
  aircraftTypeId: string;
  gateId: string;
  arrivalSim: number;
  departureSim: number;
}

export interface Scenario {
  id: string;
  name: string;
  airportName: string;
  airportCode: string;
  startSim: number;
  endSim: number;
  timeScale: number;
  targetScore: number;
  flights: FlightPlan[];
}

export interface ServiceTask {
  id: ServiceId;
  state: TaskState;
  progress: number;
  duration: number;
  assignedVehicleIds: string[];
  startedAt: number | null;
  completedAt: number | null;
}

export interface Flight {
  id: string;
  flightNumber: string;
  airlineId: string;
  aircraftTypeId: string;
  gateId: string;
  arrivalSim: number;
  departureSim: number;
  phase: FlightPhase;
  position: Vec2;
  heading: number;
  path: string[];
  pathIndex: number;
  speed: number;
  beaconOn: boolean;
  enginesOn: boolean;
  chocksOn: boolean;
  tasks: ServiceTask[];
  holdShort: boolean;
  departedAt: number | null;
  scoreAwarded: boolean;
}

export interface GroundVehicle {
  id: string;
  type: VehicleType;
  state: VehicleState;
  position: Vec2;
  heading: number;
  speed: number;
  stagingId: string;
  path: string[];
  pathIndex: number;
  assignedFlightId: string | null;
  assignedServiceId: ServiceId | null;
  targetPoint: Vec2 | null;
}

export interface GateState {
  id: string;
  occupiedBy: string | null;
  jetBridge: number;
}

export interface ScorePopup {
  flightId: string;
  label: string;
  amount: number;
  kind: "bonus" | "base" | "streak" | "late";
}

export interface ShiftResult {
  completed: boolean;
  flightsTurned: number;
  flightsScheduled: number;
  onTime: number;
  otp: number;
  score: number;
  bestStreak: number;
  perfectTurns: number;
  stars: 0 | 1 | 2 | 3;
}

export interface SimSnapshot {
  time: number;
  speed: SpeedSetting;
  paused: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  onTime: number;
  late: number;
  departed: number;
  otp: number;
  flights: Flight[];
  vehicles: GroundVehicle[];
  gates: GateState[];
  radio: string[];
  result: ShiftResult | null;
}
