# `@filosign/astro`

Marketing / SEO site (Astro 6 + Tailwind v4).

## Commands

From repo root:

- `bun run astro:dev` — dev server ([localhost:4321](http://localhost:4321))
- `bun run astro:build` — production build to `dist/`

From this package:

- `bun run dev` / `bun run build` / `bun run preview`

## Tailwind

Tailwind runs via **PostCSS** (`@tailwindcss/postcss` + `postcss.config.mjs`), not `@tailwindcss/vite`, so builds stay compatible with the workspace’s Vite 8 resolution.

Global styles: `src/styles/global.css` (imported from `src/layouts/BaseLayout.astro`).

## Docs

[Astro documentation](https://docs.astro.build)
