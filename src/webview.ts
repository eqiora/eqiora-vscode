import katex from "katex";
import {
  comparison,
  nodeName,
  type ViewState,
  type Page,
  type ModelNode,
} from "./model";
declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const vscode = acquireVsCodeApi();
const content = document.getElementById("content")!;
const tabs = document.getElementById("tabs")!;
let state: ViewState | undefined;
const pages: [Page, string][] = [
  ["equations", "Equations"],
  ["connections", "Connections"],
  ["boundaries", "Boundaries"],
  ["plan", "Model / Plan"],
  ["changes", "Changes"],
];
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function action(label: string, message: object): HTMLButtonElement {
  const button = element("button", label);
  button.onclick = () => vscode.postMessage(message);
  return button;
}
function section(title: string, subtitle?: string): HTMLElement {
  const block = element("section", undefined, "section");
  block.append(element("h2", title));
  if (subtitle) block.append(element("p", subtitle, "muted"));
  content.append(block);
  return block;
}
function nodeButton(node: ModelNode): HTMLElement {
  return node.locations.length
    ? action(nodeName(node), { type: "openNode", id: node.id })
    : element("span", nodeName(node));
}
function render(): void {
  if (!state) return;
  content.replaceChildren();
  tabs.replaceChildren();
  document.getElementById("subtitle")!.textContent =
    state.inspection?.model ?? state.title;
  for (const [page, label] of pages) {
    const button = action(label, { type: "page", page });
    button.setAttribute("aria-current", String(page === state.page));
    tabs.append(button);
  }
  if (state.message) content.append(element("p", state.message, "notice"));
  const inspection = state.inspection;
  if (!inspection) return;
  if (inspection.errors.length) {
    const details = element("details");
    details.append(element("summary", "Analysis notes"));
    inspection.errors.forEach((error) => details.append(element("p", error)));
    content.append(details);
  }
  const toolbar = element("div", undefined, "toolbar");
  toolbar.append(
    action(`Model: ${inspection.model ?? "none"} ▾`, { type: "selectModel" }),
    element(
      "span",
      `${inspection.nodes.length} entities · ${inspection.equations.length} equations`,
      "muted",
    ),
  );
  content.append(toolbar);
  const byId = new Map(inspection.nodes.map((node) => [node.id, node]));
  if (state.page === "equations") {
    const block = section(
      "Equations",
      "Rendered from the compiled model. Select a quantity to open its source definition.",
    );
    block.append(action("Export LaTeX", { type: "export" }));
    if (!inspection.equations.length)
      block.append(element("p", "No renderable equations in this model."));
    for (const equation of inspection.equations) {
      const card = element("article", undefined, "equation");
      card.dataset.references = JSON.stringify(equation.references);
      const owner = byId.get(equation.relation);
      if (owner) card.append(element("h3", nodeName(owner)));
      const math = element("div", undefined, "math");
      math.style.fontSize = `${state.fontSize}px`;
      if (equation.fallback) math.textContent = equation.plain;
      else {
        try {
          katex.render(equation.latex, math, {
            displayMode: true,
            throwOnError: true,
            trust: false,
            strict: "error",
            maxExpand: 1000,
            maxSize: 20,
            output: "htmlAndMathml",
          });
        } catch {
          math.textContent = equation.plain;
        }
      }
      card.append(math);
      const quantities = element("div", undefined, "quantities");
      for (const id of [...new Set(equation.references)]) {
        const node = byId.get(id);
        if (node) quantities.append(nodeButton(node));
      }
      card.append(quantities);
      const accessible = element("details");
      accessible.append(
        element("summary", "Plain text and spoken form"),
        element("pre", equation.plain),
        element("p", equation.speech),
      );
      card.append(accessible);
      block.append(card);
    }
  } else if (state.page === "connections" || state.page === "boundaries") {
    const boundary = state.page === "boundaries";
    const block = section(
      boundary ? "Boundary condition map" : "Ports and conserving connections",
      boundary
        ? "Topological supports and their compiled links. Spatial geometry is not inferred from names."
        : "Inspect the compiler’s ports, connections and edge roles.",
    );
    const nodes = inspection.nodes.filter((node) =>
      boundary
        ? node.boundary || ["Domain", "Representation"].includes(node.kind)
        : ["Port", "Connection"].includes(node.kind),
    );
    if (!nodes.length)
      block.append(
        element(
          "p",
          boundary
            ? "This model has no spatial supports or boundary ports."
            : "This model has no ports or connections.",
        ),
      );
    for (const node of nodes) {
      const card = element("article", undefined, "entity");
      const title = element("h3");
      title.append(nodeButton(node));
      card.append(title);
      card.append(
        element(
          "p",
          [node.kind, node.valueType, node.boundary ? "Model boundary" : ""]
            .filter(Boolean)
            .join(" · "),
          "muted",
        ),
      );
      const list = element("ul");
      inspection.edges
        .filter((edge) => edge.from === node.id || edge.to === node.id)
        .forEach((edge) => {
          const item = element("li");
          item.append(
            element(
              "span",
              `${edge.kind} ${edge.from === node.id ? "→" : "←"} `,
            ),
          );
          const other = byId.get(edge.from === node.id ? edge.to : edge.from);
          if (other) item.append(nodeButton(other));
          list.append(item);
        });
      card.append(list);
      const detail = element("details");
      detail.append(
        element("summary", "Compiled definition"),
        element("pre", node.details),
      );
      card.append(detail);
      block.append(card);
    }
  } else if (state.page === "plan") {
    const physical = section(
      "Physical model",
      "Equations, quantities, supports and connection laws describe the physical problem.",
    );
    const counts = new Map<string, number>();
    inspection.nodes.forEach((node) =>
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1),
    );
    const grid = element("div", undefined, "counts");
    counts.forEach((count, kind) =>
      grid.append(element("div", `${count} ${kind}`)),
    );
    physical.append(grid);
    const numeric = section(
      "Numerical Plan",
      "Mesh, discretization, solver and tolerances are selected separately when constructing a Plan.",
    );
    numeric.append(action("Open numerical Plan…", { type: "attachPlan" }));
    const plan = inspection.plan;
    if (plan) {
      numeric.append(
        element("h3", state.plan?.name ?? "Numerical Plan"),
        element(
          "p",
          plan.matchesSelectedModel
            ? "Validated Plan for this exact Model artifact."
            : "Validated Plan for a different Model artifact. It is not bound to the selected model.",
          "notice",
        ),
        element("p", `Plan identity: ${plan.identity}`),
        element("p", `Plan Model digest: ${plan.modelDigest}`),
        element("p", `Plan Model revision: ${plan.modelRevision}`),
        element("p", `Selected Model digest: ${plan.selectedModelDigest}`),
        element(
          "p",
          `Backend: ${plan.solverBackend} ${plan.solverBackendVersion}`,
        ),
        element(
          "p",
          "Accepted numerical controls (canonical artifact vocabulary):",
        ),
        element("pre", JSON.stringify(plan.metadata, null, 2)),
      );
      if (plan.geometryDigest)
        numeric.append(element("p", `Geometry digest: ${plan.geometryDigest}`));
      if (plan.meshDigest)
        numeric.append(element("p", `Mesh digest: ${plan.meshDigest}`));
    } else
      numeric.append(
        element(
          "p",
          state.plan
            ? "The attached Plan has not been validated for this view. Refresh to request validation."
            : "No numerical Plan is attached. Save an existing Plan with plan.write('model.eqplan') in Python, then open it here.",
        ),
      );
    numeric.append(
      element(
        "p",
        "Read-only inspection does not run the Plan. Complex and modal Result projections are not yet available; phase, power and probability are not inferred by this view.",
      ),
    );
  } else {
    const block = section(
      "Semantic change preview",
      comparison(inspection, state.baseline, state.uri),
    );
    block.append(action("Capture current baseline", { type: "baseline" }));
    if (state.baseline) {
      block.append(
        element("p", `Baseline captured ${state.baseline.captured}`, "muted"),
      );
      const columns = element("div", undefined, "comparison");
      for (const [label, equations] of [
        ["Baseline equations", state.baseline.equations],
        ["Current equations", inspection.equations.map((e) => e.plain)],
      ] as [string, string[]][]) {
        const col = element("div");
        col.append(
          element("h3", label),
          element("pre", equations.join("\n\n") || "No rendered equations"),
        );
        columns.append(col);
      }
      block.append(
        columns,
        element(
          "p",
          "Equation text is a reading aid. Structural equality is decided by Eqiora’s fingerprint, which can reject unsupported models; it is not a proof of identical numerical results.",
          "muted",
        ),
      );
    }
  }
}
document.getElementById("refresh")!.onclick = () =>
  vscode.postMessage({ type: "refresh" });
window.addEventListener("message", (event) => {
  if (event.data?.type === "state") {
    state = event.data.state as ViewState;
    render();
  }
  if (event.data?.type === "highlight") {
    const ids = new Set(event.data.ids as string[]);
    document.querySelectorAll<HTMLElement>(".equation").forEach((card) =>
      card.classList.toggle(
        "selected",
        (JSON.parse(card.dataset.references ?? "[]") as string[]).some((id) =>
          ids.has(id),
        ),
      ),
    );
  }
});
vscode.postMessage({ type: "ready" });
