import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeLetter, normalizeWord, levelFromScore } from "./hebrew";

const HINT_COST = 15;
const WRONG_PENALTY = 5;
const STREAK_BONUS = 10;

export const getNextClue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const maxDiff = Math.min(5, Math.ceil((profile?.level ?? 1) / 2));

    const { data: solvedRows } = await supabase
      .from("game_progress").select("clue_id").eq("user_id", userId).eq("is_solved", true);
    const solvedIds = (solvedRows ?? []).map((r) => r.clue_id);

    let query = supabase.from("clues").select("id, clue, answer, category, difficulty, base_points")
      .eq("is_active", true).lte("difficulty", maxDiff).limit(50);
    if (solvedIds.length) query = query.not("id", "in", `(${solvedIds.join(",")})`);

    const { data: clues } = await query;
    if (!clues || clues.length === 0) {
      // fallback: any clue
      const { data: any } = await supabase.from("clues").select("id, clue, answer, category, difficulty, base_points").eq("is_active", true).limit(50);
      if (!any || any.length === 0) throw new Error("אין חידות זמינות");
      const pick = any[Math.floor(Math.random() * any.length)];
      return await loadProgress(supabase, userId, pick);
    }
    const pick = clues[Math.floor(Math.random() * clues.length)];
    return await loadProgress(supabase, userId, pick);
  });

async function loadProgress(supabase: any, userId: string, clue: any) {
  const { data: prog } = await supabase.from("game_progress").select("*")
    .eq("user_id", userId).eq("clue_id", clue.id).maybeSingle();
  return {
    clue: {
      id: clue.id, clue: clue.clue, category: clue.category,
      difficulty: clue.difficulty, basePoints: clue.base_points,
      length: clue.answer.length,
    },
    progress: prog ?? { revealed_letters: [], wrong_guesses: [], hints_used: 0, is_solved: false, score_earned: 0 },
  };
}

const guessSchema = z.object({
  clueId: z.string().uuid(),
  letter: z.string().min(1).max(1),
});

export const guessLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => guessSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabase.from("clues").select("*").eq("id", data.clueId).single();
    if (!clue) throw new Error("חידה לא נמצאה");
    const letter = normalizeLetter(data.letter);
    const answer = normalizeWord(clue.answer);
    const isCorrect = answer.includes(letter);

    const { data: existing } = await supabase.from("game_progress").select("*")
      .eq("user_id", userId).eq("clue_id", data.clueId).maybeSingle();
    const revealed: string[] = existing?.revealed_letters ?? [];
    const wrong: string[] = existing?.wrong_guesses ?? [];

    if (isCorrect && !revealed.includes(letter)) revealed.push(letter);
    if (!isCorrect && !wrong.includes(letter)) wrong.push(letter);

    const solved = answer.split("").every((c) => revealed.includes(c));
    const payload: any = { user_id: userId, clue_id: data.clueId, revealed_letters: revealed, wrong_guesses: wrong };

    if (solved) {
      const earned = Math.max(20, clue.base_points - wrong.length * WRONG_PENALTY - (existing?.hints_used ?? 0) * HINT_COST);
      payload.is_solved = true;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      await applyScore(supabase, userId, earned, true);
    }

    if (existing) {
      await supabase.from("game_progress").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("game_progress").insert(payload);
    }

    return { isCorrect, solved, revealed, wrong };
  });

const fullSchema = z.object({ clueId: z.string().uuid(), guess: z.string().min(1).max(50) });

export const guessFullAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fullSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabase.from("clues").select("*").eq("id", data.clueId).single();
    if (!clue) throw new Error("חידה לא נמצאה");
    const correct = normalizeWord(clue.answer.replace(/\s/g, "")) === normalizeWord(data.guess.replace(/\s/g, ""));
    const { data: existing } = await supabase.from("game_progress").select("*")
      .eq("user_id", userId).eq("clue_id", data.clueId).maybeSingle();
    if (correct) {
      const revealed = Array.from(new Set(normalizeWord(clue.answer).split("")));
      const wrong = existing?.wrong_guesses ?? [];
      const earned = Math.max(30, clue.base_points - wrong.length * WRONG_PENALTY - (existing?.hints_used ?? 0) * HINT_COST);
      const payload = {
        user_id: userId, clue_id: data.clueId, revealed_letters: revealed,
        wrong_guesses: wrong, is_solved: true, score_earned: earned, solved_at: new Date().toISOString(),
      };
      if (existing) await supabase.from("game_progress").update(payload).eq("id", existing.id);
      else await supabase.from("game_progress").insert(payload);
      await applyScore(supabase, userId, earned, true);
      return { correct: true, earned };
    } else {
      const wrong = [...(existing?.wrong_guesses ?? []), `__full:${data.guess}`];
      if (existing) await supabase.from("game_progress").update({ wrong_guesses: wrong }).eq("id", existing.id);
      else await supabase.from("game_progress").insert({ user_id: userId, clue_id: data.clueId, wrong_guesses: wrong });
      await resetStreak(supabase, userId);
      return { correct: false, earned: 0 };
    }
  });

const hintSchema = z.object({ clueId: z.string().uuid() });

export const useHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => hintSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clue } = await supabase.from("clues").select("*").eq("id", data.clueId).single();
    if (!clue) throw new Error("חידה לא נמצאה");
    const answer = normalizeWord(clue.answer);
    const { data: existing } = await supabase.from("game_progress").select("*")
      .eq("user_id", userId).eq("clue_id", data.clueId).maybeSingle();
    const revealed: string[] = existing?.revealed_letters ?? [];
    const candidates = answer.split("").filter((c) => c !== " " && !revealed.includes(c));
    if (candidates.length === 0) return { letter: null, revealed };
    const letter = candidates[Math.floor(Math.random() * candidates.length)];
    revealed.push(letter);
    const hintsUsed = (existing?.hints_used ?? 0) + 1;

    await supabase.from("hint_usage").insert({ user_id: userId, clue_id: data.clueId, letter, position: answer.indexOf(letter), cost: HINT_COST });

    const solved = answer.split("").every((c) => revealed.includes(c) || c === " ");
    const payload: any = { user_id: userId, clue_id: data.clueId, revealed_letters: revealed, wrong_guesses: existing?.wrong_guesses ?? [], hints_used: hintsUsed };
    if (solved) {
      const earned = Math.max(10, clue.base_points - (existing?.wrong_guesses?.length ?? 0) * WRONG_PENALTY - hintsUsed * HINT_COST);
      payload.is_solved = true;
      payload.score_earned = earned;
      payload.solved_at = new Date().toISOString();
      await applyScore(supabase, userId, earned, true);
    }
    if (existing) await supabase.from("game_progress").update(payload).eq("id", existing.id);
    else await supabase.from("game_progress").insert(payload);
    return { letter, revealed, solved };
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

async function resetStreak(supabase: any, userId: string) {
  const { data: p } = await supabase.from("profiles").select("current_streak").eq("id", userId).single();
  if (p && p.current_streak > 0) {
    await supabase.from("profiles").update({ current_streak: 0 }).eq("id", userId);
  }
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("*").eq("id", context.userId).single();
    return data;
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles")
      .select("id, username, display_name, total_score, level, solved_count, best_streak")
      .order("total_score", { ascending: false }).limit(50);
    return data ?? [];
  });
