import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { budgetsQuery, buildInsights, healthScore, profileQuery, transactionsQuery } from "@/lib/finance";
import { Card, Meter, PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — PesaPlan" },
      { name: "description", content: "Friendly tips and your financial health, based on your spending." },
      { property: "og:title", content: "Insights — PesaPlan" },
      { property: "og:description", content: "Your friendly money coach." },
    ],
  }),
  component: InsightsPage,
});

const TONE = { good: { bg: "bg-success-soft", icon: "🌱", label: "Nice work" }, info: { bg: "bg-primary-soft", icon: "💡", label: "Good to know" }, "heads-up": { bg: "bg-warning-soft", icon: "👀", label: "Heads up" } };

function InsightsPage() {
  const { data: profile } = useQuery(profileQuery());
  const { data: txs = [] } = useQuery(transactionsQuery());
  const { data: budgets = [] } = useQuery(budgetsQuery());
  const insights = buildInsights(txs, budgets, profile?.currency ?? "KES");
  const h = healthScore(txs, budgets);
  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Helpful tips — never judgement." />
      <Card className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-hero text-primary-foreground">
          <span className="text-4xl font-extrabold tabular">{h.score}</span><span className="text-xs opacity-85">out of 100</span>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Financial health</p>
          <p className="text-2xl font-bold">{h.label}</p>
          <div className="my-3 max-w-md"><Meter value={h.score} max={100} label="Financial health score" /></div>
          <ul className="space-y-1 text-sm">{h.reasons.map((r) => <li key={r}>✓ {r}</li>)}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Based on how much you save, staying within budgets, and how your spending is changing. It's a guide, not a grade.</p>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((i, idx) => (
          <div key={idx} className={`flex gap-3 rounded-3xl p-5 ${TONE[i.tone].bg}`}>
            <span className="text-2xl" aria-hidden>{TONE[i.tone].icon}</span>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TONE[i.tone].label}</p><p className="mt-1 font-medium">{i.text}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
