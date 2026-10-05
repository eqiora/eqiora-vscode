import * as vscode from "vscode";
import * as assert from "node:assert/strict";
import type { Inspection, ProjectionValue } from "../src/model";

export async function resultChecks(api: {
  refresh: () => Promise<void>;
  inspection: () => Inspection | undefined;
}): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri;
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(root, "response.eqi"),
  );
  await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  await vscode.commands.executeCommand(
    "eqiora.attachPlan",
    vscode.Uri.joinPath(root, "response.eqplan"),
  );
  assert.ok(
    api.inspection()?.plan?.matchesSelectedModel,
    `the fixture Plan matches the selected Model: ${JSON.stringify(api.inspection())}`,
  );
  await vscode.commands.executeCommand(
    "eqiora.attachResult",
    vscode.Uri.joinPath(root, "response.eqresult"),
  );
  const inspection = api.inspection();
  assert.ok(
    inspection?.result,
    "the bundled native server validates a canonical Result through the real extension commands",
  );
  assert.equal(inspection.result.planIdentity, inspection.plan!.identity);
  assert.equal(
    inspection.result.modelDigest,
    inspection.plan!.selectedModelDigest,
  );
  const observation = (name: string) =>
    inspection.result!.observations.find((row) => row.names.includes(name))!;
  const value = (projection: ProjectionValue) => {
    assert.ok("value" in projection);
    return projection.value;
  };
  const voltage = observation("voltage").components![0];
  // (1-2i)(3+4i)=11-2i and a 3-4-5 triangle give independent component expectations.
  assert.ok(Math.abs(value(voltage.real) - 3) < 1e-10);
  assert.ok(Math.abs(value(voltage.imaginary) - 4) < 1e-10);
  assert.ok(Math.abs(value(voltage.magnitude) - 5) < 1e-10);
  assert.ok(Math.abs(value(voltage.squaredMagnitude) - 25) < 1e-10);
  assert.ok(
    Math.abs(value(observation("peak_power").components![0].real) - 5.5) <
      1e-10,
  );
  assert.ok("undefined" in observation("zero").components![0].phase);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(0, 0, document.lineCount, 0),
    document.getText().replace("11[V]", "13[V]"),
  );
  await vscode.workspace.applyEdit(edit);
  await api.refresh();
  assert.equal(
    api.inspection(),
    undefined,
    "an edited Model cannot retain a stale Result",
  );
  await vscode.commands.executeCommand("eqiora.detachResult");
  assert.ok(
    api.inspection(),
    "the detach command recovers the Model/Plan view after rejection",
  );
  assert.equal(api.inspection()!.result, null);
  assert.equal(api.inspection()!.plan!.matchesSelectedModel, false);
}
