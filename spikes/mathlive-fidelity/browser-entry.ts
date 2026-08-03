import "mathlive";

const field = document.querySelector("math-field");
const latex = document.querySelector<HTMLTextAreaElement>("#latex");

if (!field || !latex) {
  throw new Error("Spike page did not mount required elements.");
}

const mf = field as HTMLElement & {
  setValue(value?: string, options?: unknown): void;
  getValue(format?: string): string;
  executeCommand(command: string | [string, ...unknown[]]): boolean;
  insert(value: string, options?: unknown): void;
  value: string;
  mathVirtualKeyboardPolicy: string;
  smartFence: boolean;
  smartMode: boolean;
};

mf.mathVirtualKeyboardPolicy = "manual";
mf.smartFence = false;
mf.smartMode = false;

function syncOut(): void {
  latex.value = mf.getValue("latex");
}

document.querySelector("#set")?.addEventListener("click", () => {
  mf.setValue(latex.value);
  syncOut();
});

document.querySelector("#get")?.addEventListener("click", syncOut);

document.querySelector("#frac")?.addEventListener("click", () => {
  mf.insert("\\frac{#0}{\\placeholder{}}", { selectionMode: "placeholder" });
  syncOut();
});

document.querySelector("#next")?.addEventListener("click", () => {
  mf.executeCommand("moveToNextPlaceholder");
  syncOut();
});

document.querySelector("#prev")?.addEventListener("click", () => {
  mf.executeCommand("moveToPreviousPlaceholder");
  syncOut();
});

document.querySelector("#clear")?.addEventListener("click", () => {
  mf.setValue("");
  syncOut();
});

field.addEventListener("input", syncOut);

Object.assign(window, {
  spikeMathlive: {
    setValue(value: string): void {
      mf.setValue(value);
      syncOut();
    },
    getValue(): string {
      return mf.getValue("latex");
    },
    insertTemplate(value: string): void {
      mf.insert(value, { selectionMode: "placeholder" });
      syncOut();
    },
    execute(command: string): boolean {
      const result = mf.executeCommand(command);
      syncOut();
      return result;
    },
    focus(): void {
      mf.focus();
    },
  },
});
