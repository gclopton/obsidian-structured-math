import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const spikeDir = path.join(repoRoot, "spikes/mathlive-fidelity");
const resultPath = path.join(spikeDir, "results.json");
const analysisPath = path.join(spikeDir, "d28-analysis.json");

function normalizeD28(value) {
  let normalized = value;
  normalized = normalized.replace(/\s+/g, "");
  normalized = normalized.replace(/\\left/g, "").replace(/\\right/g, "");
  normalized = normalized.replace(/\\middle\{\|\}/g, "\\middle|");
  normalized = normalized.replace(/([A-Za-z])\^\{\\prime\}/g, "$1'");
  normalized = normalized.replace(/(\\[A-Za-z]+\{[^{}]+\})\^\{\\prime\}/g, "$1'");
  normalized = normalized.replace(/\\(t?frac)\{([^{}])\}\{([^{}])\}/g, "\\$1$2$3");
  normalized = normalized.replace(/\\sqrt\{([^{}])\}/g, "\\sqrt$1");
  normalized = normalized.replace(/_\{([A-Za-z0-9+\-=])\}/g, "_$1");
  normalized = normalized.replace(/\^\{([A-Za-z0-9+\-=])\}/g, "^$1");
  normalized = normalized.replace(/_\{(\\[A-Za-z]+)\}/g, "_$1");
  normalized = normalized.replace(/\^\{(\\[A-Za-z]+)\}/g, "^$1");
  normalized = normalized.replace(/\\mathrm\{([A-Za-z]+)\}_([A-Za-z0-9])/g, "\\mathrm{$1_$2}");
  normalized = normalized.replace(/\\mathrm\{([A-Za-z]+)([0-9])([A-Za-z]+)\}_([0-9])/g, "\\mathrm{$1$2$3_$4}");
  normalized = normalized.replace(/\\mathrm\{([A-Za-z]+_[0-9]+[A-Za-z]+)\}_([0-9])/g, "\\mathrm{$1_$2}");
  normalized = normalized.replace(/\\longrightarrow\{([A-Za-z])\}/g, "\\longrightarrow$1");
  return normalized;
}

const results = JSON.parse(await readFile(resultPath, "utf8"));
const items = results.items.map((item) => {
  const inputD28 = normalizeD28(item.input);
  const outputD28 = normalizeD28(item.output);
  const middleRewrite = item.output.includes("\\middle{|}");
  return {
    id: item.id,
    name: item.name,
    strictPass: item.roundtripPass,
    proposedD28Pass: inputD28 === outputD28,
    requiresMiddleCompatibilityCheck: middleRewrite,
    input: item.input,
    output: item.output,
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
    "flag \\middle| to \\middle{|} for external compatibility review",
  ],
  summary: {
    strictCountedPasses: counted.filter((item) => item.strictPass).length,
    proposedD28CountedPasses: counted.filter((item) => item.proposedD28Pass).length,
    proposedD28CountedFailures: counted.filter((item) => !item.proposedD28Pass).length,
    mustPassAligned: items.find((item) => item.id === 22)?.proposedD28Pass === true,
    mustPassCases: items.find((item) => item.id === 25)?.proposedD28Pass === true,
    middleCompatibilityItems: items.filter((item) => item.requiresMiddleCompatibilityCheck).map((item) => item.id),
  },
  failures: items.filter((item) => !item.proposedD28Pass),
  items,
};

await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Wrote ${path.relative(repoRoot, analysisPath)}`);
console.log(JSON.stringify(analysis.summary, null, 2));
