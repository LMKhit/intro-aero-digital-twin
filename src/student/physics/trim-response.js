const DEG_TO_RAD = Math.PI / 180;
const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

/**
 * Convert an angle from degrees to radians.
 * Input: degrees. Output: radians.
 */
export function degreesToRadians(degrees) {
  return requireFiniteNumber(degrees, "degrees") * DEG_TO_RAD;
}

/**
 * Calculate Cm(alpha).
 * Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad, alphaRad rad.
 * Output: dimensionless pitching-moment coefficient.
 * Sign convention: positive Cm and positive alpha are nose-up.
 */
export function calculateCm(cm0, cmAlphaPerRad, alphaRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(alphaRad, "alphaRad");

  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Calculate trim angle.
 * Inputs: cm0 dimensionless, cmAlphaPerRad 1/rad.
 * Output: radians, or null when no unique trim angle exists.
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
 * Calculate the disturbance-induced change in Cm.
 * Inputs: cmAlphaPerRad 1/rad, disturbanceAlphaRad rad.
 * Output: dimensionless delta_Cm.
 */
export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaRad) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(disturbanceAlphaRad, "disturbanceAlphaRad");

  return cmAlphaPerRad * disturbanceAlphaRad;
}

/**
 * Classify the disturbance using the sign of
 * delta_alpha_rad * delta_Cm.
 */
export function classifyDisturbance(disturbanceAlphaRad, deltaCm) {
  requireFiniteNumber(disturbanceAlphaRad, "disturbanceAlphaRad");
  requireFiniteNumber(deltaCm, "deltaCm");

  const product = disturbanceAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

/**
 * Determine whether the selected condition is trimmed.
 * Output: Boolean.
 */
export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

/**
 * Calculate all Stage 4 outputs from the canonical aircraft inputs.
 */
export function calculateTrimResponse({
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg,
  disturbanceAlphaDeg,
}) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  requireFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");
  requireFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  const cm = calculateCm(cm0, cmAlphaPerRad, alphaRad);
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);
  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaRad,
  );

  return {
    cm,
    trimAngleRad,
    trimAngleDeg:
      trimAngleRad === null
        ? null
        : trimAngleRad / DEG_TO_RAD,
    deltaCm,
    trimmed: isTrimmed(cm),
    disturbanceTendency: classifyDisturbance(
      disturbanceAlphaRad,
      deltaCm,
    ),
  };
}

export { TRIM_TOLERANCE };