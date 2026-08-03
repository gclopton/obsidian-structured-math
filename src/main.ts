import { Plugin } from "obsidian";
import { createStructuredMathExtension, displayMathSource } from "./editor/extension";
import { DEFAULT_SETTINGS, type StructuredMathSettings } from "./settings";

export default class StructuredMathPlugin extends Plugin {
  settings: StructuredMathSettings = DEFAULT_SETTINGS;

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
