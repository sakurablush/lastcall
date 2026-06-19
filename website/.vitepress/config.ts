import { defineConfig } from 'vitepress';

const base = process.env.VITEPRESS_BASE ?? '/';

export default defineConfig({
  title: 'lastcall',
  titleTemplate: ':title · lastcall docs',
  description:
    'lastcall — graceful process lifecycle management for Node.js and Bun. SIGTERM, phased shutdown, HTTP drain, dependencies.',
  base,
  srcDir: '../docs',
  outDir: '.vitepress/dist',
  cleanUrls: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f59e0b' }],
    [
      'meta',
      {
        name: 'description',
        content:
          'Graceful shutdown for Node.js — register cleanup handlers, drain HTTP servers, and exit cleanly on SIGTERM.',
      },
    ],
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { property: 'og:title', content: 'lastcall — graceful shutdown for Node.js' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Register cleanup handlers, drain HTTP servers, and exit cleanly on SIGTERM. Zero dependencies, 100% line coverage.',
      },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://sakurablush.github.io/lastcall/' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'lastcall',
    editLink: {
      pattern: 'https://github.com/sakurablush/lastcall/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Features', link: '/features/handler-registration' },
      { text: 'Examples', link: '/examples/' },
      { text: 'API', link: '/api/reference' },
      { text: 'Testing', link: '/testing/running-tests' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Why lastcall?', link: '/design/why-lastcall' },
          { text: 'Examples', link: '/examples/' },
          { text: 'Docs site deployment', link: '/DEPLOYMENT' },
          { text: 'Contributing', link: '/contributing' },
          { text: 'Cursor skills & rules', link: '/contributing/cursor-skills' },
          { text: 'CI & automation', link: '/contributing/ci-and-automation' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
          { text: 'Shutdown lifecycle', link: '/architecture/shutdown-lifecycle' },
          { text: 'Phases', link: '/architecture/phases' },
          { text: 'Dependency graph', link: '/architecture/dependency-graph' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Handler registration', link: '/features/handler-registration' },
          { text: 'Signal handling', link: '/features/signal-handling' },
          { text: 'HTTP server drain', link: '/features/http-server' },
          { text: 'Events & metrics', link: '/features/events-and-metrics' },
          { text: 'Exception capture', link: '/features/exception-capture' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Kubernetes', link: '/guides/kubernetes' },
          { text: 'Docker', link: '/guides/docker' },
          { text: 'Bun', link: '/guides/bun' },
          { text: 'Windows', link: '/guides/windows' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
      {
        text: 'Testing',
        items: [
          { text: 'Running tests', link: '/testing/running-tests' },
          { text: 'Writing tests', link: '/testing/writing-tests' },
          { text: 'Verification matrix', link: '/testing/verification-matrix' },
          { text: 'Coverage audit', link: '/testing/coverage-audit' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API reference', link: '/api/reference' },
          { text: 'Security', link: '/security-policy' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sakurablush/lastcall' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/lastcall' },
    ],
    footer: {
      message:
        'MIT Licensed · <a href="https://www.npmjs.com/package/lastcall" target="_blank" rel="noreferrer">npm: lastcall</a> · <a href="https://github.com/sakurablush/lastcall" target="_blank" rel="noreferrer">GitHub</a>',
      copyright: 'lastcall contributors',
    },
    outline: [2, 3],
    search: { provider: 'local' },
  },
});
