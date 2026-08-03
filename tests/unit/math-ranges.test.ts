import { describe, expect, it } from "vitest";
import { mathSource, scanMarkdownMathText } from "../../src/editor/math-ranges";

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
});
