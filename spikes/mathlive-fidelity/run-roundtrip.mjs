import esbuild from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const spikeDir = path.resolve(repoRoot, "spikes/mathlive-fidelity");
const tmpDir = path.resolve(repoRoot, ".tmp/mathlive-fidelity");
const batteryPath = path.join(spikeDir, "battery.json");
const resultPath = path.join(spikeDir, "results.json");

function normalizeCosmetic(value) {
  return value
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\^\{([A-Za-z0-9+\-=])\}/g, "^$1")
    .replace(/_\{([A-Za-z0-9+\-=])\}/g, "_$1")
    .replace(/\s+/g, "");
}

function classify(input, output, tolerance) {
  if (input === output) return { diffClass: "identical", pass: true };
  if (tolerance === "identical") return { diffClass: "destructive", pass: false };
  if (normalizeCosmetic(input) === normalizeCosmetic(output)) {
    return { diffClass: "cosmetic", pass: true };
  }
  if (tolerance === "cosmetic-or-raw") {
    return { diffClass: "raw", pass: true };
  }
  return { diffClass: "destructive", pass: false };
}

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
    const output = await page.evaluate(() => window.spikeMathlive.getValue());
    const result = classify(item.latex, output, item.tolerance);
    items.push({
      id: item.id,
      name: item.name,
      input: item.latex,
      output,
      tolerance: item.tolerance,
      mustPass: item.mustPass,
      diffClass: result.diffClass,
      roundtripPass: result.pass,
      naturalEditPass: null,
      notes: result.pass ? "" : "Round-trip output is outside D16 cosmetic tolerance.",
    });
  }

  const counted = items.filter((item) => item.id <= 36);
  const countedPasses = counted.filter((item) => item.roundtripPass).length;
  const countedFailures = counted.length - countedPasses;
  const mustPassAligned = items.find((item) => item.id === 22)?.roundtripPass === true;
  const mustPassCases = items.find((item) => item.id === 25)?.roundtripPass === true;
  const singleLinePasses = items.filter((item) => item.id <= 20 && item.roundtripPass).length;
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
    items,
    summary: {
      countedPasses,
      countedFailures,
      mustPassAligned,
      mustPassCases,
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
