import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { NOINDEX_META } from "@/lib/site";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useFeatureFlags } from "@/hooks/use-public-settings";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signup" ? "signup" : undefined,
  }),
  component: AuthPage,
  head: () => ({ meta: [NOINDEX_META] }),
});

type AuthMode = "signin" | "signup" | "forgot";

const ACCESS_DISABLED_MESSAGE = "הכניסה וההרשמה למשחק מושבתות כרגע. נסו שוב מאוחר יותר.";

function getAuthErrorMessage(error: any, mode: AuthMode): string {
  const code = error?.code as string | undefined;

  switch (code) {
    case "invalid_credentials":
      return "כתובת האימייל או הסיסמה שגויות";

    case "email_not_confirmed":
      return "יש לאשר את כתובת האימייל לפני ההתחברות";

    case "email_exists":
    case "user_already_exists":
      return "כבר קיים חשבון עם כתובת האימייל הזאת";

    case "weak_password":
      return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר";

    case "signup_disabled":
    case "email_provider_disabled":
      return "ההרשמה באמצעות אימייל מושבתת כרגע";

    case "email_address_invalid":
      return "כתובת האימייל שהוזנה אינה תקינה";

    case "email_address_not_authorized":
      return "לא ניתן לשלוח הודעות לכתובת האימייל הזאת כרגע";

    case "over_email_send_rate_limit":
      return "נשלחו יותר מדי הודעות אימייל. המתינו מעט ונסו שוב";

    case "over_request_rate_limit":
      return "בוצעו יותר מדי ניסיונות. המתינו כמה דקות ונסו שוב";

    case "user_banned":
      return "החשבון הזה חסום ואינו יכול להתחבר";

    case "request_timeout":
      return "הבקשה נמשכה זמן רב מדי. נסו שוב";

    case "validation_failed":
      return "הפרטים שהוזנו אינם תקינים";
  }

  // שומר הודעות עבריות שיצרנו בעצמנו בקוד.
  if (typeof error?.message === "string" && /[\u0590-\u05FF]/.test(error.message)) {
    return error.message;
  }

  if (mode === "forgot") {
    return "לא ניתן לשלוח כרגע קישור לאיפוס הסיסמה. נסו שוב";
  }

  if (mode === "signup") {
    return "לא ניתן להשלים את ההרשמה כרגע. נסו שוב";
  }

  return "לא ניתן להתחבר כרגע. נסו שוב";
}

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();

  const [mode, setMode] = useState<AuthMode>(initialMode === "signup" ? "signup" : "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const flags = useFeatureFlags();
  const accessDisabled = !flags.loading && !flags.allowNewRegistrations;

  useEffect(() => {
    if (flags.loading) return;

    if (!flags.allowNewRegistrations) {
      if (user) {
        void supabase.auth.signOut();
      }
      return;
    }

    if (user) {
      navigate({
        to: "/play",
        replace: true,
      });
    }
  }, [user, navigate, flags.loading, flags.allowNewRegistrations]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (flags.loading) {
      toast.error("רגע, טוען הגדרות...");
      return;
    }

    if (!flags.allowNewRegistrations) {
      toast.error(ACCESS_DISABLED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      if (mode === "forgot") {
        if (!email) {
          throw new Error("נא להזין כתובת אימייל");
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          throw error;
        }

        toast.success("שלחנו לכם מייל לאיפוס הסיסמה. בדקו את תיבת הדואר.");

        setMode("signin");
      } else if (mode === "signup") {
        if (password.length < 6) {
          throw new Error("הסיסמה חייבת להכיל לפחות 6 תווים");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.user) {
          throw new Error("ההרשמה נכשלה. נסו שוב.");
        }

        toast.success("נרשמת בהצלחה! מתחברים...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      }
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err, mode));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    if (flags.loading) {
      toast.error("רגע, טוען הגדרות...");
      return;
    }

    if (!flags.allowNewRegistrations) {
      toast.error(ACCESS_DISABLED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("לא ניתן להתחבר באמצעות Google. נסו שוב.");
      }
    } catch {
      toast.error("לא ניתן להתחבר באמצעות Google. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  const apple = async () => {
    if (flags.loading) {
      toast.error("רגע, טוען הגדרות...");
      return;
    }

    if (!flags.allowNewRegistrations) {
      toast.error(ACCESS_DISABLED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("לא ניתן להתחבר באמצעות Apple. נסו שוב.");
      }
    } catch {
      toast.error("לא ניתן להתחבר באמצעות Apple. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-card border rounded-3xl shadow-card p-6 sm:p-8">
          {flags.loading ? (
            <div className="text-center py-8">
              <h1 className="font-display text-3xl font-extrabold mb-3 text-gradient-sunset">טוען...</h1>
              <p className="text-muted-foreground">בודקים את זמינות הכניסה למשחק</p>
            </div>
          ) : accessDisabled ? (
            <div className="text-center py-6" dir="rtl">
              <h1 className="font-display text-3xl font-extrabold mb-3 text-gradient-sunset">
                הכניסה למשחק מושבתת זמנית
              </h1>

              <p className="text-muted-foreground leading-relaxed">
                לא ניתן להתחבר או להירשם למשחק כרגע. נסו שוב מאוחר יותר.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl font-extrabold text-center mb-1 text-gradient-sunset">
                {mode === "signin" ? "כיף שחזרתם" : mode === "signup" ? "ברוכים הבאים" : "שכחתי סיסמא"}
              </h1>

              <p className="text-center text-muted-foreground text-sm mb-6">
                {mode === "signin"
                  ? "התחברו והמשיכו לשחק"
                  : mode === "signup"
                    ? "הרשמו בחינם והתחילו לשחק"
                    : "הזינו את האימייל שלכם ונשלח קישור לאיפוס הסיסמה"}
              </p>

              {mode !== "forgot" && (
                <>
                  <button
                    type="button"
                    onClick={google}
                    disabled={loading}
                    className="w-full mb-3 py-3 rounded-xl border bg-card hover:bg-muted font-medium flex items-center justify-center gap-2 transition"
                  >
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    המשך עם Google
                  </button>

                  <button
                    type="button"
                    onClick={apple}
                    disabled={loading}
                    className="w-full mb-4 py-3 rounded-xl bg-black text-white hover:opacity-90 font-medium flex items-center justify-center gap-2 transition"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    המשך עם Apple
                  </button>

                  <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    או
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={2}
                    maxLength={30}
                    placeholder="שם משתמש"
                    className="w-full px-4 py-3 rounded-xl border bg-card text-right"
                    dir="rtl"
                  />
                )}

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="אימייל"
                  className="w-full px-4 py-3 rounded-xl border bg-card text-right"
                  dir="ltr"
                />

                {mode !== "forgot" && (
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    type="password"
                    placeholder="סיסמה (לפחות 6 תווים)"
                    className="w-full px-4 py-3 rounded-xl border bg-card text-right"
                    dir="ltr"
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? "..." : mode === "signin" ? "התחברות" : mode === "signup" ? "הרשמה" : "שליחת קישור איפוס"}
                </button>
              </form>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="w-full mt-3 text-sm text-primary hover:underline"
                >
                  שכחתי סיסמא
                </button>
              )}

              {(flags.allowNewRegistrations || mode === "forgot") && (
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {mode === "forgot"
                    ? "← חזרה להתחברות"
                    : mode === "signin"
                      ? "עדיין לא נרשמתם? לחצו כאן"
                      : "כבר נרשמתם? לחצו כאן כדי להתחבר"}
                </button>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← חזרה למסך הבית
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
