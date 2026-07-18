import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, ChevronDown, ChevronRight, Circle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getStorage, readyTelegramWebApp } from "@/lib/telegram";

const START_DATE = "2026-07-15";

const fmtMoney = (n: number, compact = false) => {
  if (compact && Math.abs(n) >= 1000000) {
    return "₦" + (n / 1000000).toFixed(2) + "M";
  }
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
};

const fmtDateLabel = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateShort = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EXPENSE_CATS = ["rent", "salaries", "marketing", "utilities", "other"] as const;
type ExpenseCat = typeof EXPENSE_CATS[number];
const EXPENSE_LABELS: Record<ExpenseCat, string> = { rent: "Rent", salaries: "Salaries", marketing: "Marketing", utilities: "Utilities", other: "Other" };

interface Product {
  id: string;
  name: string;
  revenue: number;
  cogs: number;
}

interface Day {
  id: string;
  date: string;
  products: Product[];
  expenses: Record<ExpenseCat, number>;
  note: string;
}

export default function RevenueLedger() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(START_DATE);

  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Record<ExpenseCat, string>>({ rent: "", salaries: "", marketing: "", utilities: "", other: "" });
  const [productName, setProductName] = useState("");
  const [productRevenue, setProductRevenue] = useState("");
  const [productCogs, setProductCogs] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editProductForms, setEditProductForms] = useState<Record<string, { name: string; revenue: string; cogs: string }>>({});

  useEffect(() => {
    readyTelegramWebApp();
    const storage = getStorage();
    storage.getItem("revenue-ledger-days").then((saved) => {
      if (saved) {
        try {
          setDays(JSON.parse(saved));
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    const storage = getStorage();
    storage.setItem("revenue-ledger-days", JSON.stringify(days)).catch(() => {});
  }, [days, loading]);

  const existingDay = days.find((d) => d.date === currentDate);

  const sortedDays = useMemo(() => [...days].sort((a, b) => (a.date < b.date ? 1 : -1)), [days]);

  const calcDayTotals = (day: Day) => {
    const productRevenue = day.products.reduce((sum, p) => sum + p.revenue, 0);
    const productCogs = day.products.reduce((sum, p) => sum + p.cogs, 0);
    const expenseTotal = EXPENSE_CATS.reduce((sum, k) => sum + (day.expenses[k] || 0), 0);
    const grossProfit = productRevenue - productCogs;
    const netProfit = grossProfit - expenseTotal;
    return { productRevenue, productCogs, expenseTotal, grossProfit, netProfit };
  };

  const totals = useMemo(() => {
    return days.reduce(
      (acc, day) => {
        const dt = calcDayTotals(day);
        acc.revenue += dt.productRevenue;
        acc.cogs += dt.productCogs;
        acc.expenses += dt.expenseTotal;
        acc.gross += dt.grossProfit;
        acc.net += dt.netProfit;
        return acc;
      },
      { revenue: 0, cogs: 0, expenses: 0, gross: 0, net: 0 }
    );
  }, [days]);

  const grossMargin = totals.revenue ? (totals.gross / totals.revenue) * 100 : 0;
  const netMargin = totals.revenue ? (totals.net / totals.revenue) * 100 : 0;

  const chartData = useMemo(() => {
    return [...days]
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((day) => {
        const dt = calcDayTotals(day);
        return {
          label: fmtDateShort(day.date),
          Revenue: dt.productRevenue,
          Gross: dt.grossProfit,
          Net: dt.netProfit,
        };
      });
  }, [days]);

  function addProduct() {
    const rev = parseFloat(productRevenue);
    const cg = parseFloat(productCogs) || 0;
    if (!productName.trim()) return setError("Product name is required.");
    if (isNaN(rev) || rev <= 0) return setError("Revenue must be a positive number.");
    if (cg > rev) return setError("COGS can't be higher than revenue.");
    setError("");
    setProducts((prev) => [...prev, { id: uid(), name: productName.trim(), revenue: rev, cogs: cg }]);
    setProductName("");
    setProductRevenue("");
    setProductCogs("");
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function submitDay() {
    if (products.length === 0) return setError("Add at least one product.");
    if (existingDay) return setError("This day already exists — expand it below to add more.");
    setError("");
    const newDay: Day = {
      id: uid(),
      date: currentDate,
      products,
      expenses: {
        rent: parseFloat(expenses.rent) || 0,
        salaries: parseFloat(expenses.salaries) || 0,
        marketing: parseFloat(expenses.marketing) || 0,
        utilities: parseFloat(expenses.utilities) || 0,
        other: parseFloat(expenses.other) || 0,
      },
      note: note.trim(),
    };
    setDays((prev) => [...prev, newDay]);
    setProducts([]);
    setExpenses({ rent: "", salaries: "", marketing: "", utilities: "", other: "" });
    setNote("");
    const nextDate = new Date(currentDate + "T00:00:00");
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate.toISOString().split("T")[0]);
    setExpandedDay(newDay.id);
  }

  function deleteDay(dayId: string) {
    setDays((prev) => prev.filter((d) => d.id !== dayId));
  }

  function deleteProductFromDay(dayId: string, productId: string) {
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, products: d.products.filter((p) => p.id !== productId) } : d))
    );
  }

  function updateDayExpense(dayId: string, category: ExpenseCat, value: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, expenses: { ...d.expenses, [category]: parseFloat(value) || 0 } } : d
      )
    );
  }

  function getEditForm(dayId: string) {
    return editProductForms[dayId] || { name: "", revenue: "", cogs: "" };
  }

  function setEditForm(dayId: string, field: string, value: string) {
    setEditProductForms((prev) => ({
      ...prev,
      [dayId]: { ...getEditForm(dayId), [field]: value },
    }));
  }

  function addProductToDay(dayId: string) {
    const form = getEditForm(dayId);
    const rev = parseFloat(form.revenue);
    const cg = parseFloat(form.cogs) || 0;
    if (!form.name || !form.name.trim() || isNaN(rev) || rev <= 0) return;
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, products: [...d.products, { id: uid(), name: form.name.trim(), revenue: rev, cogs: cg }] }
          : d
      )
    );
    setEditProductForms((prev) => ({ ...prev, [dayId]: { name: "", revenue: "", cogs: "" } }));
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, button:focus-visible {
          outline: 1px solid #3ECF8E;
          outline-offset: 0px;
        }
        input::placeholder { color: #4A5361; }
        .product-row:hover { background: #171C22; }
        .day-row:hover { background: #14181E; }
        .primary-btn:hover { background: #35B87D; }
        .primary-btn:active { transform: scale(0.98); }
        .ghost-btn:hover { background: #1A1F26; border-color: #3A424E; }
        .icon-btn:hover { opacity: 1 !important; color: #F04952 !important; background: rgba(240,73,82,0.1) !important; }
        .day-header:hover { background: #12161C; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #2A313B; border-radius: 3px; }
        @media (max-width: 760px) {
          .summary-grid { grid-template-columns: 1fr 1fr !important; }
          .product-form-grid { grid-template-columns: 1fr 1fr !important; }
          .expense-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.brand}>
            <div style={styles.brandDot} />
            <span style={styles.brandText}>Revenue Ledger</span>
          </div>
          <div style={styles.topbarRight}>
            <span style={styles.sinceTag}>since {fmtDateShort(START_DATE)}, 2026</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingState}>Loading…</div>
      ) : (
      <div style={styles.container}>
        {/* KPI Row */}
        <div className="summary-grid" style={styles.summaryGrid}>
          <KpiCard label="Revenue" value={fmtMoney(totals.revenue)} />
          <KpiCard label="COGS" value={fmtMoney(totals.cogs)} muted />
          <KpiCard
            label="Gross Profit"
            value={fmtMoney(totals.gross)}
            sub={`${grossMargin.toFixed(1)}% margin`}
            positive={totals.gross >= 0}
          />
          <KpiCard
            label="Net Profit"
            value={fmtMoney(totals.net)}
            sub={`${netMargin.toFixed(1)}% margin`}
            positive={totals.net >= 0}
            emphasize
          />
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>Performance trend</span>
            </div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#1B2028" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5C6672", fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#232830" }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#5C6672", fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                  />
                  <Tooltip
                    formatter={(v: number) => fmtMoney(v)}
                    contentStyle={{ background: "#12161C", border: "1px solid #232830", borderRadius: 6, fontFamily: "Inter", fontSize: 12, color: "#E8EAED" }}
                    labelStyle={{ color: "#8B93A1" }}
                  />
                  <Line type="monotone" dataKey="Revenue" stroke="#5C7CFA" strokeWidth={1.75} dot={false} />
                  <Line type="monotone" dataKey="Gross" stroke="#C9A44C" strokeWidth={1.75} dot={false} />
                  <Line type="monotone" dataKey="Net" stroke="#3ECF8E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.legendRow}>
              <LegendDot color="#5C7CFA" label="Revenue" />
              <LegendDot color="#C9A44C" label="Gross profit" />
              <LegendDot color="#3ECF8E" label="Net profit" />
            </div>
          </div>
        )}

        {/* Entry panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>New entry</span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          {existingDay && (
            <div style={styles.warnBanner}>
              An entry for {fmtDateLabel(currentDate)} already exists. Expand it in the list below to add more products or adjust expenses.
            </div>
          )}

          {!existingDay && (
            <>
              <div style={styles.subLabel}>Products</div>
              <div className="product-form-grid" style={styles.productFormGrid}>
                <input
                  type="text"
                  placeholder="Product name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProduct()}
                  style={styles.input}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Revenue"
                  value={productRevenue}
                  onChange={(e) => setProductRevenue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProduct()}
                  style={styles.input}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="COGS"
                  value={productCogs}
                  onChange={(e) => setProductCogs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addProduct()}
                  style={styles.input}
                />
                <button className="primary-btn" onClick={addProduct} style={styles.addBtn}>
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>

              {products.length > 0 && (
                <div style={styles.miniTable}>
                  {products.map((p) => {
                    const gp = p.revenue - p.cogs;
                    const margin = p.revenue ? ((gp / p.revenue) * 100).toFixed(0) : 0;
                    return (
                      <div key={p.id} className="product-row" style={styles.miniRow}>
                        <span style={styles.miniRowName}>{p.name}</span>
                        <span style={styles.miniRowMono}>{fmtMoney(p.revenue)}</span>
                        <span style={styles.miniRowMonoMuted}>−{fmtMoney(p.cogs)}</span>
                        <span style={{ ...styles.miniRowMono, color: "#3ECF8E" }}>{fmtMoney(gp)} · {margin}%</span>
                        <button className="icon-btn" onClick={() => removeProduct(p.id)} style={styles.iconBtn}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ ...styles.subLabel, marginTop: 16 }}>Operating expenses</div>
              <div className="expense-grid" style={styles.expenseGrid}>
                {EXPENSE_CATS.map((cat) => (
                  <div key={cat} style={styles.expenseField}>
                    <span style={styles.expenseFieldLabel}>{EXPENSE_LABELS[cat]}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={expenses[cat]}
                      onChange={(e) => setExpenses({ ...expenses, [cat]: e.target.value })}
                      style={styles.inputSmall}
                    />
                  </div>
                ))}
              </div>

              <input
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ ...styles.input, marginTop: 12, width: "100%" }}
              />

              {products.length > 0 && (
                <div style={styles.previewBar}>
                  <span>
                    Gross <b style={{ color: "#C9A44C" }}>{fmtMoney(products.reduce((s, p) => s + p.revenue - p.cogs, 0))}</b>
                  </span>
                  <span>
                    Net{" "}
                    <b style={{ color: "#3ECF8E" }}>
                      {fmtMoney(
                        products.reduce((s, p) => s + p.revenue - p.cogs, 0) -
                          EXPENSE_CATS.reduce((s, c) => s + (parseFloat(expenses[c]) || 0), 0)
                      )}
                    </b>
                  </span>
                </div>
              )}

              {error && <div style={styles.errorText}>{error}</div>}

              <button className="primary-btn" onClick={submitDay} style={styles.submitBtn}>
                Submit day
              </button>
            </>
          )}
        </div>

        {/* Days list */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Daily entries</span>
            <span style={styles.countTag}>{days.length}</span>
          </div>

          {sortedDays.length === 0 ? (
            <div style={styles.emptyState}>No entries yet. Submit your first day above.</div>
          ) : (
            <div>
              {sortedDays.map((day) => {
                const dt = calcDayTotals(day);
                const isOpen = expandedDay === day.id;
                const editForm = getEditForm(day.id);
                return (
                  <div key={day.id} style={styles.dayBlock}>
                    <div
                      className="day-header"
                      style={styles.dayHeader}
                      onClick={() => setExpandedDay(isOpen ? null : day.id)}
                    >
                      <div style={styles.dayHeaderLeft}>
                        {isOpen ? <ChevronDown size={14} color="#5C6672" /> : <ChevronRight size={14} color="#5C6672" />}
                        <span style={styles.dayDate}>{fmtDateLabel(day.date)}</span>
                        <span style={styles.dayProductCount}>{day.products.length} product{day.products.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={styles.dayHeaderRight}>
                        <span style={styles.dayFigure}>{fmtMoney(dt.productRevenue, true)}</span>
                        <span style={{ ...styles.dayFigure, color: "#C9A44C" }}>{fmtMoney(dt.grossProfit, true)}</span>
                        <span style={{ ...styles.dayFigureBold, color: dt.netProfit >= 0 ? "#3ECF8E" : "#F04952" }}>
                          {dt.netProfit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {fmtMoney(dt.netProfit, true)}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={styles.dayBody}>
                        {day.note && <div style={styles.dayNoteText}>"{day.note}"</div>}

                        <div style={styles.subLabel}>Products</div>
                        {day.products.map((p) => {
                          const gp = p.revenue - p.cogs;
                          const margin = p.revenue ? ((gp / p.revenue) * 100).toFixed(0) : 0;
                          return (
                            <div key={p.id} className="product-row" style={styles.miniRow}>
                              <span style={styles.miniRowName}>{p.name}</span>
                              <span style={styles.miniRowMono}>{fmtMoney(p.revenue)}</span>
                              <span style={styles.miniRowMonoMuted}>−{fmtMoney(p.cogs)}</span>
                              <span style={{ ...styles.miniRowMono, color: "#3ECF8E" }}>{fmtMoney(gp)} · {margin}%</span>
                              <button
                                className="icon-btn"
                                onClick={() => deleteProductFromDay(day.id, p.id)}
                                style={styles.iconBtn}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add product to existing day */}
                        <div className="product-form-grid" style={{ ...styles.productFormGrid, marginTop: 8 }}>
                          <input
                            type="text"
                            placeholder="Product name"
                            value={editForm.name}
                            onChange={(e) => setEditForm(day.id, "name", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Revenue"
                            value={editForm.revenue}
                            onChange={(e) => setEditForm(day.id, "revenue", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="COGS"
                            value={editForm.cogs}
                            onChange={(e) => setEditForm(day.id, "cogs", e.target.value)}
                            style={styles.input}
                          />
                          <button className="primary-btn" onClick={() => addProductToDay(day.id)} style={styles.addBtn}>
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        <div style={{ ...styles.subLabel, marginTop: 16 }}>Operating expenses</div>
                        <div className="expense-grid" style={styles.expenseGrid}>
                          {EXPENSE_CATS.map((cat) => (
                            <div key={cat} style={styles.expenseField}>
                              <span style={styles.expenseFieldLabel}>{EXPENSE_LABELS[cat]}</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={day.expenses[cat] || ""}
                                placeholder="0"
                                onChange={(e) => updateDayExpense(day.id, cat, e.target.value)}
                                style={styles.inputSmall}
                              />
                            </div>
                          ))}
                        </div>

                        <div style={styles.dayFooterRow}>
                          <div style={styles.dayTotalsInline}>
                            <span>Revenue <b>{fmtMoney(dt.productRevenue)}</b></span>
                            <span>Expenses <b>{fmtMoney(dt.expenseTotal)}</b></span>
                            <span>Net <b style={{ color: dt.netProfit >= 0 ? "#3ECF8E" : "#F04952" }}>{fmtMoney(dt.netProfit)}</b></span>
                          </div>
                          <button className="ghost-btn" onClick={() => deleteDay(day.id)} style={styles.deleteDayBtn}>
                            <Trash2 size={12} />
                            Delete day
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  muted?: boolean;
  emphasize?: boolean;
}

function KpiCard({ label, value, sub, positive, muted, emphasize }: KpiCardProps) {
  return (
    <div style={{ ...styles.kpiCard, ...(emphasize ? styles.kpiCardEmphasis : {}) }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div
        style={{
          ...styles.kpiValue,
          color: muted ? "#5C6672" : positive === false ? "#F04952" : positive === true ? "#3ECF8E" : "#E8EAED",
        }}
      >
        {value}
      </div>
      {sub && <div style={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={styles.legendItem}>
      <Circle size={7} fill={color} color={color} />
      {label}
    </span>
  );
}

const MONO = "'JetBrains Mono', monospace";
const SANS = "'Inter', sans-serif";
const DISPLAY = "'Space Grotesk', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0B0E11",
    fontFamily: SANS,
    color: "#E8EAED",
  },
  loadingState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    color: "#5C6672",
  },
  topbar: {
    borderBottom: "1px solid #1B2028",
    background: "#0D1014",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  topbarInner: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#3ECF8E",
    boxShadow: "0 0 8px #3ECF8E",
  },
  brandText: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.01em",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  savingTag: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: "#C9A44C",
  },
  sinceTag: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#5C6672",
  },
  container: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "20px 20px 50px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    background: "#12161C",
    border: "1px solid #1F252D",
    borderRadius: 8,
    padding: "13px 14px",
  },
  kpiCardEmphasis: {
    background: "#0F1A15",
    border: "1px solid #1E3A2C",
  },
  kpiLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#5C6672",
    marginBottom: 6,
  },
  kpiValue: {
    fontFamily: DISPLAY,
    fontSize: 19,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.01em",
  },
  kpiSub: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: "#5C6672",
    marginTop: 3,
  },
  panel: {
    background: "#12161C",
    border: "1px solid #1F252D",
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: {
    fontFamily: DISPLAY,
    fontSize: 13.5,
    fontWeight: 600,
    color: "#E8EAED",
    letterSpacing: "-0.005em",
  },
  countTag: {
    fontFamily: MONO,
    fontSize: 11,
    color: "#5C6672",
    background: "#171C22",
    padding: "2px 8px",
    borderRadius: 10,
  },
  legendRow: {
    display: "flex",
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #1B2028",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: MONO,
    fontSize: 10.5,
    color: "#8B93A1",
  },
  dateInput: {
    background: "#0D1014",
    border: "1px solid #232830",
    borderRadius: 5,
    padding: "6px 8px",
    fontFamily: MONO,
    fontSize: 12,
    color: "#E8EAED",
    colorScheme: "dark",
  },
  warnBanner: {
    fontFamily: SANS,
    fontSize: 12.5,
    color: "#C9A44C",
    background: "#1A160D",
    border: "1px solid #332A15",
    borderRadius: 6,
    padding: "10px 12px",
  },
  subLabel: {
    fontFamily: MONO,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#5C6672",
    marginBottom: 8,
  },
  productFormGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr auto",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    background: "#0D1014",
    border: "1px solid #232830",
    borderRadius: 5,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: MONO,
    color: "#E8EAED",
    width: "100%",
  },
  inputSmall: {
    background: "#0D1014",
    border: "1px solid #232830",
    borderRadius: 5,
    padding: "7px 9px",
    fontSize: 12.5,
    fontFamily: MONO,
    color: "#E8EAED",
    width: "100%",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#3ECF8E",
    color: "#0B0E11",
    border: "none",
    borderRadius: 5,
    width: 36,
    cursor: "pointer",
  },
  miniTable: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginTop: 4,
  },
  miniRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1.3fr auto",
    gap: 8,
    alignItems: "center",
    padding: "7px 8px",
    borderRadius: 4,
  },
  miniRowName: {
    fontFamily: SANS,
    fontSize: 12.5,
    color: "#E8EAED",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miniRowMono: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#B8BFC9",
    textAlign: "right",
  },
  miniRowMonoMuted: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#5C6672",
    textAlign: "right",
  },
  iconBtn: {
    border: "none",
    background: "transparent",
    color: "#5C6672",
    cursor: "pointer",
    opacity: 0.6,
    padding: 4,
    borderRadius: 4,
    display: "flex",
  },
  expenseGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
  },
  expenseField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  expenseFieldLabel: {
    fontFamily: MONO,
    fontSize: 9.5,
    color: "#5C6672",
  },
  previewBar: {
    display: "flex",
    gap: 20,
    marginTop: 14,
    padding: "10px 12px",
    background: "#0D1014",
    borderRadius: 6,
    fontFamily: MONO,
    fontSize: 12.5,
    color: "#8B93A1",
  },
  errorText: {
    color: "#F04952",
    fontSize: 12.5,
    marginTop: 10,
    fontFamily: SANS,
  },
  submitBtn: {
    marginTop: 14,
    background: "#3ECF8E",
    color: "#0B0E11",
    border: "none",
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: SANS,
    cursor: "pointer",
    width: "100%",
  },
  emptyState: {
    textAlign: "center",
    padding: "30px 10px",
    color: "#5C6672",
    fontSize: 13,
  },
  dayBlock: {
    borderBottom: "1px solid #1B2028",
  },
  dayHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "11px 6px",
    cursor: "pointer",
    borderRadius: 5,
  },
  dayHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  dayDate: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: 600,
    color: "#E8EAED",
  },
  dayProductCount: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: "#5C6672",
    background: "#171C22",
    padding: "1px 7px",
    borderRadius: 8,
  },
  dayHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  dayFigure: {
    fontFamily: MONO,
    fontSize: 12,
    color: "#B8BFC9",
    minWidth: 66,
    textAlign: "right",
  },
  dayFigureBold: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 700,
    minWidth: 70,
    textAlign: "right",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  dayBody: {
    padding: "4px 6px 16px",
  },
  dayNoteText: {
    fontFamily: SANS,
    fontSize: 12,
    fontStyle: "italic",
    color: "#5C6672",
    marginBottom: 12,
  },
  dayFooterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #1B2028",
    flexWrap: "wrap",
    gap: 10,
  },
  dayTotalsInline: {
    display: "flex",
    gap: 16,
    fontFamily: MONO,
    fontSize: 11.5,
    color: "#8B93A1",
  },
  deleteDayBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    color: "#8B93A1",
    border: "1px solid #232830",
    borderRadius: 5,
    padding: "6px 10px",
    fontSize: 11.5,
    fontFamily: SANS,
    cursor: "pointer",
  },
  footnote: {
    textAlign: "center",
    fontSize: 11,
    color: "#3A424E",
    marginTop: 6,
    fontFamily: MONO,
  },
};
