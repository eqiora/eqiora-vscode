import * as vscode from "vscode";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Inspection } from "../src/model";
export async function run(): Promise<void> {
  const executable = process.env.EQIORA_SERVER;
  if (!executable)
    assert.ok(
      existsSync(
        path.resolve(
          __dirname,
          "../server",
          process.platform === "win32"
            ? "eqiora-language-server.exe"
            : "eqiora-language-server",
        ),
      ),
      "Build the bundled server or set EQIORA_SERVER for the editor test.",
    );
  await vscode.workspace
    .getConfiguration("eqiora")
    .update("server.path", executable ?? "", vscode.ConfigurationTarget.Global);
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "decay.eqi"),
  );
  await vscode.window.showTextDocument(doc);
  assert.equal(doc.languageId, "eqiora");
  const extension = vscode.extensions.getExtension<{
    refresh: () => Promise<void>;
    inspection: () => Inspection | undefined;
  }>("nkiyohara.eqiora");
  assert.ok(extension);
  const api = await extension.activate();
  await api.refresh();
  const inspection = api.inspection();
  assert.ok(inspection, "inspection is returned by the real server");
  assert.equal(inspection.model, "Decay");
  assert.deepEqual(inspection.errors, []);
  assert.ok(inspection.equations.some((e) => e.plain.includes("=")));
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    "vscode.executeDocumentSymbolProvider",
    doc.uri,
  );
  assert.ok(symbols?.some((symbol) => symbol.name === "Decay"));
  await vscode.commands.executeCommand("eqiora.preview");
  await vscode.commands.executeCommand("eqiora.captureBaseline");
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    doc.uri,
    new vscode.Range(0, 0, doc.lineCount, 0),
    "model Broken() { nonsense; }\n",
  );
  await vscode.workspace.applyEdit(edit);
  await api.refresh();
  assert.ok(
    !api.inspection() || api.inspection()!.equations.length === 0,
    "invalid edits cannot retain stale equations",
  );
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}
