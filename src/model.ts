/** Presentation-only values provided by Eqiora's versioned inspection endpoint. */
export interface Position {
  line: number;
  character: number;
}
export interface Location {
  uri: string;
  range: { start: Position; end: Position };
}
export interface ModelNode {
  id: string;
  kind: string;
  names: string[];
  locations: Location[];
  valueType: string | null;
  boundary: boolean;
  details: string;
}
export interface ModelEdge {
  from: string;
  to: string;
  kind: string;
}
export interface Equation {
  relation: string;
  index: number;
  latex: string;
  plain: string;
  speech: string;
  fallback: boolean;
  references: string[];
}
export interface PlanProjection {
  identity: string;
  modelDigest: string;
  modelRevision: number;
  selectedModelDigest: string;
  matchesSelectedModel: boolean;
  geometryDigest: string | null;
  meshDigest: string | null;
  solverBackend: string;
  solverBackendVersion: string;
  metadata: Record<string, unknown>;
}
export type ProjectionValue =
  | { value: number; unit: string }
  | { undefined: string }
  | { unavailable: string };
export interface ResultComponent {
  index: number;
  real: ProjectionValue;
  imaginary: ProjectionValue;
  magnitude: ProjectionValue;
  squaredMagnitude: ProjectionValue;
  phase: ProjectionValue;
}
export interface ResultObservation {
  id: string;
  names: string[];
  valueType?: string;
  shape?: number[];
  components?: ResultComponent[];
  unsupported?: string;
}
export interface ResultProjection {
  version: 1;
  identity: string;
  planIdentity: string;
  modelDigest: string;
  observations: ResultObservation[];
  interpretation: string;
  phaseConvention: string;
  modal: string;
}
export interface Inspection {
  version: number;
  models: string[];
  model: string | null;
  nodes: ModelNode[];
  edges: ModelEdge[];
  equations: Equation[];
  fingerprint: string | null;
  plan?: PlanProjection | null;
  result?: ResultProjection | null;
  errors: string[];
}
export type Page =
  "equations" | "connections" | "boundaries" | "plan" | "changes";
export interface Baseline {
  uri: string;
  model: string;
  fingerprint: string;
  captured: string;
  equations: string[];
}
export interface ViewState {
  page: Page;
  title: string;
  uri: string;
  inspection?: Inspection;
  message?: string;
  baseline?: Baseline;
  plan?: { name: string };
  result?: { name: string };
  fontSize: number;
}
export const nodeName = (node: ModelNode): string =>
  node.names.join(" / ") || `${node.kind} ${node.id.slice(-6)}`;
export function comparison(
  current: Inspection,
  baseline: Baseline | undefined,
  uri: string,
): string {
  if (!baseline)
    return "Capture a baseline to compare this model after editing.";
  if (baseline.uri !== uri || baseline.model !== current.model)
    return "Select the same document and model as the baseline.";
  if (!current.fingerprint)
    return "Structural comparison is unavailable for this model. No equivalence claim can be made.";
  return current.fingerprint === baseline.fingerprint
    ? "The compiler reports the same structural meaning within its supported comparison vocabulary."
    : "The compiler reports a structural change. Review the equations and model before running it.";
}
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function inspectResponse(value: unknown): Inspection {
  if (!value || typeof value !== "object")
    throw new Error("Invalid Eqiora inspection response");
  const result = value as Inspection;
  if (
    !Number.isInteger(result.version) ||
    !Array.isArray(result.nodes) ||
    !Array.isArray(result.edges) ||
    !Array.isArray(result.equations) ||
    !Array.isArray(result.models) ||
    !Array.isArray(result.errors)
  )
    throw new Error("Incompatible Eqiora inspection response");
  if (result.plan != null) {
    const plan = result.plan;
    if (
      typeof plan.identity !== "string" ||
      typeof plan.modelDigest !== "string" ||
      typeof plan.selectedModelDigest !== "string" ||
      typeof plan.matchesSelectedModel !== "boolean" ||
      typeof plan.solverBackend !== "string" ||
      typeof plan.solverBackendVersion !== "string" ||
      !Number.isSafeInteger(plan.modelRevision) ||
      (plan.geometryDigest !== null &&
        typeof plan.geometryDigest !== "string") ||
      (plan.meshDigest !== null && typeof plan.meshDigest !== "string") ||
      !plan.metadata ||
      typeof plan.metadata !== "object" ||
      Array.isArray(plan.metadata)
    )
      throw new Error("Incompatible Eqiora Plan inspection response");
  }
  if (result.result != null) {
    const view = result.result;
    if (
      view.version !== 1 ||
      typeof view.identity !== "string" ||
      !result.plan ||
      !result.plan.matchesSelectedModel ||
      view.planIdentity !== result.plan.identity ||
      view.modelDigest !== result.plan.selectedModelDigest ||
      typeof view.interpretation !== "string" ||
      typeof view.phaseConvention !== "string" ||
      typeof view.modal !== "string" ||
      !Array.isArray(view.observations) ||
      !view.observations.every(validObservation)
    )
      throw new Error("Incompatible Eqiora Result inspection response");
  }
  return result;
}
function validProjection(value: unknown): value is ProjectionValue {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).length === 2 &&
    typeof row.value === "number" &&
    Number.isFinite(row.value) &&
    typeof row.unit === "string"
  )
    return true;
  return (
    Object.keys(row).length === 1 &&
    (typeof row.undefined === "string" || typeof row.unavailable === "string")
  );
}
function validObservation(value: unknown): value is ResultObservation {
  if (!value || typeof value !== "object") return false;
  const row = value as ResultObservation;
  if (
    typeof row.id !== "string" ||
    !Array.isArray(row.names) ||
    !row.names.every((name) => typeof name === "string")
  )
    return false;
  if (row.unsupported !== undefined)
    return typeof row.unsupported === "string" && row.components === undefined;
  return (
    typeof row.valueType === "string" &&
    Array.isArray(row.shape) &&
    row.shape.every((n) => Number.isSafeInteger(n) && n > 0) &&
    Array.isArray(row.components) &&
    row.components.every(
      (component, index) =>
        component &&
        component.index === index &&
        [
          component.real,
          component.imaginary,
          component.magnitude,
          component.squaredMagnitude,
          component.phase,
        ].every(validProjection),
    )
  );
}
