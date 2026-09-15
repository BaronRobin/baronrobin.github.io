import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
/**
 * Vite's SPA fallback catches directory URLs like /archive/v0/ and returns the
 * app's index.html, so an archived site renders as the *current* one in dev and
 * only behaves correctly under a production server. This makes dev match what
 * GitHub Pages does.
 */
const serveArchiveIndex = (): Plugin => ({
  name: 'serve-archive-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      // Only bare /archive/<version> paths — never their assets.
      if (req.url && /^\/archive\/[^/]+\/?(?:\?|$)/.test(req.url)) {
        const [path, query] = req.url.split('?')
        req.url = path.replace(/\/?$/, '/') + 'index.html' + (query ? `?${query}` : '')
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), serveArchiveIndex()],
  base: '/', // GitHub Pages user site deploys from root
  build: {
    rollupOptions: {
      output: {
        // Split the big, rarely-changing dependencies out of the app chunk so
        // they cache across deploys instead of being invalidated by every copy
        // tweak. Routes are additionally lazy-loaded in App.tsx.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
})
