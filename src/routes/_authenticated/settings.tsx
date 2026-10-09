import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES, profileQuery } from "@/lib/finance";
import { Card, PageHeader } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PesaPlan" },
      { name: "description", content: "Manage your profile, currency and account." },
      { property: "og:title", content: "Settings — PesaPlan" },
      { property: "og:description", content: "Your profile and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery());
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [income, setIncome] = useState("");
  const [target, setTarget] = useState("");
  useEffect(() => {
    if (profile) { setName(profile.display_name ?? ""); setCurrency(profile.currency); setIncome(String(profile.monthly_income)); setTarget(String(profile.savings_target)); }
  }, [profile]);

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name, currency, monthly_income: Number(income) || 0, savings_target: Number(target) || 0 }).eq("id", profile!.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }
  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile & settings" subtitle={user?.email ?? undefined} />
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div><Label htmlFor="sn">Your name</Label><Input id="sn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="si">Monthly income</Label><Input id="si" type="number" value={income} onChange={(e) => setIncome(e.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="st">Monthly savings target</Label><Input id="st" type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" /></div>
          </div>
          <Button type="submit" className="rounded-full">Save changes</Button>
        </form>
      </Card>
      <Card className="flex items-center justify-between">
        <div><p className="font-semibold">Sign out</p><p className="text-sm text-muted-foreground">You can sign back in anytime.</p></div>
        <Button variant="outline" className="rounded-full" onClick={logout}><LogOut className="h-4 w-4" /> Log out</Button>
      </Card>
    </div>
  );
}
