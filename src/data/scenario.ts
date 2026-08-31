import type { Scenario } from "../sim/types";

const clock = (hours: number, minutes: number) => hours * 3600 + minutes * 60;

export const MORNING_BANK: Scenario = {
  id: "rdg-morning-bank",
  name: "Ridgefield Morning Bank",
  airportName: "Ridgefield Municipal",
  airportCode: "RDG",
  startSim: clock(6, 0),
  endSim: clock(7, 25),
  timeScale: 18,
  targetScore: 7200,
  flights: [
    {
      id: "f1",
      flightNumber: "RG 214",
      airlineId: "ridge",
      aircraftTypeId: "rj70",
      gateId: "g1",
      arrivalSim: clock(6, 1),
      departureSim: clock(6, 27),
    },
    {
      id: "f2",
      flightNumber: "HP 441",
      airlineId: "horizon",
      aircraftTypeId: "nb320",
      gateId: "g2",
      arrivalSim: clock(6, 6),
      departureSim: clock(6, 46),
    },
    {
      id: "f3",
      flightNumber: "SF 118",
      airlineId: "swift",
      aircraftTypeId: "rj70",
      gateId: "g1",
      arrivalSim: clock(6, 31),
      departureSim: clock(6, 54),
    },
    {
      id: "f4",
      flightNumber: "HP 508",
      airlineId: "horizon",
      aircraftTypeId: "nb320",
      gateId: "g2",
      arrivalSim: clock(6, 50),
      departureSim: clock(7, 28),
    },
    {
      id: "f5",
      flightNumber: "RG 271",
      airlineId: "ridge",
      aircraftTypeId: "rj70",
      gateId: "g1",
      arrivalSim: clock(6, 58),
      departureSim: clock(7, 24),
    },
  ],
};

export function formatSimClock(simSeconds: number): string {
  const wrapped = ((simSeconds % 86400) + 86400) % 86400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatCountdown(remaining: number): string {
  const sign = remaining < 0 ? "+" : "";
  const abs = Math.abs(remaining);
  const minutes = Math.floor(abs / 60);
  const seconds = Math.floor(abs % 60);
  return `${sign}${minutes}:${String(seconds).padStart(2, "0")}`;
}
