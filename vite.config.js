/* ===========================================================================
   VITE — build principal (PWA instalável, offline de verdade)

   `npm run dev`   servidor de desenvolvimento com recarga instantânea
   `npm run build` gera dist/ pronto para hospedar ou empacotar com o Capacitor
   =========================================================================== */

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pacote from './package.json' with { type: 'json' };

export default defineConfig({
  /* Caminhos relativos: o mesmo dist/ funciona hospedado numa subpasta e
     dentro do WebView do Android, onde a origem é um esquema próprio. */
  base: './',

  /* A versão aparece no rodapé do Perfil. Serve pra saber de qual build veio
     um relato de erro durante os testes. */
  define: { __VERSAO__: JSON.stringify(pacote.version) },

  build: {
    outDir: 'dist',
    /* Navegadores dos últimos ~3 anos. Cobre com folga o WebView mínimo que
       o Play Store exige hoje e evita transpilar sem necessidade. */
    target: 'es2022',
    sourcemap: true,
    /* As fontes (20 KB cada) precisam virar arquivo, não data URI: assim o
       service worker as guarda em cache uma vez e o HTML não incha. */
    assetsInlineLimit: 4096
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      /* Sem rede nenhuma o app abre igual: o service worker guarda todo o
         pacote, inclusive as fontes. */
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html'
      },
      includeAssets: ['icones/*.png', 'icone.svg'],
      manifest: {
        name: 'Rotina',
        short_name: 'Rotina',
        description: 'Calendário do dia, treinos, alimentação e caixa de remédios num app só.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5ead8',
        theme_color: '#f5ead8',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          {src: 'icones/icone-192.png',   sizes: '192x192', type: 'image/png'},
          {src: 'icones/icone-512.png',   sizes: '512x512', type: 'image/png'},
          {src: 'icones/icone-mascara.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}
        ]
      }
    })
  ],

  test: {
    environment: 'node',
    include: ['testes/**/*.test.js']
  }
});
