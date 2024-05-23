import globals from 'globals';
import pluginJs from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
  {
    languageOptions: { globals: globals.browser },
    plugins: {
      prettier,
    },
    rules: {
      // 'prettier/prettier': 'warn',
      'spaced-comment': 'off',
      'no-console': 'off',
      'consistent-return': 'off',
      'func-names': 'off',
      'object-shorthand': 'off',
      'no-process-exit': 'off',
      'no-param-reassign': 'off',
      'no-return-await': 'off',
      'no-underscore-dangle': 'off',
      'class-methods-use-this': 'off',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|val' }],
    },
  },
  pluginJs.configs.recommended,
];
