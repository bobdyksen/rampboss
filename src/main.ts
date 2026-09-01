import "./style.css";
import { MORNING_BANK } from "./data/scenario";
import { MapCamera } from "./render/camera2d";
import { PixelWorld } from "./render/world2d";
import { Simulation } from "./sim/simulation";
import { Overlay } from "./ui/overlay";
import { Sfx } from "./audio/sfx";
import type { ServiceId } from "./sim/types";

const app = document.querySelector<HTMLDivElement>("#app")!;
const root = document.createElement("div");
root.id = "game-root";
app.appendChild(root);

const canvas = document.createElement("canvas");
canvas.className = "game-canvas";
root.appendChild(canvas);
const ctx = canvas.getContext("2d", { alpha: false })!;

const overlayHost = document.createElement("div");
overlayHost.className = "overlay-host";
overlayHost.style.position = "absolute";
overlayHost.style.inset = "0";
overlayHost.style.pointerEvents = "none";
root.appendChild(overlayHost);

const camera = new MapCamera();
const world = new PixelWorld();
void world.loadAssets();
const overlay = new Overlay(overlayHost);
const sfx = new Sfx();

let sim = new Simulation(MORNING_BANK);
let playing = false;
let last = performance.now();
let selectedVehicleId: string | null = null;
let pointerDown: { x: number; y: number; t: number; dragged: boolean } | null = null;
let lastPinch = 0;
let pinchMid: { x: number; y: number } | null = null;

resize();
bindSimulation(sim);

overlay.onStart = () => {
  playing = true;
  overlay.hideTitle();
  sim.setSpeed(1);
  overlay.setSpeed(1);
  sfx.dispatch();
  overlay.showToast("TAP AN AIRCRAFT");
};

overlay.onRestart = () => {
  sim = new Simulation(MORNING_BANK);
  bindSimulation(sim);
  overlay.hideResults();
  playing = true;
  sim.setSpeed(1);
  overlay.setSpeed(1);
};

overlay.onAssign = (flightId, serviceId) => assign(flightId, serviceId);
overlay.onSelectFlight = (flightId) => {
  sim.selectFlight(flightId);
  const flight = sim.flights.find((item) => item.id === flightId);
  if (flight) camera.focusOn(flight.position.x, flight.position.z);
};

overlay.onSpeed = (speed) => {
  if (!playing) return;
  sim.setSpeed(speed);
  overlay.setSpeed(speed);
};

window.addEventListener("keydown", (event) => {
  if (!playing) return;
  if (event.code === "Space") {
    sim.setSpeed(sim.clock.speed === 0 ? 1 : 0);
    overlay.setSpeed(sim.clock.speed);
  }
  if (event.key === "1") {
    sim.setSpeed(1);
    overlay.setSpeed(1);
  }
  if (event.key === "2") {
    sim.setSpeed(2);
    overlay.setSpeed(2);
  }
});

window.addEventListener("resize", resize);

canvas.style.cursor = "grab";
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
  pointerDown = { x: event.clientX, y: event.clientY, t: performance.now(), dragged: false };
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointerDown) return;
  if (event.pointerType === "touch" && !event.isPrimary && pinchMid) return;
  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  if (Math.hypot(dx, dy) < 4) return;
  pointerDown.dragged = true;
  camera.panScreen(dx, dy);
  pointerDown = { ...pointerDown, x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointerDown) return;
  const dt = performance.now() - pointerDown.t;
  const dist = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  const dragged = pointerDown.dragged;
  pointerDown = null;
  canvas.style.cursor = "grab";
  if (dragged || dist > 14 || dt > 700 || !playing) return;
  pickAt(event.clientX, event.clientY);
});

canvas.addEventListener("pointercancel", () => {
  pointerDown = null;
  canvas.style.cursor = "grab";
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    camera.zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 0.94 : 1.06);
  },
  { passive: false },
);

canvas.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      lastPinch = pinchDistance(event.touches);
      pinchMid = pinchCenter(event.touches);
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length === 2 && pinchMid) {
      const next = pinchDistance(event.touches);
      const mid = pinchCenter(event.touches);
      camera.zoomAt(mid.x, mid.y, next / Math.max(1, lastPinch));
      camera.panScreen(mid.x - pinchMid.x, mid.y - pinchMid.y);
      lastPinch = next;
      pinchMid = mid;
    }
  },
  { passive: true },
);

canvas.addEventListener(
  "touchend",
  () => {
    if (pinchMid) pointerDown = null;
    pinchMid = null;
  },
  { passive: true },
);

function pinchDistance(touches: TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function pinchCenter(touches: TouchList): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function pickAt(x: number, y: number): void {
  const hit = world.pick(sim, camera, x, y);
  if (!hit) {
    sim.selectFlight(null);
    selectedVehicleId = null;
    return;
  }
  if (hit.kind === "flight") {
    if (selectedVehicleId) {
      const result = sim.assignVehicleToFlight(selectedVehicleId, hit.id);
      if (!result.ok) {
        overlay.showToast(result.reason ?? "Can't assign");
        sfx.warning();
      } else {
        sfx.dispatch();
      }
      selectedVehicleId = null;
    }
    sim.selectFlight(hit.id);
    const flight = sim.flights.find((f) => f.id === hit.id);
    if (flight) camera.focusOn(flight.position.x, flight.position.z);
  } else {
    selectedVehicleId = hit.id;
    overlay.showToast("Tap an aircraft");
  }
}

function assign(flightId: string, serviceId: ServiceId): void {
  const result = sim.assignService(flightId, serviceId);
  if (!result.ok) {
    overlay.showToast(result.reason ?? "Unavailable");
    sfx.warning();
    return;
  }
  sfx.dispatch();
}

function bindSimulation(next: Simulation): void {
  next.events.on((event) => {
    if (event.type === "task_completed") sfx.complete();
    if (event.type === "flight_departed") sfx.depart();
    if (event.type === "flight_spawned") {
      const inbound = next.flights.find((item) => item.id === event.flightId);
      if (inbound && !next.selectedFlightId) camera.focusOn(inbound.position.x, inbound.position.z);
    }
    if (event.type === "score") {
      const pos = world.aircraftPosition(event.flightId);
      if (pos) {
        const screen = project(pos.x, 0, pos.z);
        if (screen) {
          overlay.addFloat(
            `${event.label} ${event.amount > 0 ? "+" : ""}${event.amount}`,
            screen.x,
            screen.y,
            event.kind,
          );
        }
      }
      if (event.label === "PERFECT TURN") {
        overlay.showToast("PERFECT TURN!");
        sfx.perfect();
      }
      if (event.label.startsWith("ON-TIME STREAK")) overlay.showToast(event.label);
    }
    if (event.type === "flight_ready") overlay.showToast("READY FOR PUSH");
    if (event.type === "warning") overlay.showToast(event.message);
    if (event.type === "shift_ended" && next.result) overlay.showResults(next.result);
  });
}

function project(x: number, _y: number, z: number): { x: number; y: number } | null {
  return camera.worldToScreen(x, z);
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  camera.resize(window.innerWidth, window.innerHeight);
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) sim.tick(dt);
  camera.update(dt);
  world.draw(ctx, camera, sim, dt);
  overlay.update(sim, project);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
