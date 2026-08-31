import * as THREE from "three";
import { AIRCRAFT, AIRLINES, VEHICLES } from "../data/catalog";
import { GATES } from "../data/waypoints";
import type { Simulation } from "../sim/simulation";
import { createAircraftMesh, createBagMesh, createJetBridge, createVehicleMesh } from "./geometries";

const BAG_INTERVAL = 2.4;

export class GameWorld {
  readonly scene = new THREE.Scene();
  readonly raycastTargets: THREE.Object3D[] = [];
  private aircraft = new Map<string, THREE.Group>();
  private vehicles = new Map<string, THREE.Group>();
  private bridges = new Map<string, THREE.Group>();
  private bags: Array<{ mesh: THREE.Mesh; flightId: string; t: number; side: number }> = [];
  private clock = 0;

  constructor() {
    this.scene.background = new THREE.Color("#7fb7e6");
    this.scene.fog = new THREE.Fog("#9ac6e8", 80, 180);
    this.addLights();
    this.buildRamp();
    this.buildTerminal();
    this.buildBridges();
  }

  sync(sim: Simulation, dt: number): void {
    this.clock += dt;
    this.syncAircraft(sim);
    this.syncVehicles(sim);
    this.syncBridges(sim);
    this.updateBags(sim, dt);
  }

