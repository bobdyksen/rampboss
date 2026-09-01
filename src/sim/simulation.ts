import { AIRCRAFT, AIRLINES, SERVICES, VEHICLES } from "../data/catalog";
import { GATES, STAGING, VEHICLE_GRAPH, serviceWorldPoint, waypointMap } from "../data/waypoints";
import { EventBus } from "./events";
import { SimClock } from "./clock";
import { distance, findPath, headingToward, moveToward, nearestWaypoint } from "./pathfinding";
import { rateSchedule, rateShift, scoreTurnaround } from "./scoring";
import type {
  Flight,
  GateState,
  GroundVehicle,
  Scenario,
  ServiceId,
  ServiceTask,
  ShiftResult,
  SimSnapshot,
  SpeedSetting,
  Vec2,
  VehicleType,
} from "./types";

const AIRCRAFT_TAXI_SPEED = 1.35;
const AIRCRAFT_PARK_SPEED = 0.5;
const RADIO_LIMIT = 6;
const ARRIVE_EPS = 0.35;

function createTasks(aircraftTypeId: string, airlineId: string): ServiceTask[] {
  const aircraft = AIRCRAFT[aircraftTypeId];
  const airline = AIRLINES[airlineId];
  return Object.values(SERVICES).map((def) => ({
    id: def.id,
    state: "locked" as const,
    progress: 0,
    duration: def.durationSim(aircraft, airline),
    assignedVehicleIds: [],
    startedAt: null,
    completedAt: null,
  }));
}

function createVehicles(): GroundVehicle[] {
  const specs: Array<[string, VehicleType]> = [
    ["fuel-1", "fuel_truck"],
    ["belt-1", "belt_loader"],
    ["tractor-1", "baggage_tractor"],
    ["clean-1", "cleaning_van"],
    ["tug-1", "pushback_tug"],
  ];
  const waypoints = waypointMap();
  return specs.map(([id, type]) => {
    const stagingId = STAGING[type];
    const pos = waypoints.get(stagingId)!.position;
    return {
      id,
      type,
      state: "idle",
      position: { ...pos },
      heading: 0,
      speed: 0,
      stagingId,
      path: [],
      pathIndex: 0,
      assignedFlightId: null,
      assignedServiceId: null,
      targetPoint: null,
    };
  });
}

