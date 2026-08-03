import { syntaxTree } from "@codemirror/language";
import type { EditorState, Text } from "@codemirror/state";

export interface MathSourceRange {
  sourceFrom: number;
  sourceTo: number;
  contentFrom: number;
  contentTo: number;
  inline: boolean;
  latex: string;
}

function makeRange(
  sourceFrom: number,
  sourceTo: number,
  contentFrom: number,
  contentTo: number,
  inline: boolean,
  text: string
): MathSourceRange {
  let normalizedContentFrom = contentFrom;
  let normalizedContentTo = contentTo;
  let latex = text.slice(contentFrom, contentTo);

  if (!inline && latex.startsWith("\n") && latex.endsWith("\n")) {
    normalizedContentFrom += 1;
    normalizedContentTo -= 1;
    latex = text.slice(normalizedContentFrom, normalizedContentTo);
  }

  return {
    sourceFrom,
    sourceTo,
    contentFrom: normalizedContentFrom,
    contentTo: normalizedContentTo,
    inline,
    latex,
  };
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let pos = index - 1; pos >= 0 && text[pos] === "\\"; pos -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

export function mathSource(range: Pick<MathSourceRange, "inline">, latex: string): string {
  return range.inline ? `$${latex}$` : `$$\n${latex}\n$$`;
}

export function scanMarkdownMathText(text: string): MathSourceRange[] {
  const ranges: MathSourceRange[] = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "$" || isEscaped(text, index)) {
      index += 1;
      continue;
    }

    const isDisplay = text[index + 1] === "$";
    const delimiterLength = isDisplay ? 2 : 1;
    const contentFrom = index + delimiterLength;
    let search = contentFrom;
    let closing = -1;

    while (search < text.length) {
      if (text[search] !== "$" || isEscaped(text, search)) {
        search += 1;
        continue;
      }
      if (isDisplay) {
        if (text[search + 1] === "$") {
          closing = search;
          break;
        }
        search += 1;
        continue;
      }
      if (text[search + 1] !== "$") {
        closing = search;
        break;
      }
      search += 2;
    }

    if (closing === -1) {
      index += delimiterLength;
      continue;
    }

    ranges.push(makeRange(index, closing + delimiterLength, contentFrom, closing, !isDisplay, text));
    index = closing + delimiterLength;
  }

  return ranges;
}

function scanSyntaxTreeMath(state: EditorState): MathSourceRange[] {
  const ranges: MathSourceRange[] = [];
  let begin: { sourceFrom: number; contentFrom: number; inline: boolean } | null = null;

  syntaxTree(state).iterate({
    enter(node) {
      const name = node.type.name;
      if (name.includes("formatting-math-begin")) {
        const inline = !name.includes("math-block");
        begin = {
          sourceFrom: node.from,
          contentFrom: node.to,
          inline,
        };
        return;
      }

      if (!begin || !name.includes("formatting-math-end")) return;
      const sourceTo = node.to;
      const contentTo = node.from;
      if (contentTo < begin.contentFrom) {
        begin = null;
        return;
      }

      ranges.push(makeRange(begin.sourceFrom, sourceTo, begin.contentFrom, contentTo, begin.inline, state.doc.toString()));
      begin = null;
    },
  });

  return ranges;
}

export function scanMathRanges(state: EditorState): MathSourceRange[] {
  const syntaxRanges = scanSyntaxTreeMath(state);
  const fallbackRanges = scanMarkdownMathText(state.doc.toString());
  const rangesByKey = new Map<string, MathSourceRange>();
  for (const range of fallbackRanges) {
    rangesByKey.set(`${range.sourceFrom}:${range.sourceTo}`, range);
  }
  for (const range of syntaxRanges) {
    rangesByKey.set(`${range.sourceFrom}:${range.sourceTo}`, range);
  }
  return Array.from(rangesByKey.values()).sort((left, right) => left.sourceFrom - right.sourceFrom);
}

export function findMathRangeAt(doc: Text, ranges: MathSourceRange[], position: number): MathSourceRange | null {
  const clamped = Math.max(0, Math.min(position, doc.length));
  return ranges.find((range) =>
    clamped >= range.sourceFrom && clamped <= range.sourceTo
  ) ?? null;
}

export function findMathRangeByBoundary(
  ranges: MathSourceRange[],
  position: number,
  side: "before" | "after"
): MathSourceRange | null {
  return ranges.find((range) =>
    side === "before" ? position === range.sourceFrom : position === range.sourceTo
  ) ?? null;
}
