import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import {viteStaticCopy} from 'vite-plugin-static-copy';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), purgeCss(), 
	viteStaticCopy({
		targets: [
			{
				src: 'node_modules/webtorrent/dist/sw.min.js', // Path to the service worker in node_modules
				dest: '' // Copies to the root of the static directory
			}
		]})
	],
	define: {
		global: 'window'
	}
});