import esbuild from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applySerializerFixups, classifyD28, classifyStrict } from "./d28-tools.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const spikeDir = path.resolve(repoRoot, "spikes/mathlive-fidelity");
const tmpDir = path.resolve(repoRoot, ".tmp/mathlive-fidelity");
const batteryPath = path.join(spikeDir, "battery.json");
const resultPath = path.join(spikeDir, "results.json");

function staticServer(root) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const filePath = url.pathname === "/"
      ? path.join(spikeDir, "index.html")
      : path.join(root, decodeURIComponent(url.pathname.slice(1)));

    try {
      const data = await readFile(filePath);
      const type = filePath.endsWith(".js") ? "text/javascript" : filePath.endsWith(".css") ? "text/css" : "text/html";
      res.writeHead(200, { "content-type": type });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No server address.");
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

await mkdir(tmpDir, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(spikeDir, "browser-entry.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: path.join(tmpDir, "browser-entry.js"),
  logLevel: "silent",
});

const battery = JSON.parse(await readFile(batteryPath, "utf8"));
const { server, url } = await staticServer(tmpDir);
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  await page.goto(url);

  const items = [];
  for (const item of battery) {
    await page.evaluate((latex) => {
      window.spikeMathlive.setValue(latex);
    }, item.latex);
    await page.waitForTimeout(50);
    const cachedOutput = await page.evaluate(() => window.spikeMathlive.getValue("latex"));
    const serializerOutput = await page.evaluate(() => window.spikeMathlive.getValue("latex-expanded"));
    const fixed = applySerializerFixups(serializerOutput);
    const strictResult = classifyStrict(item.latex, serializerOutput, item.tolerance);
    const d28Result = classifyD28(item.latex, fixed.output);
    items.push({
      id: item.id,
      name: item.name,
      input: item.latex,
      cachedOutput,
      serializerOutput,
      output: fixed.output,
      outputFormat: "latex-expanded",
      fixupsApplied: fixed.fixups,
      tolerance: item.tolerance,
      mustPass: item.mustPass,
      strictDiffClass: strictResult.diffClass,
      strictPass: strictResult.pass,
      d28DiffClass: d28Result.diffClass,
      d28Pass: d28Result.pass,
      diffClass: d28Result.diffClass,
      roundtripPass: d28Result.pass,
      naturalEditPass: null,
      notes: d28Result.pass ? "" : "Round-trip output is outside ratified D28 tolerance.",
    });
  }

  const counted = items.filter((item) => item.id <= 36);
  const strictCountedPasses = counted.filter((item) => item.strictPass).length;
  const strictCountedFailures = counted.length - strictCountedPasses;
  const countedPasses = counted.filter((item) => item.d28Pass).length;
  const countedFailures = counted.length - countedPasses;
  const mustPassAligned = items.find((item) => item.id === 22)?.d28Pass === true;
  const mustPassCases = items.find((item) => item.id === 25)?.d28Pass === true;
  const singleLinePasses = items.filter((item) => item.id <= 20 && item.d28Pass).length;
  const decision = countedPasses >= 36 && mustPassAligned && mustPassCases
    ? "pass"
    : countedPasses >= 36
      ? "conditional"
      : singleLinePasses >= 18
        ? "conditional"
        : "fail";

  const results = {
    mathliveVersion: "0.110.0",
    date: "2026-08-03",
    method: "canonical true-serialization run: setValue(input), read getValue('latex-expanded'), apply explicit sync-layer fixups, classify under ratified D28; cached getValue('latex') retained only for BS-37 comparison",
    items,
    summary: {
      strictCountedPasses,
      strictCountedFailures,
      countedPasses,
      countedFailures,
      mustPassAligned,
      mustPassCases,
      fixupItems: items.filter((item) => item.fixupsApplied.length > 0).map((item) => item.id),
      decision,
    },
  };

  await writeFile(resultPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, resultPath)}`);
  console.log(JSON.stringify(results.summary, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
