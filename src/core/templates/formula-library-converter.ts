import type { MathTemplate } from "../contracts";

type FormulaEntry = [name: string, latex: string, nameEn?: string];
type SectionEntry = { section?: string; sectionEn?: string };
type FormulaItem = FormulaEntry | SectionEntry;

export interface FormulaLibraryFile {
  id: string;
  structures: boolean;
  items: FormulaItem[];
}

function isFormulaEntry(item: FormulaItem): item is FormulaEntry {
  return Array.isArray(item);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\[a-z]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function aliasesFromLatex(latex: string, name: string, nameEn?: string): string[] {
  const commands = Array.from(new Set(latex.match(/\\[A-Za-z]+/g) ?? []))
    .map((command) => command.slice(1));
  const names = [name, nameEn ?? ""]
    .flatMap((value) => value.split(/[^A-Za-z0-9]+/))
    .filter((value) => value.length > 1)
    .map((value) => value.toLowerCase());
  return Array.from(new Set([...commands, ...names]));
}

function normalizePlaceholders(latex: string): string {
  return latex.replace(/#\?/g, "\\placeholder{}").replace(/#@/g, "#0");
}

export function convertFormulaLibraryFile(file: FormulaLibraryFile): MathTemplate[] {
  let section = file.id;
  const templates: MathTemplate[] = [];

  for (const item of file.items) {
    if (!isFormulaEntry(item)) {
      section = item.sectionEn ?? item.section ?? file.id;
      continue;
    }

    const [name, latex, nameEn] = item;
    const title = nameEn ?? name;
    const normalizedLatex = normalizePlaceholders(latex);
    const baseId = slug(`${file.id}-${title || name || normalizedLatex}`);
    const wraps = normalizedLatex.includes("#0");
    templates.push({
      id: `formula-library.${baseId || templates.length}`,
      title,
      aliases: aliasesFromLatex(normalizedLatex, name, nameEn),
      category: section,
      latex: normalizedLatex,
      wraps,
      mode: "math",
    });
  }

  return templates;
}
