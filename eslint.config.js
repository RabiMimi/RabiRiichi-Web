import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore build output, dependencies, and generated proto code.
  {
    ignores: ['dist', 'node_modules', 'src/generated', 'protos', 'coverage'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Type-aware recommended + stylistic rules. These require type info.
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        // Lets typescript-eslint locate the right tsconfig per file.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // --- Practical async/promise safety (requested) ---
      // Forbid unhandled promises (e.g. forgetting to await).
      '@typescript-eslint/no-floating-promises': 'error',
      // Forbid passing async functions where a void-returning fn is expected.
      '@typescript-eslint/no-misused-promises': 'error',
      // `return await` adds an unnecessary microtask except inside try/catch.
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      // Disallow `await` on non-Promise values (usually a mistake).
      '@typescript-eslint/await-thenable': 'error',
      // Require `async` on functions that use `await`/return promises only when
      // it actually helps; promise-returning misuse is covered above.
      'require-await': 'off',
      '@typescript-eslint/require-await': 'warn',

      // --- General correctness ---
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-shadow': [
        'warn',
        { builtinGlobals: true, hoist: 'functions' },
      ],
      // Prefer explicit handling of nullish/optional values.
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-implicit-coercion': 'warn',
    },
  },
  // Config files run in Node and don't need browser globals or type-aware rules.
  {
    files: ['*.{js,mjs,cjs,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Tests and test helpers may use terse non-null assertions on fixtures and
  // reuse natural identifiers (e.g. `event`); these add noise without value
  // in test code. Production rules remain strict.
  {
    files: ['**/*.test.ts', '**/mockWebSocket.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': 'off',
    },
  },
  // Keep Prettier last so it disables any stylistic rules that conflict.
  prettier,
);
