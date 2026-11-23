import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { convertFormulaLibraryFile } from "../../src/core/templates/formula-library-converter";
import { builtInCatalog, validateCatalog } from "../../src/core/templates/registry";
import { rankTemplates, recordTemplateUse, type PaletteUsageState } from "../../src/core/templates/ranking";
import { appendQuery, initialPaletteModel, paletteResults } from "../../src/core/palette/model";

describe("core catalog", () => {
  it("is valid and contains the normative structural entries", () => {
    const catalog = builtInCatalog();

    expect(validateCatalog(catalog)).toEqual([]);
    expect(catalog.find((template) => template.id === "fraction")?.latex).toBe("\\frac{#0}{\\placeholder{}}");
    expect(catalog.find((template) => template.id === "pmatrix")?.aliases).toContain("matrix");
  });
});

describe("Formula Library converter", () => {
  it("converts pinned reference files into MathTemplate records", () => {
    const file = JSON.parse(
      // Exact Formula Library input from upstream ed25a986bca72c742dd1d2dc3777b607f0f5c79a.
      readFileSync(new URL("../fixtures/formula-library/functions.json", import.meta.url), "utf8")
    );

    const converted = convertFormulaLibraryFile(file);
    const sin = converted.find((template) => template.latex === "\\sin");

    expect(converted.length).toBeGreaterThan(100);
    expect(sin?.title).toBe("sin");
    expect(sin?.aliases).toContain("sin");
  });
});

describe("ranking", () => {
  const catalog = builtInCatalog();
  const emptyUsage: PaletteUsageState = { recents: [], frequency: {}, favorites: [] };

  it("narrows as the query grows toward sin", () => {
    const formulaTemplates = convertFormulaLibraryFile({
      id: "functions",
      structures: false,
      items: [["sin", "\\sin"], ["cos", "\\cos"], ["sinh", "\\sinh"]],
    });
    const templates = [...catalog, ...formulaTemplates];

    expect(rankTemplates(templates, "\\s", emptyUsage, "math").map((item) => item.template.id)).toContain("formula-library.functions-sin");
    expect(rankTemplates(templates, "\\si", emptyUsage, "math")[0]?.template.latex).toBe("\\sin");
    expect(rankTemplates(templates, "\\sin", emptyUsage, "math")[0]?.template.latex).toBe("\\sin");
  });

  it("shows recent templates first for an empty query", () => {
    const usage = recordTemplateUse(recordTemplateUse(emptyUsage, "pmatrix"), "fraction");
    const results = rankTemplates(catalog, "", usage, "math").map((item) => item.template.id);

    expect(results.slice(0, 2)).toEqual(["fraction", "pmatrix"]);
  });

  it("keeps exact text matches above recency boosts", () => {
    const usage = recordTemplateUse(emptyUsage, "pmatrix");
    const results = rankTemplates(catalog, "frac", usage, "math").map((item) => item.template.id);

    expect(results[0]).toBe("fraction");
  });
});

describe("palette model", () => {
  it("resets selection while typing a live query", () => {
    const usage: PaletteUsageState = { recents: [], frequency: {}, favorites: [] };
    let model = initialPaletteModel("math");

    model = appendQuery(model, "s");
    model = appendQuery(model, "i");

    expect(model.query).toBe("si");
    expect(model.selectedIndex).toBe(0);
    expect(paletteResults(builtInCatalog(), model, usage).length).toBeGreaterThan(0);
  });
});
