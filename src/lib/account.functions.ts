import { createServerFn } from "@tanstack/react-start";
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

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Delete owned rows (no FK cascade defined)
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
