import * as vscode from "vscode";
import assert from "node:assert/strict";

export async function completionChecks(
  doc: vscode.TextDocument,
): Promise<void> {
  async function source(marked: string): Promise<vscode.Position> {
    await vscode.commands.executeCommand("hideSuggestWidget");
    const cursor = marked.indexOf("|");
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      doc.uri,
      new vscode.Range(0, 0, doc.lineCount, 0),
      marked.replace("|", ""),
    );
    await vscode.workspace.applyEdit(edit);
    const position = doc.positionAt(cursor);
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(position, position);
    return position;
  }
  async function items(marked: string): Promise<vscode.CompletionItem[]> {
    const position = await source(marked);
    const result = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      position,
    );
    return result?.items ?? [];
  }
  async function accept(): Promise<void> {
    await vscode.commands.executeCommand("editor.action.triggerSuggest");
    // Allow the editor's suggest widget to consume its asynchronous provider.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await vscode.commands.executeCommand("acceptSelectedSuggestion");
  }

  assert.ok((await items("par|")).some((i) => i.label === "parameter"));
  const templates = await items("mod|");
  assert.ok(
    !templates.some(
      (i) =>
        i.label === "model" && i.kind === vscode.CompletionItemKind.Keyword,
    ),
    "canonical native snippets do not compete with duplicate keyword entries",
  );
  const settings = vscode.workspace.getConfiguration("editor", doc.uri);
  await settings.update(
    "snippetSuggestions",
    "none",
    vscode.ConfigurationTarget.Workspace,
  );
  assert.ok(
    (await items("mod|")).some((i) => i.label === "model"),
    "keywords remain available when snippets are hidden",
  );
  await settings.update(
    "snippetSuggestions",
    undefined,
    vscode.ConfigurationTarget.Workspace,
  );
  await source("|");
  await vscode.commands.executeCommand("editor.action.insertSnippet", {
    langId: "eqiora",
    name: "Model",
  });
  await vscode.commands.executeCommand("type", { text: "Inserted" });
  await vscode.commands.executeCommand("jumpToNextSnippetPlaceholder");
  await vscode.commands.executeCommand("type", {
    text: "parameter gain: 1 = 2;",
  });
  assert.ok(doc.getText().includes("model Inserted()"));
  assert.ok(doc.getText().includes("parameter gain: 1 = 2;"));

  const local = "model M(parameter gain: 1) { relation r { ga|";
  assert.ok((await items(local)).some((i) => i.label === "gain"));
  await accept();
  assert.equal(doc.getText(), local.replace("ga|", "gain"));

  // A real workspace URI allows the server's normal module graph to own aliases.
  const uri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    "electrical.eqi",
  );
  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(`/// Adjustable part.
public component Part(
  /// Required coefficient.
  parameter gain: 1,
  parameter offset: 1 = 0,
  output result: 1
) { parameter secret: 1 = 2; }
private component Hidden() {}`),
  );
  const imported = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(imported);
  await vscode.window.showTextDocument(doc);
  const prefix = "import editor.workspace.electrical as electrical;\n";
  const members = await items(`${prefix}model M() { instance p: electrical.|`);
  assert.ok(members.some((i) => i.label === "electrical.Part"));
  assert.ok(!members.some((i) => i.label === "electrical.Hidden"));
  const argument = `${prefix}model M() { instance p: electrical.Part(ga|in = 2, offset = 3); }`;
  const bindings = await items(argument);
  assert.ok(
    bindings.some(
      (i) =>
        i.label === "gain" && i.detail?.includes("required") && i.documentation,
    ),
  );
  assert.ok(!bindings.some((i) => i.label === "offset"));
  await accept();
  assert.equal(
    doc.getText(),
    argument.replace("|", ""),
    "accepting a partial binding preserves the existing equals sign",
  );
  const remaining = await items(
    `${prefix}model M() { instance p: electrical.Part(gain = 2, off|`,
  );
  assert.ok(
    remaining.some(
      (i) => i.label === "offset" && i.detail?.includes("defaulted"),
    ),
  );
  await accept();
  assert.ok(doc.getText().endsWith("offset = "));
  const exposed = await items(
    `${prefix}model M() { instance p: electrical.Part(gain = 2); relation r { p.|`,
  );
  assert.ok(exposed.some((i) => i.label === "p.result"));
  assert.ok(!exposed.some((i) => i.label === "p.secret"));
}
