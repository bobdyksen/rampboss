import type { Airline, Flight, ScorePopup, ShiftResult } from "./types";

export const SCORE = {
  base: 1000,
  onTime: 500,
  early: 250,
  perfect: 750,
  latePenalty: 350,
};

export interface TurnScore {
  total: number;
  popups: ScorePopup[];
  onTime: boolean;
  early: boolean;
  perfect: boolean;
  lateBy: number;
  streak: number;
}

export function rateSchedule(remainingToDeparture: number, turnTarget: number): "green" | "yellow" | "orange" | "red" {
  if (remainingToDeparture < 0) return "red";
  const ratio = remainingToDeparture / Math.max(1, turnTarget);
  if (ratio > 0.45) return "green";
  if (ratio > 0.22) return "yellow";
  return "orange";
}

export function scoreTurnaround(
  flight: Flight,
  airline: Airline,
  departedAt: number,
  streakBefore: number,
): TurnScore {
  const lateBy = departedAt - flight.departureSim;
  const turnTarget = flight.departureSim - flight.arrivalSim;
  const early = lateBy <= -90;
  const onTime = lateBy <= 0;
  const slack = flight.departureSim - departedAt;
  const perfect = onTime && slack >= turnTarget * 0.18;

  const popups: ScorePopup[] = [];
  let total = 0;
  const payout = airline.payoutMultiplier;

  const add = (label: string, amount: number, kind: ScorePopup["kind"]) => {
    const rounded = Math.round(amount);
    total += rounded;
    popups.push({ flightId: flight.id, label, amount: rounded, kind });
  };

  add("TURNAROUND", SCORE.base * payout, "base");

  if (onTime) {
    add("ON TIME", SCORE.onTime * payout, "bonus");
    if (early) add("EARLY DEPARTURE", SCORE.early * payout, "bonus");
    if (perfect) add("PERFECT TURN", SCORE.perfect * payout, "bonus");
  } else {
    const minutesLate = Math.ceil(lateBy / 60);
    add(
      `${minutesLate} MIN LATE`,
      -SCORE.latePenalty * airline.delayPenalty * Math.min(4, minutesLate),
      "late",
    );
  }

  const streak = onTime ? streakBefore + 1 : 0;
  if (streak >= 2) {
    const bonus = Math.round(180 * streak * payout);
    add(`ON-TIME STREAK ×${streak}`, bonus, "streak");
  }

  return { total, popups, onTime, early, perfect, lateBy, streak };
}

export function rateShift(
  flightsScheduled: number,
  flightsTurned: number,
  onTime: number,
  score: number,
  targetScore: number,
): ShiftResult {
  const otp = flightsTurned === 0 ? 0 : onTime / flightsTurned;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (flightsTurned >= flightsScheduled) stars = 1;
  if (stars >= 1 && otp >= 0.8) stars = 2;
  if (stars >= 2 && otp >= 0.95 && score >= targetScore) stars = 3;

  return {
    completed: flightsTurned >= flightsScheduled,
    flightsTurned,
    flightsScheduled,
    onTime,
    otp,
    score,
    bestStreak: 0,
    perfectTurns: 0,
    stars,
  };
}
