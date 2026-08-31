import { SimClock } from "../src/sim/clock";

describe("SimClock", () => {
  it("advances by real time * timeScale * speed", () => {
    const clock = new SimClock(15, 100);
    expect(clock.advance(1)).toBe(15);
    expect(clock.time).toBe(115);
  });

  it("does not advance while paused", () => {
    const clock = new SimClock(15, 0);
    clock.setSpeed(0);
    expect(clock.paused).toBe(true);
    expect(clock.advance(2)).toBe(0);
    expect(clock.time).toBe(0);
  });

  it("supports 2x speed", () => {
    const clock = new SimClock(10, 0);
    clock.setSpeed(2);
    expect(clock.advance(1)).toBe(20);
  });
});
