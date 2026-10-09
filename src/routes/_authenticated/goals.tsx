import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, goalsQuery, profileQuery, type Goal } from "@/lib/finance";
import { Card, Empty, Meter, PageHeader } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Savings goals — DoohWise" },
      { name: "description", content: "Set savings goals and watch your progress grow." },
      { property: "og:title", content: "Savings goals — DoohWise" },
      { property: "og:description", content: "Save for what matters." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const { data: goals = [] } = useQuery(goalsQuery());
  const cur = profile?.currency ?? "KES";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goals").insert({ name, target: Number(target), deadline: deadline || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setOpen(false); setName(""); setTarget(""); setDeadline(""); toast.success("Goal created 🎯"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Savings goals" subtitle="Small steps add up." action={<Button className="rounded-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New goal</Button>} />
      {goals.length === 0 ? (
        <Empty emoji="🐷" title="Start your first goal" text="An emergency fund, a new laptop, school fees — pick something that matters to you." action={<Button className="rounded-full" onClick={() => setOpen(true)}>Create a goal</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{goals.map((g) => <GoalCard key={g.id} g={g} cur={cur} />)}</div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>New savings goal</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
            <div><Label htmlFor="gn">What are you saving for?</Label><Input id="gn" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund" className="mt-1" /></div>
            <div><Label htmlFor="gt">Target amount</Label><Input id="gt" required type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="gd">Target date (optional)</Label><Input id="gd" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" /></div>
            <Button type="submit" className="w-full rounded-full" disabled={create.isPending}>Create goal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ g, cur }: { g: Goal; cur: string }) {
  const qc = useQueryClient();
  const [add, setAdd] = useState("");
  const pct = (Number(g.saved) / Number(g.target)) * 100;
  const months = g.deadline ? Math.max(1, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))) : null;
  const left = Math.max(0, Number(g.target) - Number(g.saved));

  async function contribute(): Promise<void> {
    const v = Number(add);
    if (!v) return;
    const { error } = await supabase.from("goals").update({ saved: Number(g.saved) + v }).eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    setAdd("");
    qc.invalidateQueries({ queryKey: ["goals"] });
    toast.success(Number(g.saved) + v >= Number(g.target) ? "Goal reached! Amazing work 🎉" : `Added ${formatMoney(v, cur)} — you're getting closer!`);
  }
  async function remove() {
    if (!confirm("Delete this goal?")) return;
    await supabase.from("goals").delete().eq("id", g.id);
    qc.invalidateQueries({ queryKey: ["goals"] });
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{g.name}</h3>
        <Button variant="ghost" size="icon" aria-label="Delete goal" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <p className="mt-2 text-2xl font-bold tabular">{formatMoney(Number(g.saved), cur)}</p>
      <p className="text-sm text-muted-foreground">of {formatMoney(Number(g.target), cur)} · {Math.min(100, Math.round(pct))}%</p>
      <div className="my-4"><Meter value={Number(g.saved)} max={Number(g.target)} label={`${g.name} progress`} /></div>
      {months && left > 0 && <p className="mb-3 rounded-xl bg-teal-soft p-3 text-sm">Save about <b>{formatMoney(Math.ceil(left / months), cur)}</b> a month to hit this by {new Date(g.deadline!).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}.</p>}
      <div className="flex gap-2">
        <Input aria-label="Amount to add" type="number" placeholder="Add amount" value={add} onChange={(e) => setAdd(e.target.value)} />
        <Button variant="secondary" onClick={contribute}>Add</Button>
      </div>
    </Card>
  );
}
