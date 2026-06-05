import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ------- Rate clue (like / dislike) -------
const rateSchema = z.object({
  clueId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
});

export const rateClue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("clue_ratings")
      .upsert(
        { user_id: userId, clue_id: data.clueId, rating: data.rating },
        { onConflict: "user_id,clue_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, rating: data.rating };
  });

export const getMyRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clueId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("clue_ratings")
      .select("rating")
      .eq("user_id", context.userId)
      .eq("clue_id", data.clueId)
      .maybeSingle();
    return { rating: (row?.rating as 1 | -1 | undefined) ?? null };
  });

// ------- Feedback -------
const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "complaint", "idea", "other"]),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(3).max(4000),
  contact_email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => feedbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("feedback").insert({
      user_id: context.userId,
      type: data.type,
      subject: data.subject || null,
      message: data.message,
      contact_email: data.contact_email || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Challenge friends -------
function randomToken(len = 10) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

const createChallengeSchema = z.object({
  clueId: z.string().uuid(),
  score: z.number().int().min(0).max(10000),
  wrong: z.number().int().min(0).max(50),
  hints: z.number().int().min(0).max(50),
});

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createChallengeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const token = randomToken();
    const { error } = await context.supabase.from("challenges").insert({
      token,
      challenger_id: context.userId,
      clue_id: data.clueId,
      challenger_score: data.score,
      challenger_wrong: data.wrong,
      challenger_hints: data.hints,
    });
    if (error) throw new Error(error.message);
    return { token };
  });

export const getChallenge = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(4).max(32) }).parse(d))
  .handler(async ({ data }) => {
    // Public route — use admin client with explicit safe-column projection
    const { data: ch } = await supabaseAdmin
      .from("challenges")
      .select("token, clue_id, challenger_id, challenger_score, challenger_wrong, challenger_hints, created_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!ch) throw new Error("אתגר לא נמצא");
    const [{ data: clue }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("clues").select("id, clue, category, difficulty").eq("id", ch.clue_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("username, display_name").eq("id", ch.challenger_id).maybeSingle(),
    ]);
    return {
      token: ch.token,
      clue,
      challenger: profile,
      score: ch.challenger_score,
      wrong: ch.challenger_wrong,
      hints: ch.challenger_hints,
    };
  });

// ------- Puzzle submissions -------
const puzzleSubmissionSchema = z.object({
  clue_text: z.string().trim().min(3).max(500),
  suggested_answer: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitPuzzle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => puzzleSubmissionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("puzzle_submissions").insert({
      user_id: context.userId,
      clue_text: data.clue_text,
      suggested_answer: data.suggested_answer,
      notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
