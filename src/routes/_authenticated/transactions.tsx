import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryEmoji, EXPENSE_CATEGORIES, formatMoney, INCOME_CATEGORIES, PAYMENT_METHODS, profileQuery, transactionsQuery } from "@/lib/finance";
import { Card, Empty, PageHeader } from "@/components/app/ui-bits";
import { useQuickAdd } from "@/components/app/quick-add";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — PesaPlan" },
      { name: "description", content: "Search, filter, edit and delete your income and expenses." },
      { property: "og:title", content: "Transactions — PesaPlan" },
      { property: "og:description", content: "All your money in and out." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const quick = useQuickAdd();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const { data: txs = [] } = useQuery(transactionsQuery());
  const cur = profile?.currency ?? "KES";
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [cat, setCat] = useState("all");
  const [method, setMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("transactions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Deleted"); },
  });

  const list = useMemo(() => txs.filter((t) =>
    (kind === "all" || t.kind === kind) && (cat === "all" || t.category === cat) && (method === "all" || t.payment_method === method) &&
    (!from || t.occurred_on >= from) && (!to || t.occurred_on <= to) &&
    (!q || `${t.note ?? ""} ${t.category}`.toLowerCase().includes(q.toLowerCase()))
  ), [txs, kind, cat, method, from, to, q]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof list>();
    list.forEach((t) => m.set(t.occurred_on, [...(m.get(t.occurred_on) ?? []), t]));
    return [...m.entries()];
  }, [list]);

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Everything coming in and going out." action={<Button className="rounded-full" onClick={() => quick.open()}><Plus className="h-4 w-4" /> Add</Button>} />
      <Card className="mb-6 space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search transactions" placeholder="Search notes or categories" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Filter label="Type" value={kind} onChange={setKind} options={[["all", "All types"], ["expense", "Money out"], ["income", "Money in"]]} />
          <Filter label="Category" value={cat} onChange={setCat} options={[["all", "All categories"], ...[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.name, c.name] as [string, string])]} />
          <Filter label="Payment method" value={method} onChange={setMethod} options={[["all", "All methods"], ...PAYMENT_METHODS.map((m) => [m, m] as [string, string])]} />
          <Input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {groups.length === 0 ? (
        <Empty emoji="🧾" title={txs.length ? "No matches" : "No transactions yet"} text={txs.length ? "Try changing your filters." : "Add your first expense — it only takes a few seconds."}
          action={!txs.length && <Button className="rounded-full" onClick={() => quick.open()}>Add expense</Button>} />
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{new Date(date).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}</p>
              <Card className="divide-y p-0">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>{categoryEmoji(t.category)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.note || t.category}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · {t.payment_method}{t.recurring ? " · Monthly" : ""}</p>
                    </div>
                    <span className={`font-semibold tabular ${t.kind === "income" ? "text-success" : ""}`}>{t.kind === "income" ? "+" : "−"}{formatMoney(Number(t.amount), cur)}</span>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => quick.open({ edit: t })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => confirm("Delete this transaction?") && del.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
