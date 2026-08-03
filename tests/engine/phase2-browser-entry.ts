import { history, undo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createStructuredMathExtension, displayMathSource } from "../../src/editor/extension";
import { DEFAULT_SETTINGS } from "../../src/settings";

interface MathfieldDom extends HTMLElement {
  setValue(value?: string, options?: unknown): void;
  getValue(format?: string): string;
  insert(value: string, options?: unknown): boolean;
  position: number;
  lastOffset: number;
}

interface Phase2Harness {
  mount(doc: string): void;
  doc(): string;
  setCursor(position: number): void;
  cursor(): number;
  activeExists(): boolean;
  activeFocused(): boolean;
  activeLatex(): string;
  setActiveLatex(latex: string): void;
  insertFractionTemplate(): void;
  insertDisplayAt(position: number): void;
  replaceDoc(doc: string): void;
  undo(): boolean;
}

declare global {
  interface Window {
    phase2Harness: Phase2Harness;
  }
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing app root.");

let view: EditorView | null = null;

function requireView(): EditorView {
  if (!view) throw new Error("Editor is not mounted.");
  return view;
}

function activeField(): MathfieldDom {
  const field = requireView().dom.querySelector<MathfieldDom>(".structured-math-active-widget math-field");
  if (!field) throw new Error("Active math field is missing.");
  return field;
}

function emitInput(field: MathfieldDom): void {
  field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
}

window.phase2Harness = {
  mount(doc: string): void {
    view?.destroy();
    app.replaceChildren();
    const host = document.createElement("div");
    app.append(host);
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc,
        extensions: [
          history(),
          markdown(),
          createStructuredMathExtension(DEFAULT_SETTINGS),
          EditorView.lineWrapping,
        ],
      }),
    });
    view.focus();
  },
  doc(): string {
    return requireView().state.doc.toString();
  },
  setCursor(position: number): void {
    const editor = requireView();
    editor.dispatch({
      selection: EditorSelection.cursor(position),
      scrollIntoView: true,
    });
    editor.focus();
  },
  cursor(): number {
    return requireView().state.selection.main.head;
  },
  activeExists(): boolean {
    return requireView().dom.querySelector(".structured-math-active-widget math-field") !== null;
  },
  activeFocused(): boolean {
    const field = requireView().dom.querySelector(".structured-math-active-widget math-field");
    return document.activeElement === field;
  },
  activeLatex(): string {
    return activeField().getValue("latex-expanded");
  },
  setActiveLatex(latex: string): void {
    const field = activeField();
    field.setValue(latex);
    emitInput(field);
    field.focus();
  },
  insertFractionTemplate(): void {
    const field = activeField();
    field.insert("\\frac{\\placeholder{}}{\\placeholder{}}", { selectionMode: "placeholder" });
    emitInput(field);
    field.focus();
  },
  insertDisplayAt(position: number): void {
    const editor = requireView();
    editor.dispatch({
      changes: { from: position, to: position, insert: displayMathSource() },
      selection: EditorSelection.cursor(position + 3),
      scrollIntoView: true,
      userEvent: "input",
    });
    editor.focus();
  },
  replaceDoc(doc: string): void {
    const editor = requireView();
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: doc },
      selection: EditorSelection.cursor(0),
    });
    editor.focus();
  },
  undo(): boolean {
    const editor = requireView();
    editor.focus();
    return undo(editor);
  },
};
