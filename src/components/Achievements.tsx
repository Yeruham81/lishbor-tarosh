import { Trophy, Lock } from "lucide-react";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  progress?: { cur: number; max: number };
};

export function buildAchievements(
  p: { solved_count: number; best_streak: number; total_score: number },
  perfectSolves: number,
): Achievement[] {
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

export function AchievementsGrid({ items }: { items: Achievement[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((a) => (
        <div
          key={a.id}
          className={`p-4 rounded-2xl border shadow-card transition ${
            a.done ? "bg-gradient-sunset text-white border-transparent" : "bg-card"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                a.done ? "bg-white/20" : "bg-muted text-muted-foreground"
              }`}
            >
              {a.done ? <Trophy className="size-5" /> : <Lock className="size-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">{a.title}</div>
              <div
                className={`text-xs ${
                  a.done ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {a.desc}
              </div>
              {a.progress && !a.done && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-sunset"
                      style={{
                        width: `${(a.progress.cur / a.progress.max) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {a.progress.cur} / {a.progress.max}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
