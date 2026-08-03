import { StateEffect, StateField, type Extension, type Transaction } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { StructuredMathWidget } from "./math-widget";
import type { MathSourceRange } from "./math-ranges";

export interface ActiveMathState extends MathSourceRange {
  initialLatex: string;
  dirty: boolean;
  focusSide: "start" | "end" | "preserve";
  sessionId: number;
}

let nextSessionId = 1;

export const activateMath = StateEffect.define<MathSourceRange & {
  focusSide?: ActiveMathState["focusSide"];
}>();
export const deactivateMath = StateEffect.define<void>();
export const markMathDirty = StateEffect.define<{ latex: string }>();

export const activeMathField = StateField.define<ActiveMathState | null>({
  create() {
    return null;
  },
  update(active, transaction) {
    let next = active ? mapActive(active, transaction) : null;

    for (const effect of transaction.effects) {
      if (effect.is(activateMath)) {
        next = {
          ...effect.value,
          initialLatex: effect.value.latex,
          dirty: false,
          focusSide: effect.value.focusSide ?? "preserve",
          sessionId: nextSessionId,
        };
        nextSessionId += 1;
        continue;
      }

      if (effect.is(markMathDirty) && next) {
        next = {
          ...next,
          latex: effect.value.latex,
          dirty: true,
          focusSide: "preserve",
        };
        continue;
      }

      if (effect.is(deactivateMath)) {
        next = null;
      }
    }

    if (next && !isValidActiveRange(next, transaction.state.doc.toString())) return null;
    return next;
  },
  provide(field): Extension {
    return EditorView.decorations.from(field, (active): DecorationSet => {
      if (!active) return Decoration.none;
      return Decoration.set([
        Decoration.replace({
          widget: new StructuredMathWidget(active),
          block: !active.inline,
          inclusive: false,
        }).range(active.sourceFrom, active.sourceTo),
      ]);
    });
  },
});

function mapActive(active: ActiveMathState, transaction: Transaction): ActiveMathState {
  if (!transaction.docChanged) return active;
  return {
    ...active,
    sourceFrom: transaction.changes.mapPos(active.sourceFrom, -1),
    sourceTo: transaction.changes.mapPos(active.sourceTo, 1),
    contentFrom: transaction.changes.mapPos(active.contentFrom, -1),
    contentTo: transaction.changes.mapPos(active.contentTo, 1),
  };
}

function isValidActiveRange(active: ActiveMathState, text: string): boolean {
  if (active.sourceFrom < 0 || active.sourceTo > text.length) return false;
  if (active.contentFrom < active.sourceFrom || active.contentTo > active.sourceTo) return false;
  if (active.inline) {
    return text[active.sourceFrom] === "$" && text[active.sourceTo - 1] === "$";
  }
  return text.slice(active.sourceFrom, active.sourceFrom + 3) === "$$\n" &&
    text.slice(active.sourceTo - 3, active.sourceTo) === "\n$$";
}
