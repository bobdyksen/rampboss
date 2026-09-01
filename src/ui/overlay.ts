import { AIRCRAFT, SERVICES } from "../data/catalog";
import { formatCountdown, formatSimClock } from "../data/scenario";
import { GATES } from "../data/waypoints";
import type { Simulation } from "../sim/simulation";
import type { ServiceId, ShiftResult } from "../sim/types";

const PLAYER_TASKS: ServiceId[] = [
  "jet_bridge",
  "deplane",
  "baggage_unload",
  "fuel",
  "cleaning",
  "baggage_load",
  "boarding",
  "pushback",
];

export class Overlay {
  readonly root: HTMLElement;
  private hud: HTMLElement;
  private radio: HTMLElement;
  private labels: HTMLElement;
  private radial: HTMLElement;
  private toast: HTMLElement;
  private title: HTMLElement;
  private results: HTMLElement;
  private controls: HTMLElement;
  onStart?: () => void;
  onRestart?: () => void;
  onAssign?: (flightId: string, serviceId: ServiceId) => void;
  onSelectFlight?: (flightId: string) => void;
  onSpeed?: (speed: 0 | 1 | 2) => void;
  private radialKey = "";
  private floats: Array<{ id: number; text: string; x: number; y: number; born: number; kind: string }> = [];

