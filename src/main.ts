import { Plugin } from "obsidian";
import { createStructuredMathExtension, displayMathSource } from "./editor/extension";
import { structuredMathDrafts } from "./editor/math-widget";
import { structuredMathReadiness, type ReleaseReadiness } from "./release-readiness";
import { DEFAULT_SETTINGS, type StructuredMathSettings } from "./settings";

export default class StructuredMathPlugin extends Plugin {
  settings: StructuredMathSettings = DEFAULT_SETTINGS;

  async getReleaseReadiness(): Promise<ReleaseReadiness> {
    const drafts = await Promise.all(structuredMathDrafts().map(async (draft) => {
      // A typed equation is safe to reload once the field's value is in the note and the note is saved.
      let saved = false;
      if (draft.typed && draft.written && draft.path !== null) {
        saved = await this.app.vault.adapter.read(draft.path).then((disk) => disk === draft.buffer, () => false);
      }
      return { typed: draft.typed, composing: draft.composing, written: draft.written, saved };
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
