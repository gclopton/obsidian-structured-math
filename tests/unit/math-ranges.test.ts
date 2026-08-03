import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import { displayReplacementForContext, mathSource, scanMarkdownMathText } from "../../src/editor/math-ranges";

describe("markdown math range scanner", () => {
  it("finds inline ranges and keeps delimiter positions separate from content", () => {
    expect(scanMarkdownMathText("alpha $x+1$ beta")).toEqual([
      {
        sourceFrom: 6,
        sourceTo: 11,
        contentFrom: 7,
        contentTo: 10,
        inline: true,
        latex: "x+1",
      },
    ]);
  });

  it("normalizes display ranges to the equation body", () => {
    expect(scanMarkdownMathText("before\n$$\nE=mc^2\n$$\nafter")).toEqual([
      {
        sourceFrom: 7,
        sourceTo: 19,
        contentFrom: 10,
        contentTo: 16,
        inline: false,
        latex: "E=mc^2",
      },
    ]);
  });

  it("serializes committed display source in the clean multiline form", () => {
    expect(mathSource({ inline: false }, "E=mc^2")).toBe("$$\nE=mc^2\n$$");
  });

  it("starts display replacements on a new line after prose", () => {
    const text = Text.of(["Display: $$"]);
    const replacement = displayReplacementForContext(text, "Display: ".length, "Display: $$".length);

    expect(replacement.source).toBe("\n$$\n\n$$");
    expect(replacement.sourceFrom).toBe("Display: \n".length);
    expect(replacement.contentFrom).toBe("Display: \n$$\n".length);
  });
});
