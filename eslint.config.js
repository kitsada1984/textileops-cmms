// eslint.config.js — warn-only phase (P-A).
// Reports code smells without failing builds or commits.
// Nothing here changes runtime behavior; `npm run lint` always exits 0
// unless ESLint itself crashes (warnings never fail).
// To escalate later: change a rule from 'warn' to 'error' one at a time.
import js from '@eslint/js'
import globals from 'globals'

const WARN_ONLY = {
  'no-unused-vars': 'warn',
  'no-undef': 'warn',
  'no-redeclare': 'warn',
  'no-unreachable': 'warn',
  'no-empty': 'warn',
  'no-case-declarations': 'warn',
  'no-fallthrough': 'warn',
  'no-prototype-builtins': 'warn',
  'no-self-assign': 'warn',
  'no-constant-condition': 'warn',
  'no-useless-escape': 'warn',
  'no-useless-assignment': 'warn',
  'no-unsafe-optional-chaining': 'warn',
  'no-unexpected-multiline': 'warn',
  'no-await-in-loop': 'warn',
  'require-await': 'warn',
  // Complexity visibility (Medium finding: 7 files >100KB).
  // Warn-only: makes hotspots visible without failing anything.
  // Per code-quality threshold: <25 OK. Splitting is logic-scope (grill first).
  'complexity': ['warn', 25],
  'max-params': ['warn', 5],
}

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'scratch/**',
      '.compare-vercel/**',
      '.wrangler/**',
      'supabase/.temp/**',
      'public/**',
      'backups/**',
      '**/*.ts',
    ],
  },
  js.configs.recommended,
  {
    // Warn-only blanket: every linted file reports, never fails.
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { ...WARN_ONLY },
  },
  {
    // Process guard: undefined identifiers crash only at runtime in the
    // browser (neither vitest nor the bundler rejects them), so this class
    // of bug ships silently. Escalated to error — everything else stays warn.
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    rules: { 'no-undef': 'error' },
  },
  {
    // Test files use vitest globals (see vite.config.js: test.globals).
    files: ['**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: { ...WARN_ONLY, 'no-undef': 'off' },
  },
]
