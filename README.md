# Juniper Leaves

[![CI](https://github.com/cascadiacollections/juniperleaves/actions/workflows/main.yml/badge.svg)](https://github.com/cascadiacollections/juniperleaves/actions/workflows/main.yml)

The Juniper Leaves storefront at [juniperleaves.com](https://juniperleaves.com/) directs customers to the [Juniper Leaves Etsy shop](https://www.etsy.com/shop/JuniperLeaves).

## Requirements

- Node.js 24
- npm 11 or newer

The repository includes `.nvmrc` for Node version managers and a dev container with the same runtime.

## Development

```sh
npm ci
npm run dev
```

Vite serves the site at [http://localhost:5173](http://localhost:5173).

## Validation

```sh
npm run check
```

This type-checks the TypeScript and creates the production build in `dist/`.

## Deployment

Pushes to `main` are checked, built, and deployed to GitHub Pages by `.github/workflows/main.yml`. Static files in `public/` are copied to the deployment root, including the `CNAME` file for `juniperleaves.com`.
