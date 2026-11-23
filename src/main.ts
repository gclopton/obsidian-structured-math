import { Plugin } from "obsidian";
import { createStructuredMathExtension, displayMathSource } from "./editor/extension";
import { structuredMathDrafts } from "./editor/math-widget";
import { structuredMathReadiness, type ReleaseReadiness } from "./release-readiness";
import { DEFAULT_SETTINGS, type StructuredMathSettings } from "./settings";

export default class StructuredMathPlugin extends Plugin {
  settings: StructuredMathSettings = DEFAULT_SETTINGS;

  async getReleaseReadiness(): Promise<ReleaseReadiness> {
    const savedNotes = new Map<string, string>();
    const paths = new Set<string>();
    for (const draft of structuredMathDrafts()) {
      if (draft.typed && draft.written && draft.path !== null) paths.add(draft.path);
    }
    await Promise.all(Array.from(paths, async (path) => {
      try { savedNotes.set(path, await this.app.vault.adapter.read(path)); }
      catch { /* An unreadable note cannot establish that its equation is saved. */ }
    }));
    // Edits and IME composition can start while the note reads are pending.
    const drafts = structuredMathDrafts().map((draft) => ({
      ...draft, saved: draft.path !== null && savedNotes.get(draft.path) === draft.buffer,
    }));
    return structuredMathReadiness({ drafts });
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerEditorExtension(createStructuredMathExtension(this.settings));

    this.addCommand({
      id: "insert-display-math-container",
      name: "Insert display math container",
      editorCallback: (editor) => {
        editor.replaceSelection(displayMathSource());
        const cursor = editor.getCursor();
        editor.setCursor({ line: cursor.line - 1, ch: 0 });
      },
    });
  }

  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
}
