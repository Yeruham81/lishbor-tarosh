import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeLetter, normalizeWord, levelFromScore, buildRevealMask, wordLengths } from "./hebrew";

const HINT_COST = 15;
const WRONG_PENALTY = 5;
const SKIP_PENALTY = 10;
const STREAK_BONUS = 10;

type ClueRow = {
  id: string; clue: string; answer: string; category: string | null;
  difficulty: number; base_points: number;
};

function publicClue(clue: ClueRow, revealed: string[], wrong: string[], hintsUsed: number, isSolved: boolean) {
  const mask = buildRevealMask(clue.answer, revealed);
  return {
    id: clue.id,
    clue: clue.clue,
    category: clue.category,
    difficulty: clue.difficulty,
    basePoints: clue.base_points,
    wordLengths: wordLengths(clue.answer),
    mask,
    revealed,
    wrong,
    hintsUsed,
    isSolved,
    // currentScore = remaining potential reward
    currentScore: Math.max(20, clue.base_points - wrong.length * WRONG_PENALTY - hintsUsed * HINT_COST),
  };
}

async function loadProgress(supabase: any, userId: string, clue: ClueRow) {
  const { data: prog } = await supabase.from("game_progress").select("*")
    .eq("user_id", userId).eq("clue_id", clue.id).maybeSingle();
  const revealed: string[] = prog?.revealed_letters ?? [];
  const wrong: string[] = (prog?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));
  return publicClue(clue, revealed, wrong, prog?.hints_used ?? 0, prog?.is_solved ?? false);
}

export const getNextClue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1) Resume in-progress (not solved) puzzle if any
    const { data: inProgress } = await supabase
      .from("game_progress")
      .select("clue_id, updated_at")
      .eq("user_id", userId)
      .eq("is_solved", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inProgress?.clue_id) {
      const { data: clue } = await supabaseAdmin.from("clues").select("*").eq("id", inProgress.clue_id).eq("is_active", true).maybeSingle();
      if (clue) return await loadProgress(supabase, userId, clue);
    }

    // 2) Pick a fresh clue scaled to level, excluding already-solved
    const { data: profile } = await supabase.from("profiles").select("level").eq("id", userId).single();
    const maxDiff = Math.min(5, Math.ceil(((profile?.level ?? 1) + 1) / 2));

    const { data: solvedRows } = await supabase
      .from("game_progress").select("clue_id").eq("user_id", userId).eq("is_solved", true);
    const solvedIds = (solvedRows ?? []).map((r: any) => r.clue_id);

    let query = supabaseAdmin.from("clues").select("*")
      .eq("is_active", true).lte("difficulty", maxDiff).limit(100);
    if (solvedIds.length) query = query.not("id", "in", `(${solvedIds.join(",")})`);

    let { data: clues } = await query;
    if (!clues || clues.length === 0) {
      const { data: any } = await supabaseAdmin.from("clues").select("*").eq("is_active", true).limit(100);
      clues = (any ?? []).filter((c: any) => !solvedIds.includes(c.id));
    }
    if (!clues || clues.length === 0) return { exhausted: true as const };

    const pick = clues[Math.floor(Math.random() * clues.length)];

    // Auto-reveal one letter if answer has more than 3 (non-space) letters.
    // Picked randomly from letters that appear EXACTLY ONCE. Free of charge.
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

    // Create a progress row so it persists across navigation/refresh
    await supabase.from("game_progress").insert({
      user_id: userId,
      clue_id: pick.id,
      revealed_letters: initialRevealed,
      wrong_guesses: [],
      hints_used: 0,
      is_solved: false,
    });

    return await loadProgress(supabase, userId, pick);
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

    const { data: existing } = await supabase.from("game_progress").select("*")
      .eq("user_id", userId).eq("clue_id", data.clueId).maybeSingle();

    if (existing?.is_solved) {
      return publicClue(clue, existing.revealed_letters, existing.wrong_guesses, existing.hints_used, true);
    }

    const revealed: string[] = existing?.revealed_letters ?? [];
    const wrong: string[] = (existing?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));

    const isCorrect = answer.replace(/\s/g, "").includes(letter);
    if (isCorrect && !revealed.includes(letter)) revealed.push(letter);
    if (!isCorrect && !wrong.includes(letter)) wrong.push(letter);

    const solved = answer.split("").every((c) => c === " " || revealed.includes(c));
    const hintsUsed = existing?.hints_used ?? 0;
    const payload: any = {
      user_id: userId, clue_id: data.clueId,
      revealed_letters: revealed, wrong_guesses: wrong, hints_used: hintsUsed,
    };

    if (solved) {
      const earned = Math.max(20, clue.base_points - wrong.length * WRONG_PENALTY - hintsUsed * HINT_COST);
      payload.is_solved = true;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      await applyScore(supabase, userId, earned, true);
      await bumpSolvedCount(supabase, clue.id);
    } else if (!isCorrect) {
      // small immediate streak break for repeated mistakes? keep streak intact for now
    }

    if (existing) await supabase.from("game_progress").update(payload).eq("id", existing.id);
    else await supabase.from("game_progress").insert(payload);

    return publicClue(clue, revealed, wrong, hintsUsed, solved);
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
    const { data: existing } = await supabase.from("game_progress").select("*")
      .eq("user_id", userId).eq("clue_id", data.clueId).maybeSingle();
    if (existing?.is_solved) return publicClue(clue, existing.revealed_letters, existing.wrong_guesses, existing.hints_used, true);

    const revealed: string[] = existing?.revealed_letters ?? [];
    const candidates = Array.from(new Set(answer.split("").filter((c) => c !== " " && !revealed.includes(c))));
    if (candidates.length === 0) return publicClue(clue, revealed, existing?.wrong_guesses ?? [], existing?.hints_used ?? 0, false);

    const letter = candidates[Math.floor(Math.random() * candidates.length)];
    revealed.push(letter);
    const hintsUsed = (existing?.hints_used ?? 0) + 1;
    const wrong = (existing?.wrong_guesses ?? []).filter((w: string) => !w.startsWith("__"));

    await supabase.from("hint_usage").insert({
      user_id: userId, clue_id: data.clueId, letter, position: answer.indexOf(letter), cost: HINT_COST,
    });

    const solved = answer.split("").every((c) => c === " " || revealed.includes(c));
    const payload: any = {
      user_id: userId, clue_id: data.clueId,
      revealed_letters: revealed, wrong_guesses: wrong, hints_used: hintsUsed,
    };
    if (solved) {
      const earned = Math.max(10, clue.base_points - wrong.length * WRONG_PENALTY - hintsUsed * HINT_COST);
      payload.is_solved = true;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      await applyScore(supabase, userId, earned, true);
      await bumpSolvedCount(supabase, clue.id);
    }
    if (existing) await supabase.from("game_progress").update(payload).eq("id", existing.id);
    else await supabase.from("game_progress").insert(payload);

    return publicClue(clue, revealed, wrong, hintsUsed, solved);
  });

