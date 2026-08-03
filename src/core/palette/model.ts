import type { MathTemplate } from "../contracts";
import type { PaletteUsageState } from "../templates/ranking";
import { rankTemplates } from "../templates/ranking";

export interface PaletteModel {
  query: string;
  selectedIndex: number;
  mode: "math" | "text";
}

export function initialPaletteModel(mode: "math" | "text"): PaletteModel {
  return { query: "", selectedIndex: 0, mode };
}

export function appendQuery(model: PaletteModel, char: string): PaletteModel {
  return { ...model, query: `${model.query}${char}`, selectedIndex: 0 };
}

export function backspaceQuery(model: PaletteModel): PaletteModel {
  return { ...model, query: model.query.slice(0, -1), selectedIndex: 0 };
}

export function moveSelection(model: PaletteModel, delta: number, resultCount: number): PaletteModel {
  if (resultCount === 0) return { ...model, selectedIndex: 0 };
  return { ...model, selectedIndex: (model.selectedIndex + delta + resultCount) % resultCount };
}

export function paletteResults(templates: readonly MathTemplate[], model: PaletteModel, usage: PaletteUsageState): MathTemplate[] {
  return rankTemplates(templates, model.query, usage, model.mode).map((item) => item.template);
}