export class Simulation {
  readonly scenario: Scenario;
  readonly clock: SimClock;
  readonly events = new EventBus();
  readonly waypoints = waypointMap();
  flights: Flight[];
  vehicles: GroundVehicle[];
  gates: GateState[];
  score = 0;
  streak = 0;
  bestStreak = 0;
  onTimeCount = 0;
  lateCount = 0;
  perfectTurns = 0;
  radio: string[] = [];
  result: ShiftResult | null = null;
  selectedFlightId: string | null = null;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.clock = new SimClock(scenario.timeScale, scenario.startSim);
    this.flights = scenario.flights.map((plan) => ({
      ...plan,
      phase: "scheduled",
      position: { ...this.waypoints.get("entry")!.position },
      heading: -Math.PI / 2,
      path: [],
      pathIndex: 0,
      speed: 0,
      beaconOn: false,
      enginesOn: false,
      chocksOn: false,
      tasks: createTasks(plan.aircraftTypeId, plan.airlineId),
      holdShort: false,
      departedAt: null,
      scoreAwarded: false,
    }));
    this.vehicles = createVehicles();
    this.gates = GATES.map((gate) => ({
      id: gate.id,
      occupiedBy: null,
      jetBridge: 0,
    }));
  }

  setSpeed(speed: SpeedSetting): void {
    this.clock.setSpeed(speed);
  }

  selectFlight(flightId: string | null): void {
    this.selectedFlightId = flightId;
  }

  tick(realDt: number): void {
    if (this.result) return;
    const simDt = this.clock.advance(Math.min(realDt, 0.25));
    if (simDt <= 0) return;

    this.spawnArrivals();
    this.updateFlights(simDt);
    this.updateVehicles(simDt);
    this.updateTasks(simDt);
    this.updateJetBridges(simDt);
    this.checkShiftEnd();
  }

  assignService(flightId: string, serviceId: ServiceId): { ok: boolean; reason?: string } {
    const flight = this.flights.find((f) => f.id === flightId);
    if (!flight) return { ok: false, reason: "Unknown flight" };
    const task = flight.tasks.find((t) => t.id === serviceId);
    const def = SERVICES[serviceId];
    if (!task || !def?.playerAssigned) return { ok: false, reason: "Cannot assign that service" };
    if (flight.phase === "pushing" || flight.phase === "departed") {
      return { ok: false, reason: "Aircraft is already leaving" };
    }
    if (task.state === "complete") return { ok: false, reason: "Already complete" };
    if (task.state === "locked") return { ok: false, reason: "Not ready yet" };
    if (task.state === "in_progress" || task.state === "assigned") {
      return { ok: false, reason: "Already assigned" };
    }

    if (serviceId === "pushback") {
      const blocking = this.vehiclesOnStand(flight.gateId).filter((v) => v.type !== "pushback_tug");
      for (const vehicle of blocking) this.recallVehicle(vehicle);
    }

    const needed = def.vehicleTypes;
    const chosen: GroundVehicle[] = [];
    for (const type of needed) {
      const vehicle = this.findAssignableVehicle(type, flightId);
      if (!vehicle) {
        const busy = this.vehicles.find((v) => v.type === type);
        const eta = busy?.assignedFlightId
          ? this.flights.find((f) => f.id === busy.assignedFlightId)?.flightNumber
          : null;
        return {
          ok: false,
          reason: eta ? `${VEHICLES[type].name} is on ${eta}` : `${VEHICLES[type].name} unavailable`,
        };
      }
      chosen.push(vehicle);
    }

    task.state = "assigned";
    task.assignedVehicleIds = chosen.map((v) => v.id);
    for (const vehicle of chosen) {
      this.dispatchVehicle(vehicle, flight, serviceId);
    }
    const message =
      serviceId === "deplane"
        ? `${flight.flightNumber}, deplaning.`
        : serviceId === "boarding"
          ? `${flight.flightNumber}, boarding.`
          : `${flight.flightNumber}, ${def.label.toLowerCase()} rolling.`;
    this.radioTalk(message);
    return { ok: true };
  }

  assignVehicleToFlight(vehicleId: string, flightId: string): { ok: boolean; reason?: string } {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    const flight = this.flights.find((f) => f.id === flightId);
    if (!vehicle || !flight) return { ok: false, reason: "Invalid assignment" };
    const service = Object.values(SERVICES).find(
      (s) => s.playerAssigned && s.vehicleTypes.includes(vehicle.type),
    );
    if (!service) return { ok: false, reason: "No matching service" };

    const preferred =
      vehicle.type === "belt_loader" || vehicle.type === "baggage_tractor"
        ? flight.tasks.find((t) => t.id === "baggage_unload" && t.state === "available")
          ? "baggage_unload"
          : "baggage_load"
        : service.id;

    return this.assignService(flightId, preferred);
  }

  scheduleColor(flight: Flight): "green" | "yellow" | "orange" | "red" {
    return rateSchedule(flight.departureSim - this.clock.time, flight.departureSim - flight.arrivalSim);
  }

  snapshot(): SimSnapshot {
    const departed = this.flights.filter((f) => f.phase === "departed").length;
    return {
      time: this.clock.time,
      speed: this.clock.speed,
      paused: this.clock.paused,
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreak,
      onTime: this.onTimeCount,
      late: this.lateCount,
      departed,
      otp: departed === 0 ? 1 : this.onTimeCount / departed,
      flights: this.flights,
      vehicles: this.vehicles,
      gates: this.gates,
      radio: this.radio,
      result: this.result,
    };
  }

  private spawnArrivals(): void {
    for (const flight of this.flights) {
      if (flight.phase !== "scheduled") continue;
      if (this.clock.time < flight.arrivalSim) continue;
      flight.phase = "inbound";
      flight.enginesOn = true;
      flight.beaconOn = true;
      flight.position = { ...this.waypoints.get("entry")!.position };
      flight.heading = -Math.PI / 2;
      this.routeAircraftToGate(flight);
      this.events.emit({ type: "flight_spawned", flightId: flight.id });
      this.radioTalk(`Ramp, ${flight.flightNumber} is inbound for ${this.gateName(flight.gateId)}.`);
    }
  }

  private routeAircraftToGate(flight: Flight): void {
    const gate = GATES.find((g) => g.id === flight.gateId)!;
    const occupied = this.gates.find((g) => g.id === flight.gateId)?.occupiedBy;
    const from =
      nearestWaypoint(this.waypoints, flight.position, new Set(["entry", "taxi_east", "taxi_mid", "taxi_west", "g1_taxi", "g2_taxi", "g1_stand", "g2_stand"])) ??
      "entry";
    if (occupied && occupied !== flight.id) {
      flight.holdShort = true;
      flight.path = findPath(this.waypoints, from, gate.taxiHold);
      flight.phase = "taxiing";
    } else {
      flight.holdShort = false;
      this.occupyGate(flight);
      flight.path = findPath(this.waypoints, from, gate.taxiStand);
      flight.phase = flight.phase === "inbound" ? "taxiing" : flight.phase;
    }
    flight.pathIndex = 0;
  }

  private occupyGate(flight: Flight): void {
    const gate = this.gates.find((g) => g.id === flight.gateId);
    if (gate) gate.occupiedBy = flight.id;
  }

  private updateFlights(simDt: number): void {
    for (const flight of this.flights) {
      if (flight.phase === "scheduled" || flight.phase === "departed") continue;

      if (flight.holdShort && flight.phase === "taxiing") {
        const occupied = this.gates.find((g) => g.id === flight.gateId)?.occupiedBy;
        if (!occupied) {
          this.routeAircraftToGate(flight);
        }
      }

      if (flight.phase === "taxiing" || flight.phase === "parking" || flight.phase === "inbound") {
        this.advanceAlongPath(flight, simDt, flight.phase === "parking" ? AIRCRAFT_PARK_SPEED : AIRCRAFT_TAXI_SPEED);
        const last = flight.path[flight.path.length - 1];
        const atEnd = flight.pathIndex >= flight.path.length - 1 && last && distance(flight.position, this.waypoints.get(last)!.position) < ARRIVE_EPS;
        if (atEnd && flight.holdShort) {
          flight.speed = 0;
          continue;
        }
        if (atEnd && !flight.holdShort && flight.phase !== "parking") {
          flight.phase = "parking";
        }
        if (atEnd && flight.phase === "parking") {
          this.parkAircraft(flight);
        }
      }

      if (flight.phase === "pushing") {
        this.advanceAlongPath(flight, simDt, AIRCRAFT_TAXI_SPEED * 0.72);
        const last = flight.path[flight.path.length - 1];
        if (last && flight.pathIndex >= flight.path.length - 1 && distance(flight.position, this.waypoints.get(last)!.position) < 0.8) {
          this.completeDeparture(flight);
        }
      }

      if (flight.phase === "on_blocks" && this.requiredComplete(flight) && this.task(flight, "pushback")?.state !== "complete") {
        // Stay on blocks until pushback is assigned and finished.
      }

      if (flight.phase === "ready") {
        const push = this.task(flight, "pushback");
        if (push && (push.state === "assigned" || push.state === "in_progress")) {
          // tug inbound or connected
        }
      }
    }
  }

  private advanceAlongPath(
    agent: { position: Vec2; heading: number; speed: number; path: string[]; pathIndex: number },
    simDt: number,
    maxSpeed: number,
  ): void {
    if (agent.path.length === 0) return;
    const waypointId = agent.path[Math.min(agent.pathIndex, agent.path.length - 1)];
    const waypoint = this.waypoints.get(waypointId);
    if (!waypoint) return;
    agent.speed = maxSpeed;
    if (distance(agent.position, waypoint.position) > 0.01) {
      agent.heading = headingToward(agent.position, waypoint.position);
    }
    const step = moveToward(agent.position, waypoint.position, maxSpeed * simDt);
    agent.position = step.position;
    if (step.arrived && agent.pathIndex < agent.path.length - 1) {
      agent.pathIndex += 1;
    }
  }

  private parkAircraft(flight: Flight): void {
    const gate = GATES.find((g) => g.id === flight.gateId)!;
    flight.phase = "on_blocks";
    flight.position = { ...gate.stand };
    flight.heading = gate.heading;
    flight.speed = 0;
    flight.enginesOn = false;
    flight.beaconOn = false;
    flight.chocksOn = true;
    this.refreshTaskLocks(flight);
    this.events.emit({ type: "flight_on_blocks", flightId: flight.id });
    this.radioTalk(`${flight.flightNumber} is on blocks.`);
  }

  private startPushback(flight: Flight): void {
    const gate = GATES.find((g) => g.id === flight.gateId)!;
    flight.phase = "pushing";
    flight.chocksOn = false;
    flight.enginesOn = true;
    flight.beaconOn = true;
    const gateState = this.gates.find((g) => g.id === flight.gateId);
    if (gateState) gateState.occupiedBy = null;
    flight.path = findPath(this.waypoints, gate.taxiStand, gate.taxiExit);
    flight.pathIndex = 0;
    this.events.emit({ type: "flight_pushing", flightId: flight.id });
    this.radioTalk(`${flight.flightNumber} ready for push.`);
  }

  private completeDeparture(flight: Flight): void {
    if (flight.scoreAwarded) return;
    flight.phase = "departed";
    flight.departedAt = this.clock.time;
    flight.scoreAwarded = true;
    flight.speed = 0;
    const tug = this.vehicles.find((v) => v.assignedFlightId === flight.id && v.type === "pushback_tug");
    if (tug) this.recallVehicle(tug);

    const airline = AIRLINES[flight.airlineId];
    const turn = scoreTurnaround(flight, airline, this.clock.time, this.streak);
    this.score += turn.total;
    this.streak = turn.streak;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (turn.onTime) this.onTimeCount += 1;
    else this.lateCount += 1;
    if (turn.perfect) this.perfectTurns += 1;
    for (const popup of turn.popups) {
      this.events.emit({
        type: "score",
        flightId: popup.flightId,
        label: popup.label,
        amount: popup.amount,
        kind: popup.kind,
      });
    }
    this.events.emit({ type: "flight_departed", flightId: flight.id });
    if (turn.perfect) this.radioTalk(`PERFECT TURN, ${flight.flightNumber}!`);
    else if (turn.onTime) this.radioTalk(`${flight.flightNumber} is off the gate, on time.`);
    else this.radioTalk(`${flight.flightNumber} departed late.`);
  }

  private updateVehicles(simDt: number): void {
    for (const vehicle of this.vehicles) {
      const def = VEHICLES[vehicle.type];
      const destination = this.vehicleDestination(vehicle);
      if (!destination) {
        vehicle.speed = Math.max(0, vehicle.speed - def.accel * simDt);
        continue;
      }

      if (vehicle.path.length === 0) {
        this.routeVehicle(vehicle, destination);
      }

      const onFinalLeg = vehicle.pathIndex >= Math.max(0, vehicle.path.length - 1);
      const waypointTarget = vehicle.path[vehicle.pathIndex];
      const targetPos =
        onFinalLeg && destination
          ? destination
          : waypointTarget
            ? this.waypoints.get(waypointTarget)!.position
            : destination;
      const remaining = distance(vehicle.position, destination);
      const slow = remaining < 4 ? 0.45 : 1;
      const desired = def.speed * slow;
      if (vehicle.speed < desired) vehicle.speed = Math.min(desired, vehicle.speed + def.accel * simDt);
      else vehicle.speed = Math.max(desired, vehicle.speed - def.accel * simDt);

      const step = moveToward(vehicle.position, targetPos, vehicle.speed * simDt);
      vehicle.position = step.position;
      if (distance(vehicle.position, targetPos) > 0.01) {
        vehicle.heading = headingToward(vehicle.position, targetPos);
      }

      if (step.arrived) {
        if (!onFinalLeg) {
          vehicle.pathIndex += 1;
        } else {
          this.onVehicleArrived(vehicle);
        }
      }
    }
  }

  private vehicleDestination(vehicle: GroundVehicle): Vec2 | null {
    if (vehicle.targetPoint) return vehicle.targetPoint;
    if (vehicle.state === "returning") return this.waypoints.get(vehicle.stagingId)!.position;
    return null;
  }

  private routeVehicle(vehicle: GroundVehicle, destination: Vec2): void {
    const start =
      nearestWaypoint(this.waypoints, vehicle.position, VEHICLE_GRAPH) ?? vehicle.stagingId;
    const end = nearestWaypoint(this.waypoints, destination, VEHICLE_GRAPH) ?? vehicle.stagingId;
    vehicle.path = findPath(this.waypoints, start, end);
    vehicle.pathIndex = 0;
  }

  private onVehicleArrived(vehicle: GroundVehicle): void {
    vehicle.speed = 0;
    vehicle.path = [];
    if (vehicle.state === "returning") {
      vehicle.state = "idle";
      vehicle.assignedFlightId = null;
      vehicle.assignedServiceId = null;
      vehicle.targetPoint = null;
      return;
    }
    if (vehicle.assignedFlightId && vehicle.assignedServiceId) {
      vehicle.state = "servicing";
      this.events.emit({
        type: "vehicle_arrived",
        vehicleId: vehicle.id,
        flightId: vehicle.assignedFlightId,
      });
    }
  }

  private dispatchVehicle(vehicle: GroundVehicle, flight: Flight, serviceId: ServiceId): void {
    if (vehicle.assignedFlightId && vehicle.assignedFlightId !== flight.id) {
      const previous = this.flights.find((item) => item.id === vehicle.assignedFlightId);
      previous?.tasks.forEach((task) => {
        task.assignedVehicleIds = task.assignedVehicleIds.filter((id) => id !== vehicle.id);
        if (task.state === "assigned" && task.assignedVehicleIds.length === 0) {
          task.state = "available";
        }
      });
    }
    vehicle.assignedFlightId = flight.id;
    vehicle.assignedServiceId = serviceId;
    vehicle.state = "traveling";
    vehicle.targetPoint = this.servicePoint(flight, vehicle.type);
    vehicle.path = [];
    vehicle.pathIndex = 0;
    this.events.emit({ type: "vehicle_dispatched", vehicleId: vehicle.id, flightId: flight.id });
  }

  private recallVehicle(vehicle: GroundVehicle): void {
    this.detachVehicle(vehicle);
    vehicle.state = "returning";
    vehicle.targetPoint = this.waypoints.get(vehicle.stagingId)!.position;
    vehicle.path = [];
    vehicle.pathIndex = 0;
  }

  private detachVehicle(vehicle: GroundVehicle): void {
    for (const flight of this.flights) {
      for (const task of flight.tasks) {
        if (!task.assignedVehicleIds.includes(vehicle.id)) continue;
        task.assignedVehicleIds = task.assignedVehicleIds.filter((id) => id !== vehicle.id);
        const def = SERVICES[task.id];
        if (
          (task.state === "assigned" || task.state === "in_progress") &&
          task.assignedVehicleIds.length < def.vehicleTypes.length
        ) {
          task.state = task.progress > 0 ? "assigned" : "available";
          if (task.progress === 0) task.assignedVehicleIds = [];
        }
      }
    }
    vehicle.assignedFlightId = null;
    vehicle.assignedServiceId = null;
  }

  private findAssignableVehicle(type: VehicleType, flightId: string): GroundVehicle | undefined {
    const reserved = this.vehicles.find(
      (v) => v.type === type && v.assignedFlightId === flightId && v.assignedServiceId !== null,
    );
    if (reserved) return reserved;

    const parkedHere = this.vehicles.find(
      (v) => v.type === type && v.assignedFlightId === flightId && v.state === "idle",
    );
    if (parkedHere) return parkedHere;

    return this.vehicles.find(
      (v) =>
        v.type === type &&
        !v.assignedServiceId &&
        (v.state === "idle" || v.state === "returning"),
    );
  }

  private servicePoint(flight: Flight, type: VehicleType): Vec2 {
    const aircraft = AIRCRAFT[flight.aircraftTypeId];
    const gate = GATES.find((g) => g.id === flight.gateId)!;
    const key =
      type === "fuel_truck"
        ? "fuel"
        : type === "cleaning_van"
          ? "service"
          : type === "pushback_tug"
            ? "nose"
            : type === "baggage_tractor"
              ? "cargo"
              : "cargo";
    const offset = aircraft.serviceOffsets[key];
    const point = serviceWorldPoint(gate.stand, gate.heading, offset);
    if (type === "baggage_tractor") {
      return { x: point.x + 2.4, z: point.z + 2.8 };
    }
    return point;
  }

  private updateTasks(simDt: number): void {
    for (const flight of this.flights) {
      if (flight.phase !== "on_blocks" && flight.phase !== "ready" && flight.phase !== "parking") continue;
      this.refreshTaskLocks(flight);

      for (const task of flight.tasks) {
        const def = SERVICES[task.id];
        if (task.state === "complete") continue;

        if (!def.playerAssigned && task.state === "available") {
          task.state = "assigned";
        }

        if (task.state === "assigned" || task.state === "in_progress") {
          if (!this.resourcesReady(flight, task.id)) continue;
          if (task.state === "assigned") {
            task.state = "in_progress";
            task.startedAt = this.clock.time;
            this.events.emit({ type: "task_started", flightId: flight.id, serviceId: task.id });
          }
          task.progress = Math.min(1, task.progress + simDt / task.duration);
          if (task.progress >= 1) this.completeTask(flight, task);
        }
      }

      if (this.requiredComplete(flight) && flight.phase === "on_blocks") {
        const push = this.task(flight, "pushback");
        if (push && push.state === "locked") push.state = "available";
        flight.phase = "ready";
        this.events.emit({ type: "flight_ready", flightId: flight.id });
        this.radioTalk(`${flight.flightNumber} ready for push.`);
      }
    }
  }

  private completeTask(flight: Flight, task: ServiceTask): void {
    task.state = "complete";
    task.progress = 1;
    task.completedAt = this.clock.time;
    this.events.emit({ type: "task_completed", flightId: flight.id, serviceId: task.id });

    if (task.id === "pushback") {
      this.startPushback(flight);
      return;
    }

    if (task.id === "baggage_unload" || task.id === "fuel" || task.id === "cleaning" || task.id === "baggage_load") {
      for (const vehicleId of task.assignedVehicleIds) {
        const vehicle = this.vehicles.find((v) => v.id === vehicleId);
        if (!vehicle) continue;
        const reuse =
          (task.id === "baggage_unload" &&
            (vehicle.type === "belt_loader" || vehicle.type === "baggage_tractor"));
        if (reuse) {
          vehicle.state = "idle";
          vehicle.assignedServiceId = null;
        } else {
          this.recallVehicle(vehicle);
        }
      }
    }

    this.refreshTaskLocks(flight);
  }

  private resourcesReady(flight: Flight, serviceId: ServiceId): boolean {
    const def = SERVICES[serviceId];
    if (def.vehicleTypes.length === 0) return true;
    const task = this.task(flight, serviceId);
    if (!task) return false;
    if (task.assignedVehicleIds.length < def.vehicleTypes.length) return false;
    return task.assignedVehicleIds.every((id) => {
      const vehicle = this.vehicles.find((v) => v.id === id);
      return vehicle?.state === "servicing" && vehicle.assignedFlightId === flight.id;
    });
  }

  private refreshTaskLocks(flight: Flight): void {
    if (flight.phase !== "on_blocks" && flight.phase !== "ready") return;
    for (const task of flight.tasks) {
      if (task.state !== "locked") continue;
      const def = SERVICES[task.id];
      const ready = def.dependsOn.every((dep) => {
        if (dep === "on_blocks") return flight.phase === "on_blocks" || flight.phase === "ready";
        return this.task(flight, dep)?.state === "complete";
      });
      if (ready) {
        task.state = "available";
        this.events.emit({ type: "task_available", flightId: flight.id, serviceId: task.id });
      }
    }
  }

  private requiredComplete(flight: Flight): boolean {
    return flight.tasks
      .filter((t) => t.id !== "pushback")
      .every((t) => t.state === "complete");
  }

  private task(flight: Flight, id: ServiceId): ServiceTask | undefined {
    return flight.tasks.find((t) => t.id === id);
  }

  private updateJetBridges(simDt: number): void {
    for (const gate of this.gates) {
      const flight = this.flights.find((f) => f.id === gate.occupiedBy);
      const bridge = flight ? this.task(flight, "jet_bridge") : undefined;
      const target =
        bridge && (bridge.state === "in_progress" || bridge.state === "complete") && flight?.phase !== "pushing"
          ? 1
          : 0;
      const delta = simDt / 35;
      if (gate.jetBridge < target) gate.jetBridge = Math.min(target, gate.jetBridge + delta);
      else gate.jetBridge = Math.max(target, gate.jetBridge - delta);
    }
  }

  private vehiclesOnStand(gateId: string): GroundVehicle[] {
    const gate = GATES.find((g) => g.id === gateId)!;
    return this.vehicles.filter((v) => distance(v.position, gate.stand) < 14 && v.state !== "returning");
  }

  private gateName(gateId: string): string {
    return GATES.find((g) => g.id === gateId)?.name ?? gateId;
  }

  private radioTalk(message: string): void {
    this.radio = [message, ...this.radio].slice(0, RADIO_LIMIT);
    this.events.emit({ type: "radio", message });
  }

  private checkShiftEnd(): void {
    const allDone = this.flights.every((f) => f.phase === "departed");
    const timeUp = this.clock.time >= this.scenario.endSim + 180;
    if (!allDone && !timeUp) return;
    if (this.result) return;

    const departed = this.flights.filter((f) => f.phase === "departed");
    const result = rateShift(
      this.flights.length,
      departed.length,
      this.onTimeCount,
      this.score,
      this.scenario.targetScore,
    );
    result.bestStreak = this.bestStreak;
    result.perfectTurns = this.perfectTurns;
    this.result = result;
    this.clock.setSpeed(0);
    this.events.emit({ type: "shift_ended" });
  }
}

export function autoAssignAvailable(sim: Simulation): void {
  for (const flight of sim.flights) {
    if (flight.phase !== "on_blocks" && flight.phase !== "ready") continue;
    for (const task of flight.tasks) {
      if (task.state !== "available") continue;
      const def = SERVICES[task.id];
      if (!def.playerAssigned) continue;
      sim.assignService(flight.id, task.id);
    }
  }
}
