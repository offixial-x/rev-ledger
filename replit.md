# Revenue Ledger

A Telegram Mini App for tracking daily revenue, COGS, and operating expenses. Data is stored in Telegram CloudStorage when opened inside Telegram, or in `localStorage` when previewed in a browser.

## Run & Operate

- `pnpm --filter @workspace/rev-ledger run dev` — run the app in Replit preview
- `pnpm --filter @workspace/rev-ledger run build` — build the static GitHub Pages files
- `pnpm run typecheck` — full typecheck across all packages
- The static output lives in `artifacts/rev-ledger/dist`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React 19 + Vite 7
- Recharts for the trend chart, Lucide React for icons
- Telegram Web App SDK for CloudStorage and the mini-app container

## Where things live

- Source of truth for the app: `artifacts/rev-ledger/`
- Page component: `artifacts/rev-ledger/src/pages/RevenueLedger.tsx`
- Telegram helpers: `artifacts/rev-ledger/src/lib/telegram.ts`
- GitHub Pages workflow: `.github/workflows/deploy.yml`
- Deployment guide: `GITHUB_PAGES.md`

## Architecture decisions

- The app is client-side only so it can be hosted on GitHub Pages without a backend.
- The Vite base path is set to `/rev-ledger/` to match the GitHub Pages project-site URL.
- The Telegram bot menu button is configured via the Bot API to open the GitHub Pages URL.

## Product

- Add daily products with revenue and COGS.
- Record operating expenses per day (rent, salaries, marketing, utilities, other).
- See totals, gross/net profit, margins, and a trend chart.
- Data persists across sessions inside Telegram CloudStorage.

## User preferences

- GitHub username: `offixial-x`
- GitHub repository name: `rev-ledger`
- GitHub Pages URL: `https://offixial-x.github.io/rev-ledger/`
- Telegram bot: `@myrevenue_tracker_bot`
- Bot menu button text: `Open App`
- GitHub repo visibility: `public`

## Gotchas

- The repo must be named exactly `rev-ledger` so the Vite base path matches the GitHub Pages URL.
- In GitHub Pages settings, choose **Source: GitHub Actions**, not the default branch deploy.
- The first push to `main` triggers the deploy workflow.

## Pointers

- See `GITHUB_PAGES.md` for the full deploy steps.
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
