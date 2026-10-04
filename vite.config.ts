import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { formatUpdated, renderCards, renderJsonLd, renderSitemap, type ListingsFile } from './scripts/listings.ts';

const SITE_URL = 'https://juniperleaves.com/';

// GitHub Pages can't send response headers, so the policy ships as a meta tag.
// Only in the build: the dev server injects inline styles for hot reload.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self'",
  "img-src 'self' https://i.etsystatic.com data:",
  "connect-src 'self' https://cloudflareinsights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

const LISTINGS_PATH = fileURLToPath(new URL('./src/listings.json', import.meta.url));

const readListings = (): ListingsFile => JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')) as ListingsFile;

// Renders the featured listings, their JSON-LD, the copyright year, and the
// sitemap from src/listings.json, and adds the CSP to built pages.
const listingsPlugin = (): Plugin => ({
  name: 'juniperleaves:listings',
  configureServer(server) {
    server.watcher.add(LISTINGS_PATH);
    server.watcher.on('change', (file) => {
      if (file === LISTINGS_PATH) {
        server.ws.send({ type: 'full-reload' });
      }
    });
  },
  transformIndexHtml(html, ctx) {
    const { updated, listings } = readListings();
    const csp = ctx.server ? '' : `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`;

    return html
      .replace('<!-- csp -->', csp)
      .replace('<!-- listings:cards -->', renderCards(listings))
      .replace('<!-- listings:jsonld -->', renderJsonLd(listings))
      .replaceAll('%LISTINGS_UPDATED%', formatUpdated(updated))
      .replaceAll('%BUILD_YEAR%', new Date().getUTCFullYear().toString());
  },
  generateBundle() {
    // The listings are the page's only regularly changing content, so their
    // refresh date doubles as the page's last-modified date.
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: renderSitemap(SITE_URL, readListings().updated)
    });
  }
});

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [listingsPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
});
