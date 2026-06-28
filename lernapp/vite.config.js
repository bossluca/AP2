/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
//
// `base` bestimmt den Pfad-Präfix, unter dem die statischen Assets geladen werden.
// - Standard "/" → Deployment auf eigener (Sub-)Domain, z. B. https://lernapp.example.de/
//   (empfohlen für externe Nutzung, einfachste Nginx-Config).
// - Für ein Sub-Path-Deployment (z. B. https://server/lernapp/) den Build mit
//   gesetzter Umgebungsvariable starten:  VITE_BASE=/lernapp/ npm run build
//   Wichtig: Da die App HashRouter nutzt, betrifft `base` nur das Laden der
//   JS/CSS-Assets, nicht das clientseitige Routing (das läuft über #/...).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    // PWA: installierbar + offline (Service Worker via Workbox). Auto-Update,
    // Registrierung wird automatisch injiziert. Im Dev bewusst aus (devOptions).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'FiSi.dev – AP2-Vorbereitung Systemintegration',
        short_name: 'FiSi.dev',
        description:
          'Deine AP2-Vorbereitung für Fachinformatiker Systemintegration: Lernpfade, Klausursimulation, Spaced Repetition und Karteikarten.',
        lang: 'de',
        theme_color: '#5BE38A',
        background_color: '#0B0F0C',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alle Build-Assets (inkl. examdata- und vendor-Chunk) precachen → voll
        // offline nutzbar. Für SPA auf index.html zurückfallen.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  // Dev-Proxy: /api → lokales Backend (Default localhost:3001), damit das
  // Frontend same-origin spricht (keine CORS-Konfiguration nötig). Ziel per
  // VITE_API_PROXY überschreibbar. In Produktion übernimmt der Reverse-Proxy
  // (Nginx/Caddy) das Weiterleiten von /api an das Backend.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manuelles Chunking für besseres Caching auf dem Handy:
        // - `examdata`: die große Prüfungsdaten-JSON (ändert sich selten) wird vom
        //   Code getrennt, sodass Code-Deploys den Daten-Chunk nicht invalidieren.
        // - `vendor`: Bibliotheken (React, Router, Markdown, Icons) separat, parallel
        //   ladbar und über Releases hinweg cachebar.
        manualChunks(id) {
          if (id.includes('exam_data.json')) return 'examdata';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  // Vitest: jsdom für spätere Komponententests, globals für describe/it/expect
  // ohne Imports, jest-dom-Matcher via Setup-Datei.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    css: false,
  },
});
