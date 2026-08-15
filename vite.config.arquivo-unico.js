/* ===========================================================================
   VITE — build alternativo: um único arquivo HTML

   Gera `dist-arquivo-unico/index.html` com CSS, JavaScript e fontes embutidos.
   Nenhum arquivo ao lado, nenhum servidor: dá pra abrir com duplo clique,
   mandar por WhatsApp ou guardar no Drive e continuar funcionando.

   É o formato que você já usava. O build principal (PWA) é melhor pro uso
   diário e obrigatório pro Play Store; este continua existindo pra quando o
   que importa é entregar UM arquivo pra alguém.

   `npm run build:arquivo-unico`
   =========================================================================== */

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-arquivo-unico',
    target: 'es2022',
    /* Aqui o objetivo é o oposto do build normal: TUDO vira data URI, para
       não sobrar nenhum arquivo externo. O limite alto embute as fontes. */
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    sourcemap: false
  },
  plugins: [viteSingleFile()]
});
