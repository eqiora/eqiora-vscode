import { readFile, writeFile, mkdir } from "node:fs/promises";
const upstream = JSON.parse(await readFile("upstream.json", "utf8"));
if (!/^[0-9a-f]{40}$/.test(upstream.revision))
  throw new Error("Pin a full upstream commit SHA.");
const files = [
  "bundle.json",
  "language-configuration.json",
  "snippets/eqiora.json",
  "syntaxes/eqiora.tmLanguage.json",
  "README.md",
];
for (const file of files) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${upstream.repository}/${upstream.revision}/editor/eqiora/${file}`,
  );
  if (!response.ok)
    throw new Error(`Could not fetch ${file}: ${response.status}`);
  const target = `vendor/syntax/${file}`;
  await mkdir(target.substring(0, target.lastIndexOf("/")), {
    recursive: true,
  });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}
for (const [source, target] of [
  ["docs/site/src/assets/brand/eqiora-mark.svg", "media/icon.svg"],
  ["docs/site/src/assets/brand/eqiora-mark.svg", "media/file.svg"],
  ["docs/site/public/apple-touch-icon.png", "media/icon.png"],
]) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${upstream.repository}/${upstream.revision}/${source}`,
  );
  if (!response.ok) throw new Error(`Could not fetch ${source}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}
const bundle = JSON.parse(await readFile("vendor/syntax/bundle.json", "utf8"));
if (bundle.bundleVersion !== upstream.syntaxBundle)
  throw new Error("Update the declared syntax bundle version.");
