# API Server

## Configuration

Create a `.env` file in the root of the project with the following variables:

```env
# API Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rev_ledger

# Notifications (Formspree)
FORMSPREE_ENDPOINT=https://formspree.io/f/xykrbvgr
```

## Email Notifications

The API server includes automated email reminders sent via [Formspree](https://formspree.io):

### Daily Reminder (10 PM WAT)
- Runs every day at **10 PM Africa/Lagos time** (9 PM UTC)
- Sends a reminder if no entries (Revenue, COGS, or Expenses) have been logged for the current day
- Encourages you to log today's numbers

### Weekly Summary (Monday 9 AM WAT)
- Runs every **Monday at 9 AM Africa/Lagos time** (8 AM UTC)
- Sends a summary of last week's totals:
  - Revenue
  - COGS
  - Gross Profit
  - Expenses
  - Net Profit
  - Gross & Net Margins

### Requirements
- `FORMSPREE_ENDPOINT` must be set in `.env`
- The endpoint is read from the environment variable (not hardcoded)
- Notifications are sent as JSON POST requests to Formspree
- Errors are logged but don't crash the application

## Scheduler

The notification scheduler uses `node-cron` to run jobs in UTC (adjusted for Africa/Lagos timezone):

- **Daily job**: `0 21 * * *` (9 PM UTC = 10 PM WAT)
- **Weekly job**: `0 8 * * 1` (Monday 8 AM UTC = Monday 9 AM WAT)

Jobs run in-process with graceful shutdown support (SIGTERM, SIGINT).
