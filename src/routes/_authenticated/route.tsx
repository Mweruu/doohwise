import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  LayoutDashboard, ArrowLeftRight, PieChart, PiggyBank, CalendarClock, Lightbulb, BarChart3, Settings, Plus, User, Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { profileQuery } from "@/lib/finance";
import { QuickAddProvider, useQuickAdd } from "@/components/app/quick-add";
import { Onboarding } from "@/components/app/onboarding";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/goals", label: "Savings Goals", icon: PiggyBank },
  { to: "/bills", label: "Bills", icon: CalendarClock },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);
  const profile = useQuery({ ...profileQuery(), enabled: !!session });

  if (loading || !session || profile.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading your money…</div>;
  }
  if (profile.data && !profile.data.onboarded) return <Onboarding profile={profile.data} />;

  return (
    <QuickAddProvider>
      <Shell />
    </QuickAddProvider>
  );
}

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero text-primary-foreground"><Wallet className="h-5 w-5" /></span>
      DoohWise
    </Link>
  );
}

function Shell() {
  const quick = useQuickAdd();
  const linkCls = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground";
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="px-2 py-2"><Logo /></div>
        <Button size="lg" className="mt-6 rounded-full shadow-float" onClick={() => quick.open()}>
          <Plus className="h-5 w-5" /> Add expense
        </Button>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground" }}>
              <n.icon className="h-5 w-5" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <div className="flex gap-1">
            <Link to="/insights" className="rounded-full p-2 text-muted-foreground" aria-label="Insights"><Lightbulb className="h-5 w-5" /></Link>
            <Link to="/bills" className="rounded-full p-2 text-muted-foreground" aria-label="Bills"><CalendarClock className="h-5 w-5" /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <MobileLink to="/dashboard" label="Home" icon={LayoutDashboard} />
        <MobileLink to="/transactions" label="Transactions" icon={ArrowLeftRight} />
        <button onClick={() => quick.open()} className="flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-primary" aria-label="Add expense">
          <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float"><Plus className="h-7 w-7" /></span>
          Add
        </button>
        <MobileLink to="/budgets" label="Budgets" icon={PieChart} />
        <MobileLink to="/settings" label="Profile" icon={User} />
      </nav>
    </div>
  );
}

function MobileLink({ to, label, icon: Icon }: { to: "/dashboard" | "/transactions" | "/budgets" | "/settings"; label: string; icon: typeof User }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "!text-primary" }}>
      <Icon className="h-5 w-5" /> {label}
    </Link>
  );
}
