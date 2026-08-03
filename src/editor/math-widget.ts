import { EditorSelection } from "@codemirror/state";
import { WidgetType, type EditorView } from "@codemirror/view";
import { MathLiveEngine } from "../engine/mathlive/mathlive-engine";
import { activateMath, deactivateMath, markMathDirty, type ActiveMathState } from "./active-state";
import { mathSource } from "./math-ranges";

interface MathfieldDom extends HTMLElement {
  position: number;
  lastOffset: number;
}

interface WidgetDomState {
  engine: MathLiveEngine;
  cleanup: Array<() => void>;
}

const widgetState = new WeakMap<HTMLElement, WidgetDomState>();

function codeMirrorInputState(view: EditorView): { composing: number } | undefined {
  return (view as unknown as { inputState?: { composing: number } }).inputState;
}

function numberFromDataset(element: HTMLElement, key: string): number {
  const value = element.dataset[key];
  if (!value) return Number.NaN;
  return Number.parseInt(value, 10);
}

function updateDataset(element: HTMLElement, active: ActiveMathState): void {
  element.dataset.sessionId = String(active.sessionId);
  element.dataset.sourceFrom = String(active.sourceFrom);
  element.dataset.sourceTo = String(active.sourceTo);
  element.dataset.contentFrom = String(active.contentFrom);
  element.dataset.contentTo = String(active.contentTo);
  element.dataset.inline = String(active.inline);
  element.dataset.initialLatex = active.initialLatex;
  element.dataset.dirty = String(active.dirty);
}

function activeFromDataset(element: HTMLElement, latex: string): ActiveMathState | null {
  const sourceFrom = numberFromDataset(element, "sourceFrom");
  const sourceTo = numberFromDataset(element, "sourceTo");
  const contentFrom = numberFromDataset(element, "contentFrom");
  const contentTo = numberFromDataset(element, "contentTo");
  const sessionId = numberFromDataset(element, "sessionId");
  if ([sourceFrom, sourceTo, contentFrom, contentTo, sessionId].some(Number.isNaN)) return null;
  return {
    sourceFrom,
    sourceTo,
    contentFrom,
    contentTo,
    inline: element.dataset.inline === "true",
    latex,
    initialLatex: element.dataset.initialLatex ?? "",
    dirty: element.dataset.dirty === "true",
    focusSide: "preserve",
    sessionId,
  };
}

function mathfieldIn(element: HTMLElement): MathfieldDom | null {
  return element.querySelector<MathfieldDom>("math-field");
}

export class StructuredMathWidget extends WidgetType {
  constructor(private readonly active: ActiveMathState) {
    super();
  }

