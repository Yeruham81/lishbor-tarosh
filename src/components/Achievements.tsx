import { Trophy, Lock } from "lucide-react";
import {
  ACHIEVEMENT_TIERS,
  CATEGORY_LABELS,
  CATEGORY_REMAINING_LABEL,
  buildAchievementDefs,
  type AchievementCategory,
  type AchievementDef,
} from "@/lib/progression";

export type AchievementView = AchievementDef & { done: boolean; remaining: number; current: number };

export type AchievementStats = {
  solvedCount: number;
  perfectSolves: number;
  playDaysStreak: number; // use current_play_days_streak (consecutive)
  bestPlayDaysStreak?: number;
  bestPerfectStreak?: number;
  currentPerfectStreak?: number;
};

function valueFor(category: AchievementCategory, s: AchievementStats): number {
  if (category === "solved") return s.solvedCount;
  if (category === "perfect") return s.perfectSolves;
  if (category === "perfect_streak") {
    return Math.max(s.currentPerfectStreak ?? 0, s.bestPerfectStreak ?? 0);
  }
  // For consecutive-day achievements, show CURRENT streak as the progress
  // value so the bar moves day-by-day. Completion uses best below.
  return s.playDaysStreak;
}

function bestFor(category: AchievementCategory, s: AchievementStats): number {
  if (category === "play_days") return Math.max(s.playDaysStreak, s.bestPlayDaysStreak ?? 0);
  if (category === "perfect_streak") return Math.max(s.currentPerfectStreak ?? 0, s.bestPerfectStreak ?? 0);
  return valueFor(category, s);
}

export function buildAchievementsForStats(s: AchievementStats): AchievementView[] {
  const defs = buildAchievementDefs();
  return defs.map((d) => {
    const v = valueFor(d.category, s);
    const best = bestFor(d.category, s);
    const done = best >= d.threshold;
    return {
      ...d,
      done,
      remaining: Math.max(0, d.threshold - v),
      current: v,
    };
  });
}


// Group achievements by category. Within each category, show:
//  - All already-completed tiers
//  - PLUS the next not-yet-completed tier (with remaining-only label)
// Hide further locked tiers to keep the screen clean.
export function groupAchievementsForDisplay(
  s: AchievementStats,
): { category: AchievementCategory; label: string; items: AchievementView[]; nextRemainingLabel: string | null }[] {
  const all = buildAchievementsForStats(s);
  const cats: AchievementCategory[] = ["solved", "perfect", "perfect_streak", "play_days"];
  return cats.map((cat) => {
    const inCat = all.filter((a) => a.category === cat).sort((a, b) => a.threshold - b.threshold);
    const completed = inCat.filter((a) => a.done);
    const nextLocked = inCat.find((a) => !a.done);
    const items = nextLocked ? [...completed, nextLocked] : completed;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      items,
      nextRemainingLabel: nextLocked ? CATEGORY_REMAINING_LABEL[cat](nextLocked.remaining) : null,
    };
  });
}

export function AchievementsByCategory({ stats }: { stats: AchievementStats }) {
  const groups = groupAchievementsForDisplay(stats);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.category}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-display text-lg font-bold">{g.label}</h3>
          </div>
          {g.items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3">אין עדיין הישגים בקטגוריה זו</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {g.items.map((a) => (
                <AchievementCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ a }: { a: AchievementView }) {
  const pct = a.done ? 100 : Math.min(100, Math.round((a.current / a.threshold) * 100));
  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border shadow-card transition ${
        a.done
          ? "bg-gradient-sunset text-white border-transparent flex flex-col justify-center"
          : "bg-card"
      }`}
    >
      <div className={`flex gap-2 sm:gap-3 ${a.done ? "items-center" : "items-start"}`}>
        <div
          className={`size-8 sm:size-10 rounded-xl flex items-center justify-center shrink-0 ${
            a.done ? "bg-white/20" : "bg-muted text-muted-foreground"
          }`}
        >
          {a.done ? <Trophy className="size-4 sm:size-5" /> : <Lock className="size-3.5 sm:size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm sm:text-base leading-tight">{a.title}</div>
          {!a.done && (
            <div className="mt-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-sunset transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 tabular-nums">
                {a.current.toLocaleString("he-IL")} / {a.threshold.toLocaleString("he-IL")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Back-compat: keep legacy export names so existing imports compile ----
export type Achievement = AchievementView;
export function buildAchievements(
  p: { solved_count: number; best_streak?: number; total_score?: number; current_play_days_streak?: number; best_play_days_streak?: number },
  perfectSolves: number,
): AchievementView[] {
  return buildAchievementsForStats({
    solvedCount: p.solved_count ?? 0,
    perfectSolves,
    playDaysStreak: p.current_play_days_streak ?? 0,
    bestPlayDaysStreak: p.best_play_days_streak ?? 0,
  });
}
export function AchievementsGrid({ items: _items }: { items: AchievementView[] }) {
  // Legacy flat grid no longer used; kept as a no-op placeholder.
  return null;
}
// Tier counts for screens that show total counts.
export const ACHIEVEMENT_TIER_COUNTS = ACHIEVEMENT_TIERS;
