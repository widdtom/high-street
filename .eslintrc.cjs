/* =============================================================================
 *  ██  MONEY IS INTEGER PENCE. FLOATS ARE FORBIDDEN FOR MONEY.  ██
 *
 *  Every monetary amount in this codebase is a whole number of PENCE, held in
 *  a plain integer. 0.1 + 0.2 !== 0.3, and a child learning to count change is
 *  the last person who should meet a rounding error. £1.20 is 120. Never 1.2.
 *
 *  This is enforced below by a `no-restricted-syntax` rule that bans any
 *  decimal numeric literal inside the money layers — src/engine/** and
 *  src/data/** — along with `parseFloat` and `.toFixed()`, the two usual ways
 *  a float sneaks back in. Formatting to "£1.20" happens at the render edge,
 *  never in the engine.
 *
 *  SCOPE. The rule applies to src/engine/** and src/data/** only — the pure
 *  money layers. Screens and components are outside it, because they must be
 *  free to use fractional opacities, durations, transforms and SVG coordinates.
 *
 *  DELIBERATE EXEMPTIONS (see the override block): src/engine/coins.ts and
 *  src/engine/geometry.ts. Those hold PHYSICAL measurements, not money — the
 *  Royal Mint's coin diameters in millimetres (20.3, 25.9, 27.3 …) and the
 *  mm-to-pixel scale (3.2). Those are legitimately fractional and banning them
 *  would be wrong. The exemption is per-file and narrow on purpose: if a new
 *  file needs fractional non-money numbers, add it here consciously rather
 *  than widening the rule. (The coin-drawing geometry currently lives at
 *  src/components/coins/geometry.ts, which is already outside the rule's
 *  scope; src/engine/geometry.ts is listed in case it ever moves.)
 * ============================================================================= */

/**
 * esquery selector: a numeric Literal whose raw source text contains a decimal
 * point. Matching on `raw` rather than `value` is what keeps it precise —
 * string literals carry their quotes in `raw` (e.g. `'../engine/types'`), so a
 * relative import path can never satisfy this anchored pattern, while `1.5`,
 * `.5`, `2.` and `1.5e3` all do.
 */
const DECIMAL_LITERAL_SELECTOR = 'Literal[raw=/^[0-9]*\\.[0-9]*([eE][+-]?[0-9]+)?$/]';

const MONEY_MESSAGE =
  'MONEY IS INTEGER PENCE — decimal literals are forbidden in the money layer. ' +
  'Write £1.20 as 120. If this number is a physical measurement rather than an ' +
  'amount of money, it belongs in coins.ts / geometry.ts (see .eslintrc.cjs).';

module.exports = {
  root: true,

  env: {
    browser: true,
    es2022: true,
  },

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },

  plugins: ['@typescript-eslint', 'react-hooks'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],

  ignorePatterns: [
    'dist',
    'dev-dist',
    'node_modules',
    'coverage',
    'public',
    '*.d.ts',
  ],

  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'prefer-const': 'error',
    'no-var': 'error',
  },

  overrides: [
    /* ---------------------------------------------------------------------
     * THE MONEY RULE. Scoped to the pure layers where amounts actually live.
     * Screens and components are excluded: they legitimately deal in opacity,
     * durations, transforms and other fractional presentation values.
     * ------------------------------------------------------------------- */
    {
      files: ['src/engine/**/*.ts', 'src/data/**/*.ts'],
      excludedFiles: [
        // Physical facts, not money — see the banner at the top of this file.
        'src/engine/coins.ts',
        'src/engine/geometry.ts',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          { selector: DECIMAL_LITERAL_SELECTOR, message: MONEY_MESSAGE },
          {
            selector: 'Identifier[name="parseFloat"]',
            message: `${MONEY_MESSAGE} Use parseInt/Number on integer pence instead of parseFloat.`,
          },
          {
            selector: 'MemberExpression[property.name="toFixed"]',
            message: `${MONEY_MESSAGE} toFixed() is a formatting concern; format at the render edge, not in the engine.`,
          },
        ],
      },
    },

    /* Tests may assert on whatever they like. */
    {
      files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { node: true },
      rules: {
        'no-restricted-syntax': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },

    /* Build tooling runs in Node, not the browser. */
    {
      files: ['*.cjs', '*.config.js', '*.config.cjs', 'vite.config.ts'],
      env: { node: true, browser: false },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
