export interface LatexFixup {
  id: string;
  description: string;
}

export interface FixedLatex {
  latex: string;
  fixups: LatexFixup[];
}

export function applySerializerFixups(latex: string): FixedLatex {
  const fixups: LatexFixup[] = [];
  let fixed = latex;

  const middleDelimiterBrace = /\\middle\{\|\}/g;
  if (middleDelimiterBrace.test(fixed)) {
    fixed = fixed.replace(middleDelimiterBrace, "\\middle|");
    fixups.push({
      id: "middle-delimiter-brace",
      description: "Rewrite MathLive nonstandard \\middle{|} output to standard \\middle|.",
    });
  }

  return { latex: fixed, fixups };
}
