import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const vaultPluginDir = "/Users/gradyclopton/ObsidianVaults/latex/.obsidian/plugins/structured-math";

function run(command, args) {
  const child = spawn(command, args, { cwd: repoRoot, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function copyArtifacts() {
  await mkdir(vaultPluginDir, { recursive: true });
  await copyFile(path.join(repoRoot, "dist/main.js"), path.join(vaultPluginDir, "main.js"));
  await copyFile(path.join(repoRoot, "manifest.json"), path.join(vaultPluginDir, "manifest.json"));
  await copyFile(path.join(repoRoot, "styles.css"), path.join(vaultPluginDir, "styles.css"));
}

await run("node", ["esbuild.config.mjs", "production"]);
await copyArtifacts();
console.log(`Copied plugin artifacts to ${vaultPluginDir}`);
