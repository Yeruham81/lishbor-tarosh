import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeLetter, normalizeWord, buildRevealMask, wordLengths } from "./hebrew";
import {
  SCORING,
  computeSolveScore,
  currentSolveValue,
  isPerfectSolve,
  stageFromScore,
  perfectStreakBonus,
  todayIsoDate,
  nextPlayDaysStreak,
  ACHIEVEMENT_TIERS,
  tiersCrossed,
  findAchievementTitle,
} from "./progression";

const LEADERBOARD_AVATAR_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function isSafeLeaderboardAvatarPath(profileId: string, path: string | null | undefined) {
  if (!path) return false;
  const prefix = `${profileId}/avatar-`;
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return (
    path.startsWith(prefix) && !path.slice(prefix.length).includes("/") && LEADERBOARD_AVATAR_EXTENSIONS.has(extension)
  );
}

async function signedLeaderboardAvatar(profileId: string, path: string | null | undefined) {
  if (!isSafeLeaderboardAvatarPath(profileId, path)) return null;
  const { data, error } = await supabaseAdmin.storage.from("avatars").createSignedUrl(path!, 60 * 60);
  if (error) {
    console.error("[leaderboard] failed to sign avatar", { profileId, message: error.message });
    return null;
  }
  return data?.signedUrl ?? null;
}

async function withSignedLeaderboardAvatars<T extends { id: string; avatar_url?: string | null }>(rows: T[]) {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      avatar_url: await signedLeaderboardAvatar(row.id, row.avatar_url),
    })),
  );
}

export type SolveEvent =
  | { kind: "score"; points: number }
  | { kind: "perfect_bonus"; points: number; streak: number }
  | { kind: "stage_up"; stage: number }
  | {
      kind: "achievement";
      title: string;
      category: "solved" | "perfect" | "perfect_streak" | "play_days";
      threshold: number;
    };

type ClueRow = {
  id: string;
  clue: string;
  answer: string;
  category: string | null;
  difficulty: number;
  base_points: number;
  explanation?: string | null;
  credit?: string | null;
};

function publicClue(clue: ClueRow, revealed: string[], wrong: string[], hintsUsed: number, isSolved: boolean) {
  const mask = buildRevealMask(clue.answer, revealed);
  return {
    id: clue.id,
    clue: clue.clue,
    category: clue.category,
    difficulty: clue.difficulty,
    basePoints: SCORING.BASE_POINTS,
    wordLengths: wordLengths(clue.answer),
    mask,
    revealed,
    wrong,
    hintsUsed,
    isSolved,
    explanation: clue.explanation ?? null,
    credit: clue.credit ?? null,
    // Value the player will earn (or has earned) for this definition right now.
    currentScore: currentSolveValue(wrong.length, hintsUsed),
    // Visual mistake indicators config (so UI doesn't hard-code FREE_WRONGS).
    freeWrongs: SCORING.FREE_WRONGS,
  };
}

async function loadProgress(_supabase: any, userId: string, clue: ClueRow) {
  const { data: prog } = await supabaseAdmin
    .from("game_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("clue_id", clue.id)
    .maybeSingle();
  const revealed: string[] = prog?.revealed_letters ?? [];
  const wrong: string[] = (prog?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));
  return publicClue(clue, revealed, wrong, prog?.hints_used ?? 0, prog?.is_solved ?? false);
}

