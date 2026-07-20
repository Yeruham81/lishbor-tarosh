import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Sensitive personal columns are column-revoked from `authenticated`;
    // read via admin scoped to owner.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, display_name, display_name_confirmed, avatar_url, total_score, solved_count, current_streak, best_streak, level, is_private, auto_next, notification_prefs, accessibility_prefs, auth_provider, perfect_solves, definitions_played, definitions_skipped, hints_used_total, wrong_letters_total, current_play_days_streak, best_play_days_streak, last_play_date, player_level, is_paid, paid_at, payment_amount, created_at, updated_at",
      )
      .eq("id", userId)
      .single();

    const p: any = profile ?? {};
    const totalSolved = p.solved_count ?? 0;
    const totalSkipped = p.definitions_skipped ?? 0;
    const totalPlayed = p.definitions_played ?? 0;
    const successRate = totalPlayed > 0 ? Math.round((totalSolved / totalPlayed) * 100) : 0;

    return {
      profile,
      // Per-stat exposes (kept names for backward compat too)
      perfectSolves: p.perfect_solves ?? 0,
      totalHints: p.hints_used_total ?? 0,
      totalWrongLetters: p.wrong_letters_total ?? 0,
      definitionsPlayed: totalPlayed,
      definitionsSolved: totalSolved,
      definitionsSkipped: totalSkipped,
      currentPerfectStreak: p.current_streak ?? 0,
      bestPerfectStreak: p.best_streak ?? 0,
      currentPlayDaysStreak: p.current_play_days_streak ?? 0,
      bestPlayDaysStreak: p.best_play_days_streak ?? 0,
      currentStage: p.level ?? 1,
      successRate,
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
        highest_streak: 0,
        level: 1,
        perfect_solves: 0,
        definitions_played: 0,
        definitions_skipped: 0,
        hints_used_total: 0,
        wrong_letters_total: 0,
        current_play_days_streak: 0,
        best_play_days_streak: 0,
        last_play_date: null,
        active_day_date: null,
        active_day_solves: 0,
      } as any)
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
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(2, "הכינוי קצר מדי (לפחות 2 תווים)")
        .max(20, "הכינוי ארוך מדי (עד 20 תווים)")
        .regex(
          /^[A-Za-z\u0590-\u05FF0-9 .,_-]{2,20}$/,
          "ניתן להשתמש באותיות עברית/אנגלית, מספרים, רווחים ו- . , _ - בלבד",
        ),
    ),
  playerLevel: z.number().int().min(1).max(5),
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
      throw new Error("הכינוי כבר אושר ולא ניתן לשנותו");
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        display_name_confirmed: true,
        player_level: data.playerLevel,
      } as any)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Player level is editable in profile; nickname is immutable.
export const updatePlayerLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playerLevel: z.number().int().min(1).max(5) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ player_level: data.playerLevel } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Check if the current user is an admin (for client-side gating like maintenance mode bypass).
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
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
    const suggested: string | null = meta.full_name || meta.name || meta.display_name || profile?.display_name || null;
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
      // merge with existing (accessibility_prefs is column-revoked from authenticated)
      const { data: cur } = await supabaseAdmin
        .from("profiles")
        .select("accessibility_prefs")
        .eq("id", userId)
        .single();
      const curPrefs = (cur?.accessibility_prefs ?? {}) as Record<string, any>;
      patch.accessibility_prefs = { ...curPrefs, ...data.accessibility_prefs };
    }
    const { error } = await supabase
      .from("profiles")
      .update(patch as any)
      .eq("id", userId);
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
        await supabaseAdmin.storage.from("avatars").remove(list.map((f) => `${context.userId}/${f.name}`));
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
