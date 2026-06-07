import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getProfile } from "@/lib/game.functions";
import { getStats } from "@/lib/account.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { buildAchievements, AchievementsGrid } from "@/components/Achievements";
import { Lock, Check, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/levels")({ component: Levels });

function Levels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const fetchProfile = useServerFn(getProfile);
  const fetchStats = useServerFn(getStats);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), enabled: !!user });
  const cur = p?.level ?? 1;

  const achievements = p && stats
    ? buildAchievements(p, stats.perfectSolves)
    : [];
  const completed = achievements.filter((a) => a.done).length;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-10">
        <section>
          <h1 className="font-display text-4xl font-extrabold text-center mb-2 text-gradient-sunset">רמות</h1>
          <p className="text-center text-muted-foreground mb-6">פתרו הגדרות כדי לעלות ברמות ולשחרר הגדרות מאתגרות יותר</p>
          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, i) => {
              const lvl = i + 1;
              const required = scoreForNextLevel(lvl - 1);
              const unlocked = cur >= lvl;
              const current = cur === lvl;
              return (
                <div key={lvl} className={`flex items-center gap-4 p-4 rounded-2xl border ${current ? "bg-gradient-sunset text-white shadow-glow" : unlocked ? "bg-card" : "bg-muted/30"}`}>
                  <div className={`size-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg ${current ? "bg-white/20" : unlocked ? "bg-gradient-sunset text-white" : "bg-muted text-muted-foreground"}`}>
                    {unlocked ? lvl : <Lock className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">רמה {lvl}</div>
                    <div className={`text-xs ${current ? "text-white/80" : "text-muted-foreground"}`}>נדרשים {required} נק׳</div>
                  </div>
                  {unlocked && !current && <Check className="size-5 text-success" />}
                  {current && <Link to="/play" className="px-4 py-2 rounded-lg bg-white text-primary font-bold text-sm">המשך</Link>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Award className="size-6 text-primary" /> אתגרים
            </h2>
            {achievements.length > 0 && (
              <span className="text-sm text-muted-foreground">{completed}/{achievements.length} הושלמו</span>
            )}
          </div>
          {achievements.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">טוען אתגרים...</div>
          ) : (
            <AchievementsGrid items={achievements} />
          )}
        </section>
      </div>
    </AppShell>
  );
}
