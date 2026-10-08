import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"];

export const EXPENSE_CATEGORIES = [
  { name: "Food", emoji: "🍲" },
  { name: "Transport", emoji: "🚌" },
  { name: "Rent/Housing", emoji: "🏠" },
  { name: "Utilities", emoji: "💡" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Entertainment", emoji: "🎬" },
  { name: "Health", emoji: "🩺" },
  { name: "Education", emoji: "📚" },
  { name: "Subscriptions", emoji: "🔁" },
  { name: "Family", emoji: "👪" },
  { name: "Personal care", emoji: "🧴" },
  { name: "Other", emoji: "📦" },
] as const;

export const INCOME_CATEGORIES = [
  { name: "Salary", emoji: "💼" },
  { name: "Freelance", emoji: "💻" },
  { name: "Business", emoji: "🏪" },
  { name: "Side hustle", emoji: "⚡" },
  { name: "Investments", emoji: "📈" },
  { name: "Other income", emoji: "💰" },
] as const;

export const PAYMENT_METHODS = ["M-Pesa", "Cash", "Card", "Bank transfer", "Other"];
export const CURRENCIES = ["KES", "USD", "EUR", "GBP", "UGX", "TZS", "NGN", "ZAR"];

export function categoryEmoji(name: string) {
  return (
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.name === name)?.emoji ?? "📦"
  );
}

export function formatMoney(value: number, currency = "KES", compact = false) {
  const n = Number(value) || 0;
  if (currency === "KES") {
    const s = new Intl.NumberFormat("en-KE", {
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? "compact" : "standard",
    }).format(n);
    return `KSh ${s}`;
  }
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function inRange(t: Transaction, r: { start: string; end: string }) {
  return t.occurred_on >= r.start && t.occurred_on <= r.end;
}

export function sum(list: Transaction[], kind?: "income" | "expense") {
  return list.filter((t) => !kind || t.kind === kind).reduce((a, t) => a + Number(t.amount), 0);
}

export function byCategory(list: Transaction[]) {
  const map = new Map<string, number>();
  list.filter((t) => t.kind === "expense").forEach((t) => {
    map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
  });
  return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

// ---------- queries ----------
async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const id = await uid();
      if (!id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: e2 } = await supabase.from("profiles").insert({ id }).select().single();
        if (e2) throw e2;
        return created;
      }
      return data;
    },
  });

export const transactionsQuery = () =>
  queryOptions({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });

export const budgetsQuery = () =>
  queryOptions({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").order("amount", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const goalsQuery = () =>
  queryOptions({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

export const billsQuery = () =>
  queryOptions({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills").select("*").order("due_date");
      if (error) throw error;
      return data;
    },
  });

// ---------- insights ----------
export type Insight = { tone: "good" | "info" | "heads-up"; text: string };

export function buildInsights(txs: Transaction[], budgets: Budget[], currency: string): Insight[] {
  const cur = txs.filter((t) => inRange(t, monthRange(0)));
  const prev = txs.filter((t) => inRange(t, monthRange(-1)));
  const out: Insight[] = [];
  const curSpend = sum(cur, "expense");
  const prevSpend = sum(prev, "expense");
  const income = sum(cur, "income");

  if (prevSpend > 0) {
    const diff = ((curSpend - prevSpend) / prevSpend) * 100;
    if (diff < -1) out.push({ tone: "good", text: `You're doing well! Your spending is down ${Math.abs(diff).toFixed(0)}% compared with last month.` });
    else if (diff > 5) out.push({ tone: "heads-up", text: `You've spent ${diff.toFixed(0)}% more than last month so far. A quick look at your top categories could help.` });
  }

  const cats = byCategory(cur);
  if (cats[0]) out.push({ tone: "info", text: `${cats[0].category} is your biggest expense this month at ${formatMoney(cats[0].total, currency)}.` });
  if (cats[1]) out.push({ tone: "info", text: `${cats[1].category} is your second-largest expense.` });

  const prevCats = new Map(byCategory(prev).map((c) => [c.category, c.total]));
  for (const c of cats) {
    const p = prevCats.get(c.category);
    if (p && p > c.total * 1.15 && p - c.total > 500) {
      out.push({ tone: "good", text: `You've reduced ${c.category.toLowerCase()} spending by ${formatMoney(p - c.total, currency)} compared with last month.` });
      break;
    }
  }

  for (const b of budgets) {
    const spent = cats.find((c) => c.category === b.category)?.total ?? 0;
    if (Number(b.amount) > 0 && spent > Number(b.amount)) {
      out.push({ tone: "heads-up", text: `Your ${b.category.toLowerCase()} spending is above your plan. Would you like to adjust that budget?` });
      break;
    }
  }

  const ent = cats.find((c) => c.category === "Entertainment");
  if (ent && ent.total > 2000) {
    out.push({ tone: "info", text: `You could save about ${formatMoney(Math.round(ent.total * 0.25), currency)} a month by trimming entertainment by a quarter.` });
  }

  if (income > 0) {
    const saved = income - curSpend;
    if (saved > 0) out.push({ tone: "good", text: `You've kept ${formatMoney(saved, currency)} this month. That's ${((saved / income) * 100).toFixed(0)}% of your income — nice work.` });
  }
  if (out.length === 0) out.push({ tone: "info", text: "Add a few transactions and we'll start sharing helpful tips about your money." });
  return out;
}

export function healthScore(txs: Transaction[], budgets: Budget[]) {
  const cur = txs.filter((t) => inRange(t, monthRange(0)));
  const prev = txs.filter((t) => inRange(t, monthRange(-1)));
  const income = sum(cur, "income");
  const spend = sum(cur, "expense");
  const reasons: string[] = [];
  let score = 50;
  if (income > 0) {
    const rate = (income - spend) / income;
    score += Math.max(-20, Math.min(25, rate * 100));
    if (rate >= 0.1) reasons.push(`You're saving ${(rate * 100).toFixed(0)}% of your income`);
    else if (rate >= 0) reasons.push("You're spending less than you earn");
    else reasons.push("You've spent a little more than you earned this month");
  }
  const cats = byCategory(cur);
  if (budgets.length) {
    const within = budgets.filter((b) => (cats.find((c) => c.category === b.category)?.total ?? 0) <= Number(b.amount)).length;
    score += (within / budgets.length) * 20 - 5;
    reasons.push(within === budgets.length ? "You're within all your budgets" : `You're within ${within} of ${budgets.length} budgets`);
  }
  const prevSpend = sum(prev, "expense");
  if (prevSpend > 0 && spend < prevSpend) {
    score += 5;
    reasons.push("Your spending decreased this month");
  }
  score = Math.round(Math.max(0, Math.min(100, score)));
  const label = score >= 80 ? "Great" : score >= 60 ? "Good" : score >= 40 ? "Getting there" : "Let's build momentum";
  return { score, label, reasons };
}
