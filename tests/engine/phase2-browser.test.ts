import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import path from "node:path";
import { buildBrowserFixture, type BrowserFixture } from "./browser-fixture";

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

describe("Phase 2 in-document editor path", () => {
  let fixture: BrowserFixture;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    fixture = await buildBrowserFixture(
      path.resolve("tests/engine/phase2-browser-entry.ts"),
      path.resolve(".tmp/phase2-browser")
    );
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(fixture.url);
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => fixture.server.close(() => resolve()));
  });

  async function waitForActive(): Promise<void> {
    await page.waitForFunction(() => window.phase2Harness.activeExists());
    await page.waitForFunction(() => window.phase2Harness.activeFocused());
  }

  it("creates inline math from $ and continues prose after a boundary exit", async () => {
    await page.evaluate(() => window.phase2Harness.mount("Speed: "));
    await page.evaluate(() => window.phase2Harness.setCursor("Speed: ".length));
    await page.keyboard.type("$");
    await waitForActive();

    await page.evaluate(() => window.phase2Harness.setActiveLatex("v = \\frac{s}{t}"));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.type(" on the line");

    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("Speed: $v=\\frac{s}{t}$ on the line");
  });

  it("does not rewrite an equation that is activated and closed without edits", async () => {
    const original = "A $x+1$ B";
    await page.evaluate((doc) => window.phase2Harness.mount(doc), original);
    await page.evaluate(() => window.phase2Harness.setCursor(2));
    await page.keyboard.press("ArrowRight");
    await waitForActive();
    await page.keyboard.press("Escape");

    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe(original);
  });

  it("reverts an active edit with Escape", async () => {
    const original = "A $x+1$ B";
    await page.evaluate((doc) => window.phase2Harness.mount(doc), original);
    await page.evaluate(() => window.phase2Harness.setCursor(2));
    await page.keyboard.press("ArrowRight");
    await waitForActive();
    await page.evaluate(() => window.phase2Harness.setActiveLatex("x+2"));
    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("A $x+2$ B");

    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe(original);
  });

  it("edits display math in place and stores clean display Markdown", async () => {
    await page.evaluate(() => window.phase2Harness.mount(""));
    await page.evaluate(() => window.phase2Harness.insertDisplayAt(0));
    await waitForActive();
    await page.evaluate(() => window.phase2Harness.setActiveLatex("E=mc^2"));
    await page.keyboard.press("ArrowRight");

    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("$$\nE=mc^2\n$$");
  });

  it("undo after commit reverts an activation-session edit in one step", async () => {
    await page.evaluate(() => window.phase2Harness.mount("A $x$ B"));
    await page.evaluate(() => window.phase2Harness.setCursor(2));
    await page.keyboard.press("ArrowRight");
    await waitForActive();
    await page.evaluate(() => window.phase2Harness.setActiveLatex("\\frac{s}{t}"));
    await page.keyboard.press("ArrowRight");

    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("A $\\frac{s}{t}$ B");
    expect(await page.evaluate(() => window.phase2Harness.undo())).toBe(true);
    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("A $x$ B");
  });

  it("drops stale active ranges after an external whole-document replacement", async () => {
    await page.evaluate(() => window.phase2Harness.mount("A $x$ B"));
    await page.evaluate(() => window.phase2Harness.setCursor(2));
    await page.keyboard.press("ArrowRight");
    await waitForActive();

    await page.evaluate(() => window.phase2Harness.replaceDoc("fresh document"));

    expect(await page.evaluate(() => window.phase2Harness.activeExists())).toBe(false);
    expect(await page.evaluate(() => window.phase2Harness.doc())).toBe("fresh document");
  });
});