  pick(raycaster: THREE.Raycaster): { kind: "flight" | "vehicle"; id: string } | null {
    const hits = raycaster.intersectObjects(this.raycastTargets, true);
    const hit = hits[0];
    if (!hit) return null;
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      if (obj.userData.flightId) return { kind: "flight", id: obj.userData.flightId };
      if (obj.userData.vehicleId) return { kind: "vehicle", id: obj.userData.vehicleId };
      obj = obj.parent;
    }
    return null;
  }

  aircraftPosition(id: string): THREE.Vector3 | null {
    const group = this.aircraft.get(id);
    return group ? group.position.clone() : null;
  }

  private addLights(): void {
    const hemi = new THREE.HemisphereLight("#fff4e0", "#3d5a45", 0.85);
    const sun = new THREE.DirectionalLight("#fff2d2", 1.15);
    sun.position.set(-30, 48, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    this.scene.add(hemi, sun);
  }

  private buildRamp(): void {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 140),
      new THREE.MeshStandardMaterial({ color: "#4d8a46", roughness: 1 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.05;
    grass.receiveShadow = true;

    const tarmac = new THREE.Mesh(
      new THREE.PlaneGeometry(92, 72),
      new THREE.MeshStandardMaterial({ color: "#4a5160", roughness: 0.95 }),
    );
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.receiveShadow = true;

    this.scene.add(grass, tarmac);
    this.addLine(-40, 40, 34, 34, 1.1, "#f4d03f");
    this.addLine(-40, 40, 46, 46, 1.1, "#f4d03f");
    this.addLine(-22, 22, 18, 18, 0.35, "#f7e27a");

    for (const gate of GATES) {
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(7.5, 24),
        new THREE.MeshStandardMaterial({ color: "#555d6c", roughness: 0.9 }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(gate.stand.x, 0.02, gate.stand.z);
      pad.receiveShadow = true;
      this.scene.add(pad);

      const number = this.makeTextPlane(gate.name.replace("Gate ", ""), "#f4d03f");
      number.rotation.x = -Math.PI / 2;
      number.position.set(gate.stand.x, 0.04, gate.stand.z + 11);
      this.scene.add(number);

      const lead = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 16),
        new THREE.MeshStandardMaterial({ color: "#f4d03f" }),
      );
      lead.rotation.x = -Math.PI / 2;
      lead.position.set(gate.stand.x, 0.03, gate.stand.z + 12);
      this.scene.add(lead);
    }

    this.addStaging(-24, 24, "#f1c40f");
    this.addStaging(-8, 24, "#e67e22");
    this.addStaging(8, 24, "#27ae60");
    this.addStaging(24, 24, "#c0392b");
  }

  private addStaging(x: number, z: number, color: string): void {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.08, 5),
      new THREE.MeshStandardMaterial({ color: "#3d4452" }),
    );
    pad.position.set(x, 0.04, z);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.09, 0.18),
      new THREE.MeshStandardMaterial({ color }),
    );
    stripe.position.set(x, 0.08, z - 2.2);
    this.scene.add(pad, stripe);
  }

  private addLine(x1: number, x2: number, z1: number, z2: number, width: number, color: string): void {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(len, width),
      new THREE.MeshStandardMaterial({ color }),
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -Math.atan2(dz, dx);
    line.position.set((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    this.scene.add(line);
  }

  private buildTerminal(): void {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(70, 10, 10),
      new THREE.MeshStandardMaterial({ color: "#e8eef5", roughness: 0.45, metalness: 0.1 }),
    );
    building.position.set(0, 5, -18);
    building.castShadow = true;
    building.receiveShadow = true;

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(64, 5.5, 0.4),
      new THREE.MeshStandardMaterial({ color: "#5dade2", roughness: 0.15, metalness: 0.35 }),
    );
    glass.position.set(0, 4.6, -12.8);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(74, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: "#8aa0b5" }),
    );
    roof.position.set(0, 10.2, -18);

    this.scene.add(building, glass, roof);
  }

  private buildBridges(): void {
    for (const gate of GATES) {
      const bridge = createJetBridge();
      bridge.position.set(gate.stand.x + 4.6, 0, -12);
      this.scene.add(bridge);
      this.bridges.set(gate.id, bridge);
    }
  }

  private syncAircraft(sim: Simulation): void {
    const live = new Set<string>();
    for (const flight of sim.flights) {
      if (flight.phase === "scheduled") continue;
      live.add(flight.id);
      let group = this.aircraft.get(flight.id);
      if (!group) {
        const type = AIRCRAFT[flight.aircraftTypeId];
        const airline = AIRLINES[flight.airlineId];
        group = createAircraftMesh(type, airline.color);
        group.userData.flightId = flight.id;
        this.scene.add(group);
        this.aircraft.set(flight.id, group);
        this.raycastTargets.push(group);
      }
      group.position.set(flight.position.x, 1.15, flight.position.z);
      group.rotation.y = flight.heading;
      group.visible = flight.phase !== "departed";
      const beacon = group.getObjectByName("beacon") as THREE.Mesh | undefined;
      if (beacon && beacon.material instanceof THREE.MeshStandardMaterial) {
        beacon.material.emissiveIntensity = flight.beaconOn ? (Math.sin(this.clock * 10) > 0 ? 2 : 0.15) : 0.05;
      }
    }
    for (const [id, group] of this.aircraft) {
      if (!live.has(id) || sim.flights.find((f) => f.id === id)?.phase === "departed") {
        group.visible = false;
      }
    }
  }

  private syncVehicles(sim: Simulation): void {
    for (const vehicle of sim.vehicles) {
      let group = this.vehicles.get(vehicle.id);
      if (!group) {
        group = createVehicleMesh(vehicle.type, VEHICLES[vehicle.type].color);
        group.userData.vehicleId = vehicle.id;
        this.scene.add(group);
        this.vehicles.set(vehicle.id, group);
        this.raycastTargets.push(group);
      }
      group.position.set(vehicle.position.x, 0, vehicle.position.z);
      group.rotation.y = vehicle.heading;
    }
  }

  private syncBridges(sim: Simulation): void {
    for (const gate of sim.gates) {
      const group = this.bridges.get(gate.id);
      if (!group) continue;
      const tunnel = group.getObjectByName("tunnel");
      const cabin = group.getObjectByName("cabin");
      const extend = 4 + gate.jetBridge * 8;
      if (tunnel) {
        tunnel.scale.z = 0.45 + gate.jetBridge * 0.85;
        tunnel.position.z = extend * 0.42;
      }
      if (cabin) cabin.position.z = 3.2 + gate.jetBridge * 9.2;
    }
  }

  private updateBags(sim: Simulation, dt: number): void {
    for (const flight of sim.flights) {
      const unload = flight.tasks.find((t) => t.id === "baggage_unload");
      const load = flight.tasks.find((t) => t.id === "baggage_load");
      const active =
        (unload?.state === "in_progress" ? -1 : 0) || (load?.state === "in_progress" ? 1 : 0);
      if (!active) continue;
      if (Math.random() < dt / BAG_INTERVAL) {
        const mesh = createBagMesh();
        this.scene.add(mesh);
        this.bags.push({ mesh, flightId: flight.id, t: active < 0 ? 0 : 1, side: active });
      }
    }

    this.bags = this.bags.filter((bag) => {
      const flight = sim.flights.find((f) => f.id === bag.flightId);
      if (!flight || flight.phase === "departed") {
        this.scene.remove(bag.mesh);
        return false;
      }
      bag.t += bag.side * dt * 0.35;
      const type = AIRCRAFT[flight.aircraftTypeId];
      const cargo = type.serviceOffsets.cargo;
      const x = flight.position.x + cargo.x + bag.t * 1.2;
      const z = flight.position.z + cargo.z + bag.t * 4;
      bag.mesh.position.set(x, 0.9 + Math.sin(bag.t * 6) * 0.08, z);
      if (bag.t < -0.1 || bag.t > 1.15) {
        this.scene.remove(bag.mesh);
        return false;
      }
      return true;
    });
  }

  private makeTextPlane(text: string, color: string): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "bold 80px Rajdhani, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 70);
    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    return mesh;
  }
}
