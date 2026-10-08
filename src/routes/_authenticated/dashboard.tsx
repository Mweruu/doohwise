import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  billsQuery, budgetsQuery, buildInsights, byCategory, categoryEmoji, formatMoney, goalsQuery, healthScore, inRange,
  monthRange, profileQuery, sum, toISODate, transactionsQuery,
} from "@/lib/finance";
import { Card, Meter, StatusPill } from "@/components/app/ui-bits";
import { useQuickAdd } from "@/components/app/quick-add";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PesaPlan" },
      { name: "description", content: "Your balance, spending, savings and upcoming bills at a glance." },
      { property: "og:title", content: "Dashboard — PesaPlan" },
      { property: "og:description", content: "Your money at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const quick = useQuickAdd();
  const { data: profile } = useQuery(profileQuery());
  const { data: txs = [] } = useQuery(transactionsQuery());
  const { data: budgets = [] } = useQuery(budgetsQuery());
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: bills = [] } = useQuery(billsQuery());
  const cur = profile?.currency ?? "KES";
  const m = monthRange(0);
  const month = txs.filter((t) => inRange(t, m));
  const income = sum(month, "income");
  const spend = sum(month, "expense");
  const balance = sum(txs, "income") - sum(txs, "expense");
  const saved = Math.max(0, income - spend);
  const budgetTotal = budgets.reduce((a, b) => a + Number(b.amount), 0);
  const remaining = budgetTotal - spend;
  const cats = byCategory(month);
  const health = healthScore(txs, budgets);
  const tip = buildInsights(txs, budgets, cur)[0];
  const upcoming = bills.filter((b) => !b.paid).slice(0, 4);
  const goalSaved = goals.reduce((a, g) => a + Number(g.saved), 0);
  const goalTarget = goals.reduce((a, g) => a + Number(g.target), 0);

  // last 30 days trend
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const iso = toISODate(d);
    return { day: d.getDate(), spent: txs.filter((t) => t.kind === "expense" && t.occurred_on === iso).reduce((a, t) => a + Number(t.amount), 0) };
  });

  const hello = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground">{hello},</p>
          <h1 className="text-2xl font-bold md:text-3xl">{profile?.display_name ?? "there"} 👋</h1>
        </div>
        <Button className="hidden rounded-full md:inline-flex" onClick={() => quick.open()}><Plus className="h-4 w-4" /> Add expense</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-hero p-6 text-primary-foreground shadow-float lg:col-span-2">
          <p className="text-sm opacity-85">Current balance</p>
          <p className="mt-1 text-4xl font-extrabold tabular md:text-5xl">{formatMoney(balance, cur)}</p>
          <div className="mt-6 grid grid-cols-3 items-center gap-2 rounded-2xl bg-primary-foreground/10 p-4 text-sm">
            <Flow label="Income" value={formatMoney(income, cur)} />
            <Flow label="Spending" value={formatMoney(spend, cur)} arrow />
            <Flow label="Saved" value={formatMoney(saved, cur)} arrow />
          </div>
        </div>
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Financial health</p>
            <p className="mt-1 text-2xl font-bold">{health.label}</p>
            <div className="mt-3"><Meter value={health.score} max={100} label="Financial health score" /></div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {health.reasons.slice(0, 3).map((r) => <li key={r}>✓ {r}</li>)}
              {health.reasons.length === 0 && <li className="text-muted-foreground">Add income and expenses to see your score.</li>}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Income this month" value={formatMoney(income, cur)} icon={<TrendingUp className="h-4 w-4 text-success" />} />
        <Stat label="Spent this month" value={formatMoney(spend, cur)} icon={<TrendingDown className="h-4 w-4 text-primary" />} />
        <Stat label="Money left after expenses" value={formatMoney(income - spend, cur)} />
        <Stat label="Budget remaining" value={budgetTotal ? formatMoney(remaining, cur) : "—"} hint={budgetTotal ? undefined : "Set a budget"} />
      </div>

      {tip && (
        <div className="flex items-start gap-3 rounded-3xl bg-success-soft p-5">
          <span className="text-2xl" aria-hidden>💬</span>
          <div className="flex-1">
            <p className="font-medium">{tip.text}</p>
            <Link to="/insights" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">More tips <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Spending trend" sub="Last 30 days" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip formatter={(v: number) => formatMoney(v, cur)} labelFormatter={(l) => `Day ${l}`} />
                <Area type="monotone" dataKey="spent" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Upcoming bills" link="/bills" />
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No unpaid bills. Nice! 🎉</p> : (
            <ul className="space-y-3">
              {upcoming.map((b) => {
                const overdue = b.due_date < toISODate(new Date());
                return (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <div><p className="font-medium">{b.name}</p><p className={overdue ? "text-destructive" : "text-muted-foreground"}>{overdue ? "Overdue · " : "Due "}{new Date(b.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p></div>
                    <span className="font-semibold tabular">{formatMoney(Number(b.amount), cur)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Recent transactions" link="/transactions" />
          {txs.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nothing here yet. <button className="font-semibold text-primary" onClick={() => quick.open()}>Add your first expense</button>
            </div>
          ) : (
            <ul className="divide-y">
              {txs.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>{categoryEmoji(t.category)}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.note || t.category}</p><p className="text-xs text-muted-foreground">{t.category} · {t.payment_method}</p></div>
                  <span className={`font-semibold tabular ${t.kind === "income" ? "text-success" : ""}`}>{t.kind === "income" ? "+" : "−"}{formatMoney(Number(t.amount), cur)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <SectionTitle title="Budgets" link="/budgets" />
            <div className="space-y-4">
              {budgets.slice(0, 4).map((b) => {
                const spent = cats.find((c) => c.category === b.category)?.total ?? 0;
                const pct = Number(b.amount) ? (spent / Number(b.amount)) * 100 : 0;
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{categoryEmoji(b.category)} {b.category}</span><StatusPill pct={pct} /></div>
                    <Meter value={spent} max={Number(b.amount)} label={`${b.category} budget`} />
                  </div>
                );
              })}
              {budgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets yet.</p>}
            </div>
          </Card>
          <Card>
            <SectionTitle title="Savings progress" link="/goals" />
            <div className="flex items-center gap-3">
              <PiggyBank className="h-8 w-8 text-teal" />
              <div className="flex-1">
                <p className="font-semibold tabular">{formatMoney(goalSaved, cur)} <span className="font-normal text-muted-foreground">of {formatMoney(goalTarget, cur)}</span></p>
                <div className="mt-2"><Meter value={goalSaved} max={goalTarget || 1} label="Savings progress" /></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Flow({ label, value, arrow }: { label: string; value: string; arrow?: boolean }) {
  return (
    <div className="relative">
      {arrow && <ArrowRight className="absolute -left-3 top-3 hidden h-4 w-4 opacity-60 sm:block" aria-hidden />}
      <p className="opacity-80">{label}</p>
      <p className="truncate font-bold tabular sm:text-base">{value}</p>
    </div>
  );
}

function Stat({ label, value, icon, hint }: { label: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p>{icon}</div>
      <p className="mt-2 truncate text-xl font-bold tabular">{value}</p>
      {hint && <Link to="/budgets" className="text-xs font-semibold text-primary">{hint}</Link>}
    </Card>
  );
}

function SectionTitle({ title, sub, link }: { title: string; sub?: string; link?: "/bills" | "/transactions" | "/budgets" | "/goals" }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div><h2 className="font-semibold">{title}</h2>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      {link && <Link to={link} className="text-sm font-semibold text-primary">See all</Link>}
    </div>
  );
}
