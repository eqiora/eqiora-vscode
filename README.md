<p align="center"><img src="https://raw.githubusercontent.com/nkiyohara/eqiora-vscode/main/media/icon.png" width="96" alt="Eqiora"></p>
<h1 align="center">Eqiora for Visual Studio Code</h1>
<p align="center">Write the model. Read the equations. Explore the physics.</p>

The official Eqiora extension connects `.eqi` source to the mathematics it describes.
Eqiora owns parsing, units, physical meaning and numerical execution; this extension
connects its language server to VS Code and renders its inspection results.

![Equation preview of the included decay model](media/preview.png)

## Features

- **Editing:** canonical highlighting, snippets, brackets, comments, indentation,
  diagnostics, formatting, hover, definitions, references, symbols and folding.
- **Equation Preview:** live LaTeX display with accessible MathML/plain text,
  source navigation, cursor highlighting, model selection and LaTeX export.
- **Model Hierarchy:** nested declarations with navigation to source.
- **Ports and Connections:** compiled entities, connection roles and source definitions.
- **Boundary Condition Map:** topology of domains, supports and boundary ports.
- **Model / Plan:** physical model inventory alongside an explicitly opened numerical
  Plan JSON. Supplied JSON is displayed without claiming validation or execution.
- **Semantic Changes:** capture a baseline and compare the compiler's bounded
  structural fingerprint, alongside before/after equation text.

Rich views are optional. Syntax highlighting works without a server or workspace
trust. The language server reports type and unit errors; the extension does not
maintain another parser, unit system or scientific evaluator.

## Install

Download the `.vsix` matching your workspace host from
[GitHub Releases](https://github.com/nkiyohara/eqiora-vscode/releases), then choose
**Extensions → … → Install from VSIX**. Release packages include the matching
language server. Marketplace and Open VSX listings are not yet published.

For source builds without a bundled server, install the server from the exact
Eqiora revision in [upstream.json](upstream.json), or use **Eqiora: Select Language
Server**. An older LSP server can provide basic editing; rich views require
`experimental.eqioraInspection = 1`.

Open an `.eqi` file, then choose **Eqiora: Open Equation Preview** or use the equation
button in the editor title. The Eqiora activity bar contains model, port and
boundary explorers. Try **Eqiora: Open Example Model** to see exponential decay.

[Learn the mathematics](https://eqiora.org/learn/) ·
[Language reference](https://eqiora.org/reference/language/) ·
[Settings and commands](docs/guide.md) · [Development](CONTRIBUTING.md)

## Environments and boundaries

The extension runs on the **workspace host**: local desktop, SSH, WSL, a development
container or Codespaces. Configure a server for that host's OS and architecture.
A browser connected to Codespaces uses its remote native extension host; standalone
vscode.dev virtual workspaces are not supported.

Compiled inspection uses unsaved source and the server's exact local-package graph.
Models that need unbound parameters, invalid edits and unsupported renderings show
explicit analysis notes. An invalid or stale response cannot masquerade as a current
successful preview. Boundaries are a topological view, not a CAD viewport.

Structural comparison uses the compiler's supported vocabulary and resource bounds;
it does not promise identical solver outputs. This extension does not run models,
infer solvers, validate arbitrary Plan JSON, implement rename or provide semantic
completion beyond the shipped snippets and existing server capabilities.

## Ownership

- [Eqiora](https://github.com/nkiyohara/eqiora): language, compiler, mathematical
  rendering, language server and canonical syntax bundle.
- This repository: editor integration, settings, rich views, icons, packaging and
  independent extension releases.

The syntax bundle and brand mark are copied from an exact Eqiora commit by
`npm run sync:upstream`. Change their sources in Eqiora first.

Licensed under Apache-2.0. KaTeX is included under its MIT license.
