import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/locales',
          dest: 'locales',
        },
        {
          src: 'scripts',
          dest: 'scripts',
        },
      ],
    }),
  ],
  publicDir: 'public',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: [
      {
        find: /^~(.*)$/,
        replacement: '$1',
      },
      {
        find: 'util',
        replacement: 'util',
      },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$feature-flags: ();`,
        includePaths: ['node_modules'],
      },
    },
  },
});