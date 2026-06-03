import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: solves }, { count: hintsCount }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("game_progress")
        .select("wrong_guesses, hints_used")
        .eq("user_id", userId)
        .eq("is_solved", true),
      supabase
        .from("hint_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const solvedRows = (solves ?? []) as Array<{ wrong_guesses: string[] | null; hints_used: number | null }>;
    const totalSolved = profile?.solved_count ?? solvedRows.length;
    const perfectSolves = solvedRows.filter(
      (r) => (r.wrong_guesses?.length ?? 0) === 0 && (r.hints_used ?? 0) === 0,
    ).length;
    const totalWrong = solvedRows.reduce((s, r) => s + (r.wrong_guesses?.length ?? 0), 0);
    const totalAttempts = totalSolved + totalWrong;
    const successRate = totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0;

    return {
      profile,
      perfectSolves,
      successRate,
      totalHints: hintsCount ?? 0,
    };
  });

// "שכח אותי" — reset all progress and stats but keep the account & display name.
export const resetAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await Promise.all([
      supabaseAdmin.from("game_progress").delete().eq("user_id", userId),
      supabaseAdmin.from("hint_usage").delete().eq("user_id", userId),
      supabaseAdmin.from("clue_ratings").delete().eq("user_id", userId),
      supabaseAdmin.from("challenges").delete().eq("challenger_id", userId),
    ]);
    await supabaseAdmin
      .from("profiles")
      .update({
        total_score: 0,
        solved_count: 0,
        current_streak: 0,
        best_streak: 0,
        level: 1,
      })
      .eq("id", userId);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await Promise.all([
      supabaseAdmin.from("game_progress").delete().eq("user_id", userId),
      supabaseAdmin.from("hint_usage").delete().eq("user_id", userId),
      supabaseAdmin.from("clue_ratings").delete().eq("user_id", userId),
      supabaseAdmin.from("challenges").delete().eq("challenger_id", userId),
      supabaseAdmin.from("feedback").delete().eq("user_id", userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
    ]);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Confirm a display name on first login. Permanent — set once.
const confirmSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "שם תצוגה לא יכול להיות ריק")
    .max(40, "שם תצוגה ארוך מדי"),
});

export const confirmDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => confirmSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("profiles")
      .select("display_name_confirmed")
      .eq("id", userId)
      .single();
    if (existing?.display_name_confirmed) {
      throw new Error("שם התצוגה כבר אושר ולא ניתן לשנותו");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: data.displayName, display_name_confirmed: true })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Return suggested display name from auth metadata when not yet confirmed.
export const getDisplayNameStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, display_name_confirmed, username")
      .eq("id", userId)
      .single();
    // Try to extract a suggested name from JWT user_metadata
    const meta = (claims?.user_metadata ?? {}) as Record<string, any>;
    const suggested: string | null =
      meta.full_name || meta.name || meta.display_name || profile?.display_name || null;
    return {
      confirmed: !!profile?.display_name_confirmed,
      current: profile?.display_name ?? profile?.username ?? "",
      suggested,
    };
  });
