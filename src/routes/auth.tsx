import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DoohWise" },
      { name: "description", content: "Sign in or create your free DoohWise account." },
      { property: "og:title", content: "Sign in — DoohWise" },
      { property: "og:description", content: "Sign in or create your free DoohWise account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("We've sent you a link to reset your password.");
        setMode("signin");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Couldn't sign in with Google. Please try again.");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-12 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold"><Wallet /> DoohWise</Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Understand your money.<br />Spend better. Save more.</h2>
          <p className="mt-4 max-w-md opacity-90">Friendly budgeting built for real life — M-Pesa, matatu fare, chama and all.</p>
        </div>
        <p className="text-sm opacity-75">Your data is private and only visible to you.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
          <p className="mt-2 text-muted-foreground">{mode === "signup" ? "It's free and takes a minute." : mode === "forgot" ? "We'll email you a reset link." : "Sign in to see your money at a glance."}</p>
          {mode !== "forgot" && (
            <>
              <Button type="button" variant="outline" size="lg" className="mt-6 w-full rounded-full" onClick={google}>Continue with Google</Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
            </>
          )}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div><Label htmlFor="name">Your name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
            )}
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
            {mode !== "forgot" && (
              <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" /></div>
            )}
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === "signin" && <button className="text-primary hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
            <p className="text-muted-foreground">
              {mode === "signup" ? "Already have an account? " : "New to DoohWise? "}
              <button className="font-semibold text-primary hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                {mode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