  constructor(parent: HTMLElement) {
    this.root = parent;
    parent.innerHTML = `
      <div class="hud">
        <div class="hud-top">
          <div class="chip"><label>SCORE</label><strong id="hud-score">0</strong></div>
          <div class="chip"><label>OTP</label><strong id="hud-otp">—</strong></div>
          <div class="chip"><label>TIME</label><strong id="hud-time">06:00</strong></div>
          <div class="chip"><label>ACTIVE</label><strong id="hud-active">0</strong></div>
        </div>
      </div>
      <div class="labels" id="labels"></div>
      <div class="radial hidden" id="radial"></div>
      <div class="radio" id="radio"></div>
      <div class="toast" id="toast"></div>
      <div class="floats" id="floats"></div>
      <div class="controls">
        <button data-speed="0">II</button>
        <button data-speed="1" class="active">1x</button>
        <button data-speed="2">2x</button>
      </div>
      <div class="title-layer" id="title">
        <div class="title-card">
          <p>WORKING TITLE</p>
          <h1>RAMP BOSS</h1>
          <p>Ridgefield Municipal — Morning Bank. Top-down pixel ramp. Drag the map, tap a jet, keep the airport moving.</p>
          <div class="howto">
            <div><strong>Tap an aircraft</strong>to open services</div>
            <div><strong>Dispatch crews</strong>deplane, fuel, bags, board, push</div>
            <div><strong>Travel time matters</strong>equipment cannot be two places at once</div>
            <div><strong>Beat the clock</strong>on-time departures stack a streak</div>
          </div>
          <div class="actions">
            <button class="primary-btn" id="start-btn">START SHIFT</button>
          </div>
        </div>
      </div>
      <div class="results-layer hidden" id="results"></div>
    `;

    this.hud = parent.querySelector(".hud")!;
    this.radio = parent.querySelector("#radio")!;
    this.labels = parent.querySelector("#labels")!;
    this.radial = parent.querySelector("#radial")!;
    this.toast = parent.querySelector("#toast")!;
    this.title = parent.querySelector("#title")!;
    this.results = parent.querySelector("#results")!;
    this.controls = parent.querySelector(".controls")!;

    parent.querySelector("#start-btn")?.addEventListener("click", () => this.onStart?.());
    this.labels.addEventListener("click", (event) => {
      const label = (event.target as HTMLElement).closest<HTMLElement>(".ac-label");
      const flightId = label?.dataset.flightId;
      if (flightId) this.onSelectFlight?.(flightId);
    });
    this.controls.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const speed = Number(button.getAttribute("data-speed")) as 0 | 1 | 2;
        this.onSpeed?.(speed);
      });
    });
  }

  hideTitle(): void {
    this.title.classList.add("hidden");
  }

  addFloat(text: string, x: number, y: number, kind: string): void {
    this.floats.push({ id: Date.now() + Math.random(), text, x, y, born: performance.now(), kind });
  }

  showToast(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.remove("show");
    void this.toast.offsetWidth;
    this.toast.classList.add("show");
  }

  setSpeed(speed: 0 | 1 | 2): void {
    this.controls.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", Number(button.getAttribute("data-speed")) === speed);
    });
  }

  update(sim: Simulation, project: (x: number, y: number, z: number) => { x: number; y: number } | null): void {
    const snap = sim.snapshot();
    this.setText("hud-score", snap.score.toLocaleString());
    this.setText("hud-otp", snap.departed === 0 ? "—" : `${Math.round(snap.otp * 100)}%`);
    this.setText("hud-time", formatSimClock(snap.time));
    this.setText(
      "hud-active",
      String(snap.flights.filter((f) => f.phase !== "scheduled" && f.phase !== "departed").length),
    );
    this.radio.innerHTML = snap.radio
      .slice(0, 3)
      .map((line) => `<div class="radio-item">${line}</div>`)
      .join("");

    this.renderLabels(sim, project);
    this.renderRadial(sim, project);
    this.renderFloats();
    this.hud.style.display = this.title.classList.contains("hidden") ? "" : "none";
    this.controls.style.visibility = this.title.classList.contains("hidden") ? "visible" : "hidden";
  }

  showResults(result: ShiftResult): void {
    const stars = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
    const headline = result.stars === 3 ? "RAMP BOSS" : result.completed ? "SHIFT COMPLETE" : "SHIFT OVER";
    this.results.classList.remove("hidden");
    this.results.innerHTML = `
      <div class="results-card">
        <p>RIDGEFIELD MUNICIPAL</p>
        <h1>${headline}</h1>
        <div class="stars">${stars}</div>
        <p>Score ${result.score.toLocaleString()} · OTP ${Math.round(result.otp * 100)}% · ${result.flightsTurned}/${result.flightsScheduled} turned</p>
        <p>Best streak ×${result.bestStreak} · Perfect turns ${result.perfectTurns}</p>
        <div class="actions" style="margin-top:18px">
          <button class="primary-btn" id="again-btn">RUN IT AGAIN</button>
        </div>
      </div>
    `;
    this.results.querySelector("#again-btn")?.addEventListener("click", () => this.onRestart?.());
  }

  hideResults(): void {
    this.results.classList.add("hidden");
    this.results.innerHTML = "";
  }

  private terminalAnchor(flightGateId: string): { x: number; z: number } {
    const gate = GATES.find((g) => g.id === flightGateId);
    return { x: gate?.stand.x ?? 0, z: -19 };
  }

  private renderLabels(
    sim: Simulation,
    project: (x: number, y: number, z: number) => { x: number; y: number } | null,
  ): void {
    const bits: string[] = [];
    for (const flight of sim.flights) {
      if (flight.phase === "scheduled" || flight.phase === "departed") continue;
      const anchor = this.terminalAnchor(flight.gateId);
      const screen = project(anchor.x, 0, anchor.z);
      if (!screen) continue;
      const color = sim.scheduleColor(flight);
      const remain = flight.departureSim - sim.clock.time;
      const type = AIRCRAFT[flight.aircraftTypeId];
      const icons = PLAYER_TASKS.map((id) => {
        const task = flight.tasks.find((t) => t.id === id);
        return `<span class="task-dot ${task?.state ?? "locked"}" title="${id}"></span>`;
      }).join("");
      bits.push(`
        <div class="ac-label terminal ${color}${flight.id === sim.selectedFlightId ? " selected" : ""}" data-flight-id="${flight.id}" style="left:${screen.x}px;top:${screen.y}px">
          <div class="num">${flight.flightNumber}</div>
          <div class="meta">${type.name} · DEP ${formatSimClock(flight.departureSim)}</div>
          <div class="meta">${remain < 0 ? "LATE" : "OUT"} ${formatCountdown(remain)}</div>
          <div class="task-row">${icons}</div>
        </div>
      `);
    }
    this.labels.innerHTML = bits.join("");
  }

  private renderRadial(
    sim: Simulation,
    project: (x: number, y: number, z: number) => { x: number; y: number } | null,
  ): void {
    const flight = sim.flights.find((f) => f.id === sim.selectedFlightId);
    if (!flight || flight.phase === "scheduled" || flight.phase === "departed") {
      this.radial.classList.add("hidden");
      this.radial.innerHTML = "";
      this.radialKey = "";
      return;
    }
    const anchor = this.terminalAnchor(flight.gateId);
    const screen = project(anchor.x, 0, anchor.z + 1.5);
    if (!screen) return;
    this.radial.classList.remove("hidden");
    this.radial.style.left = `${screen.x}px`;
    this.radial.style.top = `${screen.y + 110}px`;

    const assignable: ServiceId[] = [
      "deplane",
      "baggage_unload",
      "fuel",
      "cleaning",
      "baggage_load",
      "boarding",
      "pushback",
    ];
    const key = `${flight.id}:${assignable
      .map((id) => {
        const task = flight.tasks.find((t) => t.id === id);
        return `${id}:${task?.state}:${Math.floor((task?.progress ?? 0) * 8)}`;
      })
      .join("|")}`;
    if (key === this.radialKey) return;
    this.radialKey = key;

    this.radial.innerHTML = assignable
      .map((id) => {
        const task = flight.tasks.find((t) => t.id === id)!;
        const def = SERVICES[id];
        const disabled = task.state !== "available";
        const cls = task.state === "complete" ? "done" : task.state === "available" ? "ready" : "busy";
        const pct = task.state === "in_progress" ? ` ${Math.round(task.progress * 100)}%` : "";
        return `<button class="${cls}" data-service="${id}" ${disabled ? "disabled" : ""}>${def.shortLabel}${pct}</button>`;
      })
      .join("");

    this.radial.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const serviceId = button.getAttribute("data-service") as ServiceId;
        this.onAssign?.(flight.id, serviceId);
      });
    });
  }

  private renderFloats(): void {
    const now = performance.now();
    this.floats = this.floats.filter((item) => now - item.born < 2200);
    const layer = this.root.querySelector("#floats");
    if (!layer) return;
    layer.innerHTML = this.floats
      .map((item) => {
        const t = (now - item.born) / 2200;
        const y = item.y - t * 70;
        return `<div class="score-float ${item.kind}" style="left:${item.x}px;top:${y}px;opacity:${1 - t}">${item.text}</div>`;
      })
      .join("");
  }

  private setText(id: string, value: string): void {
    const el = this.root.querySelector(`#${id}`);
    if (el) el.textContent = value;
  }
}
