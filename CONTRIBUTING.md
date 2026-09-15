# Development

Use Node.js 24 and the committed lockfile.

```sh
npm ci
npm run verify
npm run package
```

F5 starts an Extension Development Host. Set `eqiora.server.path` to the matching
Eqiora language server, or build it with `node scripts/build-server.mjs` after
checking the exact upstream revision out at `upstream/`.

```sh
EQIORA_SERVER=/absolute/path/to/eqiora-language-server npm run test:editor
# Linux without a display:
EQIORA_SERVER=/absolute/path/to/eqiora-language-server xvfb-run -a npm run test:editor
```

The editor integration test starts real VS Code and the real Rust server. Unit
tests exercise comparison boundaries and presentation safety. CI builds and tests
native packages on Linux x64, Windows x64 and macOS ARM64.

## Update Eqiora

Update the immutable revision in `upstream.json`, then run `npm run sync:upstream`.
This copies the canonical syntax bundle and brand assets without forking them.
Update the compatibility notes and test against the corresponding server. Never
reimplement language parsing, mathematical notation or physical semantics in TS.

Use a pull request for changes. Run focused checks; perform a risk-focused review
for executable launch, webview trust or release workflow changes. Branch protection
requires CI with no actor-separation requirement. Sign off commits (`git commit -s`).
