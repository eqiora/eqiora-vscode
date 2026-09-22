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
export interface Inspection {
  version: number;
  models: string[];
  model: string | null;
  nodes: ModelNode[];
  edges: ModelEdge[];
  equations: Equation[];
  fingerprint: string | null;
  plan?: PlanProjection | null;
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
  return result;
}
