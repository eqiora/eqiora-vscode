import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comparison,
  escapeHtml,
  inspectResponse,
  type Inspection,
  type Baseline,
} from "../src/model";
const current: Inspection = {
  version: 1,
  models: ["Decay"],
  model: "Decay",
  nodes: [],
  edges: [],
  equations: [],
  errors: [],
  fingerprint: "v1:abc",
};
const baseline: Baseline = {
  uri: "file:///decay.eqi",
  model: "Decay",
  fingerprint: "v1:abc",
  captured: "today",
  equations: [],
};
test("structural comparison requires the same model and an actual compiler fingerprint", () => {
  assert.match(
    comparison(current, baseline, baseline.uri),
    /same structural meaning/,
  );
  assert.match(
    comparison({ ...current, fingerprint: "v1:def" }, baseline, baseline.uri),
    /structural change/,
  );
  assert.match(
    comparison({ ...current, fingerprint: null }, baseline, baseline.uri),
    /unavailable/,
  );
  assert.match(
    comparison(current, baseline, "file:///other.eqi"),
    /same document/,
  );
  assert.match(
    comparison({ ...current, model: "Other" }, baseline, baseline.uri),
    /same document/,
  );
});
test("HTML attributes cannot introduce markup or handlers", () => {
  assert.equal(
    escapeHtml("<img src=\"x\" onerror='attack'>&"),
    "&lt;img src=&quot;x&quot; onerror=&#39;attack&#39;&gt;&amp;",
  );
});
test("incompatible server payloads reject instead of displaying an invented model", () => {
  assert.throws(
    () => inspectResponse({ version: 1, nodes: [] }),
    /Incompatible/,
  );
  assert.equal(inspectResponse(current), current);
});
