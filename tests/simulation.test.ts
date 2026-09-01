import { MORNING_BANK } from "../src/data/scenario";
import { Simulation, autoAssignAvailable } from "../src/sim/simulation";
import type { Scenario, ServiceId } from "../src/sim/types";

function compactScenario(): Scenario {
  return {
    ...MORNING_BANK,
    id: "test-bank",
    timeScale: 1,
    startSim: 0,
    endSim: 4000,
    flights: [
      {
        id: "f1",
        flightNumber: "RG 1",
        airlineId: "ridge",
        aircraftTypeId: "rj70",
        gateId: "g1",
        arrivalSim: 5,
        departureSim: 2000,
      },
      {
        id: "f2",
        flightNumber: "HP 2",
        airlineId: "horizon",
        aircraftTypeId: "nb320",
        gateId: "g2",
        arrivalSim: 8,
        departureSim: 3500,
      },
    ],
  };
}

function tickFor(sim: Simulation, seconds: number, step = 0.25, auto = false): void {
  const ticks = Math.ceil(seconds / step);
  for (let i = 0; i < ticks; i += 1) {
    if (auto) autoAssignAvailable(sim);
    sim.tick(step);
  }
}

function run(sim: Simulation, seconds: number, step = 0.25): void {
  tickFor(sim, seconds, step, true);
}

function taskState(sim: Simulation, flightId: string, serviceId: ServiceId) {
  return sim.flights.find((f) => f.id === flightId)?.tasks.find((t) => t.id === serviceId)?.state;
}

describe("simulation turnaround", () => {
  it("parks an inbound aircraft and unlocks on-block services", () => {
    const sim = new Simulation(compactScenario());
    run(sim, 160);
    const flight = sim.flights[0];
    expect(flight.phase).toBe("on_blocks");
    expect(taskState(sim, "f1", "fuel")).toBe("available");
    expect(taskState(sim, "f1", "baggage_unload")).toBe("available");
    expect(taskState(sim, "f1", "cleaning")).toBe("locked");
  });

  it("keeps cleaning locked until deplane finishes", () => {
    const sim = new Simulation(compactScenario());
    tickFor(sim, 160);
    expect(sim.assignService("f1", "cleaning").ok).toBe(false);
    expect(sim.assignService("f1", "fuel").ok).toBe(true);
  });

  it("does not let one fuel truck service two aircraft at once", () => {
    const sim = new Simulation(compactScenario());
    tickFor(sim, 180);
    expect(sim.assignService("f1", "fuel").ok).toBe(true);
    const second = sim.assignService("f2", "fuel");
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/Fuel Truck/i);
  });


  it("requires the player to start deplane and boarding", () => {
    const sim = new Simulation(compactScenario());
    tickFor(sim, 160);
    // jet bridge is automatic; deplane waits for the player
    tickFor(sim, 120);
    expect(taskState(sim, "f1", "deplane")).toBe("available");
    expect(sim.assignService("f1", "deplane").ok).toBe(true);
    expect(taskState(sim, "f1", "deplane")).toBe("assigned");
  });

  it("completes a full turnaround when resources are assigned", () => {
    const sim = new Simulation(compactScenario());
    run(sim, 4000);
    expect(sim.flights[0].phase).toBe("departed");
    expect(sim.flights[1].phase).toBe("departed");
    expect(sim.score).toBeGreaterThan(0);
    expect(sim.onTimeCount).toBeGreaterThan(0);
  });

  it("holds the second arrival when its gate is still occupied", () => {
    const scenario = compactScenario();
    scenario.flights[1] = {
      ...scenario.flights[1],
      id: "f2",
      gateId: "g1",
      arrivalSim: 20,
      departureSim: 2000,
    };
    const sim = new Simulation(scenario);
    run(sim, 120);
    expect(sim.flights[0].phase).toBe("on_blocks");
    expect(sim.flights[1].holdShort || sim.flights[1].phase === "taxiing").toBe(true);
    expect(sim.gates.find((g) => g.id === "g1")?.occupiedBy).toBe("f1");
  });

  it("pauses the simulation clock", () => {
    const sim = new Simulation(compactScenario());
    run(sim, 40);
    const time = sim.clock.time;
    sim.setSpeed(0);
    sim.tick(2);
    expect(sim.clock.time).toBe(time);
  });
});
