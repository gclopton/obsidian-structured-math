const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

const outDir = "/Users/gradyclopton/Projects/obsidian-structured-math/docs/reports/phase-2-demo";
const notePath = "/Users/gradyclopton/ObsidianVaults/latex/Phase 2 Checkpoint 2 Demo.md";
const activeSelector = ".structured-math-active-widget math-field";
const initialDoc = `Phase 2 checkpoint demo

Inline:

No-edit activation: $x+1$

Escape revert: $x+1$

Undo: $x+1$

Display:
`;

const transcript = [];

function stamp(text) {
  transcript.push(`${new Date().toISOString()} ${text}`);
}

async function resetEvidenceDir() {
  await fs.mkdir(outDir, { recursive: true });
  for (const name of await fs.readdir(outDir)) {
    if (name.endsWith(".png") || name === "before.md" || name === "after.md" || name === "keystrokes.txt") {
      await fs.unlink(path.join(outDir, name));
    }
  }
}

async function activeMarkdownEditor(page) {
  return page.evaluate(() => {
    const view = app.workspace.activeEditor;
    if (!view?.editor) throw new Error("No active Markdown editor.");
    return true;
  });
}

async function setCursorAtText(page, needle, offset) {
  await page.evaluate(({ needle: target, offset: cursorOffset }) => {
    const view = app.workspace.activeEditor;
    const text = view.editor.getValue();
    const index = text.indexOf(target) + cursorOffset;
    if (index < cursorOffset) throw new Error(`Missing text: ${target}`);
    const prefix = text.slice(0, index);
    const line = prefix.split("\n").length - 1;
    const lastLineStart = prefix.lastIndexOf("\n") + 1;
    view.editor.setCursor({ line, ch: index - lastLineStart });
    view.editor.focus();
    document.querySelector(".cm-content")?.focus();
  }, { needle, offset });
  await page.waitForTimeout(100);
}

async function setActiveLatex(page, latex) {
  await page.evaluate((value) => {
    const field = document.querySelector(".structured-math-active-widget math-field");
    if (!field) throw new Error("No active MathLive field.");
    field.setValue(value);
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    field.focus();
  }, latex);
}

async function main() {
  await resetEvidenceDir();
  await fs.writeFile(notePath, initialDoc, "utf8");
  await fs.writeFile(path.join(outDir, "before.md"), initialDoc, "utf8");

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url() === "app://obsidian.md/index.html");
  if (!page) throw new Error("No Obsidian page.");

  await page.bringToFront();
  await page.evaluate(async () => {
    await app.workspace.openLinkText("Phase 2 Checkpoint 2 Demo", "", false);
  });
  await page.waitForTimeout(700);
  await activeMarkdownEditor(page);
  await page.evaluate((doc) => {
    const view = app.workspace.activeEditor;
    view.editor.setValue(doc);
    view.editor.focus();
  }, initialDoc);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "01-start.png"), fullPage: false });
  stamp("Opened Phase 2 Checkpoint 2 Demo.md in the latex vault and reset fixture content. Screenshot: 01-start.png");

  await page.evaluate(() => {
    const view = app.workspace.activeEditor;
    view.editor.setCursor({ line: 2, ch: "Inline:".length });
    view.editor.focus();
  });
  stamp("Placed cursor after Inline:");
  await page.keyboard.press("Enter");
  await page.keyboard.type("$");
  stamp("Typed $ in text mode; active inline in-document mathfield appeared.");
  await page.waitForSelector(activeSelector, { state: "attached", timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, "02-inline-active-empty.png"), fullPage: false });

  await setActiveLatex(page, "v = \\frac{s}{t}");
  stamp("Built inline equation in the active in-document MathLive field as v = fraction(s,t).");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "03-inline-built.png"), fullPage: false });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type(" continuing prose");
  stamp("Pressed ArrowRight at the equation boundary and typed continuing prose on the same line.");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "04-inline-committed-prose.png"), fullPage: false });

  const noEditBefore = await fs.readFile(notePath, "utf8");
  await setCursorAtText(page, "$x+1$", 0);
  await page.keyboard.press("ArrowRight");
  stamp("Activated existing $x+1$ by ArrowRight from its left boundary with no edit.");
  await page.waitForSelector(activeSelector, { state: "attached", timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, "05-no-edit-active.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await page.waitForSelector(activeSelector, { state: "detached", timeout: 5000 });
  await page.waitForTimeout(400);
  const noEditAfter = await fs.readFile(notePath, "utf8");
  stamp(`Pressed Escape without editing. Byte-neutral result: ${noEditBefore === noEditAfter}.`);

  await setCursorAtText(page, "Escape revert: $x+1$", "Escape revert: ".length);
  await page.keyboard.press("ArrowRight");
  stamp("Activated Escape-revert equation by ArrowRight from its left boundary.");
  await page.waitForSelector(activeSelector, { state: "attached", timeout: 5000 });
  await setActiveLatex(page, "x+2");
  stamp("Edited Escape-revert equation to x+2 inside the in-document field.");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "06-escape-edited.png"), fullPage: false });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "07-escape-reverted.png"), fullPage: false });
  stamp("Pressed Escape; equation reverted to activation-time value.");

  await page.evaluate(() => {
    const view = app.workspace.activeEditor;
    view.editor.setCursor({ line: view.editor.lastLine(), ch: 0 });
    view.editor.focus();
    app.commands.executeCommandById("structured-math:insert-display-math-container");
  });
  stamp("Ran Structured Math: Insert display math container command.");
  await page.waitForSelector(activeSelector, { state: "attached", timeout: 5000 });
  await setActiveLatex(page, "E=mc^2");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "08-display-active.png"), fullPage: false });
  await page.keyboard.press("ArrowRight");
  stamp("Edited display equation in place and exited right.");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "09-display-committed.png"), fullPage: false });

  await setCursorAtText(page, "Undo: $x+1$", "Undo: ".length);
  await page.keyboard.press("ArrowRight");
  stamp("Activated Undo equation by ArrowRight from its left boundary.");
  await page.waitForSelector(activeSelector, { state: "attached", timeout: 5000 });
  await setActiveLatex(page, "\\frac{s}{t}");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const undoEdited = await fs.readFile(notePath, "utf8");
  await page.keyboard.press("Meta+Z");
  await page.waitForTimeout(500);
  const undoAfter = await fs.readFile(notePath, "utf8");
  stamp(`Edited Undo equation to fraction, exited, then pressed Cmd+Z. One-step undo restored original Undo equation: ${undoEdited.includes("Undo: $\\frac{s}{t}$") && undoAfter.includes("Undo: $x+1$")}.`);
  await page.screenshot({ path: path.join(outDir, "10-undo-after.png"), fullPage: false });

  const finalDoc = await fs.readFile(notePath, "utf8");
  await fs.writeFile(path.join(outDir, "after.md"), finalDoc, "utf8");
  await fs.writeFile(path.join(outDir, "keystrokes.txt"), `${transcript.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ finalDoc, transcript }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
