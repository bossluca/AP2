/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { EXAMDATEN_CACHE } from './src/lib/examdatenCache.js';

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
        // App-Shell + Bibliotheken precachen → offline nutzbar. Für SPA auf
        // index.html zurückfallen.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Nicht vorab cachen:
        // - pdf.js (+ Worker, zusammen > 1 MB) – nur wer PDFs importiert, lädt es nach.
        // - examdata (C9): Prüfungsinhalte nur mit Sitzung. nginx liefert den Chunk
        //   ohne gültiges Sitzungs-Cookie nicht aus; der Precache würde ihn sonst
        //   schon vor dem Login (ohne Cookie) anfordern.
        globIgnores: ['**/pdfjs-*.js', '**/pdf.worker*', '**/examdata-*.js'],
        navigateFallback: 'index.html',
        // Prüfungsdaten nach dem Login zur Laufzeit cachen (CacheFirst: der
        // Dateiname enthält einen Inhalts-Hash) → nach einem Login offline
        // nutzbar. Nur 200er-Antworten (kein 401 der Sitzungsprüfung). Logout/
        // Kontowechsel löscht den Cache (lib/examdatenCache.js).
        runtimeCaching: [
          {
            urlPattern: /\/assets\/examdata-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: EXAMDATEN_CACHE,
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
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
          // pdf.js nur für „Eigene Karten" – eigener, lazy geladener Chunk.
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs';
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
