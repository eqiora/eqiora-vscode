# Using Eqiora in VS Code

## First model

Install a release VSIX, open an `.eqi` file and trust its workspace to enable the
native language server. Diagnostics appear in Problems and in the editor. F12
opens a resolved definition; Shift+F12 finds its references. Use Format Document
for the canonical formatter and the Outline or Eqiora activity bar for declarations.

Choose **Eqiora: Open Equation Preview** to view generated mathematics beside the
source. Edit the source to refresh it. Select a quantity in the preview to read its
definition. Hovering code uses the language server's declaration documentation.
Use **Eqiora: Open Eqiora Guide** to open the linked textbook.

## Commands

All commands are available from the Command Palette under **Eqiora**:

| Command                           | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| Open Equation Preview             | Live equations and quantity navigation                |
| Select Model                      | Choose among models in the current file               |
| Export Equations as LaTeX         | Open generated equations in a new unsaved document    |
| Inspect Ports and Connections     | Inspect compiler-owned connections and roles          |
| Open Boundary Condition Map       | Inspect support and boundary topology                 |
| Inspect Model and Numerical Plan  | Distinguish physics from numerical choices            |
| Open Numerical Plan JSON          | Display an existing JSON file, up to 2 MiB            |
| Capture Model Comparison Baseline | Capture the compiler's structural fingerprint         |
| Preview Semantic Changes          | Compare the selected model with its captured baseline |
| Select Language Server            | Set the executable on the workspace host              |
| Restart Language Server           | Restart after changing installations                  |
| Show Language Server Log          | Diagnose startup, version or analysis failures        |
| Refresh Model Views               | Request a new snapshot                                |
| Open Example Model                | Open the included decay model                         |
| Open Eqiora Guide                 | Open the mathematical modeling textbook               |

The baseline is kept in memory for the current extension session. It applies to one
exact document URI and selected model. A Plan file is a separately opened reading
aid, not evidence that a Plan belongs to the current model.

## Settings

Search **Eqiora** in Settings. `eqiora.server.path` selects the executable;
`eqiora.server.args` supplies direct arguments without a shell. An empty path first
uses the bundled binary, then `eqiora-language-server` on PATH.

`eqiora.server.enabled` disables server features. `eqiora.preview.enabled` controls
rich views. `eqiora.preview.updateDelay` controls edit debounce (100–5000 ms);
`eqiora.preview.followCursor` highlights related equations;
`eqiora.preview.fontSize` controls their size. `eqiora.trace.server` enables protocol
logging. Logs may contain model source when verbose tracing is enabled.

For remote workspaces, select the executable on the remote host. Workspace trust
is required before any configured executable starts. No automatic downloads,
telemetry, model execution or arbitrary webview commands run in the extension.

## Compatibility

[upstream.json](../upstream.json) pins the Eqiora source commit, syntax bundle version
and inspection protocol used by each extension release. Packaged native servers
are built from that commit. Custom servers must report the inspection capability
before rich views are enabled; basic LSP features can remain useful independently.

## Release destinations

Installable GitHub release assets are separate from Marketplace or Open VSX
publication. Publisher accounts, namespace ownership and release credentials must
be configured before publishing there. See [publishing](publishing.md).
