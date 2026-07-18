# Deploy to GitHub Pages

The Revenue Ledger mini-app is already wired to your Telegram bot (`@myrevenue_tracker_bot`) and points to:

```text
https://offixial-x.github.io/rev-ledger/
```

## How the automatic workflow works

The file `.github/workflows/deploy.yml` runs every time you push to the `main` branch:

1. Checks out the repo.
2. Installs `pnpm` and Node.js 24.
3. Installs workspace dependencies using `pnpm install --frozen-lockfile`.
4. Builds the Revenue Ledger app (`pnpm --filter @workspace/rev-ledger run build`).
5. Uploads the static output from `artifacts/rev-ledger/dist` to GitHub Pages.
6. Deploys the uploaded files to the GitHub Pages environment.

## What you need to do

1. Create a new GitHub repository named `rev-ledger` under your account `offixial-x`.
2. Push this whole Replit workspace to that repo:
   - You can use the Replit **Git** pane or the `git remote` skill to connect the repo.
   - Make sure the `main` branch is pushed.
3. In GitHub, open the repo **Settings → Pages**.
4. Under **Build and deployment**, select **Source: GitHub Actions**.
5. The first deployment will happen automatically after you push. Future deployments will happen every time you push to `main`.

## Notes

- The app is built for the path `/rev-ledger/` because GitHub Pages project sites use `/<repo-name>/`. This is already set in `artifacts/rev-ledger/vite.config.ts`.
- The Telegram bot token is stored as a Replit secret (`TELEGRAM_BOT_TOKEN`) and is not committed to the repo.
- The bot menu button is already set. Once the GitHub Pages site is live, opening the bot in Telegram will show an **Open App** button at the bottom.
