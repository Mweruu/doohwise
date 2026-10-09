import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string | undefined; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-surface p-5", className)}>{children}</div>;
}

export function Meter({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const tone = pct > 100 ? "bg-destructive" : pct >= 85 ? "bg-warning" : "bg-teal";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function StatusPill({ pct }: { pct: number }) {
  if (pct > 100) return <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">Over plan</span>;
  if (pct >= 85) return <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-foreground">Almost there</span>;
  return <span className="rounded-full bg-teal-soft px-2 py-0.5 text-xs font-semibold text-foreground">On track</span>;
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
