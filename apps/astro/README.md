# `@filosign/astro`

Marketing / SEO site (Astro 6 + Tailwind v4). Migrated from the React client app for better SEO and static generation.

## Commands

From repo root:

- `bun run astro:dev` — dev server ([localhost:3001](http://localhost:3001))
- `bun run astro:build` — production build to `dist/`

From this package:

- `bun run dev` / `bun run build` / `bun run preview`

## Environment Variables

This project uses `@t3-oss/env-core` for type-safe environment variables.

Copy `.env.example` to `.env` and set:

```bash
PUBLIC_APP_URL=http://localhost:5173    # React client — CTAs / redirects
PUBLIC_SERVER_URL=http://localhost:3000 # API / backend — health, integrations
```

### Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_APP_URL` | `http://localhost:5173` | Client app URL for nav CTAs and links off the marketing site |
| `PUBLIC_SERVER_URL` | `http://localhost:3000` | Backend base URL (health checks, API calls from islands if you add them) |

Canonical URLs in meta tags still come from each page’s `canonicalUrl` / `BaseLayout` today, not from env.

## Pages

All marketing pages migrated from the React app:

| Route | Description |
|-------|-------------|
| `/` | Landing page with Hero, Features Bento, and Stats |
| `/about` | About page with mission, values, and team |
| `/pricing` | Pricing plans with yearly/monthly toggle |
| `/blog` | Blog listing with featured article |
| `/blog/introduction` | Introducing Filosign — launch post |
| `/changelog` | What's new — feature updates and releases |

## CTAs / App Integration

All "Connect", "Get Started", "Try Filosign" buttons redirect to `PUBLIC_APP_URL`. Update your `.env` to point to your React app deployment.

## Tailwind

Tailwind runs via **PostCSS** (`@tailwindcss/postcss` + `postcss.config.mjs`), not `@tailwindcss/vite`, so builds stay compatible with the workspace's Vite 8 resolution.

Global styles: `src/styles/global.css` (imported from `src/layouts/BaseLayout.astro`).

## SEO

Every page includes:
- Meta title & description
- OpenGraph tags (title, description, image, URL)
- Twitter Card tags
- Canonical URL (from each page’s `canonicalUrl` prop / `BaseLayout`)
- JSON-LD structured data (SoftwareApplication schema)
- Preconnect hints for external fonts

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