const skipSchema = z.object({ clueId: z.string().uuid() });

export const skipClue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => skipSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Remove in-progress row so this clue can re-appear later; apply small penalty + reset streak
    await supabase.from("game_progress").delete()
      .eq("user_id", userId).eq("clue_id", data.clueId).eq("is_solved", false);
    const { data: p } = await supabase.from("profiles").select("total_score, current_streak").eq("id", userId).single();
    if (p) {
      const newScore = Math.max(0, p.total_score - SKIP_PENALTY);
      await supabase.from("profiles").update({
        total_score: newScore, current_streak: 0, level: levelFromScore(newScore),
      }).eq("id", userId);
    }
    // Analytics: increment skip counter on the clue
    const { data: c } = await supabaseAdmin.from("clues").select("skip_count").eq("id", data.clueId).maybeSingle();
    if (c) await supabaseAdmin.from("clues").update({ skip_count: (c.skip_count ?? 0) + 1 }).eq("id", data.clueId);
    return { ok: true };
  });

async function applyScore(supabase: any, userId: string, points: number, success: boolean) {
  const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!p) return;
  const newStreak = success ? p.current_streak + 1 : 0;
  const bonus = success ? newStreak * STREAK_BONUS : 0;
  const newScore = p.total_score + points + bonus;
  await supabase.from("profiles").update({
    total_score: newScore,
    current_streak: newStreak,
    best_streak: Math.max(p.best_streak, newStreak),
    solved_count: p.solved_count + (success ? 1 : 0),
    level: levelFromScore(newScore),
  }).eq("id", userId);
}

async function bumpSolvedCount(supabase: any, clueId: string) {
  const { data: c } = await supabaseAdmin.from("clues").select("solved_count").eq("id", clueId).maybeSingle();
  if (c) await supabaseAdmin.from("clues").update({ solved_count: (c.solved_count ?? 0) + 1 }).eq("id", clueId);
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // NOTE: exclude `email` (column SELECT revoked from authenticated for privacy).
    const { data } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, display_name_confirmed, avatar_url, total_score, solved_count, current_streak, best_streak, level, is_private, auto_next, notification_prefs, accessibility_prefs, auth_provider, created_at, updated_at")
      .eq("id", context.userId).single();
    return data;
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles")
      .select("id, username, display_name, avatar_url, total_score, level, solved_count, best_streak")
      .eq("is_private", false)
      .order("total_score", { ascending: false }).limit(50);
    return data ?? [];
  });

const periodSchema = z.object({
  period: z.enum(["today", "week", "month", "all"]),
});

export const getLeaderboardByPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    if (data.period === "all") {
      const { data: rows } = await supabase.from("profiles")
        .select("id, username, display_name, avatar_url, total_score, level, solved_count, best_streak")
        .eq("is_private", false)
        .order("total_score", { ascending: false }).limit(20);
      return (rows ?? []).map((r: any) => ({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        level: r.level,
        solved_count: r.solved_count,
        best_streak: r.best_streak,
        score: r.total_score,
      }));
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

    const { data: progress } = await supabase
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

    const topIds = [...totals.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 20);

    if (topIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level, best_streak, is_private")
      .in("id", topIds.map(([id]) => id));

    const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    return topIds
      .filter(([id]) => !byId.get(id)?.is_private)
      .map(([id, t]) => {
        const p = byId.get(id) ?? {};
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
  });
