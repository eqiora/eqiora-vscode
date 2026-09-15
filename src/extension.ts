import * as vscode from "vscode";
import * as path from "node:path";
import { Servers } from "./server";
import { InspectorPanel } from "./panel";
import { ModelTree, symbolEntries, graphEntries } from "./trees";
import type { Baseline, Inspection, Page, ViewState } from "./model";

let controller: Controller | undefined;
export async function activate(context: vscode.ExtensionContext): Promise<{
  refresh: () => Promise<void>;
  inspection: () => Inspection | undefined;
}> {
  controller = new Controller(context);
  context.subscriptions.push(controller);
  await controller.refresh();
  return {
    refresh: () => controller!.refresh(),
    inspection: () => controller?.inspection,
  };
}
export async function deactivate(): Promise<void> {
  await controller?.servers.restart();
}

class Controller implements vscode.Disposable {
  readonly servers: Servers;
  inspection?: Inspection;
  private panel: InspectorPanel;
  private hierarchy = new ModelTree();
  private ports = new ModelTree();
  private boundaries = new ModelTree();
  private subscriptions: vscode.Disposable[] = [];
  private document?: vscode.TextDocument;
  private selected = new Map<string, string>();
  private page: Page = "equations";
  private baseline?: Baseline;
  private plan?: { name: string; text: string };
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private cancellation?: vscode.CancellationTokenSource;
  private status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    20,
  );
  constructor(private context: vscode.ExtensionContext) {
    this.servers = new Servers(context);
    this.panel = new InspectorPanel(context, (message) => {
      void this.handle(message).catch((error) => this.error(error));
    });
    for (const [id, tree] of [
      ["eqiora.models", this.hierarchy],
      ["eqiora.ports", this.ports],
      ["eqiora.boundaryTree", this.boundaries],
    ] as const)
      this.subscriptions.push(vscode.window.registerTreeDataProvider(id, tree));
    const commands: Record<string, () => unknown> = {
      restartServer: async () => {
        await this.servers.restart();
        await this.refresh();
      },
      showOutput: () => this.servers.output.show(),
      selectServer: () => this.selectServer(),
      preview: () => this.show("equations"),
      connections: () => this.show("connections"),
      boundaries: () => this.show("boundaries"),
      modelPlan: () => this.show("plan"),
      semanticChanges: () => this.show("changes"),
      selectModel: () => this.selectModel(),
      attachPlan: () => this.attachPlan(),
      captureBaseline: () => this.captureBaseline(),
      exportEquations: () => this.exportEquations(),
      openGuide: () =>
        vscode.env.openExternal(vscode.Uri.parse("https://eqiora.org/learn/")),
      openExample: async () => {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.joinPath(context.extensionUri, "examples", "decay.eqi"),
        );
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      },
      refresh: () => this.refresh(),
    };
    for (const [name, action] of Object.entries(commands))
      this.subscriptions.push(
        vscode.commands.registerCommand(`eqiora.${name}`, async () => {
          try {
            return await action();
          } catch (error) {
            this.error(error);
          }
        }),
      );
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.languageId === "eqiora") this.schedule();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === this.document) this.schedule();
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        if (doc === this.document) {
          this.document = undefined;
          this.inspection = undefined;
          this.hierarchy.update([]);
          this.ports.update([]);
          this.boundaries.update([]);
          this.panel.update(this.state("Open an Eqiora model."));
          this.status.hide();
          void vscode.commands.executeCommand(
            "setContext",
            "eqiora.hasDocument",
            false,
          );
        }
      }),
      vscode.workspace.onDidGrantWorkspaceTrust(() => {
        void this.refresh();
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("eqiora.server"))
          void this.servers.restart().then(() => this.refresh());
        else if (event.affectsConfiguration("eqiora.preview")) this.schedule();
      }),
      vscode.window.onDidChangeTextEditorSelection((event) =>
        this.highlight(event),
      ),
    );
    this.status.command = "eqiora.showOutput";
    this.status.name = "Eqiora language server";
  }
  private error(error: unknown): void {
    this.servers.output.appendLine(String(error));
    void vscode.window
      .showErrorMessage(`Eqiora: ${String(error)}`, "Select Server", "Show Log")
      .then((action) => {
        if (action === "Select Server") void this.selectServer();
        if (action === "Show Log") this.servers.output.show();
      });
  }
  private schedule(): void {
    clearTimeout(this.timer);
    this.generation++;
    this.cancellation?.cancel();
    // Never show a previous successful model as the current edited model.
    this.inspection = undefined;
    this.panel.update(this.state("Updating model…"));
    this.ports.update([]);
    this.boundaries.update([]);
    this.timer = setTimeout(
      () => void this.refresh(),
      vscode.workspace
        .getConfiguration("eqiora")
        .get<number>("preview.updateDelay", 400),
    );
  }
  async refresh(): Promise<void> {
    const active = vscode.window.activeTextEditor?.document;
    if (active?.languageId === "eqiora") this.document = active;
    const doc = this.document;
    if (!doc || doc.isClosed) return;
    const generation = ++this.generation;
    this.cancellation?.cancel();
    this.cancellation?.dispose();
    this.cancellation = new vscode.CancellationTokenSource();
    const token = this.cancellation.token;
    const version = doc.version;
    this.inspection = undefined;
    this.panel.update(this.state("Analyzing model…"));
    void vscode.commands.executeCommand(
      "setContext",
      "eqiora.hasDocument",
      true,
    );
    this.status.text = "$(sync~spin) Eqiora";
    this.status.show();
    try {
      await this.servers.client(doc);
      const symbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[]
      >("vscode.executeDocumentSymbolProvider", doc.uri);
      if (generation !== this.generation || doc.version !== version) return;
      this.hierarchy.update(symbolEntries(symbols ?? [], doc.uri));
      if (
        !vscode.workspace
          .getConfiguration("eqiora", doc.uri)
          .get<boolean>("preview.enabled", true)
      ) {
        this.status.text = "$(check) Eqiora";
        this.panel.update(this.state("Rich views are disabled in settings."));
        return;
      }
      const selected = this.selected.get(doc.uri.toString());
      if (selected && !symbols?.some((symbol) => symbol.name === selected))
        this.selected.delete(doc.uri.toString());
      const inspection = await this.servers.inspect(
        doc,
        this.selected.get(doc.uri.toString()),
        this.page === "changes",
        token,
      );
      if (
        generation !== this.generation ||
        doc.version !== version ||
        inspection.version !== version
      )
        return;
      this.inspection = inspection;
      this.ports.update(graphEntries(inspection, "ports"));
      this.boundaries.update(graphEntries(inspection, "boundaries"));
      this.panel.update(this.state());
      this.status.text = inspection.errors.length
        ? "$(warning) Eqiora"
        : "$(check) Eqiora";
      this.status.tooltip = `${inspection.model ?? "Declarations"} — ${inspection.equations.length} equations. Click for the server log.`;
    } catch (error) {
      if (generation !== this.generation || token.isCancellationRequested)
        return;
      this.inspection = undefined;
      this.ports.update([]);
      this.boundaries.update([]);
      this.panel.update(this.state(String(error)));
      this.status.text = "$(warning) Eqiora";
      this.status.tooltip = String(error);
      this.servers.output.appendLine(String(error));
    }
  }
  private state(message?: string): ViewState {
    return {
      page: this.page,
      title: this.document
        ? path.basename(this.document.fileName)
        : "Model inspector",
      uri: this.document?.uri.toString() ?? "",
      inspection: this.inspection,
      message,
      baseline: this.baseline,
      plan: this.plan,
      fontSize: vscode.workspace
        .getConfiguration("eqiora")
        .get<number>("preview.fontSize", 18),
    };
  }
  private async show(page: Page): Promise<void> {
    this.page = page;
    this.panel.show();
    this.panel.update(this.state());
    await this.refresh();
  }
  private async selectModel(): Promise<void> {
    const models = this.inspection?.models ?? [];
    const selected = await vscode.window.showQuickPick(models, {
      title: "Select an Eqiora Model",
    });
    if (selected && this.document) {
      this.selected.set(this.document.uri.toString(), selected);
      await this.refresh();
    }
  }
  private async selectServer(): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: false,
      title: "Select eqiora-language-server executable",
    });
    if (selected?.[0])
      await vscode.workspace
        .getConfiguration("eqiora")
        .update(
          "server.path",
          selected[0].fsPath,
          vscode.ConfigurationTarget.Global,
        );
  }
  private async captureBaseline(): Promise<void> {
    const doc = this.document;
    if (!doc) throw new Error("Open an Eqiora model first.");
    const version = doc.version;
    const model = this.selected.get(doc.uri.toString());
    const inspection = await this.servers.inspect(doc, model, true);
    if (
      doc !== this.document ||
      version !== doc.version ||
      inspection.version !== version
    )
      throw new Error("The document changed. Capture the baseline again.");
    if (!inspection.fingerprint || !inspection.model)
      throw new Error(
        inspection.errors.join("\n") || "Structural comparison is unavailable.",
      );
    this.baseline = {
      uri: doc.uri.toString(),
      model: inspection.model,
      fingerprint: inspection.fingerprint,
      captured: new Date().toLocaleString(),
      equations: inspection.equations.map((e) => e.plain),
    };
    await this.show("changes");
  }
  private async attachPlan(): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { "Plan JSON": ["json"] },
      title: "Open an existing numerical Plan as read-only JSON",
    });
    if (!selected?.[0]) return;
    const stat = await vscode.workspace.fs.stat(selected[0]);
    if (stat.size > 2 * 1024 * 1024)
      throw new Error("Plan JSON exceeds the 2 MiB display limit.");
    const bytes = await vscode.workspace.fs.readFile(selected[0]);
    if (bytes.byteLength > 2 * 1024 * 1024)
      throw new Error("Plan JSON exceeds the 2 MiB display limit.");
    const value: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
    this.plan = {
      name: path.basename(selected[0].fsPath),
      text: JSON.stringify(value, null, 2),
    };
    await this.show("plan");
  }
  private async exportEquations(): Promise<void> {
    if (!this.inspection?.equations.length)
      throw new Error("No equations to export.");
    const doc = await vscode.workspace.openTextDocument({
      language: "latex",
      content: this.inspection.equations
        .map((e) =>
          e.fallback
            ? `% ${e.plain.replaceAll("\n", "\n% ")}`
            : `\\[\n${e.latex}\n\\]`,
        )
        .join("\n\n"),
    });
    await vscode.window.showTextDocument(doc);
  }
  private highlight(event: vscode.TextEditorSelectionChangeEvent): void {
    if (
      event.textEditor.document !== this.document ||
      !vscode.workspace
        .getConfiguration("eqiora")
        .get<boolean>("preview.followCursor", true)
    )
      return;
    const selection = event.selections[0];
    if (!selection) return;
    const ids = (this.inspection?.nodes ?? [])
      .filter((node) =>
        node.locations.some(
          (location) =>
            location.uri === this.document?.uri.toString() &&
            new vscode.Range(
              location.range.start.line,
              location.range.start.character,
              location.range.end.line,
              location.range.end.character,
            ).contains(selection.active),
        ),
      )
      .map((node) => node.id);
    this.panel.highlight(ids);
  }
  private async handle(message: unknown): Promise<void> {
    if (!message || typeof message !== "object") return;
    const input = message as { type?: string; page?: Page; id?: string };
    const pages: Page[] = [
      "equations",
      "connections",
      "boundaries",
      "plan",
      "changes",
    ];
    if (input.type === "page" && input.page && pages.includes(input.page))
      return this.show(input.page);
    if (input.type === "openNode") {
      const source = this.inspection?.nodes.find((node) => node.id === input.id)
        ?.locations[0];
      if (source && vscode.Uri.parse(source.uri).scheme === "file")
        await vscode.window.showTextDocument(vscode.Uri.parse(source.uri), {
          viewColumn: vscode.ViewColumn.One,
          selection: new vscode.Range(
            source.range.start.line,
            source.range.start.character,
            source.range.end.line,
            source.range.end.character,
          ),
        });
    } else if (input.type === "refresh") await this.refresh();
    else if (input.type === "selectModel") await this.selectModel();
    else if (input.type === "baseline") await this.captureBaseline();
    else if (input.type === "attachPlan") await this.attachPlan();
    else if (input.type === "export") await this.exportEquations();
  }
  dispose(): void {
    clearTimeout(this.timer);
    this.cancellation?.cancel();
    this.cancellation?.dispose();
    this.subscriptions.forEach((item) => item.dispose());
    this.panel.dispose();
    this.servers.dispose();
    this.hierarchy.dispose();
    this.ports.dispose();
    this.boundaries.dispose();
    this.status.dispose();
  }
}
