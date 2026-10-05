import type { ResultProjection, PlanProjection } from "../src/model";
export const resultPlan: PlanProjection = {
  identity: "plan:exact",
  modelDigest: "model:accepted",
  modelRevision: 0,
  selectedModelDigest: "model:accepted",
  matchesSelectedModel: true,
  geometryDigest: null,
  meshDigest: null,
  solverBackend: "reference",
  solverBackendVersion: "1",
  metadata: {},
};
export const resultFixture: ResultProjection = {
  version: 1,
  identity: "result:exact",
  planIdentity: "plan:exact",
  modelDigest: "model:accepted",
  interpretation:
    "Mathematical components; no peak/RMS, power or probability is inferred.",
  phaseConvention:
    "Principal argument in radians, undefined at exact zero. No threshold or unwrapping.",
  modal:
    "Modal Result projections are unavailable; no normalization or phase reference is inferred.",
  observations: [
    {
      id: "response-id",
      names: ["response"],
      valueType: "complex<V>",
      shape: [],
      components: [
        {
          index: 0,
          real: { value: 3, unit: "V" },
          imaginary: { value: 4, unit: "V" },
          magnitude: { value: 5, unit: "V" },
          squaredMagnitude: { value: 25, unit: "V²" },
          phase: { value: 0.9272952180016122, unit: "rad" },
        },
      ],
    },
    {
      id: "zero-id",
      names: ["zero"],
      valueType: "complex<V>",
      shape: [],
      components: [
        {
          index: 0,
          real: { value: 0, unit: "V" },
          imaginary: { value: 0, unit: "V" },
          magnitude: { value: 0, unit: "V" },
          squaredMagnitude: { value: 0, unit: "V²" },
          phase: { undefined: "Phase is undefined at zero magnitude" },
        },
      ],
    },
    {
      id: "field-id",
      names: ["field"],
      unsupported: "Observation requires explicit spatial sampling coordinates",
    },
  ],
};
