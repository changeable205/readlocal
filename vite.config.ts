import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri's custom protocol can be picky about the `crossorigin` attribute that
// Vite adds to module scripts; strip it so older WKWebView (Big Sur) loads them.
const stripCrossOrigin = (): Plugin => ({
  name: 'strip-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/\scrossorigin(=("|')[^"']*\2)?/g, '');
  },
});

// Tauri expects a fixed dev port and relative asset base for the bundled webview.
export default defineConfig({
  plugins: [react(), stripCrossOrigin()],
  base: './',
  // Tauri uses ES modules and does not need the PWA/service-worker layer.
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      // Do not watch Rust sources from the Vite dev server.
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Conservative target so the bundle parses on Big Sur's older WKWebView.
    target: 'es2019',
    outDir: 'dist',
    sourcemap: false,
    // Inline KaTeX fonts (each < 200 KB) as data URIs so both the app and the
    // self-contained PDF HTML render math offline with no external font files.
    assetsInlineLimit: 204800,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
