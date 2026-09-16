import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const PORT = 3039;

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/assets/company/crm/' : '/',
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],

  resolve: {
    alias: [
      {
        find: /^src(.+)/,
        replacement: path.resolve(process.cwd(), 'src/$1'),
      },
    ],
  },

  server: {
    port: PORT,
    host: 'erp.localhost.bbkexports.in',
    hmr: {
      host: 'erp.localhost.bbkexports.in',
    },
    proxy: {
      // 🔹 Frappe APIs 
      '/api': {
        target: 'http://erp.localhost.bbkexports.in:8007',
        changeOrigin: true,
        secure: false,
      },
      // 🔹 File assets
      '/files': {
        target: 'http://erp.localhost.bbkexports.in:8007',
        changeOrigin: true,
        secure: false,
      },
      '/private': {
        target: 'http://erp.localhost.bbkexports.in:8007',
        changeOrigin: true,
        secure: false,
      }
    },
  },

  preview: {
    port: PORT,
    host: true,
  },
}));
