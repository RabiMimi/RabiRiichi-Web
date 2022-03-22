module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    'eqeqeq': 'warn',
    'no-return-await': 'warn',
    '@typescript-eslint/no-shadow': ['warn', { 'builtinGlobals': true, 'hoist': 'functions', 'allow': [] }],
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [2, { 'args': 'all', 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/explicit-member-accessibility': 'warn',
  },
};
