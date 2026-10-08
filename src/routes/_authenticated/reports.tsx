import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { budgetsQuery, byCategory, formatMoney, goalsQuery, inRange, monthRange, profileQuery, toISODate, transactionsQuery } from "@/lib/finance";
import { Card, Meter, PageHeader } from "@/components/app/ui-bits";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — PesaPlan" },
      { name: "description", content: "Simple charts of your spending, income and savings over time." },
      { property: "og:title", content: "Reports — PesaPlan" },
      { property: "og:description", content: "See your money over time." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function ReportsPage() {
  const { data: profile } = useQuery(profileQuery());
  const { data: txs = [] } = useQuery(transactionsQuery());
  const { data: budgets = [] } = useQuery(budgetsQuery());
  const { data: goals = [] } = useQuery(goalsQuery());
  const cur = profile?.currency ?? "KES";
  const [period, setPeriod] = useState("daily");
  const fmt = (v: number) => formatMoney(v, cur);

  const spendSeries = (() => {
    const out: { label: string; spent: number }[] = [];
    const exp = txs.filter((t) => t.kind === "expense");
    if (period === "daily") {
      for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const iso = toISODate(d); out.push({ label: d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }), spent: exp.filter((t) => t.occurred_on === iso).reduce((a, t) => a + Number(t.amount), 0) }); }
    } else if (period === "weekly") {
      for (let i = 7; i >= 0; i--) { const e = new Date(); e.setDate(e.getDate() - i * 7); const s = new Date(e); s.setDate(s.getDate() - 6); const r = { start: toISODate(s), end: toISODate(e) }; out.push({ label: s.toLocaleDateString("en-KE", { day: "numeric", month: "short" }), spent: exp.filter((t) => inRange(t, r)).reduce((a, t) => a + Number(t.amount), 0) }); }
    } else {
      for (let i = 5; i >= 0; i--) { const r = monthRange(-i); out.push({ label: new Date(r.start).toLocaleDateString("en-KE", { month: "short" }), spent: exp.filter((t) => inRange(t, r)).reduce((a, t) => a + Number(t.amount), 0) }); }
    }
    return out;
  })();

  const ivx = Array.from({ length: 6 }, (_, k) => {
    const r = monthRange(k - 5);
    const m = txs.filter((t) => inRange(t, r));
    return { label: new Date(r.start).toLocaleDateString("en-KE", { month: "short" }), Income: m.filter((t) => t.kind === "income").reduce((a, t) => a + Number(t.amount), 0), Spending: m.filter((t) => t.kind === "expense").reduce((a, t) => a + Number(t.amount), 0) };
  });

  const cats = byCategory(txs.filter((t) => inRange(t, monthRange(0))));
  const pie = [...cats.slice(0, 5), ...(cats.length > 5 ? [{ category: "Everything else", total: cats.slice(5).reduce((a, c) => a + c.total, 0) }] : [])];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Your money, in simple pictures." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Spending over time</h2>
          <Tabs value={period} onValueChange={setPeriod}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs>
        </div>
        <div className="h-64"><ResponsiveContainer><BarChart data={spendSeries}><XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} /><YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v, cur, true)} width={70} /><Tooltip formatter={fmt} /><Bar dataKey="spent" name="Spent" fill="var(--chart-1)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Spending by category · this month</h2>
          {pie.length === 0 ? <p className="text-sm text-muted-foreground">No spending yet this month.</p> : (
            <div className="h-64"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="total" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={fmt} /><Legend /></PieChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Income vs spending</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={ivx}><XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} /><YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(v, cur, true)} width={70} /><Tooltip formatter={fmt} /><Legend /><Bar dataKey="Income" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /><Bar dataKey="Spending" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Budget performance</h2>
          <div className="space-y-3">
            {budgets.map((b) => { const s = cats.find((c) => c.category === b.category)?.total ?? 0; return (
              <div key={b.id}><div className="mb-1 flex justify-between text-sm"><span>{b.category}</span><span className="tabular text-muted-foreground">{fmt(s)} / {fmt(Number(b.amount))}</span></div><Meter value={s} max={Number(b.amount)} label={b.category} /></div>
            ); })}
            {budgets.length === 0 && <p className="text-sm text-muted-foreground">No budgets yet.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Savings progress</h2>
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id}><div className="mb-1 flex justify-between text-sm"><span>{g.name}</span><span className="tabular text-muted-foreground">{fmt(Number(g.saved))} / {fmt(Number(g.target))}</span></div><Meter value={Number(g.saved)} max={Number(g.target)} label={g.name} /></div>
            ))}
            {goals.length === 0 && <p className="text-sm text-muted-foreground">No savings goals yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
