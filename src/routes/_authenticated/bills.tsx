import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { billsQuery, formatMoney, profileQuery, toISODate, type Bill } from "@/lib/finance";
import { Card, Empty, PageHeader } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Bills & reminders — PesaPlan" },
      { name: "description", content: "Keep track of rent, internet, subscriptions and other recurring bills." },
      { property: "og:title", content: "Bills & reminders — PesaPlan" },
      { property: "og:description", content: "Never miss a bill." },
    ],
  }),
  component: BillsPage,
});

const SUGGESTIONS = ["Rent", "Internet", "Netflix", "Spotify", "Insurance", "Loan", "School fees", "KPLC Electricity", "Water"];

function nextDue(d: string, freq: string) {
  const date = new Date(d);
  if (freq === "weekly") date.setDate(date.getDate() + 7);
  else if (freq === "yearly") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return toISODate(date);
}

function BillsPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const { data: bills = [] } = useQuery(billsQuery());
  const cur = profile?.currency ?? "KES";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", due_date: toISODate(new Date()), frequency: "monthly" });
  const today = toISODate(new Date());

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bills").insert({ ...form, amount: Number(form.amount) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); setOpen(false); setForm({ name: "", amount: "", due_date: today, frequency: "monthly" }); toast.success("Bill reminder added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function markPaid(b: Bill) {
    // record expense, then roll recurring bill forward
    await supabase.from("transactions").insert({ kind: "expense", amount: Number(b.amount), category: b.name.match(/netflix|spotify|showmax|subscription/i) ? "Subscriptions" : b.name.match(/rent/i) ? "Rent/Housing" : "Utilities", note: b.name, recurring: b.frequency !== "once" });
    if (b.frequency === "once") await supabase.from("bills").update({ paid: true }).eq("id", b.id);
    else await supabase.from("bills").update({ due_date: nextDue(b.due_date, b.frequency) }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["bills"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success(`${b.name} paid — well done!`);
  }
  async function remove(id: string) {
    await supabase.from("bills").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bills"] });
  }

  const unpaid = bills.filter((b) => !b.paid);
  const dueSoon = unpaid.filter((b) => b.due_date >= today && b.due_date <= toISODate(new Date(Date.now() + 7 * 864e5)));
  const overdue = unpaid.filter((b) => b.due_date < today);

  return (
    <div>
      <PageHeader title="Bills & reminders" subtitle="A gentle nudge before things are due." action={<Button className="rounded-full" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add bill</Button>} />
      {(dueSoon.length > 0 || overdue.length > 0) && (
        <div className="mb-6 space-y-2">
          {overdue.length > 0 && <p className="rounded-2xl bg-destructive-soft p-4 text-sm">⏰ <b>{overdue.length}</b> bill{overdue.length > 1 ? "s are" : " is"} past due. Mark them paid once you've sorted them.</p>}
          {dueSoon.length > 0 && <p className="rounded-2xl bg-warning-soft p-4 text-sm">🔔 <b>{dueSoon.map((b) => b.name).join(", ")}</b> due in the next 7 days.</p>}
        </div>
      )}
      {bills.length === 0 ? (
        <Empty emoji="📅" title="No bills yet" text="Add rent, internet, Netflix or school fees and we'll remind you before they're due." action={<Button className="rounded-full" onClick={() => setOpen(true)}>Add a bill</Button>} />
      ) : (
        <Card className="divide-y p-0">
          {bills.map((b) => {
            const late = !b.paid && b.due_date < today;
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.frequency === "once" ? "One-time" : `Repeats ${b.frequency}`} · Due {new Date(b.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
                </div>
                <span className="font-semibold tabular">{formatMoney(Number(b.amount), cur)}</span>
                {b.paid ? <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold">✓ Paid</span>
                  : late ? <span className="rounded-full bg-destructive-soft px-3 py-1 text-xs font-semibold text-destructive">Overdue</span>
                  : <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Unpaid</span>}
                {!b.paid && <Button size="sm" variant="secondary" className="rounded-full" onClick={() => markPaid(b)}><Check className="h-4 w-4" /> Mark paid</Button>}
                <Button variant="ghost" size="icon" aria-label={`Delete ${b.name}`} onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>New bill reminder</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
            <div>
              <Label htmlFor="bn">Bill name</Label>
              <Input id="bn" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              <div className="mt-2 flex flex-wrap gap-1.5">{SUGGESTIONS.map((s) => <button type="button" key={s} onClick={() => setForm({ ...form, name: s })} className="rounded-full bg-muted px-3 py-1 text-xs">{s}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ba">Amount</Label><Input id="ba" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1" /></div>
              <div><Label htmlFor="bd">Due date</Label><Input id="bd" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" /></div>
            </div>
            <div>
              <Label>How often</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem><SelectItem value="once">Just once</SelectItem></SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-full">Save reminder</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
