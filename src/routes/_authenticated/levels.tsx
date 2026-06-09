import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getProfile } from "@/lib/game.functions";
import { getStats } from "@/lib/account.functions";
import { STAGE_THRESHOLDS, stageFromScore, nextStageInfo } from "@/lib/progression";
import { AchievementsByCategory } from "@/components/Achievements";
import { Check, Award, Trophy, CheckCircle2, Target, Sparkles, Percent, Flame, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/levels")({ component: Levels });

function Levels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const fetchProfile = useServerFn(getProfile);
  const fetchStats = useServerFn(getStats);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats(), enabled: !!user });

  const totalScore = p?.total_score ?? 0;
  const currentStage = stageFromScore(totalScore);
  const next = nextStageInfo(totalScore);

  // Visible stages: 1..currentStage AND one locked stage beyond (next), if exists.
  const visibleStages: number[] = [];
  for (let s = 1; s <= currentStage; s++) visibleStages.push(s);
  if (next) visibleStages.push(next.nextStage);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-10">
        <section>
          <h1 className="font-display text-4xl font-extrabold text-center mb-2 text-gradient-sunset">שלבים</h1>
          <p className="text-center text-muted-foreground mb-4">פתרו הגדרות וצברו ניקוד כדי להתקדם בשלבים</p>

          {/* Score summary */}
          <div className="bg-card border rounded-2xl p-4 mb-5 text-center shadow-card">
            <div className="text-muted-foreground text-base font-normal">נקודות שצברת עד כה:</div>
            <div className="font-display text-3xl font-extrabold text-gradient-sunset">
              {totalScore.toLocaleString("he-IL")}
            </div>
          </div>

          {next ? (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>שלב {currentStage}</span>
                <span>
                  {totalScore.toLocaleString("he-IL")} / {next.required.toLocaleString("he-IL")}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-sunset transition-all duration-500"
                  style={{
                    width: `${(() => {
                      const prev = STAGE_THRESHOLDS[currentStage - 1] ?? 0;
                      const span = Math.max(1, next.required - prev);
                      return Math.min(100, Math.max(0, ((totalScore - prev) / span) * 100));
                    })()}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-base font-normal mb-5 text-center">הגעתם לשלב המקסימלי הזמין</div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visibleStages.map((lvl) => {
              const unlocked = lvl <= currentStage;
              const current = lvl === currentStage && unlocked;
              const required = STAGE_THRESHOLDS[lvl - 1] ?? 0; // threshold to reach this stage
              if (!unlocked) {
                return (
                  <div key={lvl} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border bg-muted/30 min-h-[140px] text-center">
                    <div className="size-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg bg-muted text-muted-foreground">
                      {lvl}
                    </div>
                    <div className="font-bold">שלב {lvl}</div>
                    <div className="text-xs text-muted-foreground">דרושות {required.toLocaleString("he-IL")} נקודות</div>
                  </div>
                );
              }
              return (
                <div
                  key={lvl}
                  className={`flex flex-col items-center justify-between gap-2 p-4 rounded-2xl border text-center min-h-[140px] ${
                    current ? "bg-gradient-sunset text-white shadow-glow" : "bg-card"
                  }`}
                >
                  <div className={`size-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg ${current ? "bg-white/20" : "bg-gradient-sunset text-white"}`}>
                    {lvl}
                  </div>
                  <div className="font-bold">שלב {lvl}</div>
                  {current ? (
                    <Link to="/play" className="px-3 py-1.5 rounded-lg bg-white text-primary font-bold text-sm">המשך</Link>
                  ) : (
                    <Check className="size-5 text-success" />
                  )}
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
          </div>
          {!stats ? (
            <div className="text-center text-muted-foreground py-6">טוען אתגרים...</div>
          ) : (
            <AchievementsByCategory
              stats={{
                solvedCount: stats.definitionsSolved ?? 0,
                perfectSolves: stats.perfectSolves ?? 0,
                playDaysStreak: stats.currentPlayDaysStreak ?? 0,
                bestPlayDaysStreak: stats.bestPlayDaysStreak ?? 0,
              }}
            />
          )}
        </section>

        {stats && (
          <section>
            <h2 className="font-display text-xl font-bold mb-3">סטטיסטיקות אישיות</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={<Trophy className="size-5" />} label="ניקוד כולל" value={totalScore} />
              <StatCard icon={<CheckCircle2 className="size-5" />} label="שלב נוכחי" value={currentStage} />
              <StatCard icon={<Target className="size-5" />} label="הגדרות שפתרת" value={stats.definitionsSolved} />
              <StatCard icon={<Sparkles className="size-5" />} label="פתירות מושלמות" value={stats.perfectSolves} />
              <StatCard icon={<Percent className="size-5" />} label="אחוז הצלחה" value={`${stats.successRate}%`} />
              <StatCard icon={<Flame className="size-5" />} label="רצף מושלם נוכחי" value={stats.currentPerfectStreak} />
              <StatCard icon={<Award className="size-5" />} label="שיא רצף מושלם" value={stats.bestPerfectStreak} />
              <StatCard icon={<Flame className="size-5" />} label="ימים רצופים" value={stats.currentPlayDaysStreak} />
              <StatCard icon={<Award className="size-5" />} label="שיא ימים רצופים" value={stats.bestPlayDaysStreak} />
              <StatCard icon={<Lightbulb className="size-5" />} label="רמזים בשימוש" value={stats.totalHints} />
              <StatCard icon={<Target className="size-5" />} label="הגדרות ששוחקו" value={stats.definitionsPlayed} />
              <StatCard icon={<Target className="size-5" />} label="הגדרות שדולגו" value={stats.definitionsSkipped} />
            </div>
          </section>
        )}
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
