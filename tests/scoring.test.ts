import { AIRLINES } from "../src/data/catalog";
import { rateShift, scoreTurnaround } from "../src/sim/scoring";
import type { Flight } from "../src/sim/types";

function flight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: "f1",
    flightNumber: "RG 214",
    airlineId: "ridge",
    aircraftTypeId: "rj70",
    gateId: "g1",
    arrivalSim: 6 * 3600,
    departureSim: 6 * 3600 + 26 * 60,
    phase: "departed",
    position: { x: 0, z: 0 },
    heading: 0,
    path: [],
    pathIndex: 0,
    speed: 0,
    beaconOn: false,
    enginesOn: false,
    chocksOn: false,
    tasks: [],
    holdShort: false,
    departedAt: null,
    scoreAwarded: false,
    ...overrides,
  };
}

describe("turnaround scoring", () => {
  it("rewards on-time and perfect turns", () => {
    const result = scoreTurnaround(flight(), AIRLINES.ridge, 6 * 3600 + 20 * 60, 0);
    expect(result.onTime).toBe(true);
    expect(result.perfect).toBe(true);
    expect(result.total).toBeGreaterThan(2000);
    expect(result.popups.some((p) => p.label === "PERFECT TURN")).toBe(true);
  });

  it("penalizes late departures and breaks the streak", () => {
    const result = scoreTurnaround(flight(), AIRLINES.swift, 6 * 3600 + 40 * 60, 3);
    expect(result.onTime).toBe(false);
    expect(result.streak).toBe(0);
    expect(result.total).toBeLessThan(1000);
  });

  it("awards streak bonuses from the second on-time flight", () => {
    const result = scoreTurnaround(flight(), AIRLINES.ridge, 6 * 3600 + 25 * 60, 1);
    expect(result.streak).toBe(2);
    expect(result.popups.some((p) => p.label.includes("STREAK"))).toBe(true);
  });
});

describe("shift stars", () => {
  it("requires all flights for one star", () => {
    expect(rateShift(5, 4, 4, 9000, 7200).stars).toBe(0);
    expect(rateShift(5, 5, 3, 4000, 7200).stars).toBe(1);
  });

  it("requires 80% OTP for two stars and 95% plus score for three", () => {
    expect(rateShift(5, 5, 4, 4000, 7200).stars).toBe(2);
    expect(rateShift(5, 5, 5, 4000, 7200).stars).toBe(2);
    expect(rateShift(5, 5, 5, 8000, 7200).stars).toBe(3);
  });
});
