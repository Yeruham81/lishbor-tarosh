// Centralized progression / scoring configuration & helpers.
// All values are configurable here for future balancing.
// Internal names are English; player-facing strings live in UI files.

export const SCORING = {
  BASE_POINTS: 10,
  FREE_WRONGS: 3, // first N wrong letters cost nothing
  WRONG_PENALTY: 1, // subtracted per wrong letter beyond FREE_WRONGS
  HINT_PENALTY: 2, // subtracted per hint used
  MIN_SOLVE_SCORE: 2, // minimum score for a solved definition
  SKIP_SCORE: 0,
} as const;

// Bonus points awarded automatically when reaching a perfect-streak milestone.
// Keys are streak counts; values are bonus points.
export const PERFECT_STREAK_BONUSES: Record<number, number> = {
  5: 5,
  10: 10,
  20: 25,
  50: 75,
};

// Cumulative total_score needed to UNLOCK each stage. Stage 1 = 0.
// Index 0 unused; STAGE_THRESHOLDS[n] = score needed to reach stage n.
export const STAGE_THRESHOLDS: number[] = [
  0, // stage 1
  50, // stage 2
  150, // stage 3
  300, // stage 4
  500, // stage 5
  750, // stage 6
  1050, // stage 7
  1400, // stage 8
  1800, // stage 9
  2300, // stage 10
  2850, // 11
  3450, // 12
  4100, // 13
  4800, // 14
  5550, // 15
  6350, // 16
  7200, // 17
  8100, // 18
  9050, // 19
  10050, // 20
];

// Compute earned score for a solved definition.
export function computeSolveScore(wrongCount: number, hintsUsed: number): number {
  const overFree = Math.max(0, wrongCount - SCORING.FREE_WRONGS);
  const raw = SCORING.BASE_POINTS - overFree * SCORING.WRONG_PENALTY - hintsUsed * SCORING.HINT_PENALTY;
  return Math.max(SCORING.MIN_SOLVE_SCORE, raw);
}

// Potential current value of an in-progress definition (mirrors computeSolveScore).
export function currentSolveValue(wrongCount: number, hintsUsed: number): number {
  return computeSolveScore(wrongCount, hintsUsed);
}

// Perfect solve: no hints AND no more than FREE_WRONGS wrong letters.
export function isPerfectSolve(wrongCount: number, hintsUsed: number): boolean {
  return hintsUsed === 0 && wrongCount <= SCORING.FREE_WRONGS;
}

// Determine the player's current stage from cumulative score.
export function stageFromScore(score: number): number {
  let stage = 1;
  for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
    if (score >= STAGE_THRESHOLDS[i]) stage = i + 1;
    else break;
  }
  return stage;
}

// Score required to unlock the NEXT stage from the current cumulative score.
// Returns null when no further stage is configured.
export function nextStageInfo(score: number): { nextStage: number; required: number; remaining: number } | null {
  const cur = stageFromScore(score);
  if (cur >= STAGE_THRESHOLDS.length) return null;
  const required = STAGE_THRESHOLDS[cur]; // threshold to reach stage cur+1
  return { nextStage: cur + 1, required, remaining: Math.max(0, required - score) };
}

// Award any perfect-streak bonus reached at the new streak count.
export function perfectStreakBonus(newStreak: number): number {
  return PERFECT_STREAK_BONUSES[newStreak] ?? 0;
}

// ---------- Achievements ----------
export type AchievementCategory = "solved" | "perfect" | "perfect_streak" | "play_days";

export const ACHIEVEMENT_TIERS: Record<AchievementCategory, number[]> = {
  solved: [10, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000],
  perfect: [10, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 2500, 5000],
  perfect_streak: [10, 20, 30, 50, 100, 200, 500],
  play_days: [2, 7, 14, 30, 100],
};

export type AchievementDef = {
  id: string;
  category: AchievementCategory;
  threshold: number;
  title: string; // Hebrew
  description: string; // Hebrew
};

function solvedTitle(n: number) {
  return `${n.toLocaleString("he-IL")} הגדרות פתורות`;
}
function perfectTitle(n: number) {
  return `${n.toLocaleString("he-IL")} פתירות מושלמות`;
}
function daysTitle(n: number) {
  return `${n.toLocaleString("he-IL")} ימים רצופים`;
}

export function buildAchievementDefs(): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const n of ACHIEVEMENT_TIERS.solved) {
    out.push({
      id: `solved-${n}`,
      category: "solved",
      threshold: n,
      title: solvedTitle(n),
      description: `פתרו ${n.toLocaleString("he-IL")} הגדרות בסך הכל`,
    });
  }
  for (const n of ACHIEVEMENT_TIERS.perfect) {
    out.push({
      id: `perfect-${n}`,
      category: "perfect",
      threshold: n,
      title: perfectTitle(n),
      description: `פתרו ${n.toLocaleString("he-IL")} הגדרות עם ניקוד מושלם`,
    });
  }
  for (const n of ACHIEVEMENT_TIERS.play_days) {
    out.push({
      id: `play-days-${n}`,
      category: "play_days",
      threshold: n,
      title: daysTitle(n),
      description: `שחקו במשך ${n.toLocaleString("he-IL")} ימים רצופים`,
    });
  }
  return out;
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  solved: "הגדרות פתורות",
  perfect: "פתירות מושלמות",
  play_days: "ימים רצופים",
};

export const CATEGORY_REMAINING_LABEL: Record<AchievementCategory, (n: number) => string> = {
  solved: (n) => `עוד ${n.toLocaleString("he-IL")} הגדרות`,
  perfect: (n) => `עוד ${n.toLocaleString("he-IL")} פתרונות מושלמים`,
  play_days: (n) => `עוד ${n.toLocaleString("he-IL")} ימים רצופים`,
};

// Returns thresholds in `thresholds` newly crossed when value moves from `before` to `after`.
export function tiersCrossed(thresholds: number[], before: number, after: number): number[] {
  return thresholds.filter((t) => before < t && after >= t);
}

export function findAchievementTitle(category: AchievementCategory, threshold: number): string {
  if (category === "solved") return solvedTitle(threshold);
  if (category === "perfect") return perfectTitle(threshold);
  return daysTitle(threshold);
}

// Returns ISO date (YYYY-MM-DD) for the current UTC day.
export function todayIsoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Given last play date and today, compute the new consecutive-play-days streak.
// - same day: unchanged
// - exactly +1 day: increment
// - missed: reset to 1
export function nextPlayDaysStreak(lastDate: string | null, current: number, today: string): number {
  if (!lastDate) return 1;
  if (lastDate === today) return current || 1;
  const last = new Date(lastDate + "T00:00:00Z").getTime();
  const cur = new Date(today + "T00:00:00Z").getTime();
  const diffDays = Math.round((cur - last) / 86400000);
  if (diffDays === 1) return current + 1;
  return 1;
}
