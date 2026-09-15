import { runTests } from "@vscode/test-electron";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const workspace = await mkdtemp(path.join(tmpdir(), "eqiora-vscode-"));
try {
  await copyFile("examples/decay.eqi", path.join(workspace, "decay.eqi"));
  await runTests({
    extensionDevelopmentPath: process.cwd(),
    extensionTestsPath: path.resolve("dist/editor-test.cjs"),
    version: process.env.VSCODE_VERSION ?? "stable",
    launchArgs: [
      workspace,
      "--disable-workspace-trust",
      "--no-sandbox",
      "--disable-gpu",
      "--skip-welcome",
      "--skip-release-notes",
    ],
    extensionTestsEnv: { EQIORA_SERVER: process.env.EQIORA_SERVER ?? "" },
  });
} finally {
  await rm(workspace, { recursive: true, force: true });
}
