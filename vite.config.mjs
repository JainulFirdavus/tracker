



import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const backend = 'http://127.0.0.1:4387';
const proxy = {
  target: backend,
  changeOrigin: true,
  configure(server) {
    server.on('proxyReq', (outgoing, incoming) => {
      if (incoming.headers.origin === 'http://127.0.0.1:5173') outgoing.setHeader('Origin', backend);
    });
  }
};

export default defineConfig({
  plugins: [react(), {
    name: 'local-notification-development',
    transformIndexHtml(html, context) {
      return context.server ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/, '') : html;
    }
  }],
  base: './',
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': proxy,
      '/documentation': proxy,
      '/assets': {
        ...proxy,
        bypass(request) {
          if (!request.url.split('?')[0].endsWith('.gif')) return request.url;
        }
      }
    }
  },
  build: {
    outDir: 'renderer-dist',
    rollupOptions: {
      input: {
        dashboard: fileURLToPath(new URL('./index.html', import.meta.url)),
        notification: fileURLToPath(new URL('./notification.html', import.meta.url))
      }
    }
  }
});