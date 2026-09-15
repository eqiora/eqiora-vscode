import { build } from "esbuild";
import { mkdir, cp } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await Promise.all([
  build({
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    external: ["vscode"],
    sourcemap: true,
  }),
  build({
    entryPoints: ["src/webview.ts"],
    outfile: "dist/webview.js",
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
  }),
  build({
    entryPoints: ["test/editor.ts"],
    outfile: "dist/editor-test.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
  }),
]);
await cp("node_modules/katex/dist/katex.min.css", "dist/katex.min.css");
await cp("node_modules/katex/dist/fonts", "dist/fonts", { recursive: true });
await cp("node_modules/katex/LICENSE", "dist/KATEX-LICENSE");
