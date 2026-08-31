import "./style.css";
import * as THREE from "three";
import { MORNING_BANK } from "./data/scenario";
import { IsoCamera } from "./render/camera";
import { GameWorld } from "./render/world";
import { Simulation } from "./sim/simulation";
import { Overlay } from "./ui/overlay";
import { Sfx } from "./audio/sfx";
import type { ServiceId } from "./sim/types";

const app = document.querySelector<HTMLDivElement>("#app")!;
const root = document.createElement("div");
root.id = "game-root";
app.appendChild(root);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = "game-canvas";
root.appendChild(renderer.domElement);

const overlayHost = document.createElement("div");
overlayHost.className = "overlay-host";
overlayHost.style.position = "absolute";
overlayHost.style.inset = "0";
overlayHost.style.pointerEvents = "none";
root.appendChild(overlayHost);

const cameraRig = new IsoCamera(window.innerWidth / window.innerHeight);
const world = new GameWorld();
const overlay = new Overlay(overlayHost);
const sfx = new Sfx();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let sim = new Simulation(MORNING_BANK);
let playing = false;
let last = performance.now();
let selectedVehicleId: string | null = null;
let pointerDown: { x: number; y: number; t: number } | null = null;
let lastPinch = 0;

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
  if (flight) cameraRig.focusOn(flight.position.x, flight.position.z);
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

window.addEventListener("resize", () => {
  cameraRig.resize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.style.cursor = "grab";
renderer.domElement.addEventListener("pointerdown", (event) => {
  renderer.domElement.style.cursor = "grabbing";
  pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!pointerDown || event.pointerType === "touch" && (event as PointerEvent).isPrimary === false) return;
  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  if (Math.hypot(dx, dy) < 4) return;
  cameraRig.pan(-dx * 0.08, dy * 0.08);
  cameraRig.focusOn(cameraRig.target.x, cameraRig.target.z);
  pointerDown = { x: event.clientX, y: event.clientY, t: pointerDown.t };
});

renderer.domElement.addEventListener("pointerup", (event) => {
  if (!pointerDown) return;
  const dt = performance.now() - pointerDown.t;
  const dist = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  renderer.domElement.style.cursor = "grab";
  if (dist > 14 || dt > 700 || !playing) return;
  pickAt(event.clientX, event.clientY);
});

renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraRig.zoom(event.deltaY * 0.04);
  },
  { passive: false },
);

renderer.domElement.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      lastPinch = pinchDistance(event.touches);
    }
  },
  { passive: true },
);

renderer.domElement.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length === 2) {
      const next = pinchDistance(event.touches);
      cameraRig.zoom((lastPinch - next) * 0.08);
      lastPinch = next;
    }
  },
  { passive: true },
);

function pinchDistance(touches: TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function pickAt(x: number, y: number): void {
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, cameraRig.camera);
  const hit = world.pick(raycaster);
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
    if (flight) cameraRig.focusOn(flight.position.x, flight.position.z);
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
      if (inbound && !next.selectedFlightId) cameraRig.focusOn(inbound.position.x, inbound.position.z);
    }
    if (event.type === "score") {
      const pos = world.aircraftPosition(event.flightId);
      if (pos) {
        const screen = project(pos.x, 5, pos.z);
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

function project(x: number, y: number, z: number): { x: number; y: number } | null {
  const v = new THREE.Vector3(x, y, z).project(cameraRig.camera);
  if (v.z > 1) return null;
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight,
  };
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) sim.tick(dt);
  world.sync(sim, dt);
  cameraRig.update(dt);
  overlay.update(sim, project);
  renderer.render(world.scene, cameraRig.camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
