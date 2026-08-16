/* ===========================================================================
   ESLINT

   A regra que mais importa aqui é `no-undef`. Antes de o projeto virar
   módulos ES, todo arquivo compartilhava um escopo global: chamar uma função
   de outro arquivo "simplesmente funcionava" e nada avisava quando ela sumia.
   Agora um import esquecido é erro na hora, não tela branca em produção.
   =========================================================================== */

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'dist-arquivo-unico/**', 'android/**', 'node_modules/**', '_antigo/**']
  },

  js.configs.recommended,

  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.browser, __VERSAO__: 'readonly'}
    },
    rules: {
      /* Erros de verdade */
      'no-undef': 'error',
      /* `_` na frente marca "existe por exigência da linguagem, não é usado" —
         vale também para o `catch (_err)` de um erro que é o caso esperado. */
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      /* Higiene */
      'eqeqeq': ['warn', 'smart'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-console': ['warn', {allow: ['warn', 'error']}]
    }
  },

  {
    files: ['testes/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {...globals.node, ...globals.browser}
    },
    rules: {
      'no-console': 'off'
    }
  }
];
