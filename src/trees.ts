import * as vscode from "vscode";
import { nodeName, type Inspection, type ModelNode } from "./model";
export interface Entry {
  label: string;
  description?: string;
  children?: Entry[];
  location?: vscode.Location;
  icon?: string;
}
export class ModelTree implements vscode.TreeDataProvider<Entry> {
  private changed = new vscode.EventEmitter<Entry | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private roots: Entry[] = [];
  update(roots: Entry[]): void {
    this.roots = roots;
    this.changed.fire(undefined);
  }
  getChildren(element?: Entry): Entry[] {
    return element?.children ?? this.roots;
  }
  getTreeItem(entry: Entry): vscode.TreeItem {
    const item = new vscode.TreeItem(
      entry.label,
      entry.children?.length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    item.description = entry.description;
    item.iconPath = new vscode.ThemeIcon(entry.icon ?? "symbol-field");
    if (entry.location)
      item.command = {
        command: "vscode.open",
        title: "Open definition",
        arguments: [entry.location.uri, { selection: entry.location.range }],
      };
    return item;
  }
  dispose(): void {
    this.changed.dispose();
  }
}
export function symbolEntries(
  symbols: vscode.DocumentSymbol[],
  uri: vscode.Uri,
): Entry[] {
  return symbols.map((symbol) => ({
    label: symbol.name,
    description: symbol.detail,
    children: symbolEntries(symbol.children, uri),
    location: new vscode.Location(uri, symbol.selectionRange),
    icon:
      symbol.kind === vscode.SymbolKind.Class ? "symbol-class" : "symbol-field",
  }));
}
function entry(node: ModelNode): Entry {
  const source = node.locations[0];
  return {
    label: nodeName(node),
    description: node.valueType ?? node.kind,
    icon: node.kind === "Port" ? "plug" : "symbol-namespace",
    location: source
      ? new vscode.Location(
          vscode.Uri.parse(source.uri),
          new vscode.Range(
            source.range.start.line,
            source.range.start.character,
            source.range.end.line,
            source.range.end.character,
          ),
        )
      : undefined,
  };
}
export function graphEntries(
  inspection: Inspection,
  mode: "ports" | "boundaries",
): Entry[] {
  const selected = inspection.nodes.filter((node) =>
    mode === "ports"
      ? ["Port", "Connection"].includes(node.kind)
      : node.boundary || ["Domain", "Representation"].includes(node.kind),
  );
  const byId = new Map(inspection.nodes.map((node) => [node.id, node]));
  return selected.map((node) => ({
    ...entry(node),
    children: inspection.edges
      .filter((edge) => edge.from === node.id || edge.to === node.id)
      .map((edge) => {
        const other = byId.get(edge.from === node.id ? edge.to : edge.from);
        return {
          ...(other
            ? entry(other)
            : { label: edge.from === node.id ? edge.to : edge.from }),
          description: edge.kind,
        };
      }),
  }));
}
