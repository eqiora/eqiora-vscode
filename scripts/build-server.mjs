import { spawnSync } from "node:child_process";
import { mkdir, copyFile, readFile } from "node:fs/promises";
import path from "node:path";
const upstream = JSON.parse(await readFile("upstream.json", "utf8"));
const revision = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: "upstream",
  encoding: "utf8",
});
if (revision.status !== 0 || revision.stdout.trim() !== upstream.revision)
  throw new Error("Server source does not match the pinned upstream revision.");
const result = spawnSync(
  "cargo",
  ["build", "--locked", "--release", "-p", "eqiora-language-server"],
  {
    cwd: "upstream",
    stdio: "inherit",
    env: {
      ...process.env,
      CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "3",
    },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
await mkdir("server", { recursive: true });
const binary =
  process.platform === "win32"
    ? "eqiora-language-server.exe"
    : "eqiora-language-server";
await copyFile(
  path.resolve("upstream/target/release", binary),
  path.join("server", binary),
);
