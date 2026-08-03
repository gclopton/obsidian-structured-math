import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", ".tmp/**"],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["spikes/**/*.mjs"],
    languageOptions: {
      globals: {
        window: "readonly",
      },
    },
  },
  {
    files: ["scripts/run-phase2-demo.cjs"],
    languageOptions: {
      globals: {
        app: "readonly",
        console: "readonly",
        document: "readonly",
        InputEvent: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["src/engine/**", "src/editor/**", "obsidian"],
              "message": "core/ must stay engine-agnostic and Obsidian-free."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["../../engine/**", "../engine/**", "../../editor/**", "../editor/**", "obsidian"],
              "message": "core/ must stay engine-agnostic and Obsidian-free."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "obsidian",
              "importNames": ["Modal"],
              "message": "D26 forbids Modal for primary math editing; use only for allowed secondary surfaces with a decision note."
            }
          ]
        }
      ]
    }
  }
);
