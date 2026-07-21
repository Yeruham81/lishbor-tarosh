import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { PageAdLayout } from "@/components/ads/PageAdLayout";
import { useAuth } from "@/hooks/use-auth";
import { submitPuzzle } from "@/lib/social.functions";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute("/submit-puzzle")({ component: SubmitPuzzlePage });

function SubmitPuzzlePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const send = useServerFn(submitPuzzle);
  const [clue, setClue] = useState("");
  const [answer, setAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clue.trim().length < 3) { toast.error("הגדרה קצרה מדי"); return; }
    if (answer.trim().length < 1) { toast.error("חסר הפתרון"); return; }
    setBusy(true);
    try {
      await send({ data: { clue_text: clue.trim(), suggested_answer: answer.trim(), notes: notes.trim() || undefined } });
      toast.success("ההצעה נשלחה, תודה!");
      setClue(""); setAnswer(""); setNotes("");
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <PageAdLayout screen="submit-puzzle">
      <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
        <div className="text-center mb-6">
          <PlusCircle className="size-12 mx-auto text-primary mb-2" />
          <h1 className="font-display text-4xl font-extrabold text-gradient-sunset">הוספת הגדרה</h1>
          <p className="text-muted-foreground mt-2 text-base">יש לכם הגדרת היגיון טובה ומקורית? שתפו אותנו!</p>
        </div>

        <div className="bg-muted/40 border rounded-2xl p-4 text-muted-foreground mb-4 text-sm">
          ההגדרות הטובות ביותר ישולבו במשחק ויזכו אתכם בקרדיט ובנקודות בונוס! 🎁
        </div>

        <form onSubmit={submit} className="bg-card border rounded-3xl shadow-card p-5 sm:p-7 space-y-4">
          <div>
            <label htmlFor="clue" className="block text-sm font-medium mb-1">ההגדרה שלכם</label>
            <textarea id="clue" dir="rtl" value={clue} onChange={(e) => setClue(e.target.value)} required minLength={3} maxLength={500} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y" placeholder="" />
          </div>

          <div>
            <label htmlFor="answer" className="block text-sm font-medium mb-1">הפתרון</label>
            <input id="answer" dir="rtl" value={answer} onChange={(e) => setAnswer(e.target.value)} required minLength={1} maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="" />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">הסברים והערות (אם יש)</label>
            <textarea id="notes" dir="rtl" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y" placeholder="" />
          </div>

          <button type="submit" disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition disabled:opacity-50">
            {busy ? "שולח..." : "שליחה"}
          </button>
        </form>
      </div>
      </PageAdLayout>
    </AppShell>
  );
}
