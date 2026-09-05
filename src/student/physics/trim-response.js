const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }

  return value;
}

/**
 * Convert an angle from degrees to radians.
 * Input unit: deg. Output unit: rad.
 */
export function degreesToRadians(angleDeg) {
  return requireFiniteNumber(angleDeg, "angleDeg") * DEG_TO_RAD;
}

/**
 * Convert an angle from radians to degrees.
 * Input unit: rad. Output unit: deg.
 */
export function radiansToDegrees(angleRad) {
  return requireFiniteNumber(angleRad, "angleRad") * RAD_TO_DEG;
}

/**
 * Calculate Cm(alpha).
 * cm0 is dimensionless; cmAlphaPerRad is 1/rad; angleOfAttackDeg is deg.
 * Positive pitching moment and angle of attack are nose-up.
 */
export function calculateCmAtAlpha(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Calculate the unique trim angle.
 * Returns null when cmAlphaPerRad is zero because no unique trim angle exists.
 */
export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

/**
 * Calculate the unique trim angle in degrees.
 * Returns null when no unique trim angle exists.
 */
export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  return trimAngleRad === null ? null : radiansToDegrees(trimAngleRad);
}

/**
 * Calculate the disturbance change in pitching-moment coefficient.
 * disturbanceAlphaDeg is converted to radians because the slope is per radian.
 */
export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Classify the selected condition using the specified trim tolerance.
 */
export function classifyTrim(cmAtAlpha) {
  requireFiniteNumber(cmAtAlpha, "cmAtAlpha");

  return Math.abs(cmAtAlpha) <= TRIM_TOLERANCE ? "trimmed" : "not trimmed";
}

/**
 * Classify the disturbance using sign(deltaAlphaRad * deltaCm).
 */
export function classifyDisturbanceTendency(
  disturbanceAlphaDeg,
  deltaCm,
) {
  requireFiniteNumber(deltaCm, "deltaCm");

  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const tendencyProduct = deltaAlphaRad * deltaCm;

  if (tendencyProduct < 0) {
    return "restoring";
  }

  if (tendencyProduct > 0) {
    return "destabilizing";
  }

  return "neutral";
}

/**
 * Calculate all Stage 4 engineering quantities from the canonical aircraft inputs.
 * The model is linear and quasi-static; it does not represent a time response.
 */
export function analyzeTrimResponse(aircraft) {
  if (!aircraft || typeof aircraft !== "object") {
    throw new TypeError("aircraft must be an object.");
  }

  const {
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
    disturbanceAlphaDeg,
  } = aircraft;

  const cmAtAlpha = calculateCmAtAlpha(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg,
  );

  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  const trimAngleDeg =
    trimAngleRad === null ? null : radiansToDegrees(trimAngleRad);

  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg,
  );

  return {
    cmAtAlpha,
    trimAngleRad,
    trimAngleDeg,
    deltaCm,
    trimStatus: classifyTrim(cmAtAlpha),
    disturbanceTendency: classifyDisturbanceTendency(
      disturbanceAlphaDeg,
      deltaCm,
    ),
  };
}

export const TRIM_RESPONSE_TOLERANCE = TRIM_TOLERANCE;