  eq(other: WidgetType): boolean {
    return other instanceof StructuredMathWidget && other.active.sessionId === this.active.sessionId;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement(this.active.inline ? "span" : "div");
    wrapper.classList.add("structured-math-active-widget");
    wrapper.dataset.display = String(!this.active.inline);
    updateDataset(wrapper, this.active);

    const engine = new MathLiveEngine();
    engine.mount(wrapper, {
      inline: this.active.inline,
      initialLatex: this.active.latex,
    });

    const cleanup: Array<() => void> = [];
    const revertAndDeactivate = () => {
      const current = activeFromDataset(wrapper, engine.getLatex());
      if (!current) return;
      const source = mathSource(current, current.initialLatex);
      const changes = current.dirty && view.state.doc.sliceString(current.sourceFrom, current.sourceTo) !== source
        ? { from: current.sourceFrom, to: current.sourceTo, insert: source }
        : undefined;
      view.dispatch({
        changes,
        effects: deactivateMath.of(undefined),
        selection: EditorSelection.cursor(current.sourceFrom + source.length),
        scrollIntoView: true,
      });
      view.focus();
    };

    cleanup.push(engine.onChange((latex) => {
      const contentFrom = numberFromDataset(wrapper, "contentFrom");
      const contentTo = numberFromDataset(wrapper, "contentTo");
      if (Number.isNaN(contentFrom) || Number.isNaN(contentTo)) return;
      if (view.state.doc.sliceString(contentFrom, contentTo) === latex) return;
      const inline = wrapper.dataset.inline === "true";
      const nextContentTo = contentFrom + latex.length;
      wrapper.dataset.contentTo = String(nextContentTo);
      wrapper.dataset.sourceTo = String(nextContentTo + (inline ? 1 : 3));
      wrapper.dataset.dirty = "true";
      const inputState = codeMirrorInputState(view);
      const previousComposing = inputState?.composing;
      if (inputState) inputState.composing = 1;
      try {
        view.dispatch({
          changes: { from: contentFrom, to: contentTo, insert: latex },
          effects: markMathDirty.of({ latex }),
          userEvent: "input",
        });
      } finally {
        if (inputState && previousComposing !== undefined) inputState.composing = previousComposing;
      }
      window.setTimeout(() => {
        if (wrapper.isConnected) engine.focus();
      }, 0);
    }));
    cleanup.push(engine.onBoundaryExit((direction) => {
      const sourceFrom = numberFromDataset(wrapper, "sourceFrom");
      const sourceTo = numberFromDataset(wrapper, "sourceTo");
      if (Number.isNaN(sourceFrom) || Number.isNaN(sourceTo)) return;
      const target = direction === "left" || direction === "up" ? sourceFrom : sourceTo;
      view.dispatch({
        selection: EditorSelection.cursor(target),
        effects: deactivateMath.of(undefined),
        scrollIntoView: true,
      });
      view.focus();
    }));
    cleanup.push(engine.onCancel(revertAndDeactivate));

    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "$" && canConvertEmptyInlineToDisplay(wrapper, engine)) {
        const sourceFrom = numberFromDataset(wrapper, "sourceFrom");
        const sourceTo = numberFromDataset(wrapper, "sourceTo");
        if (Number.isNaN(sourceFrom) || Number.isNaN(sourceTo)) return;
        const source = mathSource({ inline: false }, "");
        const contentFrom = sourceFrom + 3;
        view.dispatch({
          changes: { from: sourceFrom, to: sourceTo, insert: source },
          effects: activateMath.of({
            sourceFrom,
            sourceTo: sourceFrom + source.length,
            contentFrom,
            contentTo: contentFrom,
            inline: false,
            latex: "",
            focusSide: "start",
          }),
          selection: EditorSelection.cursor(contentFrom),
          scrollIntoView: true,
          userEvent: "input",
        });
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== "Escape") return;
      revertAndDeactivate();
      event.preventDefault();
      event.stopPropagation();
    }, true);
    const windowEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!wrapper.isConnected) return;
      revertAndDeactivate();
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", windowEscape, true);
    cleanup.push(() => window.removeEventListener("keydown", windowEscape, true));

    window.setTimeout(() => {
      if (!wrapper.isConnected) return;
      engine.focus();
      const mathfield = mathfieldIn(wrapper);
      if (!mathfield) return;
      if (this.active.focusSide === "start") mathfield.position = 0;
      if (this.active.focusSide === "end") mathfield.position = mathfield.lastOffset;
    }, 0);

    widgetState.set(wrapper, { engine, cleanup });
    return wrapper;
  }

  updateDOM(dom: HTMLElement): boolean {
    updateDataset(dom, this.active);
    return true;
  }

  destroy(dom: HTMLElement): void {
    const state = widgetState.get(dom);
    if (!state) return;
    for (const dispose of state.cleanup) dispose();
    state.engine.destroy();
    widgetState.delete(dom);
  }
}

function canConvertEmptyInlineToDisplay(wrapper: HTMLElement, engine: MathLiveEngine): boolean {
  if (wrapper.dataset.inline !== "true") return false;
  if (wrapper.dataset.initialLatex !== "") return false;
  if (wrapper.dataset.dirty === "true") return false;
  return engine.getLatex() === "";
}
