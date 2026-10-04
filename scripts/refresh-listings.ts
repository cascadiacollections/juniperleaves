// Refreshes src/listings.json from the Etsy Open API v3.
//
// The featured products are hand-picked, so this keeps the selection and
// only touches what goes stale on its own: each listing's price, photo, and
// URL. A listing that is no longer active (sold out, expired, removed) is
// swapped for the shop's most recently updated active listing that isn't
// already featured. The "updated" date only moves when something changed.
//
// Usage: ETSY_API_KEY=keystring:shared_secret node scripts/refresh-listings.ts
// Writes a Markdown summary of the changes to $CHANGES_FILE when set.

import { readFileSync, writeFileSync } from 'node:fs';
import type { Listing, ListingsFile } from './listings.ts';

const SHOP_NAME = 'JuniperLeaves';
const IMAGE_WIDTH = 570;
const LISTINGS_PATH = new URL('../src/listings.json', import.meta.url);
const API_BASE = process.env.ETSY_API_BASE ?? 'https://openapi.etsy.com/v3/application';
const API_KEY = process.env.ETSY_API_KEY;

interface EtsyImage {
  rank: number;
  url_570xN: string;
  full_width: number | null;
  full_height: number | null;
}

interface EtsyListing {
  listing_id: number;
  state: string;
  title: string;
  url: string;
  price: { amount: number; divisor: number; currency_code: string };
  images?: EtsyImage[];
}

interface EtsyPage<T> {
  count: number;
  results: T[];
}

const etsy = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'x-api-key': API_KEY ?? '' } });
  if (!response.ok) {
    throw new Error(`Etsy ${path} -> ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
};

// Etsy returns titles HTML-encoded ("Mom &amp; Me").
const decodeEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

// Etsy titles are long keyword strings ("PSL Bandana | Fall Dog Bandana, ...");
// the card shows the part before the first separator.
const shortTitle = (title: string): string => {
  const [first = title] = decodeEntities(title).split(/\s+[|–—-]\s+|,\s+/);
  return first.trim();
};

const toListing = (etsyListing: EtsyListing, previous?: Listing): Listing => {
  const [image] = [...(etsyListing.images ?? [])].sort((a, b) => a.rank - b.rank);
  if (!image) {
    throw new Error(`Listing ${etsyListing.listing_id} has no images`);
  }

  const url = new URL(etsyListing.url);
  url.search = '';
  const { amount, divisor, currency_code } = etsyListing.price;
  const title = previous?.title ?? shortTitle(etsyListing.title);

  return {
    id: etsyListing.listing_id,
    title,
    url: url.toString(),
    image: image.url_570xN,
    width: IMAGE_WIDTH,
    height:
      image.full_width && image.full_height
        ? Math.round((IMAGE_WIDTH * image.full_height) / image.full_width)
        : (previous?.height ?? IMAGE_WIDTH),
    // Titles and alt text are curated by hand; keep them for known listings.
    alt: previous?.alt ?? `${title} from Juniper Leaves`,
    price: (amount / divisor).toFixed(2),
    currency: currency_code
  };
};

const fetchWithImages = async (ids: number[]): Promise<Map<number, EtsyListing>> => {
  if (ids.length === 0) {
    return new Map();
  }
  const page = await etsy<EtsyPage<EtsyListing>>(`/listings/batch?listing_ids=${ids.join(',')}&includes=Images`);
  return new Map(page.results.map((listing) => [listing.listing_id, listing]));
};

const describe = (before: Listing, after: Listing): string[] => {
  if (before.id !== after.id) {
    return [`- Replaced **${before.title}** (no longer active) with **${after.title}** — ${after.url}`];
  }
  const changes: string[] = [];
  if (before.price !== after.price || before.currency !== after.currency) {
    changes.push(`price ${before.price} → ${after.price} ${after.currency}`);
  }
  if (before.image !== after.image) {
    changes.push('new photo');
  }
  if (before.url !== after.url) {
    changes.push(`URL → ${after.url}`);
  }
  return changes.length > 0 ? [`- **${after.title}**: ${changes.join(', ')}`] : [];
};

const main = async (): Promise<void> => {
  if (!API_KEY) {
    throw new Error('ETSY_API_KEY is not set');
  }

  const file = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')) as ListingsFile;
  const current = await fetchWithImages(file.listings.map((listing) => listing.id));
  const isActive = (listing: EtsyListing | undefined): listing is EtsyListing => listing?.state === 'active';

  const staleSlots = file.listings.filter((listing) => !isActive(current.get(listing.id))).length;
  let replacements: EtsyListing[] = [];

  if (staleSlots > 0) {
    const shops = await etsy<EtsyPage<{ shop_id: number }>>(`/shops?shop_name=${SHOP_NAME}`);
    const shopId = shops.results[0]?.shop_id;
    if (!shopId) {
      throw new Error(`Shop ${SHOP_NAME} not found`);
    }

    const featured = new Set(file.listings.map((listing) => listing.id));
    const active = await etsy<EtsyPage<EtsyListing>>(
      `/shops/${shopId}/listings/active?limit=25&sort_on=updated&sort_order=desc`
    );
    const candidates = active.results.filter((listing) => !featured.has(listing.listing_id)).slice(0, staleSlots);
    const withImages = await fetchWithImages(candidates.map((listing) => listing.listing_id));
    replacements = candidates.flatMap((listing) => withImages.get(listing.listing_id) ?? []);
  }

  const listings = file.listings.map((previous) => {
    const etsyListing = current.get(previous.id);
    if (isActive(etsyListing)) {
      return toListing(etsyListing, previous);
    }
    const replacement = replacements.shift();
    if (!replacement) {
      console.warn(`No active replacement for ${previous.title}; keeping it.`);
      return previous;
    }
    return toListing(replacement);
  });

  const summary = file.listings.flatMap((before, index) => describe(before, listings[index] ?? before));

  if (summary.length === 0) {
    console.log('Listings are up to date.');
    return;
  }

  const updated: ListingsFile = { updated: new Date().toISOString().slice(0, 10), listings };
  writeFileSync(LISTINGS_PATH, `${JSON.stringify(updated, null, 2)}\n`);
  const report = summary.join('\n');
  console.log(report);
  if (process.env.CHANGES_FILE) {
    writeFileSync(process.env.CHANGES_FILE, `${report}\n`);
  }
};

await main();
