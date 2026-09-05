import {
  analyzeTrimResponse,
  calculateCmAtAlpha,
  calculateDeltaCm,
} from "../physics/trim-response.js";

const REQUIRED_CAPABILITY = {
  id: "loads.pitch.component-sum",
  version: 1,
};

function hasRequiredCapability(capabilities) {
  if (!capabilities) {
    return false;
  }

  const available =
    Array.isArray(capabilities)
      ? capabilities
      : Object.values(capabilities);

  return available.some(
    (capability) =>
      capability &&
      capability.id === REQUIRED_CAPABILITY.id &&
      capability.version >= REQUIRED_CAPABILITY.version,
  );
}

function getCapabilities(capabilityContext) {
  if (!capabilityContext) {
    return null;
  }

  return capabilityContext.capabilities ?? capabilityContext;
}

function buildPlotPoints(aircraft) {
  const selectedAngle = aircraft.angleOfAttackDeg;
  const angles = [];

  for (let angle = -10; angle <= 10; angle += 1) {
    angles.push(angle);
  }

  if (
    Number.isFinite(selectedAngle) &&
    selectedAngle >= -10 &&
    selectedAngle <= 10 &&
    !angles.includes(selectedAngle)
  ) {
    angles.push(selectedAngle);
  }

  angles.sort((a, b) => a - b);

  return angles.map((angleOfAttackDeg) => ({
    x: angleOfAttackDeg,
    y: calculateCmAtAlpha(
      aircraft.cm0,
      aircraft.cmAlphaPerRad,
      angleOfAttackDeg,
    ),
  }));
}

function buildInterpretation(analysis) {
  const trimText =
    analysis.trimStatus === "trimmed"
      ? "The selected condition satisfies the specified trim tolerance."
      : "The selected condition does not satisfy the specified trim tolerance.";

  const tendencyText =
    analysis.disturbanceTendency === "restoring"
      ? "The specified disturbance creates a restoring moment tendency in this linear, quasi-static model."
      : analysis.disturbanceTendency === "destabilizing"
        ? "The specified disturbance creates a destabilizing moment tendency in this linear, quasi-static model."
        : "The specified disturbance produces a neutral tendency in this linear, quasi-static model.";

  return `${trimText} ${tendencyText} This result does not establish safety, controllability, flightworthiness, or time-response behavior.`;
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates selected-condition pitching moment, trim, and the quasi-static tendency caused by a small angle-of-attack disturbance.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use the linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "The model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    if (!hasRequiredCapability(getCapabilities(capabilityContext))) {
      throw new Error(
        "Required capability loads.pitch.component-sum version 1 is not available.",
      );
    }

    const analysis = analyzeTrimResponse(aircraft);

    const numericalDeltaCm = -0.02792526803;
    const numericalTolerance = 1e-10;

    const behavioralDeltaCm = calculateDeltaCm(
      -0.8,
      -2,
    );

    const zeroSlopeDeltaCm = calculateDeltaCm(0, 2);
    const zeroDisturbanceDeltaCm = calculateDeltaCm(-0.8, 0);

    return {
      results: [
        {
          label: "Cm(alpha)",
          value: analysis.cmAtAlpha,
          unit: "",
          precision: 8,
          emphasis: true,
        },
        {
          label: "Trim angle",
          value:
            analysis.trimAngleDeg === null
              ? "not available"
              : analysis.trimAngleDeg,
          unit: analysis.trimAngleDeg === null ? "" : "deg",
          precision: 6,
        },
        {
          label: "delta_Cm",
          value: analysis.deltaCm,
          unit: "",
          precision: 8,
        },
        {
          label: "Selected condition",
          value: analysis.trimStatus,
          unit: "",
        },
        {
          label: "Disturbance tendency",
          value: analysis.disturbanceTendency,
          unit: "",
        },
      ],
      verificationCases: [
        {
          name: "Numerical case",
          description:
            "Uses the Section 8 reference disturbance response.",
          passed:
            Math.abs(
              calculateDeltaCm(-0.8, 2) - numericalDeltaCm,
            ) <= numericalTolerance,
        },
        {
          name: "Behavioral case",
          description:
            "A negative disturbance angle with a negative Cm_alpha produces a positive delta_Cm.",
          passed: behavioralDeltaCm > 0,
        },
        {
          name: "Boundary or sanity case",
          description:
            "Zero slope and zero disturbance produce zero delta_Cm without division by zero.",
          passed:
            zeroSlopeDeltaCm === 0 &&
            zeroDisturbanceDeltaCm === 0,
        },
      ],
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation: buildInterpretation(analysis),
        status:
          analysis.disturbanceTendency === "restoring"
            ? "pass"
            : analysis.disturbanceTendency === "destabilizing"
              ? "caution"
              : "neutral",
      },
      plots: [
        {
          title: "Cm–alpha relationship",
          xAxis: {
            label: "Angle of attack",
            unit: "deg",
          },
          yAxis: {
            label: "Pitching-moment coefficient",
            unit: "",
          },
          series: [
            {
              label: "Cm(alpha)",
              points: buildPlotPoints(aircraft),
            },
          ],
          regions: [],
          referenceLines: [
            {
              axis: "y",
              value: 0,
              label: "Cm = 0 trim line",
            },
          ],
        },
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",
  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft;

    if (!aircraft || typeof aircraft !== "object") {
      throw new TypeError(
        "runtimeContext.aircraft must contain the canonical aircraft inputs.",
      );
    }

    const analysis = analyzeTrimResponse(aircraft);

    return {
      values: {
        cmAtAlpha: analysis.cmAtAlpha,
        trimAngleRad: analysis.trimAngleRad,
        trimAngleDeg: analysis.trimAngleDeg,
        deltaCm: analysis.deltaCm,
      },
    };
  },
};