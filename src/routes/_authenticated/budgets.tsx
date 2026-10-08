import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { budgetsQuery, byCategory, categoryEmoji, EXPENSE_CATEGORIES, formatMoney, inRange, monthRange, profileQuery, transactionsQuery } from "@/lib/finance";
import { Card, Empty, Meter, PageHeader, StatusPill } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — PesaPlan" },
      { name: "description", content: "Plan your monthly spending by category and see what's left." },
      { property: "og:title", content: "Budgets — PesaPlan" },
      { property: "og:description", content: "Monthly budgets that make sense." },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const { data: budgets = [] } = useQuery(budgetsQuery());
  const { data: txs = [] } = useQuery(transactionsQuery());
  const cur = profile?.currency ?? "KES";
  const cats = byCategory(txs.filter((t) => inRange(t, monthRange(0))));
  const [cat, setCat] = useState<string>("Food");
  const [amt, setAmt] = useState("");

  const upsert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("budgets").upsert({ category: cat, amount: Number(amt) || 0 }, { onConflict: "user_id,category" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); setAmt(""); toast.success("Budget saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("budgets").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });

  const total = budgets.reduce((a, b) => a + Number(b.amount), 0);
  const spentTotal = budgets.reduce((a, b) => a + (cats.find((c) => c.category === b.category)?.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" subtitle={new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div><p className="text-sm text-muted-foreground">Spent of planned</p><p className="text-3xl font-bold tabular">{formatMoney(spentTotal, cur)} <span className="text-lg font-medium text-muted-foreground">/ {formatMoney(total, cur)}</span></p></div>
            <p className="text-sm font-medium">{formatMoney(total - spentTotal, cur)} left</p>
          </div>
          <div className="mt-4"><Meter value={spentTotal} max={total || 1} label="Total budget used" /></div>
        </Card>
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-3">
            <h2 className="font-semibold">Add or update a budget</h2>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="Monthly amount" type="number" min="0" placeholder="Monthly amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
            <Button type="submit" className="w-full rounded-full" disabled={!amt}><Plus className="h-4 w-4" /> Save budget</Button>
          </form>
        </Card>
      </div>

      {budgets.length === 0 ? (
        <Empty emoji="🎯" title="No budgets yet" text="Set a monthly amount for a category like Food or Transport to see how you're tracking." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((b) => {
            const spent = cats.find((c) => c.category === b.category)?.total ?? 0;
            const pct = Number(b.amount) ? (spent / Number(b.amount)) * 100 : 0;
            const left = Number(b.amount) - spent;
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold"><span aria-hidden className="text-xl">{categoryEmoji(b.category)}</span>{b.category}</h3>
                  <div className="flex items-center gap-2"><StatusPill pct={pct} /><Button variant="ghost" size="icon" aria-label={`Remove ${b.category} budget`} onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
                <div className="my-3"><Meter value={spent} max={Number(b.amount)} label={`${b.category} budget`} /></div>
                <div className="grid grid-cols-3 text-sm">
                  <div><p className="text-muted-foreground">Planned</p><p className="font-semibold tabular">{formatMoney(Number(b.amount), cur)}</p></div>
                  <div><p className="text-muted-foreground">Spent</p><p className="font-semibold tabular">{formatMoney(spent, cur)}</p></div>
                  <div><p className="text-muted-foreground">{left >= 0 ? "Left" : "Over by"}</p><p className={`font-semibold tabular ${left < 0 ? "text-destructive" : ""}`}>{formatMoney(Math.abs(left), cur)}</p></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{Math.round(pct)}% used</p>
              </Card>
            );
          })}
        </div>
      )}

      {profile && <SpendingPlan />}
    </div>
  );
}

function SpendingPlan() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const [income, setIncome] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [debt, setDebt] = useState(0);
  const [needs, setNeeds] = useState(50);
  const [wants, setWants] = useState(30);
  useEffect(() => {
    if (profile) { setIncome(Number(profile.monthly_income)); setNeeds(profile.needs_pct); setWants(profile.wants_pct); }
  }, [profile]);
  const savings = Math.max(0, 100 - needs - wants);
  const cur = profile?.currency ?? "KES";
  const save = async () => {
    const { error } = await supabase.from("profiles").update({ monthly_income: income, needs_pct: needs, wants_pct: wants, savings_pct: savings }).eq("id", profile!.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Plan saved");
  };
  return (
    <Card>
      <h2 className="text-lg font-semibold">Your suggested spending plan</h2>
      <p className="text-sm text-muted-foreground">Enter a few numbers and we'll suggest how to split your money.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor="pi">Monthly income</Label><Input id="pi" type="number" value={income || ""} onChange={(e) => setIncome(Number(e.target.value))} className="mt-1" /></div>
        <div><Label htmlFor="pf">Fixed costs (rent, bills)</Label><Input id="pf" type="number" value={fixed || ""} onChange={(e) => setFixed(Number(e.target.value))} className="mt-1" /></div>
        <div><Label htmlFor="pd">Debt payments</Label><Input id="pd" type="number" value={debt || ""} onChange={(e) => setDebt(Number(e.target.value))} className="mt-1" /></div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <PlanBox title="Needs" pct={needs} amount={(income * needs) / 100} cur={cur} tone="bg-primary-soft" note={fixed + debt > (income * needs) / 100 ? "Your fixed costs are above this — that's okay, try trimming wants a little." : "Rent, food, transport, bills"} />
        <PlanBox title="Wants" pct={wants} amount={(income * wants) / 100} cur={cur} tone="bg-warning-soft" note="Eating out, shopping, fun" />
        <PlanBox title="Savings" pct={savings} amount={(income * savings) / 100} cur={cur} tone="bg-success-soft" note="Emergency fund, goals, investing" />
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div><Label>Needs: {needs}%</Label><Slider className="mt-3" value={[needs]} min={20} max={80} step={5} onValueChange={([v]) => setNeeds(Math.min(v, 100 - wants))} /></div>
        <div><Label>Wants: {wants}%</Label><Slider className="mt-3" value={[wants]} min={0} max={60} step={5} onValueChange={([v]) => setWants(Math.min(v, 100 - needs))} /></div>
      </div>
      <Button className="mt-6 rounded-full" onClick={save}>Save my plan</Button>
    </Card>
  );
}

function PlanBox({ title, pct, amount, cur, tone, note }: { title: string; pct: number; amount: number; cur: string; tone: string; note: string }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-sm font-semibold">{title}: {pct}%</p>
      <p className="mt-1 text-2xl font-bold tabular">{formatMoney(amount, cur)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
