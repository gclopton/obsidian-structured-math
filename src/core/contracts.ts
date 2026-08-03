export interface EngineMountOptions {
  inline: boolean;
  initialLatex: string;
}

export interface EditorEngine {
  mount(host: HTMLElement, opts: EngineMountOptions): void;
  destroy(): void;

  /** Current serialization. Must be stable: no edit means identical string. */
  getLatex(): string;
  /** Replace content without firing onChange. */
  setLatex(latex: string): void;

  /** Insert template latex; #0 wraps current selection; \placeholder{} creates slots. */
  insertTemplate(latex: string): void;
  nextPlaceholder(): void;
  prevPlaceholder(): void;

  focus(): void;
  blur(): void;
  caretInfo(): { atStart: boolean; atEnd: boolean; depth: number };

  /** Structural clipboard payload for the current selection, or null if none. */
  selectionPayload(): { latex: string } | null;

  onChange(cb: (latex: string) => void): () => void;
  onBoundaryExit(cb: (dir: "left" | "right" | "up" | "down") => void): () => void;
  onPaletteRequest(cb: (anchor: DOMRect) => void): () => void;
}

export interface MathTemplate {
  id: string;
  title: string;
  aliases: string[];
  category: string;
  latex: string;
  wraps: boolean;
  shortcut?: string;
  description?: string;
  mode: "math" | "text";
}
