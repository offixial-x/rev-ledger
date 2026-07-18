# Revenue Ledger

A Telegram Mini App for tracking daily revenue, COGS, and operating expenses.

**Live URL:** https://offixial-x.github.io/rev-ledger/

## What it does

- Add daily products with revenue and cost-of-goods-sold.
- Record daily operating expenses (rent, salaries, marketing, utilities, other).
- See totals, gross profit, net profit, margins, and a trend chart.
- Data is saved in Telegram CloudStorage when opened inside Telegram, or in browser `localStorage` when previewed on the web.

## How it’s deployed

This repo is automatically deployed to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

To deploy:

1. Make sure the repo is **public** and named `rev-ledger`.
2. In GitHub, go to **Settings → Pages** and set the **Source** to **GitHub Actions**.
3. Push to the `main` branch. The workflow builds the app and uploads the static files to Pages.

## Telegram bot

The bot is `@myrevenue_tracker_bot`. Open it in Telegram and tap the **Open App** button at the bottom to launch the mini-app.
