# `@filosign/astro`

Marketing / SEO site (Astro 6 + Tailwind v4). Migrated from the React client app for better SEO and static generation.

## Commands

From repo root:

- `bun run dev -- --astro` or `bun run --cwd apps/astro dev:local` — dev server ([localhost:3001](http://localhost:3001))
- `bun run astro:build` — production build to `dist/`

From this package:

- `bun run dev` / `bun run build` / `bun run preview`

## Environment Variables

This project uses `@t3-oss/env-core` for type-safe environment variables.

Copy `.env.example` to `.env` and set:

```bash
PUBLIC_SITE_URL=https://filosign.xyz   # Canonical base — override for staging preview URLs
PUBLIC_APP_URL=http://localhost:3000    # React client — CTAs / redirects
PUBLIC_SERVER_URL=http://localhost:30011 # API / backend — health, integrations
```

### Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_SITE_URL` | `https://filosign.xyz` | Production origin for canonical URLs, absolute OG image URLs, and `astro.config.mjs` `site` (sitemap). |
| `PUBLIC_APP_URL` | `http://localhost:3000` | Client app URL for nav CTAs and links off the marketing site |
| `PUBLIC_SERVER_URL` | `http://localhost:30011` | Backend base URL (health checks, API calls from islands if you add them) |

Canonical URLs default from `PUBLIC_SITE_URL` + current path in `BaseLayout` unless you pass `canonicalUrl`.

## Pages

All marketing pages migrated from the React app:

| Route | Description |
|-------|-------------|
| `/` | Landing page with Hero, Features Bento, and Stats |
| `/about` | About page with mission, values, and team |
| `/pricing` | Pricing plans with yearly/monthly toggle |
| `/blog` | Blog index — lists posts; hero uses `featured: true` or newest post |
| `/blog/[slug]` | MDX articles under `src/content/blog/` (e.g. `/blog/introduction`) |
| `/changelog` | What's new — feature updates and releases |

### Blog authoring (MDX + content collections)

- Add `src/content/blog/<slug>.mdx` with frontmatter matching `src/content.config.ts` (`title`, `description`, `readingTime`, `dateDisplay`, `publishedISO`, `author`, `heroImage`, optional `heroVideo`, `draft`, `featured`, …).
- **`featured: true`** picks the `/blog` hero (fallback: newest `publishedISO`).
- **`draft: true`** hides the post from build output and listings.
- Add an Open Graph line in `src/content/og-marketing.ts` with key `blog-{slug}` (e.g. `blog-future-of-digital-agreements`) so `/open-graph/blog-{slug}.png` matches meta.
- Article typography: `src/styles/blog-content.css`. **GFM** (tables, etc.) via `remark-gfm` on `@astrojs/mdx`.

## CTAs / App Integration

All "Connect", "Get Started", "Try Filosign" buttons redirect to `PUBLIC_APP_URL`. Update your `.env` to point to your React app deployment.

## Tailwind

Tailwind runs via **PostCSS** (`@tailwindcss/postcss` + `postcss.config.mjs`), not `@tailwindcss/vite`, so builds stay compatible with the workspace's Vite 8 resolution.

Global styles: `src/styles/global.css` (imported from `src/layouts/BaseLayout.astro`).

## SEO

Every page includes:
- Meta title & description
- OpenGraph tags (title, description, image, dimensions, URL) — images are **generated at build** with [astro-og-canvas](https://github.com/delucis/astro-og-canvas) (`src/pages/open-graph/[route].ts`, 1200×630 PNGs under `/open-graph/`). Copy for each card lives in `src/content/og-marketing.ts` and should stay aligned with each page’s `<BaseLayout>` title/description.
- Twitter Card tags (`name=` attributes)
- Canonical URL (`PUBLIC_SITE_URL` + path in `BaseLayout`, optional override via `canonicalUrl`)
- JSON-LD (`WebSite`, `Organization`, plus `SoftwareApplication` or `BlogPosting` on blog posts)
- Preconnect hints for external fonts
- `@astrojs/sitemap` (marketing HTML routes only; `/open-graph/*` PNGs are excluded)
- `public/robots.txt` — points crawlers at `sitemap-index.xml` (edit the `Sitemap:` URL if the deploy origin is not `filosign.io`)
- `public/llms.txt` — short site summary for AI crawlers (optional convention)

Direct dependency **`canvaskit-wasm`** is required for OG generation (see astro-og-canvas README).

## Animations

AOS (Animate On Scroll) is used for scroll-triggered animations:
- `data-aos="fade-up"` — Most elements
- `data-aos="fade-right/left"` — Split layouts
- `data-aos-delay` — Staggered animations

Configured in `BaseLayout.astro` with 800ms duration and `ease-out-cubic` easing.

## Assets

Static assets (images, videos, fonts) should be copied from `apps/client/public/` to `apps/astro/public/`:

```bash
# Example assets needed
cp apps/client/public/logo.webp apps/astro/public/
cp apps/client/public/demo.webm apps/astro/public/
cp -r apps/client/public/images apps/astro/public/
cp apps/client/public/kartik.jpeg apps/astro/public/
cp apps/client/public/banner.webp apps/astro/public/
```

## Docs

[Astro documentation](https://docs.astro.build)
