import { describe, expect, it } from "vitest";

import {
  analyzeTrimResponse,
  calculateDeltaCm,
  calculateTrimAngleDeg,
  calculateTrimAngleRad,
} from "../../src/student/physics/trim-response.js";

describe("trim-response physics", () => {
  it("matches the Section 8 numerical reference calculation", () => {
    const result = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2,
    });

    expect(result.cmAtAlpha).toBeCloseTo(0.000066866712, 10);
    expect(result.trimAngleRad).toBeCloseTo(0.05, 12);
    expect(result.trimAngleDeg).toBeCloseTo(2.864788976, 8);
    expect(result.deltaCm).toBeCloseTo(-0.02792526803, 10);
    expect(result.trimStatus).toBe("not trimmed");
    expect(result.disturbanceTendency).toBe("restoring");
  });

  it("produces a positive delta_Cm when the disturbance alpha is negative in the student behavioral case", () => {
    const deltaCm = calculateDeltaCm(-0.8, -2);

    expect(deltaCm).toBeGreaterThan(0);
  });

  it("handles zero-slope and zero-disturbance sanity conditions without division by zero", () => {
    expect(calculateTrimAngleRad(0.04, 0)).toBeNull();
    expect(calculateTrimAngleDeg(0.04, 0)).toBeNull();

    expect(calculateDeltaCm(0, 2)).toBe(0);
    expect(calculateDeltaCm(-0.8, 0)).toBe(0);

    const zeroSlopeResult = analyzeTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2,
    });

    expect(zeroSlopeResult.trimAngleDeg).toBeNull();
    expect(zeroSlopeResult.disturbanceTendency).toBe("neutral");
  });
});