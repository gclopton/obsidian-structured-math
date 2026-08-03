import coreCatalog from "./core-catalog.json";
import type { MathTemplate } from "../contracts";

export function latexCommands(latex: string): string[] {
  return Array.from(new Set(latex.match(/\\[A-Za-z]+/g) ?? []));
}

export function validateTemplate(template: MathTemplate): string[] {
  const errors: string[] = [];
  if (!template.id) errors.push("missing id");
  if (!template.title) errors.push(`${template.id}: missing title`);
  if (!template.category) errors.push(`${template.id}: missing category`);
  if (!template.latex) errors.push(`${template.id}: missing latex`);
  if (template.wraps !== template.latex.includes("#0")) {
    errors.push(`${template.id}: wraps must equal latex.includes("#0")`);
  }
  return errors;
}

export function validateCatalog(catalog: readonly MathTemplate[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const template of catalog) {
    if (seen.has(template.id)) errors.push(`${template.id}: duplicate id`);
    seen.add(template.id);
    errors.push(...validateTemplate(template));
  }
  return errors;
}

export function builtInCatalog(): MathTemplate[] {
  const templates = coreCatalog as MathTemplate[];
  const errors = validateCatalog(templates);
  if (errors.length > 0) {
    throw new Error(`Invalid core catalog:\n${errors.join("\n")}`);
  }
  return templates;
}

export function mergeCatalogs(...catalogs: readonly MathTemplate[][]): MathTemplate[] {
  const byId = new Map<string, MathTemplate>();
  for (const catalog of catalogs) {
    for (const template of catalog) {
      byId.set(template.id, template);
    }
  }
  return Array.from(byId.values());
}
