import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase parses the recovery token from the URL hash automatically and emits PASSWORD_RECOVERY.
  // We wait for a session before letting the user submit a new password.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    // Also check existing session in case the event already fired before this mount.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (pwd !== pwd2) { toast.error("הסיסמאות אינן תואמות"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("הסיסמה עודכנה. מתחברים...");
      navigate({ to: "/play" });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בעדכון הסיסמה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-3xl shadow-card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold text-center mb-1 text-gradient-sunset">איפוס סיסמה</h1>
          <p className="text-center text-muted-foreground text-sm mb-6">בחרו סיסמה חדשה (לפחות 6 תווים)</p>

          {!ready ? (
            <div className="text-center text-muted-foreground py-6">
              ממתינים לאישור הקישור... אם הגעתם לכאן בטעות, <Link to="/auth" className="text-primary hover:underline">חזרה להתחברות</Link>.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6}
                placeholder="סיסמה חדשה" className="w-full px-4 py-3 rounded-xl border bg-card text-left" dir="ltr" autoComplete="new-password" />
              <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required minLength={6}
                placeholder="אימות סיסמה" className="w-full px-4 py-3 rounded-xl border bg-card text-left" dir="ltr" autoComplete="new-password" />
              <button disabled={busy} className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 disabled:opacity-50 transition">
                {busy ? "מעדכן..." : "עדכון סיסמה"}
              </button>
            </form>
          )}
        </div>
        <div className="text-center mt-4"><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← חזרה לבית</Link></div>
      </div>
    </AppShell>
  );
}
