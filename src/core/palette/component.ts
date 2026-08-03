import type { MathTemplate } from "../contracts";
import type { PaletteUsageState } from "../templates/ranking";
import {
  appendQuery,
  backspaceQuery,
  initialPaletteModel,
  moveSelection,
  paletteResults,
  setQuery,
  type PaletteModel,
} from "./model";

export interface PaletteComponentOptions {
  templates: readonly MathTemplate[];
  usage: PaletteUsageState;
  mode: "math" | "text";
  onInsert(template: MathTemplate): void;
  onCancel(): void;
}

export class PaletteComponent {
  readonly element: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLUListElement;
  private readonly footer: HTMLDivElement;
  private model: PaletteModel;

  constructor(private readonly options: PaletteComponentOptions) {
    this.model = initialPaletteModel(options.mode);
    this.element = document.createElement("div");
    this.element.className = "structured-math-palette";
    this.element.tabIndex = -1;

    this.input = document.createElement("input");
    this.input.className = "structured-math-palette-input";
    this.input.setAttribute("aria-label", "Template search");

    this.list = document.createElement("ul");
    this.list.className = "structured-math-palette-list";

    this.footer = document.createElement("div");
    this.footer.className = "structured-math-palette-footer";

    this.element.append(this.input, this.list, this.footer);
    this.input.addEventListener("keydown", (event) => this.handleKeydown(event));
    this.input.addEventListener("input", () => this.handleInput());
    this.render();
  }

  focus(): void {
    for (const field of Array.from(document.querySelectorAll<HTMLElement>("math-field"))) {
      field.blur();
    }
    this.input.focus();
    window.setTimeout(() => this.input.focus(), 0);
  }

  results(): MathTemplate[] {
    return paletteResults(this.options.templates, this.model, this.options.usage);
  }

  query(): string {
    return this.model.query;
  }

  selectedTemplate(): MathTemplate | null {
    return this.results()[this.model.selectedIndex] ?? null;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.options.onCancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const template = this.selectedTemplate();
      if (template) this.options.onInsert(template);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      this.model = moveSelection(this.model, delta, this.results().length);
      this.render();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      this.model = backspaceQuery(this.model);
      this.render();
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.model = appendQuery(this.model, event.key);
      this.render();
    }
  }

  private handleInput(): void {
    if (this.input.value === this.model.query) return;
    this.model = setQuery(this.model, this.input.value);
    this.render();
  }

  private render(): void {
    const results = this.results().slice(0, 40);
    this.input.value = this.model.query;
    this.list.replaceChildren();

    for (const [index, template] of results.entries()) {
      const row = document.createElement("li");
      row.className = "structured-math-palette-row";
      row.dataset.templateId = template.id;
      row.setAttribute("aria-selected", String(index === this.model.selectedIndex));

      const title = document.createElement("span");
      title.className = "structured-math-palette-title";
      title.textContent = template.title;

      const preview = document.createElement("code");
      preview.className = "structured-math-palette-preview";
      preview.textContent = template.latex;

      row.append(title, preview);
      this.list.append(row);
    }

    const selected = this.selectedTemplate();
    this.footer.textContent = selected?.description ?? selected?.id ?? "";
  }
}
