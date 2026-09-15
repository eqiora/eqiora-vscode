import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const file = process.argv[2] ?? "eqiora.vsix";
const bytes = await readFile(file);
if (bytes.length < 1024) throw new Error("VSIX package is unexpectedly empty");
const result = spawnSync(
  process.execPath,
  ["node_modules/@vscode/vsce/vsce", "ls", "--tree"],
  { encoding: "utf8" },
);
if (result.status !== 0) throw new Error(result.stderr);
for (const required of [
  "extension.cjs",
  "webview.js",
  "icon.png",
  "eqiora.tmLanguage.json",
])
  if (!result.stdout.includes(required))
    throw new Error(`Missing packaged resource: ${required}`);
console.log(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
