import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^(obsidian|@codemirror\/.+)$/.test(specifier) || specifier === './editor/extension' || specifier === '../engine/mathlive/mathlive-engine' || specifier === './active-state' || specifier === './math-ranges') {
      return { url: 'stub:///' + specifier, shortCircuit: true };
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier) && context.parentURL?.startsWith('file:')) {
      const candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier + '.ts');
      if (fs.existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('stub:///')) {
      return {
        format: 'module',
        source: `
          export class Plugin { constructor(app){ this.app = app; } async loadData(){ return {}; } }
          export const editorInfoField = Symbol("editorInfoField");
          export class WidgetType {}
          export const EditorSelection = { cursor: (pos) => ({ anchor: pos }) };
          export const createStructuredMathExtension = () => [];
          export const displayMathSource = () => '$$\\n\\n$$';
          export const activateMath = { of: (value) => value };
          export const deactivateMath = { of: (value) => value };
          export const markMathDirty = { of: (value) => value };
          export const displayReplacementForContext = () => ({ source: '$$\\n\\n$$', sourceFrom: 0, sourceTo: 6, contentFrom: 3 });
          export const mathSource = () => '$x$';
          export class MathLiveEngine {
            mount(wrapper, config) { this.wrapper = wrapper; wrapper.mathLatex = config.initialLatex; }
            getLatex() { return this.wrapper.mathLatex; }
            onChange() { return () => {}; }
            onBoundaryExit() { return () => {}; }
            onCancel() { return () => {}; }
            focus() {}
            destroy() {}
          }
        `,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { default: StructuredMathPlugin } = await import('../src/main.ts');
const { StructuredMathWidget } = await import('../src/editor/math-widget.ts');

function createFakeDomEnvironment() {
  const mounted = new Set();
  const makeElement = (tag) => {
    const classes = new Set();
    const listeners = new Map();
    const element = {
      tagName: tag.toUpperCase(),
      dataset: {},
      isConnected: true,
      classList: {
        add(name) { classes.add(name); },
        contains(name) { return classes.has(name); },
      },
      addEventListener(name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
      },
      emit(name) { for (const fn of listeners.get(name) ?? []) fn({ type: name }); },
      querySelector() { return null; },
      detach() {
        element.isConnected = false;
        mounted.delete(element);
      },
    };
    mounted.add(element);
    return element;
  };

  const timers = new Set();
  const fakeDocument = {
    createElement: makeElement,
    querySelectorAll(selector) {
      if (selector !== '.structured-math-active-widget') return [];
      return [...mounted].filter((el) => el.isConnected && el.classList.contains('structured-math-active-widget'));
    },
  };
  const fakeWindow = {
    setTimeout() { return 0; },
    setInterval(fn, ms) { const id = { fn, ms }; timers.add(id); return id; },
    clearInterval(id) { timers.delete(id); },
    addEventListener() {},
    removeEventListener() {},
  };
  return { fakeDocument, fakeWindow, mounted, timers };
}

test('structured-math recipe is schema 1, installed-only, maps dist/main.js, and protects data.json', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const recipe = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin-release.json'), 'utf8'));
  assert.equal(manifest.id, 'structured-math');
  assert.equal(recipe.schema, 1);
  assert.equal(recipe.pluginId, manifest.id);
  assert.equal(recipe.scopePolicy, 'installed-only');
  assert.equal(recipe.runtimeSources['main.js'], 'dist/main.js');
  assert.ok(recipe.protectedPaths.includes('community-plugins.json'));
  assert.ok(recipe.protectedPaths.includes('plugins/structured-math/data.json'));
});

test('an untouched or saved equation can reload while a composing or unwritten edit holds', async (t) => {
  const { fakeDocument, fakeWindow } = createFakeDomEnvironment();
  const prevDocument = globalThis.document, prevWindow = globalThis.window;
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  t.after(() => { globalThis.document = prevDocument; globalThis.window = prevWindow; });

  let disk = '$x$', buffer = disk;
  const adapter = { read: async () => disk };
  const plugin = new StructuredMathPlugin({ vault: { adapter } });
  const canReload = async () => (await plugin.getReleaseReadiness()).canReload;
  assert.equal(await canReload(), true);
  const widget = new StructuredMathWidget({
    sourceFrom: 0, sourceTo: 3, contentFrom: 1, contentTo: 2, inline: true,
    latex: 'x', initialLatex: 'x', dirty: false, focusSide: 'preserve', sessionId: 1,
  });
  const view = { state: {
    doc: { get length() { return buffer.length; }, sliceString: (a,b) => buffer.slice(a,b), toString: () => buffer },
    field: () => ({ file: { path: 'note.md' } }),
  }, dispatch() {}, focus() {} };
  const dom = widget.toDOM(view);
  t.after(() => widget.destroy(dom));
  assert.equal(await canReload(), true);
  dom.emit('compositionstart');
  assert.equal(await canReload(), false);
  dom.emit('compositionend');
  dom.emit('beforeinput');
  dom.mathLatex = 'y';
  assert.equal(await canReload(), false);
  buffer = '$y$';
  assert.equal(await canReload(), false);
  disk = buffer;
  assert.equal(await canReload(), true);
  widget.destroy(dom);
  assert.equal(await canReload(), true);
});
