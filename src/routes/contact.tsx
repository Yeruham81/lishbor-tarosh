import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { submitFeedback } from "@/lib/social.functions";
import { toast } from "sonner";
import { Mail, Bug, Lightbulb, AlertTriangle, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/contact")({ component: ContactPage });

const TYPES = [
  { v: "bug", label: "דיווח על באג", icon: <Bug className="size-4" /> },
  { v: "complaint", label: "תלונה", icon: <AlertTriangle className="size-4" /> },
  { v: "idea", label: "רעיון לשיפור", icon: <Lightbulb className="size-4" /> },
  { v: "other", label: "אחר", icon: <MessageSquare className="size-4" /> },
] as const;

function ContactPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const send = useServerFn(submitFeedback);
  const [type, setType] = useState<(typeof TYPES)[number]["v"]>("idea");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) { toast.error("ההודעה קצרה מדי"); return; }
    setBusy(true);
    try {
      await send({ data: { type, subject: subject.trim() || undefined, message: message.trim(), contact_email: email.trim() || undefined } });
      toast.success("המשוב נשלח, תודה!");
      setSubject(""); setMessage(""); setEmail("");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
        <div className="text-center mb-6">
          <Mail className="size-12 mx-auto text-primary mb-2" />
          <h1 className="font-display text-4xl font-extrabold text-gradient-sunset">צור קשר</h1>
          <p className="text-muted-foreground mt-2">משובים, באגים, רעיונות — הכל מתקבל בברכה</p>
        </div>

        <form onSubmit={submit} className="bg-card border rounded-3xl shadow-card p-5 sm:p-7 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">סוג פנייה</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button key={t.v} type="button" onClick={() => setType(t.v)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition ${type === t.v ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}>
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">נושא (לא חובה)</label>
            <input dir="rtl" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="כותרת קצרה" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">הודעה</label>
            <textarea dir="rtl" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={3} maxLength={4000} rows={6}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y" placeholder="ספר/י לנו מה על הלב..." />
            <div className="text-xs text-muted-foreground mt-1 text-left">{message.length} / 4000</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">אימייל ליצירת קשר (לא חובה)</label>
            <input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-left" placeholder="you@example.com" />
          </div>

          <button type="submit" disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition disabled:opacity-50">
            {busy ? "שולח..." : "שלח משוב"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
