import { AIRCRAFT, AIRLINES, VEHICLES } from "../data/catalog";
import { GATES } from "../data/waypoints";
import type { Simulation } from "../sim/simulation";
import type { MapCamera } from "./camera2d";
import { BAG_COLORS, aircraftSprite, bagSprite, vehicleSprite } from "./sprites";

const GRASS = "#3d7a3a";
const GRASS_DARK = "#2f6230";
const TARMAC = "#4a5160";
const TARMAC_DARK = "#3c4350";
const LINE = "#f4d03f";
const CONCRETE = "#8b93a1";
const TERMINAL = "#c5d0dc";
const GLASS = "#4f8fc4";
function blit(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  scale: number,
  heading: number,
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(Math.PI - heading);
  ctx.imageSmoothingEnabled = false;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export class PixelWorld {
  private aircraft = new Map<string, HTMLCanvasElement>();
  private vehicles = new Map<string, HTMLCanvasElement>();
  private bags: Array<{ flightId: string; t: number; side: number; color: string }> = [];
  private bagArt = new Map<string, HTMLCanvasElement>();
  private clock = 0;

  constructor() {
    for (const color of BAG_COLORS) this.bagArt.set(color, bagSprite(color));
  }

  aircraftPosition(id: string): { x: number; y: number; z: number } | null {
    return this.lastFlightPos.get(id) ?? null;
  }

  private lastFlightPos = new Map<string, { x: number; y: number; z: number }>();

  pick(sim: Simulation, camera: MapCamera, sx: number, sy: number): { kind: "flight" | "vehicle"; id: string } | null {
    const world = camera.screenToWorld(sx, sy);
    let best: { kind: "flight" | "vehicle"; id: string; d: number } | null = null;
    for (const flight of sim.flights) {
      if (flight.phase === "scheduled" || flight.phase === "departed") continue;
      const d = Math.hypot(flight.position.x - world.x, flight.position.z - world.z);
      const radius = AIRCRAFT[flight.aircraftTypeId].length * 0.45;
      if (d < radius && (!best || d < best.d)) best = { kind: "flight", id: flight.id, d };
    }
    for (const vehicle of sim.vehicles) {
      const d = Math.hypot(vehicle.position.x - world.x, vehicle.position.z - world.z);
      if (d < 2.2 && (!best || d < best.d)) best = { kind: "vehicle", id: vehicle.id, d };
    }
    return best ? { kind: best.kind, id: best.id } : null;
  }

  draw(ctx: CanvasRenderingContext2D, camera: MapCamera, sim: Simulation, dt: number): void {
    this.clock += dt;
    this.trackBags(sim, dt);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = GRASS;
    ctx.fillRect(0, 0, camera.width, camera.height);
    this.drawChecker(ctx, camera);
    this.drawRamp(ctx, camera, sim);
    this.drawVehicles(ctx, camera, sim);
    this.drawBags(ctx, camera, sim);
    this.drawAircraft(ctx, camera, sim);
  }

  private drawChecker(ctx: CanvasRenderingContext2D, camera: MapCamera): void {
    const step = 4;
    for (let z = -40; z < 80; z += step) {
      for (let x = -80; x < 80; x += step) {
        if (((x + z) / step) % 2 === 0) continue;
        const p = camera.worldToScreen(x, z);
        const n = camera.worldToScreen(x + step, z + step);
        fillRect(ctx, p.x, p.y, n.x - p.x, n.y - p.y, GRASS_DARK);
      }
    }
  }

  private drawRamp(ctx: CanvasRenderingContext2D, camera: MapCamera, sim: Simulation): void {
    const tl = camera.worldToScreen(-46, -24);
    const br = camera.worldToScreen(46, 48);
    fillRect(ctx, tl.x, tl.y, br.x - tl.x, br.y - tl.y, TARMAC);
    const inner = camera.worldToScreen(-42, -8);
    const inner2 = camera.worldToScreen(42, 44);
    fillRect(ctx, inner.x, inner.y, inner2.x - inner.x, inner2.y - inner.y, TARMAC_DARK);
    fillRect(ctx, inner.x, inner.y, inner2.x - inner.x, inner2.y - inner.y, TARMAC);

    this.line(ctx, camera, -40, 34, 40, 34, 1.1, LINE);
    this.line(ctx, camera, -40, 46, 40, 46, 1.1, LINE);
    this.line(ctx, camera, -22, 18, 22, 18, 0.35, "#f7e27a");

    const term = camera.worldToScreen(-35, -22);
    const term2 = camera.worldToScreen(35, -12);
    fillRect(ctx, term.x, term.y, term2.x - term.x, term2.y - term.y, TERMINAL);
    const glass = camera.worldToScreen(-32, -20);
    const glass2 = camera.worldToScreen(32, -14);
    fillRect(ctx, glass.x, glass.y, glass2.x - glass.x, glass2.y - glass.y, GLASS);
    fillRect(ctx, term.x, term.y, term2.x - term.x, 3, CONCRETE);

    for (const gate of GATES) {
      const c = camera.worldToScreen(gate.stand.x, gate.stand.z);
      const r = 7.5 * camera.zoom;
      ctx.fillStyle = "#555d6c";
      ctx.beginPath();
      ctx.arc(Math.round(c.x), Math.round(c.y), Math.round(r), 0, Math.PI * 2);
      ctx.fill();
      this.line(ctx, camera, gate.stand.x, gate.stand.z, gate.stand.x, gate.stand.z + 16, 0.35, LINE);
      this.pixelText(ctx, camera, gate.stand.x, gate.stand.z + 12, gate.name.replace("Gate ", ""), LINE);

      const gateState = sim.gates.find((g) => g.id === gate.id);
      const extend = gateState?.jetBridge ?? 0;
      const b0 = camera.worldToScreen(gate.stand.x + 4.2, -12);
      const b1 = camera.worldToScreen(gate.stand.x + 4.2, -12 + 6 + extend * 12);
      fillRect(ctx, b0.x - camera.zoom * 0.7, b0.y, camera.zoom * 1.4, b1.y - b0.y, CONCRETE);
      fillRect(ctx, b1.x - camera.zoom * 0.95, b1.y - camera.zoom * 0.8, camera.zoom * 1.9, camera.zoom * 1.6, "#9aa8b8");
    }

    this.pad(ctx, camera, -24, 24, "#f1c40f");
    this.pad(ctx, camera, -8, 24, "#e67e22");
    this.pad(ctx, camera, 8, 24, "#27ae60");
    this.pad(ctx, camera, 24, 24, "#c0392b");
  }

  private pad(ctx: CanvasRenderingContext2D, camera: MapCamera, x: number, z: number, color: string): void {
    const a = camera.worldToScreen(x - 3.2, z - 2.4);
    const b = camera.worldToScreen(x + 3.2, z + 2.4);
    fillRect(ctx, a.x, a.y, b.x - a.x, b.y - a.y, "#3d4452");
    fillRect(ctx, a.x, a.y, b.x - a.x, 3, color);
  }

  private line(
    ctx: CanvasRenderingContext2D,
    camera: MapCamera,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width: number,
    color: string,
  ): void {
    const a = camera.worldToScreen(x1, z1);
    const b = camera.worldToScreen(x2, z2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, width * camera.zoom);
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(Math.round(a.x), Math.round(a.y));
    ctx.lineTo(Math.round(b.x), Math.round(b.y));
    ctx.stroke();
  }

  private pixelText(ctx: CanvasRenderingContext2D, camera: MapCamera, x: number, z: number, text: string, color: string): void {
    const p = camera.worldToScreen(x, z);
    ctx.fillStyle = color;
    ctx.font = `${Math.max(10, Math.round(camera.zoom * 1.4))}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, Math.round(p.x), Math.round(p.y));
  }

  private drawAircraft(ctx: CanvasRenderingContext2D, camera: MapCamera, sim: Simulation): void {
    for (const flight of sim.flights) {
      if (flight.phase === "scheduled" || flight.phase === "departed") continue;
      const type = AIRCRAFT[flight.aircraftTypeId];
      const airline = AIRLINES[flight.airlineId];
      const key = `${type.id}:${airline.color}`;
      let sprite = this.aircraft.get(key);
      if (!sprite) {
        sprite = aircraftSprite(type.className, airline.color, type.colorSecondary);
        this.aircraft.set(key, sprite);
      }
      const screen = camera.worldToScreen(flight.position.x, flight.position.z);
      const scale = (type.length * camera.zoom) / sprite.height;
      blit(ctx, sprite, screen.x, screen.y, scale, flight.heading);
      this.lastFlightPos.set(flight.id, { x: flight.position.x, y: 0, z: flight.position.z });

      if (flight.id === sim.selectedFlightId) {
        ctx.strokeStyle = "#7bd7ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.round(screen.x - type.wingspan * camera.zoom * 0.55),
          Math.round(screen.y - type.length * camera.zoom * 0.55),
          Math.round(type.wingspan * camera.zoom * 1.1),
          Math.round(type.length * camera.zoom * 1.1),
        );
      }

      if (flight.beaconOn && Math.sin(this.clock * 10) > 0) {
        ctx.fillStyle = "#ff2d2d";
        ctx.fillRect(Math.round(screen.x) - 1, Math.round(screen.y) - 1, 3, 3);
      }
    }
  }

  private drawVehicles(ctx: CanvasRenderingContext2D, camera: MapCamera, sim: Simulation): void {
    for (const vehicle of sim.vehicles) {
      let sprite = this.vehicles.get(vehicle.type);
      if (!sprite) {
        sprite = vehicleSprite(vehicle.type, VEHICLES[vehicle.type].color);
        this.vehicles.set(vehicle.type, sprite);
      }
      const screen = camera.worldToScreen(vehicle.position.x, vehicle.position.z);
      const scale = (3.4 * camera.zoom) / sprite.height;
      blit(ctx, sprite, screen.x, screen.y, scale, vehicle.heading);
    }
  }

  private trackBags(sim: Simulation, dt: number): void {
    for (const flight of sim.flights) {
      const unload = flight.tasks.find((t) => t.id === "baggage_unload");
      const load = flight.tasks.find((t) => t.id === "baggage_load");
      const active = unload?.state === "in_progress" ? -1 : load?.state === "in_progress" ? 1 : 0;
      if (!active) continue;
      if (Math.random() < dt / 1.8) {
        this.bags.push({
          flightId: flight.id,
          t: active < 0 ? 0 : 1,
          side: active,
          color: BAG_COLORS[Math.floor(Math.random() * BAG_COLORS.length)],
        });
      }
    }
    this.bags = this.bags.filter((bag) => {
      const flight = sim.flights.find((f) => f.id === bag.flightId);
      if (!flight || flight.phase === "departed") return false;
      bag.t += bag.side * dt * 0.4;
      return bag.t > -0.1 && bag.t < 1.15;
    });
  }

  private drawBags(ctx: CanvasRenderingContext2D, camera: MapCamera, sim: Simulation): void {
    for (const bag of this.bags) {
      const flight = sim.flights.find((f) => f.id === bag.flightId);
      if (!flight) continue;
      const type = AIRCRAFT[flight.aircraftTypeId];
      const cargo = type.serviceOffsets.cargo;
      const wx = flight.position.x + cargo.x + bag.t * 1.2;
      const wz = flight.position.z + cargo.z + bag.t * 4;
      const screen = camera.worldToScreen(wx, wz);
      const sprite = this.bagArt.get(bag.color)!;
      blit(ctx, sprite, screen.x, screen.y, camera.zoom / 6, 0);
    }
  }
}
