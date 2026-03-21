import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        receiver: resolve(__dirname, 'receiver.html'),
        remote: resolve(__dirname, 'remote.html'),
      },
    },
  },
});
