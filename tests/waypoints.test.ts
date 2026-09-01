import { AIRCRAFT } from "../src/data/catalog";
import { GATES, jetBridgeLayout, rotateOffset, serviceWorldPoint } from "../src/data/waypoints";

describe("serviceWorldPoint", () => {
  it("places L1 on the port side when the aircraft faces the terminal", () => {
    const gate = GATES[0];
    const l1 = serviceWorldPoint(gate.stand, gate.heading, AIRCRAFT.rj70.serviceOffsets.l1);

    expect(l1.x).toBeLessThan(gate.stand.x);
    expect(l1.z).toBeLessThan(gate.stand.z);
  });

  it("places L1 near the forward cockpit on the port side", () => {
    const gate = GATES[0];
    const l1 = serviceWorldPoint(gate.stand, gate.heading, AIRCRAFT.rj70.serviceOffsets.l1);
    const nose = serviceWorldPoint(gate.stand, gate.heading, AIRCRAFT.rj70.serviceOffsets.nose);

    expect(l1.x).toBeLessThan(gate.stand.x);
    expect(l1.z).toBeGreaterThan(nose.z);
    expect(l1.z).toBeLessThan(gate.stand.z);
  });

  it("rotates port offsets to the left of the nose direction", () => {
    const port = rotateOffset({ x: -3, z: 0 }, Math.PI / 2);
    expect(port.x).toBeCloseTo(0);
    expect(port.z).toBeCloseTo(-3);
  });
});

describe("jetBridgeLayout", () => {
  it("lands the bridge tip on L1 when fully extended", () => {
    const gate = GATES[0];
    const l1 = serviceWorldPoint(gate.stand, gate.heading, AIRCRAFT.rj70.serviceOffsets.l1);
    const { tip } = jetBridgeLayout(gate, l1, 1);
    expect(tip.x).toBeCloseTo(l1.x);
    expect(tip.z).toBeCloseTo(l1.z);
  });
});
