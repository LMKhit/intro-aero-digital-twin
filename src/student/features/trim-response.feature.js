import {
  calculateCm,
  calculateDeltaCm,
  calculateTrimResponse,
} from "../physics/trim-response.js";

function requireStage3(capabilityMap) {
  const source = capabilityMap?.["loads.pitch.component-sum"];
  if (!source || !(source.version >= 1)) {
    throw new TypeError(
      "Stage 3 loads.pitch.component-sum capability v1 is required.",
    );
  }
  return source;
}

function calculateOutputs(aircraft) {
  return calculateTrimResponse(aircraft);
}

function buildResults(output) {
  return [
    {
      label: "Pitching-moment coefficient, Cm(alpha)",
      value: output.cm,
      unit: "",
      precision: 6,
      emphasis: true,
    },
    {
      label: "Trim angle",
      value:
        output.trimAngleDeg === null
          ? "not available"
          : output.trimAngleDeg,
      unit: output.trimAngleDeg === null ? "" : "deg",
      precision: 6,
      emphasis: false,
    },
    {
      label: "Disturbance moment-coefficient change, delta_Cm",
      value: output.deltaCm,
      unit: "",
      precision: 6,
      emphasis: false,
    },
    {
      label: "Selected condition",
      value: output.trimmed ? "trimmed" : "not trimmed",
      unit: "",
      precision: 0,
      emphasis: false,
    },
    {
      label: "Disturbance tendency",
      value: output.disturbanceTendency,
      unit: "",
      precision: 0,
      emphasis: false,
    },
  ];
}

function buildRuntimeValues(output) {
  return {
    cm: output.cm,
    trimAngleDeg:
      output.trimAngleDeg === null
        ? "not available"
        : output.trimAngleDeg,
    deltaCm: output.deltaCm,
    trimmed: output.trimmed,
    disturbanceTendency: output.disturbanceTendency,
  };
}

function buildVerificationCases() {
  const numericalAircraft = {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  };

  const numerical = calculateTrimResponse(numericalAircraft);

  const numericalComparison =
    Math.abs(numerical.cm - 0.000066866712) <= 1e-6 &&
    Math.abs(numerical.trimAngleDeg - 2.864788976) <= 1e-6 &&
    Math.abs(numerical.deltaCm - -0.02792526803) <= 1e-6 &&
    numerical.trimmed === false &&
    numerical.disturbanceTendency === "restoring";

  const behavioralStart = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  });

  const behavioralChanged = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 4.0,
  });

  const behavioralComparison =
    Math.abs(behavioralStart.deltaCm - -0.02792526803) <= 1e-6 &&
    Math.abs(behavioralChanged.deltaCm - -0.05585053606) <= 1e-6 &&
    Math.abs(
      Math.abs(behavioralChanged.deltaCm) -
        2 * Math.abs(behavioralStart.deltaCm),
    ) <= 1e-6 &&
    Math.sign(behavioralStart.deltaCm) === -1 &&
    Math.sign(behavioralChanged.deltaCm) === -1 &&
    behavioralChanged.disturbanceTendency === "restoring";

  const boundary = calculateTrimResponse({
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  });

  const boundaryComparison =
    Math.abs(boundary.cm - 0.04) <= 1e-6 &&
    boundary.trimAngleDeg === null &&
    Math.abs(boundary.deltaCm) <= 1e-6 &&
    boundary.disturbanceTendency === "neutral";

  return [
    {
      label: "Numerical case",
      passed: numericalComparison,
    },
    {
      label: "Behavioral case",
      passed: behavioralComparison,
    },
    {
      label: "Boundary or sanity case",
      passed: boundaryComparison,
    },
  ];
}

function buildDecision(output) {
  let interpretation;

  if (output.trimmed && output.disturbanceTendency === "restoring") {
    interpretation =
      "The selected condition is trimmed under the simplified linear Cm-alpha model, and the specified disturbance has a restoring tendency.";
  } else if (
    output.trimmed &&
    output.disturbanceTendency === "destabilizing"
  ) {
    interpretation =
      "The selected condition is trimmed under the simplified linear Cm-alpha model, but the specified disturbance has a destabilizing tendency.";
  } else if (
    output.trimmed &&
    output.disturbanceTendency === "neutral"
  ) {
    interpretation =
      "The selected condition is trimmed under the simplified linear Cm-alpha model, and the specified disturbance is neutral.";
  } else if (
    !output.trimmed &&
    output.disturbanceTendency === "restoring"
  ) {
    interpretation =
      "The selected condition is not trimmed under the simplified linear Cm-alpha model, but the specified disturbance has a restoring tendency.";
  } else if (
    !output.trimmed &&
    output.disturbanceTendency === "destabilizing"
  ) {
    interpretation =
      "The selected condition is not trimmed under the simplified linear Cm-alpha model, and the specified disturbance has a destabilizing tendency.";
  } else {
    interpretation =
      "The selected condition is not trimmed under the simplified linear Cm-alpha model, and the specified disturbance is neutral.";
  }

  let status;

  if (output.trimmed && output.disturbanceTendency === "restoring") {
    status = "pass";
  } else if (output.disturbanceTendency === "neutral") {
    status = "neutral";
  } else {
    status = "caution";
  }

  return {
    question:
      "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
    interpretation,
    status,
  };
}

function buildCmAlphaPlot(aircraft) {
  const startDeg = -10;
  const endDeg = 10;
  const stepDeg = 1;
  const points = [];

  for (
    let angleDeg = startDeg;
    angleDeg <= endDeg;
    angleDeg += stepDeg
  ) {
    points.push({
      x: angleDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        (angleDeg * Math.PI) / 180,
      ),
    });
  }

  if (
    aircraft.angleOfAttackDeg >= startDeg &&
    aircraft.angleOfAttackDeg <= endDeg &&
    !points.some((point) => point.x === aircraft.angleOfAttackDeg)
  ) {
    points.push({
      x: aircraft.angleOfAttackDeg,
      y: calculateCm(
        aircraft.cm0,
        aircraft.cmAlphaPerRad,
        (aircraft.angleOfAttackDeg * Math.PI) / 180,
      ),
    });
  }

  points.sort((a, b) => a.x - b.x);

  return {
    id: "cm-alpha",
    title: "Cm–alpha relationship",
    xLabel: "Angle of attack (deg)",
    yLabel: "Pitching-moment coefficient, Cm",
    currentX: aircraft.angleOfAttackDeg,
    series: [{ label: "Cm(alpha)", points }],
    regions: [],
    referenceLines: [{ axis: "y", value: 0, label: "Cm = 0" }],
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates trim and small-disturbance pitching-moment tendency using the simplified linear Cm-alpha model.",
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
    { id: "loads.pitch.component-sum", version: 1 },
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],
  assumptions: [
    "The Cm-alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
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
    requireStage3(capabilityContext);

    const output = calculateOutputs(aircraft);

    return {
      results: buildResults(output),
      verificationCases: buildVerificationCases(),
      decision: buildDecision(output),
      plots: [buildCmAlphaPlot(aircraft)],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    requireStage3(runtimeContext.capabilities);

    const output = calculateOutputs(runtimeContext.aircraft);

    return {
      values: buildRuntimeValues(output),
    };
  },
};