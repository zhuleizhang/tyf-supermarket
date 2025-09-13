import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
	// base: './', // 添加此行，使用相对路径
	build: {
		sourcemap: 'hidden',
	},
	plugins: [
		react({
			babel: {
				plugins: ['react-dev-locator'],
			},
		}),
		tsconfigPaths(),
	],
});
