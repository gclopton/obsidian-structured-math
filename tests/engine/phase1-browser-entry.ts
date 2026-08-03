import { MathLiveEngine } from "../../src/engine/mathlive/mathlive-engine";
import { builtInCatalog } from "../../src/core/templates/registry";
import { convertFormulaLibraryFile } from "../../src/core/templates/formula-library-converter";
import { recordTemplateUse, type PaletteUsageState } from "../../src/core/templates/ranking";
import { PaletteComponent } from "../../src/core/palette/component";
import type { MathTemplate } from "../../src/core/contracts";

interface TestMathfield extends HTMLElement {
  select(): void;
}

interface Phase1Harness {
  mountEngine(): void;
  selectEngineContent(): void;
  insertFractionTemplate(): void;
  engineLatex(): string;
  mountPalette(): void;
  paletteIds(): string[];
  paletteQuery(): string;
  insertedIds(): string[];
}

declare global {
  interface Window {
    phase1Harness: Phase1Harness;
  }
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing app root.");

const engineHost = document.createElement("div");
const paletteHost = document.createElement("div");
app.append(engineHost, paletteHost);

const engine = new MathLiveEngine();
const inserted: MathTemplate[] = [];

const formulas = convertFormulaLibraryFile({
  id: "functions",
  structures: false,
  items: [["sin", "\\sin"], ["cos", "\\cos"], ["sinh", "\\sinh"]],
});
const catalog = [...builtInCatalog(), ...formulas];
let usage: PaletteUsageState = { recents: [], frequency: {}, favorites: [] };
usage = recordTemplateUse(recordTemplateUse(usage, "pmatrix"), "fraction");
let palette: PaletteComponent | null = null;

window.phase1Harness = {
  mountEngine(): void {
    engine.mount(engineHost, { inline: true, initialLatex: "x+1" });
    engine.focus();
  },
  selectEngineContent(): void {
    const field = engineHost.querySelector<TestMathfield>("math-field");
    if (!field) throw new Error("MathLive field missing.");
    field.select();
  },
  insertFractionTemplate(): void {
    engine.insertTemplate("\\frac{#0}{\\placeholder{}}");
  },
  engineLatex(): string {
    return engine.getLatex();
  },
  mountPalette(): void {
    paletteHost.replaceChildren();
    palette = new PaletteComponent({
      templates: catalog,
      usage,
      mode: "math",
      onInsert(template) {
        inserted.push(template);
      },
      onCancel() {
        paletteHost.replaceChildren();
      },
    });
    paletteHost.append(palette.element);
    palette.focus();
  },
  paletteIds(): string[] {
    return palette?.results().slice(0, 8).map((template) => template.id) ?? [];
  },
  paletteQuery(): string {
    return palette?.query() ?? "";
  },
  insertedIds(): string[] {
    return inserted.map((template) => template.id);
  },
};
