import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getStats, deleteAccount } from "@/lib/account.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { useTheme, PALETTES, type Palette } from "@/hooks/use-theme";
import { toast } from "sonner";
import {
  Trophy, Flame, Target, Award, Percent, Sparkles, Lightbulb,
  Sun, Moon, Palette as PaletteIcon, RotateCcw, Trash2, Lock, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

type Achievement = {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  progress?: { cur: number; max: number };
};

function buildAchievements(p: {
  solved_count: number; best_streak: number; total_score: number;
}, perfectSolves: number): Achievement[] {
  const solveTiers = [1, 10, 50, 100, 250, 500];
  const streakTiers = [3, 5, 10, 20];
  const perfectTiers = [1, 10, 50];
  const list: Achievement[] = [];
  for (const n of solveTiers) {
    list.push({
      id: `solve-${n}`,
      title: n === 1 ? "פתירת הגדרה ראשונה" : `פתירת ${n} הגדרות`,
      desc: n === 1 ? "ההגדרה הראשונה שלכם!" : `פתרו ${n} הגדרות בסך הכל`,
      done: p.solved_count >= n,
      progress: { cur: Math.min(p.solved_count, n), max: n },
    });
  }
  for (const n of perfectTiers) {
    list.push({
      id: `perfect-${n}`,
      title: n === 1 ? "פתירה מושלמת ראשונה" : `${n} פתירות מושלמות`,
      desc: "ללא טעויות וללא רמזים",
      done: perfectSolves >= n,
      progress: { cur: Math.min(perfectSolves, n), max: n },
    });
  }
  for (const n of streakTiers) {
    list.push({
      id: `streak-${n}`,
      title: `רצף של ${n}`,
      desc: `פתרו ${n} הגדרות ברצף`,
      done: p.best_streak >= n,
      progress: { cur: Math.min(p.best_streak, n), max: n },
    });
  }
  return list;
}

function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const fetchStats = useServerFn(getStats);
  const doDelete = useServerFn(deleteAccount);
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), enabled: !!user });
  const { palette, mode, setPalette, setMode, reset } = useTheme();
  const [deleting, setDeleting] = useState(false);

  if (!data?.profile) return <AppShell><div className="text-center py-20 text-muted-foreground">טוען...</div></AppShell>;
  const p = data.profile;
  const nextLevel = scoreForNextLevel(p.level);
  const prevLevel = scoreForNextLevel(p.level - 1);
  const progress = Math.min(100, Math.round(((p.total_score - prevLevel) / (nextLevel - prevLevel)) * 100));
  const achievements = buildAchievements(p, data.perfectSolves);
  const completed = achievements.filter((a) => a.done).length;

  const onDelete = async () => {
    if (!confirm("למחוק את הפרופיל לצמיתות? פעולה זו אינה הפיכה.")) return;
    if (!confirm("בטוחים? כל הניקוד וההיסטוריה יימחקו.")) return;
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
            <StatCard icon={<CheckCircle2 className="size-5" />} label="אתגרים שהושלמו" value={`${completed}/${achievements.length}`} />
          </div>
        </section>

        {/* Achievements */}
        <section>
          <h2 className="font-display text-xl font-bold mb-3">אתגרים</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className={`p-4 rounded-2xl border shadow-card transition ${a.done ? "bg-gradient-sunset text-white border-transparent" : "bg-card"}`}>
                <div className="flex items-start gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${a.done ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                    {a.done ? <Trophy className="size-5" /> : <Lock className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{a.title}</div>
                    <div className={`text-xs ${a.done ? "text-white/80" : "text-muted-foreground"}`}>{a.desc}</div>
                    {a.progress && !a.done && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-sunset" style={{ width: `${(a.progress.cur / a.progress.max) * 100}%` }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{a.progress.cur} / {a.progress.max}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section className="bg-card border rounded-3xl p-5 shadow-card space-y-5">
          <div className="flex items-center gap-2">
            <PaletteIcon className="size-5 text-primary" />
            <h2 className="font-display text-xl font-bold">תצוגה ופלטה</h2>
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

        {/* Danger zone */}
        <section className="space-y-3">
          <button onClick={signOut} className="w-full py-3 rounded-xl border bg-card hover:bg-muted transition font-medium">
            התנתק
          </button>
          <button onClick={onDelete} disabled={deleting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition font-medium disabled:opacity-50">
            <Trash2 className="size-4" /> {deleting ? "מוחק..." : "מחיקת פרופיל לצמיתות"}
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
