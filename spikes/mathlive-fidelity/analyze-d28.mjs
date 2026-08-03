import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyD28, normalizeD28 } from "./d28-tools.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const spikeDir = path.join(repoRoot, "spikes/mathlive-fidelity");
const resultPath = path.join(spikeDir, "results.json");
const analysisPath = path.join(spikeDir, "d28-analysis.json");

const results = JSON.parse(await readFile(resultPath, "utf8"));
const items = results.items.map((item) => {
  const output = item.output ?? item.serializerOutput;
  const inputD28 = normalizeD28(item.input);
  const outputD28 = normalizeD28(output);
  const d28 = classifyD28(item.input, output);
  return {
    id: item.id,
    name: item.name,
    strictPass: item.strictPass,
    proposedD28Pass: d28.pass,
    fixupsApplied: item.fixupsApplied ?? [],
    input: item.input,
    serializerOutput: item.serializerOutput,
    output,
    normalizedInput: inputD28,
    normalizedOutput: outputD28,
  };
});

const counted = items.filter((item) => item.id <= 36);
const analysis = {
  date: "2026-08-03",
  status: "provisional; depends on Sam approving D28",
  normalizationRules: [
    "ignore whitespace",
    "ignore \\left/\\right insertion or removal",
    "ignore braces around single-character subscript/superscript arguments",
    "treat \\tfrac{1}{2} and \\tfrac12 as equivalent for single-token numerator/denominator",
    "treat \\sqrt{3} and \\sqrt3 as equivalent for single-token radicands",
    "treat r' and r^{\\prime} as equivalent",
    "treat MathLive \\mathrm argument/subscript restructuring as equivalent when token order is unchanged",
    "treat \\longrightarrow{E} and \\longrightarrow E as equivalent for single-token following arguments",
    "apply explicit fixup for MathLive's nonstandard \\middle{|} before comparison and before any commit to a note",
  ],
  summary: {
    strictCountedPasses: counted.filter((item) => item.strictPass).length,
    proposedD28CountedPasses: counted.filter((item) => item.proposedD28Pass).length,
    proposedD28CountedFailures: counted.filter((item) => !item.proposedD28Pass).length,
    mustPassAligned: items.find((item) => item.id === 22)?.proposedD28Pass === true,
    mustPassCases: items.find((item) => item.id === 25)?.proposedD28Pass === true,
    fixupItems: items.filter((item) => item.fixupsApplied.length > 0).map((item) => item.id),
  },
  failures: items.filter((item) => !item.proposedD28Pass),
  items,
};

await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Wrote ${path.relative(repoRoot, analysisPath)}`);
console.log(JSON.stringify(analysis.summary, null, 2));
