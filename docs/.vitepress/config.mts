import { defineConfig } from 'vitepress';

// Use /mcp-server-tauri/ for GitHub Pages, / for local dev
// eslint-disable-next-line no-process-env
const base = process.env.VITEPRESS_BASE || '/';

// https://vitepress.dev/reference/site-config
export default defineConfig({
   title: 'MCP Server Tauri',
   description: 'An MCP server that provides AI assistants with tools to interact with Tauri applications',
   base,
   cleanUrls: true,

   head: [
      [ 'link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' } ],
      [ 'meta', { name: 'theme-color', content: '#0ea5e9' } ],
      [ 'meta', { name: 'og:type', content: 'website' } ],
      [ 'meta', { name: 'og:locale', content: 'en' } ],
      [ 'meta', { name: 'og:site_name', content: 'MCP Server Tauri' } ],
   ],

   appearance: 'dark', // Enable theme toggle, default to dark

   themeConfig: {
      logo: '/logo.svg',

      nav: [
         { text: 'Home', link: '/' },
         { text: 'Guide', link: '/guides/getting-started' },
         { text: 'API', link: '/api/' },
         { text: 'Changelog', link: '/changelog' },
      ],

      sidebar: {
         '/guides/': [
            {
               text: 'Guides',
               items: [
                  { text: 'Getting Started', link: '/guides/getting-started' },
               ],
            },
         ],
         '/api/': [
            {
               text: 'API Reference',
               items: [
                  { text: 'Overview', link: '/api/' },
                  { text: 'Project Management', link: '/api/project-management' },
                  { text: 'UI Automation', link: '/api/ui-automation' },
                  { text: 'WebView Interaction', link: '/api/webview-interaction' },
                  { text: 'IPC Plugin', link: '/api/ipc-plugin' },
               ],
            },
         ],
      },

      socialLinks: [
         { icon: 'github', link: 'https://github.com/hypothesi/mcp-server-tauri' },
      ],

      footer: {
         message:
            'This is an unofficial community project. Not affiliated with, endorsed by, or ' +
            'associated with the Tauri project or CrabNebula Ltd.',
         copyright: 'MIT Licensed',
      },

      search: {
         provider: 'local',
      },

      editLink: {
         pattern: 'https://github.com/hypothesi/mcp-server-tauri/edit/main/docs/:path',
         text: 'Edit this page on GitHub',
      },
   },

   markdown: {
      theme: {
         light: 'material-theme-lighter',
         dark: 'material-theme-palenight',
      },
      lineNumbers: true,
   },
});
