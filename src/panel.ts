import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { escapeHtml, type ViewState } from "./model";

export class InspectorPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private state?: ViewState;
  constructor(
    private context: vscode.ExtensionContext,
    private receive: (message: unknown) => void,
  ) {}
  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "eqiora.inspector",
      "Eqiora — Equations",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "dist"),
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
        ],
      },
    );
    this.panel = panel;
    panel.iconPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "media",
      "icon.png",
    );
    panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === "ready") this.update(this.state);
      else this.receive(message);
    });
    panel.onDidDispose(() => {
      this.panel = undefined;
    });
    const uri = (file: string) =>
      escapeHtml(
        panel.webview
          .asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, file))
          .toString(),
      );
    const nonce = randomBytes(24).toString("base64");
    const csp = panel.webview.cspSource;
    panel.webview.html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${csp}; font-src ${csp}; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${uri("dist/katex.min.css")}"><link rel="stylesheet" href="${uri("media/inspector.css")}"><title>Eqiora model inspector</title></head><body><header><img src="${uri("media/icon.png")}" width="36" height="36" alt=""><div><strong>Eqiora</strong><span id="subtitle">Explore the mathematics</span></div><button id="refresh" title="Refresh model">↻ Refresh</button></header><nav aria-label="Model views" id="tabs"></nav><main id="content" aria-live="polite"><p>Open an Eqiora model to begin.</p></main><script nonce="${nonce}" src="${uri("dist/webview.js")}"></script></body></html>`;
  }
  update(state?: ViewState): void {
    if (state) this.state = state;
    if (this.panel && this.state) {
      this.panel.title = `Eqiora — ${this.state.title}`;
      void this.panel.webview.postMessage({ type: "state", state: this.state });
    }
  }
  highlight(ids: string[]): void {
    void this.panel?.webview.postMessage({ type: "highlight", ids });
  }
  dispose(): void {
    this.panel?.dispose();
  }
}
