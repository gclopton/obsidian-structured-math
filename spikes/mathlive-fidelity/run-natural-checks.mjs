import esbuild from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const spikeDir = path.resolve(repoRoot, "spikes/mathlive-fidelity");
const tmpDir = path.resolve(repoRoot, ".tmp/mathlive-fidelity-natural");
const resultPath = path.join(spikeDir, "natural-results.json");
const sampleIds = new Set([9, 12, 20, 22, 25, 28, 29]);

function staticServer(root) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const filePath = url.pathname === "/"
      ? path.join(spikeDir, "index.html")
      : path.join(root, decodeURIComponent(url.pathname.slice(1)));

    try {
      const data = await readFile(filePath);
      const type = filePath.endsWith(".js") ? "text/javascript" : "text/html";
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

const battery = JSON.parse(await readFile(path.join(spikeDir, "battery.json"), "utf8"))
  .filter((item) => sampleIds.has(item.id));
const { server, url } = await staticServer(tmpDir);
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  await page.goto(url);

  const items = [];
  for (const item of battery) {
    await page.evaluate((latex) => {
      window.spikeMathlive.setValue(latex);
      window.spikeMathlive.focus();
      window.spikeMathlive.execute("moveToMathfieldStart");
    }, item.latex);

    const moves = item.id === 20 ? 6 : 10;
    const moveResults = [];
    for (let i = 0; i < moves; i += 1) {
      moveResults.push(await page.evaluate(() => window.spikeMathlive.execute("moveToNextChar")));
    }

    let afterInsertion = item.latex;
    for (let attempt = 0; attempt < 6 && afterInsertion === item.latex; attempt += 1) {
      if (attempt > 0) {
        await page.evaluate(() => window.spikeMathlive.execute("moveToNextChar"));
      }
      await page.keyboard.type("z");
      await page.waitForTimeout(50);
      afterInsertion = await page.evaluate(() => window.spikeMathlive.getValue());
    }

    let rowCommandResult = null;
    let afterRowCommand = null;
    if (item.id === 22 || item.id === 25) {
      rowCommandResult = await page.evaluate(() => window.spikeMathlive.execute("addRowAfter"));
      afterRowCommand = await page.evaluate(() => window.spikeMathlive.getValue());
    }

    const changed = afterInsertion !== item.latex;
    const stillSerializable = typeof afterInsertion === "string" && afterInsertion.length > 0;
    const navigationWorked = moveResults.some(Boolean);
    const rowWorked = item.id === 22 || item.id === 25
      ? rowCommandResult === true && afterRowCommand !== afterInsertion
      : true;

    items.push({
      id: item.id,
      name: item.name,
      navigationWorked,
      changed,
      stillSerializable,
      rowCommandResult,
      naturalEditPass: navigationWorked && changed && stillSerializable && rowWorked,
      input: item.latex,
      afterInsertion,
      afterRowCommand,
      notes: "Automated probe: move from mathfield start by arrow-equivalent commands, type z, retrying with additional right moves if the first insertion point rejects text; for multiline must-pass items run addRowAfter.",
    });
  }

  const results = {
    date: "2026-08-03",
    items,
    summary: {
      passes: items.filter((item) => item.naturalEditPass).length,
      failures: items.filter((item) => !item.naturalEditPass).length,
    },
  };

  await writeFile(resultPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, resultPath)}`);
  console.log(JSON.stringify(results.summary, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
