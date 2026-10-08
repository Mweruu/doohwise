import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCIES, EXPENSE_CATEGORIES, type Profile } from "@/lib/finance";
import { cn } from "@/lib/utils";

const GOALS = ["Build an emergency fund", "Pay off debt", "Save for something big", "Spend less on wants", "Just understand my money"];
const DEFAULT_SHARE: Record<string, number> = { "Rent/Housing": 0.3, Food: 0.15, Transport: 0.08, Utilities: 0.05, Entertainment: 0.05, Shopping: 0.05, Subscriptions: 0.02, Family: 0.05, Health: 0.03, Education: 0.05 };

export function Onboarding({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState("");
  const [currency, setCurrency] = useState(profile.currency || "KES");
  const [majors, setMajors] = useState<string[]>(["Rent/Housing", "Food", "Transport"]);
  const [save, setSave] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    const inc = Number(income) || 0;
    const sv = Number(save) || Math.round(inc * 0.2);
    const { error } = await supabase.from("profiles").update({ monthly_income: inc, currency, savings_target: sv, main_goal: goal, onboarded: true }).eq("id", profile.id);
    if (!error && inc > 0) {
      const budgets = majors.map((c) => ({ category: c, amount: Math.round((inc * (DEFAULT_SHARE[c] ?? 0.05)) / 100) * 100 }));
      await supabase.from("budgets").upsert(budgets, { onConflict: "user_id,category" });
      if (sv > 0 && goal.includes("emergency")) {
        await supabase.from("goals").insert({ name: "Emergency fund", target: inc * 3, saved: 0 });
      }
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Your starter budget is ready 🎉");
    qc.invalidateQueries();
  }

  const steps = [
    {
      q: "What is your monthly income?",
      hint: "A rough number is perfect. You can change it anytime.",
      body: <Input autoFocus inputMode="decimal" type="number" placeholder="e.g. 60000" value={income} onChange={(e) => setIncome(e.target.value)} className="h-14 rounded-2xl text-2xl font-bold" aria-label="Monthly income" />,
    },
    {
      q: "What currency do you use?",
      hint: "We'll show all amounts in this currency.",
      body: <Chips options={CURRENCIES} selected={[currency]} onToggle={setCurrency} />,
    },
    {
      q: "What are your major monthly expenses?",
      hint: "Pick as many as you like — we'll create a budget for each.",
      body: <Chips options={EXPENSE_CATEGORIES.map((c) => c.name)} selected={majors} onToggle={(c) => setMajors((m) => (m.includes(c) ? m.filter((x) => x !== c) : [...m, c]))} />,
    },
    {
      q: "How much would you like to save each month?",
      hint: income ? `Many people aim for about 20% — that's ${Math.round(Number(income) * 0.2).toLocaleString()} ${currency}.` : "Any amount is a great start.",
      body: <Input autoFocus inputMode="decimal" type="number" placeholder="e.g. 10000" value={save} onChange={(e) => setSave(e.target.value)} className="h-14 rounded-2xl text-2xl font-bold" aria-label="Monthly savings" />,
    },
    {
      q: "What is your main money goal?",
      hint: "This helps us give you better tips.",
      body: <Chips options={GOALS} selected={[goal]} onToggle={setGoal} />,
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="text-sm font-semibold text-primary">Step {step + 1} of {steps.length}</p>
        <div className="mt-2 flex gap-1.5">{steps.map((_, i) => <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
        <div className="card-surface mt-6 p-6 md:p-8">
          <Label className="text-2xl font-bold leading-tight">{s.q}</Label>
          <p className="mt-2 text-muted-foreground">{s.hint}</p>
          <div className="mt-6">{s.body}</div>
          <div className="mt-8 flex gap-3">
            {step > 0 && <Button variant="outline" size="lg" className="rounded-full" onClick={() => setStep(step - 1)}>Back</Button>}
            <Button size="lg" className="flex-1 rounded-full" disabled={busy} onClick={() => (last ? finish() : setStep(step + 1))}>
              {last ? (busy ? "Setting up…" : "Create my plan") : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}
          className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", selected.includes(o) ? "border-primary bg-primary-soft text-accent-foreground" : "bg-card hover:bg-muted")}>
          {o}
        </button>
      ))}
    </div>
  );
}
