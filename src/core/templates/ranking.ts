import type { MathTemplate } from "../contracts";
import { latexCommands } from "./registry";

export interface PaletteUsageState {
  recents: string[];
  frequency: Record<string, number>;
  favorites: string[];
}

export interface RankedTemplate {
  template: MathTemplate;
  score: number;
}

const RECENCY_SCORES = [60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fuzzySubsequenceScore(query: string, candidate: string): number {
  let qi = 0;
  let penalty = 0;
  for (let ci = 0; ci < candidate.length && qi < query.length; ci += 1) {
    if (candidate[ci] === query[qi]) {
      penalty += ci - qi;
      qi += 1;
    }
  }
  return qi === query.length ? Math.max(0, 200 - penalty) : 0;
}

function textScore(template: MathTemplate, query: string): number {
  const primaryFields = [
    template.id,
    ...template.aliases,
  ].map(normalize);
  const commandFields = [
    ...latexCommands(template.latex).map((command) => command.slice(1)),
  ].map(normalize);
  const title = normalize(template.title);
  const fields = [...primaryFields, ...commandFields];

  if (primaryFields.some((field) => field === query)) return 1000;
  if (primaryFields.some((field) => field.startsWith(query))) return 800;
  if (commandFields.some((field) => field === query)) return 700;
  if (commandFields.some((field) => field.startsWith(query))) return 650;
  if (title.startsWith(query)) return 600;
  if ([...fields, title].some((field) => field.includes(query))) return 400;
  return Math.max(...[...fields, title].map((field) => fuzzySubsequenceScore(query, field)));
}

function usageScore(template: MathTemplate, usage: PaletteUsageState): number {
  const recentIndex = usage.recents.indexOf(template.id);
  const recency = recentIndex >= 0 ? RECENCY_SCORES[recentIndex] ?? 0 : 0;
  const frequency = Math.min(40, Math.floor((usage.frequency[template.id] ?? 0) * 4));
  const favorite = usage.favorites.includes(template.id) ? 75 : 0;
  return recency + frequency + favorite;
}

export function recordTemplateUse(usage: PaletteUsageState, templateId: string, recentsLength = 12): PaletteUsageState {
  return {
    recents: [templateId, ...usage.recents.filter((id) => id !== templateId)].slice(0, recentsLength),
    frequency: {
      ...usage.frequency,
      [templateId]: (usage.frequency[templateId] ?? 0) + 1,
    },
    favorites: usage.favorites,
  };
}

export function rankTemplates(
  templates: readonly MathTemplate[],
  query: string,
  usage: PaletteUsageState,
  mode: "math" | "text"
): RankedTemplate[] {
  const available = templates.filter((template) => template.mode === mode);
  const normalizedQuery = normalize(query.replace(/^\\/, ""));

  if (normalizedQuery.length === 0) {
    const byId = new Map(available.map((template) => [template.id, template]));
    const recent = usage.recents.flatMap((id) => {
      const template = byId.get(id);
      return template ? [{ template, score: usageScore(template, usage) }] : [];
    });
    const recentIds = new Set(recent.map((item) => item.template.id));
    const remaining = available
      .filter((template) => !recentIds.has(template.id))
      .map((template) => ({ template, score: usageScore(template, usage) }))
      .sort((a, b) => b.score - a.score || a.template.title.localeCompare(b.template.title) || a.template.id.localeCompare(b.template.id));
    return [...recent, ...remaining];
  }

  return available
    .map((template) => ({ template, score: textScore(template, normalizedQuery) + usageScore(template, usage) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.template.title.localeCompare(b.template.title) || a.template.id.localeCompare(b.template.id));
}
