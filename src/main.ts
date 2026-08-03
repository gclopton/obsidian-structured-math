import { Plugin } from "obsidian";

export default class StructuredMathPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: "insert-display-math-container",
      name: "Insert display math container",
      editorCallback: (editor) => {
        editor.replaceSelection("$$\n\n$$");
        const cursor = editor.getCursor();
        editor.setCursor({ line: cursor.line - 1, ch: 0 });
      },
    });
  }
}
