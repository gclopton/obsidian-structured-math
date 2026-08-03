import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import path from "node:path";
import { buildBrowserFixture, type BrowserFixture } from "./browser-fixture";

interface Phase1Harness {
  mountEngine(): void;
  selectEngineContent(): void;
  insertFractionTemplate(): void;
  engineLatex(): string;
  mountPalette(): void;
  paletteIds(): string[];
  paletteQuery(): string;
  insertedIds(): string[];
}

declare global {
  interface Window {
    phase1Harness: Phase1Harness;
  }
}

describe("Phase 1 browser smoke", () => {
  let fixture: BrowserFixture;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    fixture = await buildBrowserFixture(
      path.resolve("tests/engine/phase1-browser-entry.ts"),
      path.resolve(".tmp/phase1-browser")
    );
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(fixture.url);
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => fixture.server.close(() => resolve()));
  });

  it("mounts MathLiveEngine, wraps a selection in a fraction, and focuses the denominator placeholder", async () => {
    await page.evaluate(() => window.phase1Harness.mountEngine());
    await page.evaluate(() => window.phase1Harness.selectEngineContent());
    await page.evaluate(() => window.phase1Harness.insertFractionTemplate());
    await page.keyboard.type("2");

    const latex = await page.evaluate(() => window.phase1Harness.engineLatex());
    expect(latex).toBe("\\frac{x+1}{2}");
  });

  it("renders the standalone palette with recents first and keyboard insertion", async () => {
    await page.evaluate(() => window.phase1Harness.mountPalette());

    expect(await page.evaluate(() => window.phase1Harness.paletteIds().slice(0, 2))).toEqual(["fraction", "pmatrix"]);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.phase1Harness.insertedIds())).toEqual(["pmatrix"]);
  });

  it("live-filters the standalone palette as sin is typed", async () => {
    await page.evaluate(() => window.phase1Harness.mountPalette());
    await page.keyboard.type("\\sin");

    const state = await page.evaluate(() => ({
      query: window.phase1Harness.paletteQuery(),
      ids: window.phase1Harness.paletteIds(),
    }));

    expect(state.query).toBe("\\sin");
    expect(state.ids[0]).toBe("formula-library.functions-sin");
  });
});
