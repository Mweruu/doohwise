import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, toISODate, type Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";

type Kind = "expense" | "income";
const Ctx = createContext<{ open: (opts?: { kind?: Kind; edit?: Transaction }) => void }>({ open: () => {} });
export const useQuickAdd = () => useContext(Ctx);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; kind: Kind; edit?: Transaction | undefined }>({ open: false, kind: "expense" });
  return (
    <Ctx.Provider value={{ open: (o) => setState({ open: true, kind: o?.edit?.kind as Kind ?? o?.kind ?? "expense", edit: o?.edit }) }}>
      {children}
      <Dialog open={state.open} onOpenChange={(v) => setState((s) => ({ ...s, open: v }))}>
        <DialogContent className="max-w-md rounded-3xl">
          {state.open && (
            <TxForm key={state.edit?.id ?? state.kind} initialKind={state.kind} edit={state.edit} onDone={() => setState((s) => ({ ...s, open: false }))} />
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function TxForm({ initialKind, edit, onDone }: { initialKind: Kind; edit?: Transaction | undefined; onDone: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [amount, setAmount] = useState(edit ? String(edit.amount) : "");
  const [category, setCategory] = useState(edit?.category ?? (initialKind === "income" ? "Salary" : "Food"));
  const [date, setDate] = useState(edit?.occurred_on ?? toISODate(new Date()));
  const [method, setMethod] = useState(edit?.payment_method ?? "M-Pesa");
  const [note, setNote] = useState(edit?.note ?? "");
  const [recurring, setRecurring] = useState(edit?.recurring ?? false);
  const cats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!value || value <= 0) throw new Error("Please enter an amount above zero.");
      const row = { kind, amount: value, category, occurred_on: date, payment_method: method, note: note || null, recurring };
      const { error } = edit
        ? await supabase.from("transactions").update(row).eq("id", edit.id)
        : await supabase.from("transactions").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(edit ? "Saved your changes" : kind === "expense" ? "Expense added" : "Income added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{edit ? "Edit transaction" : "Add money in or out"}</DialogTitle>
        <DialogDescription>Just the amount and category are needed.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setKind(k); setCategory(k === "income" ? "Salary" : "Food"); }}
            className={cn("rounded-full py-2 text-sm font-semibold transition", kind === k ? "bg-card text-foreground shadow-card" : "text-muted-foreground")}
          >
            {k === "expense" ? "Money out" : "Money in"}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="amt">Amount</Label>
        <Input id="amt" autoFocus inputMode="decimal" type="number" step="any" min="0" placeholder="0" value={amount}
          onChange={(e) => setAmount(e.target.value)} className="mt-1 h-14 rounded-2xl text-2xl font-bold tabular" />
      </div>
      <div>
        <Label>Category</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {cats.map((c) => (
            <button key={c.name} type="button" onClick={() => setCategory(c.name)}
              aria-pressed={category === c.name}
              className={cn("flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs font-medium transition",
                category === c.name ? "border-primary bg-primary-soft text-accent-foreground" : "bg-card hover:bg-muted")}>
              <span className="text-lg" aria-hidden>{c.emoji}</span>{c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="dt">Date</Label>
          <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Paid with</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="nt">Note (optional)</Label>
        <Textarea id="nt" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" placeholder="e.g. Lunch with team" />
      </div>
      <label className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
        <span>Repeats every month</span>
        <Switch checked={recurring} onCheckedChange={setRecurring} />
      </label>
      <Button type="submit" size="lg" className="w-full rounded-full" disabled={save.isPending}>
        {save.isPending ? "Saving…" : edit ? "Save changes" : "Save"}
      </Button>
    </form>
  );
}
