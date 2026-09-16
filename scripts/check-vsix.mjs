import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fromBuffer } from "yauzl";
const file = process.argv[2] ?? "eqiora.vsix";
const bytes = await readFile(file);
if (bytes.length < 1024) throw new Error("VSIX package is unexpectedly empty");
const expected = JSON.parse(await readFile("package.json", "utf8"));
let manifest;
const entries = await new Promise((resolve, reject) => {
  fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
    if (error) return reject(error);
    const names = new Set();
    zip.on("error", reject);
    zip.on("entry", (entry) => {
      if (entry.uncompressedSize > 0) names.add(entry.fileName);
      if (entry.fileName === "extension/package.json") {
        zip.openReadStream(entry, (error, stream) => {
          if (error) return reject(error);
          const chunks = [];
          stream.on("error", reject);
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("end", () => {
            try {
              manifest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              zip.readEntry();
            } catch (error) {
              reject(error);
            }
          });
        });
        return;
      }
      zip.readEntry();
    });
    zip.on("end", () => resolve(names));
    zip.readEntry();
  });
});
for (const required of [
  "extension/package.json",
  "extension/dist/extension.cjs",
  "extension/dist/webview.js",
  "extension/media/icon.png",
  "extension/vendor/syntax/syntaxes/eqiora.tmLanguage.json",
  ...(process.argv[2]
    ? [
        `extension/server/eqiora-language-server${file.includes("win32") ? ".exe" : ""}`,
      ]
    : []),
])
  if (!entries.has(required))
    throw new Error(`Missing packaged resource: ${required}`);
for (const field of ["publisher", "name", "version"])
  if (manifest?.[field] !== expected[field])
    throw new Error(`Packaged ${field} does not match package.json`);
console.log(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
