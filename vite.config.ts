import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/fundmobapi': {
        target: 'https://fundmobapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fundmobapi/, ''),
        headers: {
          Referer: 'https://fundmobapi.eastmoney.com',
        },
      },
      '/api/fundgz': {
        target: 'http://fundgz.1234567.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fundgz/, ''),
      },
      '/api/f10': {
        target: 'https://api.fund.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/f10/, '/f10'),
        headers: {
          Referer: 'https://fundf10.eastmoney.com/',
        },
      },
      '/api/api': {
        target: 'https://api.fund.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/api/, '/api'),
        headers: {
          Referer: 'https://fund.eastmoney.com',
        },
      },
      '/api/push2': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/push2/, ''),
        headers: {
          Referer: 'https://push2.eastmoney.com',
        },
      },
      '/api/fund': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fund/, ''),
        headers: {
          Referer: 'https://fund.eastmoney.com',
        },
      },
      // 新浪财经行情接口 (fu_xxx 为盘中基金估值，包含今日实时预估净值与涨跌)
      '/api/sinahq': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sinahq/, ''),
        headers: {
          Referer: 'https://finance.sina.com.cn',
        },
      },
      // 新浪7x24实时财经快讯接口
      '/api/sinanews': {
        target: 'https://zhibo.sina.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sinanews/, ''),
        headers: {
          Referer: 'https://finance.sina.com.cn',
        },
      },
      // 腾讯财经股票分时接口 (用于重仓股分钟行情拉取与估值拟合)
      '/api/tencent': {
        target: 'https://web.ifzq.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent/, ''),
        headers: {
          Referer: 'https://gu.qq.com',
        },
      },
      '/img': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});