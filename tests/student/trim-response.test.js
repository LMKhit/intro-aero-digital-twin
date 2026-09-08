import { describe, expect, test } from "vitest";

import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimResponse,
  calculateTrimAngleRad,
  classifyDisturbance,
  degreesToRadians,
} from "../../src/student/physics/trim-response.js";

describe("Stage 4 trim response physics", () => {
  test("numerical case matches the completed reference calculation", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBeCloseTo(0.000066866712, 6);
    expect(result.trimAngleDeg).toBeCloseTo(2.864788976, 6);
    expect(result.deltaCm).toBeCloseTo(-0.02792526803, 6);
    expect(result.trimmed).toBe(false);
    expect(result.disturbanceTendency).toBe("restoring");
  });

  test("behavioral case doubles delta_Cm when the disturbance doubles", () => {
    const start = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    const changed = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 4.0,
    });

    expect(start.deltaCm).toBeCloseTo(-0.02792526803, 6);
    expect(changed.deltaCm).toBeCloseTo(-0.05585053606, 6);
    expect(Math.abs(changed.deltaCm)).toBeCloseTo(
      2 * Math.abs(start.deltaCm),
      6,
    );
    expect(Math.sign(start.deltaCm)).toBe(-1);
    expect(Math.sign(changed.deltaCm)).toBe(-1);
    expect(changed.disturbanceTendency).toBe("restoring");
  });

  test("boundary case with zero slope has no unique trim angle", () => {
    const result = calculateTrimResponse({
      cm0: 0.04,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0,
    });

    expect(result.cm).toBeCloseTo(0.04, 6);
    expect(result.trimAngleDeg).toBeNull();
    expect(result.deltaCm).toBeCloseTo(0, 6);
    expect(result.disturbanceTendency).toBe("neutral");
  });

  test("degree-to-radian conversion is used for the selected angle", () => {
    expect(degreesToRadians(2.86)).toBeCloseTo(
      0.04991641661,
      10,
    );
  });

  test("negative slope with positive disturbance gives negative delta_Cm", () => {
    const disturbanceRad = degreesToRadians(2);

    expect(calculateDeltaCm(-0.8, disturbanceRad)).toBeCloseTo(
      -0.02792526803,
      6,
    );

    expect(
      classifyDisturbance(
        disturbanceRad,
        calculateDeltaCm(-0.8, disturbanceRad),
      ),
    ).toBe("restoring");
  });

  test("positive slope with positive disturbance gives destabilizing tendency", () => {
    const disturbanceRad = degreesToRadians(2);
    const deltaCm = calculateDeltaCm(0.8, disturbanceRad);

    expect(deltaCm).toBeGreaterThan(0);
    expect(classifyDisturbance(disturbanceRad, deltaCm)).toBe(
      "destabilizing",
    );
  });

  test("zero slope gives zero change in Cm", () => {
    const alphaRad = degreesToRadians(2.86);
    const disturbanceRad = degreesToRadians(2);

    expect(calculateCm(0.04, 0, alphaRad)).toBeCloseTo(0.04, 6);
    expect(calculateDeltaCm(0, disturbanceRad)).toBe(0);
  });

  test("trim angle is unavailable when slope is zero", () => {
    expect(calculateTrimAngleRad(0.04, 0)).toBeNull();
  });

  test("trim status uses the specified 1e-6 tolerance", () => {
    const insideTolerance = calculateTrimResponse({
      cm0: 1e-6,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 0,
      disturbanceAlphaDeg: 0,
    });

    const outsideTolerance = calculateTrimResponse({
      cm0: 1.000001e-6,
      cmAlphaPerRad: 0,
      angleOfAttackDeg: 0,
      disturbanceAlphaDeg: 0,
    });

    expect(insideTolerance.trimmed).toBe(true);
    expect(outsideTolerance.trimmed).toBe(false);
  });

  test("invalid numeric inputs are rejected", () => {
    expect(() =>
      calculateTrimResponse({
        cm0: 0.04,
        cmAlphaPerRad: -0.8,
        angleOfAttackDeg: Number.NaN,
        disturbanceAlphaDeg: 2,
      }),
    ).toThrow(TypeError);

    expect(() =>
      calculateTrimResponse({
        cm0: 0.04,
        cmAlphaPerRad: Infinity,
        angleOfAttackDeg: 2.86,
        disturbanceAlphaDeg: 2,
      }),
    ).toThrow(TypeError);
  });
});