import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getStats, deleteAccount, resetAccount } from "@/lib/account.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { useTheme, PALETTES, type Palette } from "@/hooks/use-theme";
import { toast } from "sonner";
import {
  Trophy, Flame, Target, Award, Percent, Sparkles, Lightbulb, CheckCircle2,
  Sun, Moon, Palette as PaletteIcon, RotateCcw, Trash2, LogOut, Eraser,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const fetchStats = useServerFn(getStats);
  const doDelete = useServerFn(deleteAccount);
  const doReset = useServerFn(resetAccount);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), enabled: !!user });
  const { palette, mode, setPalette, setMode, reset } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!data?.profile) return <AppShell><div className="text-center py-20 text-muted-foreground">טוען...</div></AppShell>;
  const p = data.profile;
  const nextLevel = scoreForNextLevel(p.level);
  const prevLevel = scoreForNextLevel(p.level - 1);
  const progress = Math.min(100, Math.round(((p.total_score - prevLevel) / (nextLevel - prevLevel)) * 100));

  const onForgetMe = async () => {
    if (!confirm(
      "פעולה זו תאפס את כל ההיסטוריה וההתקדמות שלך:\n\n" +
      "• כל ההגדרות שפתרת יימחקו\n" +
      "• הניקוד יתאפס ל-0\n" +
      "• הרמה תחזור ל-1\n" +
      "• הרצפים והאתגרים יתאפסו\n" +
      "• כל הרמזים והדירוגים יימחקו\n\n" +
      "החשבון ושם התצוגה יישמרו. להמשיך?"
    )) return;
    if (!confirm("בטוחים? לא ניתן לשחזר את הנתונים לאחר האיפוס.")) return;
    setResetting(true);
    try {
      await doReset();
      await qc.invalidateQueries();
      toast.success("הפרופיל אופס. ברוך הבא מחדש!");
    } catch (e: any) { toast.error(e.message); }
    finally { setResetting(false); }
  };

  const onDelete = async () => {
    if (!confirm(
      "מחיקת הפרופיל היא פעולה בלתי הפיכה.\n\n" +
      "כל הנתונים יימחקו לצמיתות:\n" +
      "• החשבון עצמו\n" +
      "• הסטטיסטיקות וההיסטוריה\n" +
      "• הניקוד וההישגים בטבלת המובילים\n\n" +
      "להמשיך?"
    )) return;
    if (!confirm("בטוחים לחלוטין? פעולה זו אינה הפיכה.")) return;
    setDeleting(true);
    try {
      await doDelete();
      await signOut();
      toast.success("הפרופיל נמחק");
      navigate({ to: "/" });
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Header card */}
        <div className="bg-gradient-sunset rounded-3xl p-6 text-white shadow-glow">
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-display font-extrabold">
              {p.display_name?.[0] ?? p.username[0]}
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold">{p.display_name ?? p.username}</h1>
              <p className="text-white/80">@{p.username}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1"><span>רמה {p.level}</span><span>{p.total_score} / {nextLevel}</span></div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <section>
          <h2 className="font-display text-xl font-bold mb-3">סטטיסטיקות אישיות</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={<Trophy className="size-5" />} label="ניקוד כולל" value={p.total_score} />
            <StatCard icon={<Target className="size-5" />} label="הגדרות שנפתרו" value={p.solved_count} />
            <StatCard icon={<Percent className="size-5" />} label="אחוז הצלחה" value={`${data.successRate}%`} />
            <StatCard icon={<Flame className="size-5" />} label="רצף נוכחי" value={p.current_streak} />
            <StatCard icon={<Award className="size-5" />} label="שיא רצף" value={p.best_streak} />
            <StatCard icon={<Sparkles className="size-5" />} label="פתירות מושלמות" value={data.perfectSolves} />
            <StatCard icon={<Lightbulb className="size-5" />} label="רמזים בשימוש" value={data.totalHints} />
            <StatCard icon={<CheckCircle2 className="size-5" />} label="רמה נוכחית" value={p.level} />
          </div>
        </section>

        {/* Theme */}
        <section className="bg-card border rounded-3xl p-5 shadow-card space-y-5">
          <div className="flex items-center gap-2">
            <PaletteIcon className="size-5 text-primary" />
            <h2 className="font-display text-xl font-bold">תצוגה וצבעים</h2>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">מצב</div>
            <div className="flex gap-2">
              <button onClick={() => setMode("light")}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${mode === "light" ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}>
                <Sun className="size-4" /> בהיר
              </button>
              <button onClick={() => setMode("dark")}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${mode === "dark" ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}>
                <Moon className="size-4" /> כהה
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">פלטת צבעים</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PALETTES.map((pl) => (
                <button key={pl.id} onClick={() => setPalette(pl.id as Palette)}
                  className={`p-3 rounded-xl border transition text-center ${palette === pl.id ? "ring-2 ring-primary border-transparent" : "hover:bg-muted"}`}>
                  <div className="h-10 rounded-lg mb-2" style={{ background: pl.swatch }} />
                  <div className="text-sm font-medium">{pl.label}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { reset(); toast.success("ההגדרות אופסו"); }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition text-sm font-medium">
            <RotateCcw className="size-4" /> איפוס הגדרות תצוגה
          </button>
        </section>

        {/* Account actions */}
        <section className="space-y-3">
          <button
            onClick={signOut}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border bg-card hover:bg-muted transition font-medium"
          >
            <LogOut className="size-4" /> נתק אותי
          </button>

          <button
            onClick={onForgetMe}
            disabled={resetting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-warning/40 text-warning hover:bg-warning hover:text-warning-foreground transition font-medium disabled:opacity-50"
          >
            <Eraser className="size-4" /> {resetting ? "מאפס..." : "שכח אותי"}
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition font-medium disabled:opacity-50"
          >
            <Trash2 className="size-4" /> {deleting ? "מוחק..." : "מחק אותי"}
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-card border rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon} {label}</div>
      <div className="font-display text-3xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
