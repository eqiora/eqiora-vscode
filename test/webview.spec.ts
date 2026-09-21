import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ViewState } from "../src/model";
const state: ViewState = {
  page: "equations",
  title: "Exponential decay",
  uri: "file:///decay.eqi",
  fontSize: 20,
  inspection: {
    version: 1,
    model: "Decay",
    models: ["Decay"],
    errors: [],
    fingerprint: null,
    edges: [],
    nodes: [
      {
        id: "x",
        kind: "Field",
        names: ["x"],
        locations: [
          {
            uri: "file:///decay.eqi",
            range: {
              start: { line: 2, character: 4 },
              end: { line: 2, character: 15 },
            },
          },
        ],
        valueType: "1",
        boundary: false,
        details: "Field x",
      },
    ],
    equations: [
      {
        relation: "decay",
        index: 0,
        latex: "\\frac{d x}{d t} = -r x",
        plain: "derivative(x) = -r * x",
        speech: "derivative of x equals negative r times x",
        fallback: false,
        references: ["x"],
      },
    ],
  },
};
test("preview renders math, exposes source navigation and keeps untrusted text inert", async ({
  page,
}) => {
  await page.setContent(
    '<!doctype html><html><body><div id="subtitle"></div><button id="refresh">Refresh</button><nav id="tabs"></nav><main id="content"></main></body></html>',
  );
  await page.addStyleTag({
    content: await readFile("media/inspector.css", "utf8"),
  });
  await page.addStyleTag({
    content:
      ":root{--vscode-editor-background:#151c29;--vscode-foreground:#e4eafa;--vscode-descriptionForeground:#aab8cc;--vscode-button-secondaryForeground:#e4eafa;--vscode-button-secondaryBackground:#253249;--vscode-panel-border:#34435a;--vscode-sideBar-background:#1b2636;--vscode-button-background:#24599e;--vscode-button-foreground:#fff}body{font-family:system-ui}",
  });
  await page.addStyleTag({
    content: await readFile("dist/katex.min.css", "utf8"),
  });
  await page.evaluate(() => {
    (
      window as unknown as { acquireVsCodeApi: () => unknown }
    ).acquireVsCodeApi = () => ({
      postMessage: (message: unknown) => {
        (window as unknown as { lastMessage: unknown }).lastMessage = message;
      },
    });
  });
  await page.addScriptTag({
    content: await readFile("dist/webview.js", "utf8"),
  });
  await page.evaluate(
    (state) =>
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "state", state } }),
      ),
    state,
  );
  await expect(page.locator(".katex")).toBeVisible();
  await expect(page.locator("math")).toHaveCount(1);
  await page.getByRole("button", { name: "x", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { lastMessage: unknown }).lastMessage,
    ),
  ).toEqual({ type: "openNode", id: "x" });
  if (process.env.EQIORA_SCREENSHOT)
    await page.screenshot({
      path: process.env.EQIORA_SCREENSHOT,
      fullPage: true,
    });
  const unsafe = structuredClone(state);
  unsafe.inspection!.nodes[0].names = [
    '<img src=x onerror="window.hacked=true">',
  ];
  unsafe.inspection!.equations[0].latex = "\\href{javascript:alert(1)}{click}";
  await page.evaluate(
    (state) =>
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "state", state } }),
      ),
    unsafe,
  );
  await expect(page.locator("#content img")).toHaveCount(0);
  await expect(page.locator("#content a")).toHaveCount(0);

  await page.evaluate(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "state",
          state: {
            page: "equations",
            title: "Invalid edit",
            uri: "",
            fontSize: 18,
            message: "Invalid model",
          },
        },
      }),
    ),
  );
  await expect(page.locator(".katex")).toHaveCount(0);
  await expect(page.getByText("Invalid model")).toBeVisible();
});

test("Plan viewer preserves native binding, numerical controls and unsupported result state", async ({
  page,
}) => {
  await page.setContent(
    '<div id="subtitle"></div><button id="refresh">Refresh</button><nav id="tabs"></nav><main id="content"></main>',
  );
  await page.evaluate(() => {
    (
      window as unknown as { acquireVsCodeApi: () => unknown }
    ).acquireVsCodeApi = () => ({ postMessage: () => {} });
  });
  await page.addScriptTag({
    content: await readFile("dist/webview.js", "utf8"),
  });
  const planState = structuredClone(state);
  planState.page = "plan";
  planState.plan = { name: "decay.eqplan" };
  planState.inspection!.plan = {
    identity: "plan:exact",
    modelDigest: "model:accepted",
    modelRevision: 0,
    selectedModelDigest: "model:accepted",
    matchesSelectedModel: true,
    geometryDigest: null,
    meshDigest: null,
    solverBackend: "native-provider",
    solverBackendVersion: "1.2.3",
    metadata: {
      schema: "eqiora.resolved-common-plan/v5",
      temporal: { relative_tolerance: 0.000001 },
      label: '<img src=x onerror="window.hacked=true">',
    },
  };
  const render = async () =>
    page.evaluate(
      (state) =>
        window.dispatchEvent(
          new MessageEvent("message", { data: { type: "state", state } }),
        ),
      planState,
    );
  await render();
  await expect(
    page.getByText("Validated Plan for this exact Model artifact.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("pre")).toContainText(
    '"relative_tolerance": 0.000001',
  );
  await expect(page.locator("#content img")).toHaveCount(0);
  await expect(
    page.getByText(
      /Complex and modal Result projections are not yet available/,
    ),
  ).toBeVisible();
  planState.inspection!.plan!.matchesSelectedModel = false;
  planState.inspection!.plan!.selectedModelDigest = "model:edited";
  await render();
  await expect(page.getByText(/different Model artifact/)).toBeVisible();
  await expect(
    page.getByText("Selected Model digest: model:edited", { exact: true }),
  ).toBeVisible();
  planState.inspection!.plan = null;
  await render();
  await expect(page.getByText(/has not been validated/)).toBeVisible();
  await expect(page.locator("pre")).toHaveCount(0);
});
