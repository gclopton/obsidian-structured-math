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
            mount() {}
            getLatex() { return ''; }
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
    const element = {
      tagName: tag.toUpperCase(),
      dataset: {},
      isConnected: true,
      classList: {
        add(name) { classes.add(name); },
        contains(name) { return classes.has(name); },
      },
      addEventListener() {},
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

test('actual StructuredMathPlugin.getReleaseReadiness follows StructuredMathWidget toDOM/destroy and .structured-math-active-widget', async () => {
  const { fakeDocument, fakeWindow, mounted } = createFakeDomEnvironment();
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;

  try {
    const plugin = new StructuredMathPlugin({});
    assert.deepEqual(await plugin.getReleaseReadiness(), { canReload: true });

    const widget = new StructuredMathWidget({
      sourceFrom: 0,
      sourceTo: 3,
      contentFrom: 1,
      contentTo: 2,
      inline: true,
      latex: 'x',
      initialLatex: 'x',
      dirty: false,
      focusSide: 'preserve',
      sessionId: 1,
    });
    const fakeView = {
      state: { doc: { sliceString: () => '$x$' } },
      dispatch() {},
      focus() {},
    };

    const dom = widget.toDOM(fakeView);
    assert.equal(dom.classList.contains('structured-math-active-widget'), true);
    const held = await plugin.getReleaseReadiness();
    assert.equal(held.canReload, false);
    assert.match(held.reason, /equation is being edited/i);

    widget.destroy(dom);
    dom.detach();
    assert.deepEqual(await plugin.getReleaseReadiness(), { canReload: true });

    // Also verify DOM-only detection of .structured-math-active-widget
    const externalWidget = fakeDocument.createElement('span');
    externalWidget.classList.add('structured-math-active-widget');
    assert.equal((await plugin.getReleaseReadiness()).canReload, false);
    externalWidget.detach();
    mounted.clear();
    assert.deepEqual(await plugin.getReleaseReadiness(), { canReload: true });
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
});
