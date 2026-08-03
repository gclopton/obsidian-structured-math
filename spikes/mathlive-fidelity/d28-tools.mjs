export function applySerializerFixups(value) {
  const fixups = [];
  let output = value;

  const middlePattern = /\\middle\{\|\}/g;
  if (middlePattern.test(output)) {
    output = output.replace(middlePattern, "\\middle|");
    fixups.push({
      id: "middle-delimiter-brace",
      description: "Rewrite MathLive nonstandard \\middle{|} output to standard \\middle|.",
    });
  }

  return { output, fixups };
}

export function normalizeD28(value) {
  let normalized = value;
  normalized = normalized.replace(/\s+/g, "");
  normalized = normalized.replace(/\\left/g, "").replace(/\\right/g, "");
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

export function classifyStrict(input, output, tolerance) {
  if (input === output) return { diffClass: "identical", pass: true };
  if (tolerance === "identical") return { diffClass: "destructive", pass: false };

  const normalizedInput = input
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\^\{([A-Za-z0-9+\-=])\}/g, "^$1")
    .replace(/_\{([A-Za-z0-9+\-=])\}/g, "_$1")
    .replace(/\s+/g, "");
  const normalizedOutput = output
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\^\{([A-Za-z0-9+\-=])\}/g, "^$1")
    .replace(/_\{([A-Za-z0-9+\-=])\}/g, "_$1")
    .replace(/\s+/g, "");

  if (normalizedInput === normalizedOutput) {
    return { diffClass: "cosmetic", pass: true };
  }
  if (tolerance === "cosmetic-or-raw") {
    return { diffClass: "raw", pass: true };
  }
  return { diffClass: "destructive", pass: false };
}

export function classifyD28(input, fixedOutput) {
  if (input === fixedOutput) return { diffClass: "identical", pass: true };
  if (normalizeD28(input) === normalizeD28(fixedOutput)) {
    return { diffClass: "d28-cosmetic", pass: true };
  }
  return { diffClass: "destructive", pass: false };
}
