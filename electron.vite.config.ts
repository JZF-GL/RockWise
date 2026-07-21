import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // 天天基金网 API 代理 - 解决CORS
        '/api/fund': {
          target: 'https://fund.eastmoney.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fund/, ''),
        },
        '/api/fundmobapi': {
          target: 'https://fundmobapi.eastmoney.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fundmobapi/, ''),
        },
        '/api/fundgz': {
          target: 'http://fundgz.1234567.com.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fundgz/, ''),
        },
        '/api/api': {
          target: 'https://api.fund.eastmoney.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/api/, '/api'),
        },
        '/api/push2': {
          target: 'https://push2.eastmoney.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/push2/, ''),
        },
        '/api/f10': {
          target: 'https://api.fund.eastmoney.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/f10/, '/f10'),
        },
        // 基金净值图片/图标
        '/img': {
          target: 'https://fund.eastmoney.com',
          changeOrigin: true,
        },
      },
    },
  },
});