import { Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap, ViewPlugin, type KeyBinding, type ViewUpdate } from "@codemirror/view";
import type { StructuredMathSettings } from "../settings";
import { activateMath, activeMathField } from "./active-state";
import { findMathRangeAt, findMathRangeByBoundary, scanMathRanges, type MathSourceRange } from "./math-ranges";

function focusMountedField(view: EditorView, side: "start" | "end"): void {
  window.setTimeout(() => {
    const field = view.dom.querySelector<HTMLElement>(".structured-math-active-widget math-field");
    if (!field) return;
    field.focus();
    const mathfield = field as HTMLElement & { position: number; lastOffset: number };
    mathfield.position = side === "start" ? 0 : mathfield.lastOffset;
  }, 0);
}

function activateRange(view: EditorView, range: MathSourceRange, side: "start" | "end" | "preserve"): boolean {
  view.dispatch({
    effects: activateMath.of({ ...range, focusSide: side }),
    scrollIntoView: true,
  });
  if (side === "start" || side === "end") focusMountedField(view, side);
  return true;
}

function currentActive(view: EditorView): boolean {
  return view.state.field(activeMathField, false) !== null;
}

function createInlineMath(view: EditorView, from = view.state.selection.main.from, to = view.state.selection.main.to): boolean {
  const selectedText = view.state.sliceDoc(from, to);
  const source = `$${selectedText}$`;
  const sourceFrom = from;
  const contentFrom = sourceFrom + 1;
  const contentTo = contentFrom + selectedText.length;
  const sourceTo = contentTo + 1;

  view.dispatch({
    changes: { from, to, insert: source },
    effects: activateMath.of({
      sourceFrom,
      sourceTo,
      contentFrom,
      contentTo,
      inline: true,
      latex: selectedText,
      focusSide: selectedText.length > 0 ? "end" : "start",
    }),
    scrollIntoView: true,
    userEvent: "input",
  });
  focusMountedField(view, selectedText.length > 0 ? "end" : "start");
  return true;
}

function arrowEntryBinding(key: string, side: "start" | "end"): KeyBinding {
  return {
    key,
    run(view) {
      if (currentActive(view)) return false;
      const position = view.state.selection.main.head;
      const ranges = scanMathRanges(view.state);
      const range = findMathRangeByBoundary(ranges, position, side === "start" ? "before" : "after");
      return range ? activateRange(view, range, side) : false;
    },
  };
}

function dollarBinding(settings: StructuredMathSettings): KeyBinding {
  return {
    key: "$",
    run(view) {
      if (!settings.enableDollarShortcut || currentActive(view)) return false;
      const position = view.state.selection.main.head;
      const ranges = scanMathRanges(view.state);
      if (findMathRangeAt(view.state.doc, ranges, position)) return false;
      return createInlineMath(view);
    },
  };
}

function dollarInputHandler(settings: StructuredMathSettings): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (text !== "$") return false;
    if (!settings.enableDollarShortcut || currentActive(view)) return false;
    const ranges = scanMathRanges(view.state);
    if (findMathRangeAt(view.state.doc, ranges, from)) return false;
    return createInlineMath(view, from, to);
  });
}

const selectionActivation = ViewPlugin.fromClass(class {
  private pending = false;

  constructor(private readonly view: EditorView) {
    this.schedule();
  }

  update(update: ViewUpdate): void {
    if (!update.selectionSet && !update.docChanged && !update.viewportChanged) return;
    this.schedule();
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    window.setTimeout(() => {
      this.pending = false;
      if (currentActive(this.view)) return;
      if (!this.view.hasFocus) return;
      const selection = this.view.state.selection.main;
      if (!selection.empty) return;
      const position = selection.head;
      const range = findMathRangeAt(this.view.state.doc, scanMathRanges(this.view.state), position);
      if (!range) return;
      if (position <= range.sourceFrom || position >= range.sourceTo) return;
      activateRange(this.view, range, "preserve");
    }, 0);
  }
});

export function createStructuredMathExtension(settings: StructuredMathSettings): Extension {
  return [
    activeMathField,
    selectionActivation,
    dollarInputHandler(settings),
    Prec.highest(keymap.of([
      dollarBinding(settings),
      arrowEntryBinding("ArrowRight", "start"),
      arrowEntryBinding("ArrowLeft", "end"),
    ])),
  ];
}

export function displayMathSource(): string {
  return "$$\n\n$$";
}

export function displayMathCursorOffset(): number {
  return 3;
}
