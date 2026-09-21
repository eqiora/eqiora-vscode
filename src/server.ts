import * as vscode from "vscode";
import * as path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { inspectResponse, type Inspection } from "./model";

export class Servers implements vscode.Disposable {
  private clients = new Map<string, Promise<LanguageClient>>();
  private readonly templatePrefixes: Set<string>;
  readonly output = vscode.window.createOutputChannel("Eqiora", { log: true });
  constructor(private context: vscode.ExtensionContext) {
    const templates = JSON.parse(
      readFileSync(
        context.asAbsolutePath("vendor/syntax/snippets/eqiora.json"),
        "utf8",
      ),
    ) as Record<string, { prefix: string | string[] }>;
    this.templatePrefixes = new Set(
      Object.values(templates).flatMap((t) => t.prefix),
    );
  }
  async client(document: vscode.TextDocument): Promise<LanguageClient> {
    if (!vscode.workspace.isTrusted)
      throw new Error("Trust this workspace to start Eqiora.");
    if (
      !vscode.workspace
        .getConfiguration("eqiora", document.uri)
        .get<boolean>("server.enabled", true)
    )
      throw new Error("Enable eqiora.server.enabled to use language features.");
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    const key = folder?.uri.toString() ?? document.uri.toString();
    let pending = this.clients.get(key);
    if (!pending) {
      pending = this.start(document, folder).catch((error) => {
        this.clients.delete(key);
        throw error;
      });
      this.clients.set(key, pending);
    }
    return pending;
  }
  private async start(
    document: vscode.TextDocument,
    folder?: vscode.WorkspaceFolder,
  ): Promise<LanguageClient> {
    const config = vscode.workspace.getConfiguration("eqiora", document.uri);
    const bundled = this.context.asAbsolutePath(
      path.join(
        "server",
        process.platform === "win32"
          ? "eqiora-language-server.exe"
          : "eqiora-language-server",
      ),
    );
    const executable =
      config.get<string>("server.path", "").trim() ||
      (existsSync(bundled) ? bundled : "eqiora-language-server");
    const options: ServerOptions = {
      command: executable,
      args: config.get<string[]>("server.args", []),
      options: { cwd: folder?.uri.fsPath, shell: false },
    };
    const clientOptions: LanguageClientOptions = {
      documentSelector: folder
        ? [
            {
              scheme: "file",
              language: "eqiora",
              pattern: `${folder.uri.fsPath.replace(/\\/g, "/")}/**/*`,
            },
          ]
        : [
            {
              scheme: "file",
              language: "eqiora",
              pattern: document.uri.fsPath.replace(/\\/g, "/"),
            },
            { scheme: "untitled", language: "eqiora" },
          ],
      workspaceFolder: folder,
      outputChannel: this.output,
      initializationOptions: { eqioraInspection: 1 },
      middleware: {
        provideCompletionItem: async (
          document,
          position,
          context,
          token,
          next,
        ) => {
          const version = document.version;
          const result = await next(document, position, context, token);
          if (token.isCancellationRequested || document.version !== version)
            return undefined;
          // Native snippets retain their placeholders and Tab navigation, even
          // with an older server. Suppress only duplicate keyword candidates.
          const editor = vscode.workspace.getConfiguration(
            "editor",
            document.uri,
          );
          if (
            !result ||
            editor.get("snippetSuggestions") === "none" ||
            editor.get("suggest.showSnippets") === false
          )
            return result;
          const keep = (item: vscode.CompletionItem) =>
            item.kind !== vscode.CompletionItemKind.Keyword ||
            !this.templatePrefixes.has(
              typeof item.label === "string" ? item.label : item.label.label,
            );
          if (Array.isArray(result)) return result.filter(keep);
          result.items = result.items.filter(keep);
          return result;
        },
        provideHover: async (document, position, token, next) => {
          const hover = await next(document, position, token);
          if (!hover) return hover;
          const guide = new vscode.MarkdownString(
            "[Language reference](https://eqiora.org/reference/language/) · [Learn the mathematics](https://eqiora.org/learn/)",
          );
          guide.isTrusted = false;
          return new vscode.Hover([...hover.contents, guide], hover.range);
        },
      },
    };
    const client = new LanguageClient(
      "eqiora",
      "Eqiora",
      options,
      clientOptions,
    );
    try {
      await client.start();
    } catch (error) {
      await client.dispose();
      throw new Error(
        `Could not start ${executable}. Install the matching language server or set Eqiora: Server Path. ${String(error)}`,
      );
    }
    this.output.appendLine(
      `Connected to ${client.initializeResult?.serverInfo?.name} ${client.initializeResult?.serverInfo?.version ?? ""}`,
    );
    return client;
  }
  async inspect(
    document: vscode.TextDocument,
    model?: string,
    fingerprint = false,
    token?: vscode.CancellationToken,
  ): Promise<Inspection> {
    const client = await this.client(document);
    const capability = client.initializeResult?.capabilities.experimental as
      { eqioraInspection?: number } | undefined;
    if (capability?.eqioraInspection !== 1)
      throw new Error(
        "This server supports basic editing but not rich model views. Install the server revision listed in the extension compatibility guide.",
      );
    const params = {
      textDocument: { uri: document.uri.toString() },
      model,
      fingerprint,
    };
    return inspectResponse(
      await client.sendRequest("eqiora/inspect", params, token),
    );
  }
  async restart(): Promise<void> {
    const pending = [...this.clients.values()];
    this.clients.clear();
    await Promise.allSettled(
      pending.map(async (client) => (await client).dispose()),
    );
  }
  dispose(): void {
    void this.restart();
    this.output.dispose();
  }
}
