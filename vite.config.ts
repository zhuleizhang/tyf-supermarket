import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
	// 如果您的仓库名是 tyf-supermarket，则设置为 '/tyf-supermarket/'
	// 如果使用自定义域名，则设置为 '/'
	base: '/',
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
