import { logger } from "./logger";
import { db } from "@workspace/db";
import { entriesTable, DailyTotals, Expenses, Product } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface FormspreePayload {
  message: string;
  timestamp?: string;
  type: "daily-reminder" | "weekly-summary";
}

/**
 * Send a notification to Formspree
 */
export async function sendFormspreeNotification(
  payload: FormspreePayload
): Promise<boolean> {
  const endpoint = process.env.FORMSPREE_ENDPOINT;

  if (!endpoint) {
    logger.error("FORMSPREE_ENDPOINT not configured");
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.message,
        type: payload.type,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status, endpoint },
        `Formspree request failed with status ${response.status}`
      );
      return false;
    }

    logger.info(
      { type: payload.type },
      "Formspree notification sent successfully"
    );
    return true;
  } catch (error) {
    logger.error({ error, endpoint }, "Error sending Formspree notification");
    return false;
  }
}

/**
 * Calculate totals for a single day
 */
function calcDayTotals(entry: {
  products: Product[];
  expenses: Expenses;
}): DailyTotals {
  const revenue = entry.products.reduce((sum, p) => sum + p.revenue, 0);
  const cogs = entry.products.reduce((sum, p) => sum + p.cogs, 0);
  const expenseTotal = Object.values(entry.expenses).reduce((sum, e) => sum + e, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenseTotal;

  return { revenue, cogs, grossProfit, expenses: expenseTotal, netProfit };
}

/**
 * Check if any entries were logged today and send reminder if not
 */
export async function sendDailyReminder(): Promise<void> {
  try {
    // Get today's date in WAT (UTC+1)
    const now = new Date();
    const watOffset = 1 * 60 * 60 * 1000; // 1 hour ahead of UTC
    const watDate = new Date(now.getTime() + watOffset);
    const todayDate = watDate.toISOString().split("T")[0];

    // Query for today's entries
    const todayEntries = await db
      .select()
      .from(entriesTable)
      .where(sql`DATE(${entriesTable.date}) = ${todayDate}`);

    if (todayEntries.length === 0) {
      const message = `📋 Daily Reminder (${new Date().toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos" })})\n\nYou haven't logged any entries today (Revenue, COGS, or Expenses). Please update your numbers!\n\nOpen the app and submit today's data.`;

      await sendFormspreeNotification({
        message,
        type: "daily-reminder",
      });
    } else {
      logger.info({ todayDate }, "Entries found for today, skipping reminder");
    }
  } catch (error) {
    logger.error({ error }, "Error in daily reminder job");
  }
}

/**
 * Send weekly summary of last week's totals
 */
export async function sendWeeklySummary(): Promise<void> {
  try {
    // Calculate last week's date range in WAT
    const now = new Date();
    const watOffset = 1 * 60 * 60 * 1000; // 1 hour ahead of UTC
    const watDate = new Date(now.getTime() + watOffset);

    // Get last Monday (7 days ago) and last Sunday
    const currentDayOfWeek = watDate.getDay(); // 0=Sunday, 1=Monday...
    const daysToLastMonday = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
    const lastMonday = new Date(watDate);
    lastMonday.setDate(watDate.getDate() - daysToLastMonday + 1);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const lastMondayStr = lastMonday.toISOString().split("T")[0];
    const lastSundayStr = lastSunday.toISOString().split("T")[0];

    logger.info(
      { lastMondayStr, lastSundayStr },
      "Querying entries for weekly summary"
    );

    // Query entries for the week
    const weeklyEntries = await db
      .select()
      .from(entriesTable)
      .where(
        sql`${entriesTable.date} >= ${lastMondayStr} AND ${entriesTable.date} <= ${lastSundayStr}`
      );

    // Aggregate totals
    const totals = weeklyEntries.reduce(
      (acc, entry) => {
        const entryData = {
          products: (entry.products as Product[]) || [],
          expenses: (entry.expenses as Expenses) || {},
        };
        const dayTotals = calcDayTotals(entryData);

        return {
          revenue: acc.revenue + dayTotals.revenue,
          cogs: acc.cogs + dayTotals.cogs,
          grossProfit: acc.grossProfit + dayTotals.grossProfit,
          expenses: acc.expenses + dayTotals.expenses,
          netProfit: acc.netProfit + dayTotals.netProfit,
          daysLogged: acc.daysLogged + 1,
        };
      },
      {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        daysLogged: 0,
      }
    );

    const fmtMoney = (n: number): string => {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(n || 0);
    };

    const message = `📊 Weekly Summary (${lastMondayStr} to ${lastSundayStr})

Revenue:      ${fmtMoney(totals.revenue)}
COGS:         ${fmtMoney(totals.cogs)}
Gross Profit: ${fmtMoney(totals.grossProfit)}
Expenses:     ${fmtMoney(totals.expenses)}
Net Profit:   ${fmtMoney(totals.netProfit)}

Days Logged: ${totals.daysLogged}
Gross Margin: ${totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : 0}%
Net Margin: ${totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) : 0}%`;

    await sendFormspreeNotification({
      message,
      type: "weekly-summary",
    });
  } catch (error) {
    logger.error({ error }, "Error in weekly summary job");
  }
}
