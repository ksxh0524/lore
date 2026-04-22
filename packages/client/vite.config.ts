import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 从环境变量读取端口，默认使用 39527/39528
  const serverPort = parseInt(env.LORE_SERVER_PORT || '39527', 10);
  const clientPort = parseInt(env.LORE_CLIENT_PORT || '39528', 10);
  
  return {
    plugins: [react()],
    server: {
      port: clientPort,
      proxy: {
        '/api': `http://localhost:${serverPort}`,
        '/ws': { 
          target: `ws://localhost:${serverPort}`, 
          ws: true,
        },
      },
    },
  };
});