export const getNextClue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1) Resume in-progress (not solved) puzzle if any
    const { data: inProgress } = await supabaseAdmin
      .from("game_progress")
      .select("clue_id, updated_at")
      .eq("user_id", userId)
      .eq("is_solved", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const applyScheduleFilter = (q: any) =>
      q.or(`publish_at.is.null,publish_at.lte.${nowIso}`).or(`expire_at.is.null,expire_at.gt.${nowIso}`);

    if (inProgress?.clue_id) {
      const { data: clue } = await applyScheduleFilter(
        supabaseAdmin.from("clues").select("*").eq("id", inProgress.clue_id).eq("is_active", true),
      ).maybeSingle();
      if (clue) return await loadProgress(supabase, userId, clue);
    }

    // 2) Pick a fresh clue scaled to stage, excluding already-solved
    const { data: profile } = await supabaseAdmin.from("profiles").select("level").eq("id", userId).single();
    const maxDiff = Math.min(5, Math.ceil(((profile?.level ?? 1) + 1) / 2));

    const { data: solvedRows } = await supabaseAdmin
      .from("game_progress")
      .select("clue_id")
      .eq("user_id", userId)
      .eq("is_solved", true);
    const solvedIds = (solvedRows ?? []).map((r: any) => r.clue_id);

    let query = applyScheduleFilter(
      supabaseAdmin.from("clues").select("*").eq("is_active", true).lte("difficulty", maxDiff).limit(100),
    );
    if (solvedIds.length) query = query.not("id", "in", `(${solvedIds.join(",")})`);

    let { data: clues } = await query;
    if (!clues || clues.length === 0) {
      const { data: any } = await applyScheduleFilter(
        supabaseAdmin.from("clues").select("*").eq("is_active", true).limit(100),
      );
      clues = (any ?? []).filter((c: any) => !solvedIds.includes(c.id));
    }

    if (!clues || clues.length === 0) return { exhausted: true as const };

    const pick = clues[Math.floor(Math.random() * clues.length)];

    // Auto-reveal one letter if answer has more than 3 (non-space) letters.
    const normalized = normalizeWord(pick.answer).replace(/\s/g, "");
    let initialRevealed: string[] = [];
    if (normalized.length > 3) {
      const counts = new Map<string, number>();
      for (const ch of normalized) counts.set(ch, (counts.get(ch) ?? 0) + 1);
      const singletons = [...counts.entries()].filter(([, n]) => n === 1).map(([c]) => c);
      if (singletons.length > 0) {
        initialRevealed = [singletons[Math.floor(Math.random() * singletons.length)]];
      }
    }

    await supabaseAdmin.from("game_progress").insert({
      user_id: userId,
      clue_id: pick.id,
      revealed_letters: initialRevealed,
      wrong_guesses: [],
      hints_used: 0,
      is_solved: false,
    });

    // Track that this clue was displayed (content-health metric).
    await supabaseAdmin
      .from("clues")
      .update({ times_displayed: (pick.times_displayed ?? 0) + 1 })
      .eq("id", pick.id);

    // Count this as a definition played (first time we serve it)
    await bumpPlayCounters(supabase, userId);

    return await loadProgress(supabase, userId, pick);
  });

export const getClueState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabaseAdmin
      .from("clues")
      .select("*")
      .eq("id", data.clueId)
      .eq("is_active", true)
      .maybeSingle();
    if (!clue) return null;
    const { data: prog } = await supabaseAdmin
      .from("game_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("clue_id", data.clueId)
      .maybeSingle();
    if (!prog) return null;
    return publicClue(
      clue,
      prog.revealed_letters ?? [],
      (prog.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__")),
      prog.hints_used ?? 0,
      prog.is_solved ?? false,
    );
  });

const guessSchema = z.object({
  clueId: z.string().uuid(),
  letter: z.string().min(1).max(2),
});

export const guessLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => guessSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabaseAdmin.from("clues").select("*").eq("id", data.clueId).single();
    if (!clue) throw new Error("הגדרה לא נמצאה");

    const letter = normalizeLetter(data.letter);
    const answer = normalizeWord(clue.answer);

    const { data: existing } = await supabaseAdmin
      .from("game_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("clue_id", data.clueId)
      .maybeSingle();

    if (existing?.is_solved) {
      return publicClue(clue, existing.revealed_letters, existing.wrong_guesses, existing.hints_used, true);
    }

    const revealed: string[] = existing?.revealed_letters ?? [];
    const wrong: string[] = (existing?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));

    const isCorrect = answer.replace(/\s/g, "").includes(letter);
    const wasNewWrong = !isCorrect && !wrong.includes(letter);
    if (isCorrect && !revealed.includes(letter)) revealed.push(letter);
    if (wasNewWrong) wrong.push(letter);

    const solved = answer.split("").every((c) => c === " " || revealed.includes(c));
    const hintsUsed = existing?.hints_used ?? 0;
    const perfect = isPerfectSolve(wrong.length, hintsUsed);
    const payload: any = {
      user_id: userId,
      clue_id: data.clueId,
      revealed_letters: revealed,
      wrong_guesses: wrong,
      hints_used: hintsUsed,
    };

    let events: SolveEvent[] = [];
    if (solved) {
      const earned = computeSolveScore(wrong.length, hintsUsed);
      payload.is_solved = true;
      payload.is_perfect = perfect;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      events = await applySolveResult(supabase, userId, earned, perfect, wasNewWrong ? 1 : 0);
      await bumpSolvedCount(supabase, clue.id);
    } else if (wasNewWrong) {
      // Track wrong letters & maybe break perfect streak if exceeded free wrongs.
      await applyWrongLetter(supabase, userId, wrong.length);
    }

    if (existing) await supabaseAdmin.from("game_progress").update(payload).eq("id", existing.id);
    else await supabaseAdmin.from("game_progress").insert(payload);

    const result = publicClue(clue, revealed, wrong, hintsUsed, solved);
    return { ...result, events };
  });

