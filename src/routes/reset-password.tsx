import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(error: any): string {
  const code = error?.code as string | undefined;
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";

  switch (code) {
    case "weak_password":
      return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר";

    case "same_password":
      return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית";

    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "bad_jwt":
    case "invalid_credentials":
      return "קישור איפוס הסיסמה אינו תקף או שפג תוקפו. בקשו קישור חדש";

    case "reauthentication_needed":
      return "יש להתחבר מחדש לפני שינוי הסיסמה";

    case "reauthentication_not_valid":
      return "קוד האימות אינו תקף. בקשו קישור חדש";

    case "over_request_rate_limit":
      return "בוצעו יותר מדי ניסיונות. המתינו כמה דקות ונסו שוב";

    case "request_timeout":
      return "הבקשה נמשכה זמן רב מדי. נסו שוב";

    case "validation_failed":
      return "הסיסמה שהוזנה אינה תקינה";

    case "user_not_found":
      return "החשבון לא נמצא";

    case "unexpected_failure":
      return "אירעה שגיאה בשירות האימות. נסו שוב מאוחר יותר";
  }

  if (message.includes("expired") || message.includes("invalid") || message.includes("token")) {
    return "קישור איפוס הסיסמה אינו תקף או שפג תוקפו. בקשו קישור חדש";
  }

  if (typeof error?.message === "string" && /[\u0590-\u05FF]/.test(error.message)) {
    return error.message;
  }

  return "לא ניתן לעדכן את הסיסמה כרגע. נסו שוב";
}

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase may return recovery errors in the URL fragment.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);

    const urlErrorCode = hashParams.get("error_code") ?? searchParams.get("error_code");

    const urlErrorDescription = hashParams.get("error_description") ?? searchParams.get("error_description");

    if (urlErrorCode || urlErrorDescription) {
      setLinkError(
        getResetPasswordErrorMessage({
          code: urlErrorCode,
          message: urlErrorDescription,
        }),
      );

      return;
    }

    // Supabase parses the recovery token and emits PASSWORD_RECOVERY.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });

    // Check whether the recovery session already exists.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setLinkError(getResetPasswordErrorMessage(error));
        return;
      }

      if (data.session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwd.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (pwd !== pwd2) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: pwd,
      });

      if (error) {
        throw error;
      }

      toast.success("הסיסמה עודכנה בהצלחה. מתחברים...");

      navigate({
        to: "/play",
      });
    } catch (err: any) {
      toast.error(getResetPasswordErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-3xl shadow-card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold text-center mb-1 text-gradient-sunset">איפוס סיסמה</h1>

          <p className="text-center text-muted-foreground text-sm mb-6">בחרו סיסמה חדשה המכילה לפחות 6 תווים</p>

          {linkError ? (
            <div className="text-center py-6">
              <p className="text-destructive">{linkError}</p>

              <Link to="/auth" className="inline-block mt-4 text-primary hover:underline">
                חזרה להתחברות ובקשת קישור חדש
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-center text-muted-foreground py-6">
              ממתינים לאישור הקישור... אם הגעתם לכאן בטעות,{" "}
              <Link to="/auth" className="text-primary hover:underline">
                חזרה להתחברות
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                minLength={6}
                placeholder="סיסמה חדשה"
                className="w-full px-4 py-3 rounded-xl border bg-card text-left"
                dir="ltr"
                autoComplete="new-password"
              />

              <input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                required
                minLength={6}
                placeholder="אימות סיסמה"
                className="w-full px-4 py-3 rounded-xl border bg-card text-left"
                dir="ltr"
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 disabled:opacity-50 transition"
              >
                {busy ? "מעדכן..." : "עדכון סיסמה"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← חזרה לבית
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
