import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Wallet, PieChart, PiggyBank, Lightbulb, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PesaPlan — Understand your money, spend better, save more" },
      { name: "description", content: "Track spending, plan budgets, pay bills on time and grow your savings with a friendly money coach. Built for Kenya." },
      { property: "og:title", content: "PesaPlan — Your friendly money coach" },
      { property: "og:description", content: "Track spending, plan budgets and grow your savings — without the stress." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: PieChart, title: "Budgets that make sense", text: "See at a glance how much is left for food, transport and fun." },
  { icon: PiggyBank, title: "Savings goals", text: "Emergency fund, new phone, school fees — watch them grow." },
  { icon: Lightbulb, title: "Kind, helpful tips", text: "Gentle insights about your spending. Never any shaming." },
  { icon: ShieldCheck, title: "Private by design", text: "Only you can see your money. Always." },
];

function Landing() {
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero text-primary-foreground"><Wallet className="h-5 w-5" /></span>PesaPlan
        </span>
        <Button asChild variant="ghost" className="rounded-full"><Link to="/auth">Sign in</Link></Button>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <p className="inline-block rounded-full bg-teal-soft px-3 py-1 text-sm font-semibold">Free money coach in your pocket</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">Help me understand my money, spend better, <span className="text-primary">and save more.</span></h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">PesaPlan shows where your money goes, keeps your bills on track and cheers you on as you save.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-8 shadow-float"><Link to="/auth">Get started — it's free</Link></Button>
          </div>
        </div>
        <div className="card-surface relative overflow-hidden p-6">
          <div className="rounded-2xl bg-hero p-6 text-primary-foreground">
            <p className="text-sm opacity-80">Money left this month</p>
            <p className="mt-1 text-4xl font-bold tabular">KSh 18,450</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
              <div><p className="opacity-75">In</p><p className="font-semibold">KSh 65,000</p></div>
              <div><p className="opacity-75">Out</p><p className="font-semibold">KSh 41,550</p></div>
              <div><p className="opacity-75">Saved</p><p className="font-semibold">KSh 5,000</p></div>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {[["🍲 Food", 72], ["🚌 Transport", 54], ["🎬 Entertainment", 91]].map(([n, p]) => (
              <div key={n as string}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{n}</span><span className="text-muted-foreground">{p}% used</span></div>
                <div className="h-2.5 rounded-full bg-muted"><div className={`h-full rounded-full ${Number(p) > 85 ? "bg-warning" : "bg-teal"}`} style={{ width: `${p}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-success-soft p-4 text-sm">🎉 You're doing well! Your spending is down 8% this month.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card-surface p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
