import type { EditorEngine, EngineMountOptions } from "../../core/contracts";
import { applySerializerFixups } from "../../core/latex/fixups";
import "mathlive";

type Direction = "left" | "right" | "up" | "down";

interface MathfieldLike extends HTMLElement {
  setValue(value?: string, options?: unknown): void;
  getValue(format?: string): string;
  insert(value: string, options?: unknown): boolean;
  executeCommand(command: string | [string, ...unknown[]]): boolean;
  focus(): void;
  blur(): void;
  getElementInfo(offset: number): { depth?: number } | undefined;
  position: number;
  lastOffset: number;
  selectionIsCollapsed: boolean;
  mathVirtualKeyboardPolicy: string;
  popoverPolicy: "auto" | "off";
  environmentPopoverPolicy: "auto" | "off" | "on";
  smartMode: boolean;
  smartFence: boolean;
}

function createMathfield(): MathfieldLike {
  return document.createElement("math-field") as MathfieldLike;
}

export class MathLiveEngine implements EditorEngine {
  private field: MathfieldLike | null = null;
  private changeCallbacks = new Set<(latex: string) => void>();
  private boundaryCallbacks = new Set<(dir: Direction) => void>();
  private paletteCallbacks = new Set<(anchor: DOMRect) => void>();
  private suppressChange = false;

  mount(host: HTMLElement, opts: EngineMountOptions): void {
    this.destroy();
    const field = createMathfield();
    field.classList.add("structured-math-mathfield");
    field.dataset.inline = String(opts.inline);
    field.mathVirtualKeyboardPolicy = "manual";
    field.popoverPolicy = "off";
    field.environmentPopoverPolicy = "off";
    field.smartMode = false;
    field.smartFence = false;
    field.setValue(opts.initialLatex);

    field.addEventListener("input", () => {
      if (this.suppressChange) return;
      const latex = this.getLatex();
      for (const callback of this.changeCallbacks) callback(latex);
    });

    field.addEventListener("keydown", (event) => {
      this.handleKeydown(event);
    });

    host.replaceChildren(field);
    this.field = field;
  }

  destroy(): void {
    this.field?.remove();
    this.field = null;
  }

  getLatex(): string {
    if (!this.field) return "";
    return applySerializerFixups(this.field.getValue("latex-expanded")).latex;
  }

  setLatex(latex: string): void {
    if (!this.field) return;
    this.suppressChange = true;
    try {
      this.field.setValue(latex);
    } finally {
      this.suppressChange = false;
    }
  }

  insertTemplate(latex: string): void {
    this.requireField().insert(latex, { selectionMode: "placeholder" });
  }

  nextPlaceholder(): void {
    this.requireField().executeCommand("moveToNextPlaceholder");
  }

  prevPlaceholder(): void {
    this.requireField().executeCommand("moveToPreviousPlaceholder");
  }

  focus(): void {
    this.requireField().focus();
  }

  blur(): void {
    this.requireField().blur();
  }

  caretInfo(): { atStart: boolean; atEnd: boolean; depth: number } {
    const field = this.requireField();
    return {
      atStart: field.position <= 0,
      atEnd: field.position >= field.lastOffset,
      depth: field.getElementInfo(field.position)?.depth ?? 0,
    };
  }

  selectionPayload(): { latex: string } | null {
    const field = this.requireField();
    if (field.selectionIsCollapsed) return null;
    return { latex: field.getValue("latex-expanded") };
  }

  onChange(cb: (latex: string) => void): () => void {
    this.changeCallbacks.add(cb);
    return () => this.changeCallbacks.delete(cb);
  }

  onBoundaryExit(cb: (dir: Direction) => void): () => void {
    this.boundaryCallbacks.add(cb);
    return () => this.boundaryCallbacks.delete(cb);
  }

  onPaletteRequest(cb: (anchor: DOMRect) => void): () => void {
    this.paletteCallbacks.add(cb);
    return () => this.paletteCallbacks.delete(cb);
  }

  private requireField(): MathfieldLike {
    if (!this.field) throw new Error("MathLiveEngine is not mounted.");
    return this.field;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.field) return;

    if (event.key === "\\") {
      event.preventDefault();
      for (const callback of this.paletteCallbacks) callback(this.field.getBoundingClientRect());
      return;
    }

    const info = this.caretInfo();
    const boundaryDirection = event.key === "ArrowLeft" && info.atStart
      ? "left"
      : event.key === "ArrowRight" && info.atEnd
        ? "right"
        : event.key === "ArrowUp" && info.depth === 0
          ? "up"
          : event.key === "ArrowDown" && info.depth === 0
            ? "down"
            : null;

    if (boundaryDirection) {
      event.preventDefault();
      for (const callback of this.boundaryCallbacks) callback(boundaryDirection);
    }
  }
}