const hintSchema = z.object({ clueId: z.string().uuid() });

export const useHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => hintSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabaseAdmin.from("clues").select("*").eq("id", data.clueId).single();
    if (!clue) throw new Error("הגדרה לא נמצאה");
    const answer = normalizeWord(clue.answer);
    const { data: existing } = await supabaseAdmin
      .from("game_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("clue_id", data.clueId)
      .maybeSingle();
    if (existing?.is_solved)
      return publicClue(clue, existing.revealed_letters, existing.wrong_guesses, existing.hints_used, true);

    const revealed: string[] = existing?.revealed_letters ?? [];
    const candidates = Array.from(new Set(answer.split("").filter((c) => c !== " " && !revealed.includes(c))));
    if (candidates.length === 0)
      return publicClue(clue, revealed, existing?.wrong_guesses ?? [], existing?.hints_used ?? 0, false);

    const letter = candidates[Math.floor(Math.random() * candidates.length)];
    revealed.push(letter);
    const hintsUsed = (existing?.hints_used ?? 0) + 1;
    const wrong = (existing?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));

    await supabaseAdmin.from("hint_usage").insert({
      user_id: userId,
      clue_id: data.clueId,
      letter,
      position: answer.indexOf(letter),
      cost: SCORING.HINT_PENALTY,
    });

    // Any hint use breaks the perfect streak.
    await applyHintUsed(supabase, userId);

    const solved = answer.split("").every((c) => c === " " || revealed.includes(c));
    const payload: any = {
      user_id: userId,
      clue_id: data.clueId,
      revealed_letters: revealed,
      wrong_guesses: wrong,
      hints_used: hintsUsed,
    };
    let events: SolveEvent[] = [];
    if (solved) {
      const perfect = isPerfectSolve(wrong.length, hintsUsed);
      const earned = computeSolveScore(wrong.length, hintsUsed);
      payload.is_solved = true;
      payload.is_perfect = perfect;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      events = await applySolveResult(supabase, userId, earned, perfect, 0);
      await bumpSolvedCount(supabase, clue.id);
    }
    if (existing) await supabaseAdmin.from("game_progress").update(payload).eq("id", existing.id);
    else await supabaseAdmin.from("game_progress").insert(payload);

    const result = publicClue(clue, revealed, wrong, hintsUsed, solved);
    return { ...result, events };
  });

const skipSchema = z.object({ clueId: z.string().uuid() });

export const skipClue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => skipSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabaseAdmin
      .from("game_progress")
      .delete()
      .eq("user_id", userId)
      .eq("clue_id", data.clueId)
      .eq("is_solved", false);
    // Skip breaks the perfect streak and counts the definition as skipped. No score change.
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("definitions_skipped, current_streak")
      .eq("id", userId)
      .single();
    if (p) {
      await supabaseAdmin
        .from("profiles")
        .update({
          current_streak: 0,
          definitions_skipped: (p.definitions_skipped ?? 0) + 1,
        })
        .eq("id", userId);
    }
    const { data: c } = await supabaseAdmin.from("clues").select("skip_count").eq("id", data.clueId).maybeSingle();
    if (c)
      await supabaseAdmin
        .from("clues")
        .update({ skip_count: (c.skip_count ?? 0) + 1 })
        .eq("id", data.clueId);
    return { ok: true };
  });

// ---- Profile mutators ----

// Minimum solves on a single day to count it as an "active" play day for the
// consecutive-days challenge.
const ACTIVE_DAY_SOLVE_THRESHOLD = 1;

