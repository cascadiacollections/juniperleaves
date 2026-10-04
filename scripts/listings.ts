// Featured Etsy listings: the shape of src/listings.json and the HTML rendered
// from it at build time. The product cards and their JSON-LD both come from
// the same data, so they can't drift apart.

export interface Listing {
  id: number;
  title: string;
  url: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  /** Decimal string, e.g. "19.50". */
  price: string;
  currency: string;
}

export interface ListingsFile {
  /** ISO date (YYYY-MM-DD) the listings were last refreshed. */
  updated: string;
  listings: Listing[];
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const formatPrice = ({ price, currency }: Listing): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(price));

export const formatUpdated = (isoDate: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));

export const renderCards = (listings: Listing[]): string =>
  listings
    .map(
      (listing, index) => `
          <article class="product-card">
            <a href="${escapeHtml(listing.url)}?ref=shop_home_active_${index + 1}" rel="noopener noreferrer">
              <div class="product-image">
                <img src="${escapeHtml(listing.image)}" width="${listing.width}" height="${listing.height}" loading="lazy" decoding="async" alt="${escapeHtml(listing.alt)}">
                <span>Shop on Etsy ↗</span>
              </div>
              <div class="product-meta">
                <h3>${escapeHtml(listing.title)}</h3>
                <p>From ${formatPrice(listing)}</p>
              </div>
            </a>
          </article>`
    )
    .join('\n');

export const renderJsonLd = (listings: Listing[]): string =>
  JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Latest from Juniper Leaves',
      itemListElement: listings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: listing.title,
          image: listing.image,
          url: listing.url,
          offers: {
            '@type': 'Offer',
            price: listing.price,
            priceCurrency: listing.currency,
            url: listing.url
          }
        }
      }))
    },
    null,
    2
  )
    // JSON inside <script> must not be able to close the element.
    .replaceAll('<', '\\u003c');

export const renderSitemap = (siteUrl: string, lastmod: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
