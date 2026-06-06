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

// ---- Preferences (private mode, auto-next, notifications, accessibility) ----
const prefsSchema = z.object({
  is_private: z.boolean().optional(),
  auto_next: z.boolean().optional(),
  notification_prefs: z.record(z.string(), z.boolean()).optional(),
  accessibility_prefs: z
    .object({
      colorblind: z.boolean().optional(),
      high_contrast: z.boolean().optional(),
      text_size: z.enum(["small", "normal", "large"]).optional(),
      screen_reader: z.boolean().optional(),
      palette: z.enum(["sunset", "ocean", "forest", "candy"]).optional(),
      mode: z.enum(["light", "dark"]).optional(),
    })
    .optional(),
});

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => prefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, any> = {};
    if (typeof data.is_private === "boolean") patch.is_private = data.is_private;
    if (typeof data.auto_next === "boolean") patch.auto_next = data.auto_next;
    if (data.notification_prefs) patch.notification_prefs = data.notification_prefs;
    if (data.accessibility_prefs) {
      // merge with existing
      const { data: cur } = await supabase
        .from("profiles")
        .select("accessibility_prefs")
        .eq("id", userId)
        .single();
      const curPrefs = (cur?.accessibility_prefs ?? {}) as Record<string, any>;
      patch.accessibility_prefs = { ...curPrefs, ...data.accessibility_prefs };
    }
    const { error } = await supabase.from("profiles").update(patch as any).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Avatar: save path & get signed URL ----
export const setAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.path })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    // Best-effort: remove old file when clearing
    if (!data.path) {
      const { data: list } = await supabaseAdmin.storage.from("avatars").list(context.userId);
      if (list?.length) {
        await supabaseAdmin.storage
          .from("avatars")
          .remove(list.map((f) => `${context.userId}/${f.name}`));
      }
    }
    return { ok: true };
  });

export const getAvatarUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .single();
    if (!profile?.avatar_url) return { url: null as string | null };
    const { data: signed } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 60 * 60 * 24);
    return { url: signed?.signedUrl ?? null };
  });