// Per-served-clue bookkeeping. NOTE: the consecutive-days streak is no longer
// touched here — it only advances after the player has solved
// ACTIVE_DAY_SOLVE_THRESHOLD clues today (see maybeBumpActiveDayStreak).
async function bumpPlayCounters(_supabase: any, userId: string) {
  const { data: p } = await supabaseAdmin.from("profiles").select("definitions_played").eq("id", userId).single();
  if (!p) return;
  await supabaseAdmin
    .from("profiles")
    .update({
      definitions_played: (p.definitions_played ?? 0) + 1,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

// Track today's solve count and, only when it crosses the daily threshold,
// advance the consecutive-play-days streak. Returns { oldStreak, newStreak }
// so the caller can emit tier-crossed achievements.
async function maybeBumpActiveDayStreak(userId: string): Promise<{ oldStreak: number; newStreak: number }> {
  const today = todayIsoDate();
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("active_day_date, active_day_solves, current_play_days_streak, best_play_days_streak, last_play_date")
    .eq("id", userId)
    .single();
  if (!p) return { oldStreak: 0, newStreak: 0 };

  let solves = (p as any).active_day_solves ?? 0;
  let dayDate: string | null = (p as any).active_day_date ?? null;
  if (dayDate !== today) {
    solves = 1;
    dayDate = today;
  } else {
    solves += 1;
  }

  const oldStreak = p.current_play_days_streak ?? 0;
  let newStreak = oldStreak;
  let lastPlayDate = p.last_play_date;
  if (solves === ACTIVE_DAY_SOLVE_THRESHOLD && p.last_play_date !== today) {
    newStreak = nextPlayDaysStreak(p.last_play_date, oldStreak, today);
    lastPlayDate = today;
  }
  const bestStreak = Math.max(p.best_play_days_streak ?? 0, newStreak);

  await supabaseAdmin
    .from("profiles")
    .update({
      active_day_date: dayDate,
      active_day_solves: solves,
      last_play_date: lastPlayDate,
      current_play_days_streak: newStreak,
      best_play_days_streak: bestStreak,
    } as any)
    .eq("id", userId);

  return { oldStreak, newStreak };
}

// Apply solve outcome: score, perfect streak, stage progression, counters.
// Returns notification events that should be surfaced to the player.
async function applySolveResult(
  _supabase: any,
  userId: string,
  points: number,
  perfect: boolean,
  newWrongLetters: number,
): Promise<SolveEvent[]> {
  // First, advance the daily-solve counter / consecutive-days streak.
  const dayStreak = await maybeBumpActiveDayStreak(userId);

  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("total_score, current_streak, best_streak, solved_count, perfect_solves, wrong_letters_total")
    .eq("id", userId)
    .single();
  if (!p) return [];
  const newPerfectStreak = perfect ? (p.current_streak ?? 0) + 1 : 0;
  const bonus = perfect ? perfectStreakBonus(newPerfectStreak) : 0;
  const oldScore = p.total_score ?? 0;
  const newScore = oldScore + points + bonus;
  const oldStage = stageFromScore(oldScore);
  const newStage = stageFromScore(newScore);
  const oldSolved = p.solved_count ?? 0;
  const newSolved = oldSolved + 1;
  const oldPerfect = p.perfect_solves ?? 0;
  const newPerfectTotal = oldPerfect + (perfect ? 1 : 0);

  await supabaseAdmin
    .from("profiles")
    .update({
      total_score: newScore,
      current_streak: newPerfectStreak,
      best_streak: Math.max(p.best_streak ?? 0, newPerfectStreak),
      solved_count: newSolved,
      perfect_solves: newPerfectTotal,
      wrong_letters_total: (p.wrong_letters_total ?? 0) + newWrongLetters,
      level: newStage,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", userId);

  const events: SolveEvent[] = [{ kind: "score", points: points + bonus }];
  if (bonus > 0) events.push({ kind: "perfect_bonus", points: bonus, streak: newPerfectStreak });
  if (newStage > oldStage) events.push({ kind: "stage_up", stage: newStage });
  for (const t of tiersCrossed(ACHIEVEMENT_TIERS.solved, oldSolved, newSolved)) {
    events.push({ kind: "achievement", category: "solved", threshold: t, title: findAchievementTitle("solved", t) });
  }
  if (perfect) {
    for (const t of tiersCrossed(ACHIEVEMENT_TIERS.perfect, oldPerfect, newPerfectTotal)) {
      events.push({
        kind: "achievement",
        category: "perfect",
        threshold: t,
        title: findAchievementTitle("perfect", t),
      });
    }
    const oldPerfectStreak = p.current_streak ?? 0;
    for (const t of tiersCrossed(ACHIEVEMENT_TIERS.perfect_streak, oldPerfectStreak, newPerfectStreak)) {
      events.push({
        kind: "achievement",
        category: "perfect_streak",
        threshold: t,
        title: findAchievementTitle("perfect_streak", t),
      });
    }
  }
  // Play-days tier crossings (now driven by the daily-solve threshold).
  for (const t of tiersCrossed(ACHIEVEMENT_TIERS.play_days, dayStreak.oldStreak, dayStreak.newStreak)) {
    events.push({
      kind: "achievement",
      category: "play_days",
      threshold: t,
      title: findAchievementTitle("play_days", t),
    });
  }
  return events;
}

async function applyWrongLetter(_supabase: any, userId: string, totalWrongInClue: number) {
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("current_streak, wrong_letters_total")
    .eq("id", userId)
    .single();
  if (!p) return;
  const patch: any = { wrong_letters_total: (p.wrong_letters_total ?? 0) + 1 };
  // If this single clue exceeded the free-wrongs threshold, perfect streak is lost immediately.
  if (totalWrongInClue > SCORING.FREE_WRONGS && (p.current_streak ?? 0) > 0) {
    patch.current_streak = 0;
  }
  await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
}

async function applyHintUsed(_supabase: any, userId: string) {
  const { data: p } = await supabaseAdmin
    .from("profiles")
    .select("current_streak, hints_used_total")
    .eq("id", userId)
    .single();
  if (!p) return;
  await supabaseAdmin
    .from("profiles")
    .update({
      current_streak: 0,
      hints_used_total: (p.hints_used_total ?? 0) + 1,
    })
    .eq("id", userId);
}

async function bumpSolvedCount(supabase: any, clueId: string) {
  const { data: c } = await supabaseAdmin.from("clues").select("solved_count").eq("id", clueId).maybeSingle();
  if (c)
    await supabaseAdmin
      .from("clues")
      .update({ solved_count: (c.solved_count ?? 0) + 1 })
      .eq("id", clueId);
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Sensitive columns are column-revoked from `authenticated`; read via admin scoped to owner.
    const { data } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, display_name, display_name_confirmed, avatar_url, total_score, solved_count, current_streak, best_streak, highest_streak, level, is_private, auto_next, notification_prefs, accessibility_prefs, auth_provider, perfect_solves, definitions_played, definitions_skipped, hints_used_total, wrong_letters_total, current_play_days_streak, best_play_days_streak, last_play_date, last_seen_at, age, is_blocked, is_paid, created_at, updated_at",
      )
      .eq("id", context.userId)
      .single();
    return data;
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, total_score, level, solved_count, best_streak")
      .eq("is_private", false)
      .order("total_score", { ascending: false })
      .limit(50);
    return withSignedLeaderboardAvatars(data ?? []);
  });

const periodSchema = z.object({
  period: z.enum(["today", "week", "month", "all"]),
});

export const getLeaderboardByPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.period === "all") {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, total_score, level, solved_count, best_streak")
        .eq("is_private", false)
        .order("total_score", { ascending: false })
        .limit(20);
      return withSignedLeaderboardAvatars(
        (rows ?? []).map((r: any) => ({
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
          level: r.level,
          solved_count: r.solved_count,
          best_streak: r.best_streak,
          score: r.total_score,
        })),
      );
    }

    const now = new Date();
    let since: Date;
    if (data.period === "today") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (data.period === "week") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: progress } = await supabaseAdmin
      .from("game_progress")
      .select("user_id, score_earned")
      .eq("is_solved", true)
      .gte("solved_at", since.toISOString())
      .limit(5000);

    const totals = new Map<string, { score: number; solved: number }>();
    for (const row of (progress ?? []) as any[]) {
      const t = totals.get(row.user_id) ?? { score: 0, solved: 0 };
      t.score += row.score_earned ?? 0;
      t.solved += 1;
      totals.set(row.user_id, t);
    }

    const topIds = [...totals.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 20);

    if (topIds.length === 0) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, level, best_streak, is_private")
      .in(
        "id",
        topIds.map(([id]) => id),
      );

    const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    const visibleRows = topIds
      .filter(([id]) => {
        const profile = byId.get(id);
        return !!profile && profile.is_private === false;
      })
      .map(([id, t]) => {
        const p = byId.get(id);
        return {
          id,
          username: p.username ?? "",
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          level: p.level ?? 1,
          solved_count: t.solved,
          best_streak: p.best_streak ?? 0,
          score: t.score,
        };
      });

    return withSignedLeaderboardAvatars(visibleRows);
  });
