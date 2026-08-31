import type { SpeedSetting } from "./types";

export class SimClock {
  time = 0;
  speed: SpeedSetting = 1;
  timeScale: number;

  constructor(timeScale: number, startTime = 0) {
    this.timeScale = timeScale;
    this.time = startTime;
  }

  get paused(): boolean {
    return this.speed === 0;
  }

  setSpeed(speed: SpeedSetting): void {
    this.speed = speed;
  }

  advance(realDt: number): number {
    if (this.speed === 0 || realDt <= 0) return 0;
    const simDt = realDt * this.timeScale * this.speed;
    this.time += simDt;
    return simDt;
  }
}
