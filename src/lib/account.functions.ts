import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const AVATAR_FOLDER_PAGE_SIZE = 100;
const AVATAR_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const AVATAR_ALLOWED_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

async function removeAvatarFiles(userId: string, keepPath: string | null = null) {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage.from("avatars").list(userId, {
      limit: AVATAR_FOLDER_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw new Error(error.message);

    const page = data ?? [];
    paths.push(...page.map((file) => `${userId}/${file.name}`).filter((path) => path !== keepPath));

    if (page.length < AVATAR_FOLDER_PAGE_SIZE) break;
    offset += page.length;
  }

  if (!paths.length) return;

  const { error } = await supabaseAdmin.storage.from("avatars").remove(paths);
  if (error) throw new Error(error.message);
}

function isAvatarPathInOwnedFolder(userId: string, path: string) {
  const prefix = `${userId}/`;
  return path.startsWith(prefix) && !path.slice(prefix.length).includes("/");
}

function isOwnedAvatarPath(userId: string, path: string) {
  const prefix = `${userId}/avatar-`;
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return path.startsWith(prefix) && !path.slice(prefix.length).includes("/") && AVATAR_EXTENSIONS.has(extension);
}

async function validateUploadedAvatar(userId: string, path: string) {
  const fileName = path.slice(`${userId}/`.length);
  const { data, error } = await supabaseAdmin.storage.from("avatars").list(userId, {
    limit: 20,
    search: fileName,
  });

  if (error) throw new Error(error.message);

  const uploaded = (data ?? []).find((file) => file.name === fileName);
  if (!uploaded) throw new Error("avatar_file_missing");

  const metadata = uploaded.metadata as { mimetype?: unknown; size?: unknown } | null | undefined;
  const mime = typeof metadata?.mimetype === "string" ? metadata.mimetype.toLowerCase() : null;
  const size = typeof metadata?.size === "number" ? metadata.size : Number(metadata?.size);

  if (mime && !AVATAR_ALLOWED_MIMES.has(mime)) throw new Error("avatar_file_type_invalid");
  if (Number.isFinite(size) && size > AVATAR_MAX_BYTES) throw new Error("avatar_file_too_large");
}

async function discardUploadedAvatar(path: string | null) {
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from("avatars").remove([path]);
  if (error) {
    console.error("[profile] failed to discard unreferenced avatar", {
      path,
      message: error.message,
    });
  }
}

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Sensitive personal columns are column-revoked from authenticated;
    // read via admin scoped to owner.
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, display_name, display_name_confirmed, avatar_url, total_score, solved_count, current_streak, best_streak, level, is_private, auto_next, notification_prefs, accessibility_prefs, auth_provider, perfect_solves, definitions_played, definitions_skipped, hints_used_total, wrong_letters_total, current_play_days_streak, best_play_days_streak, last_play_date, age, player_level, is_paid, paid_at, payment_amount, created_at, updated_at",
      )
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);

    const p = profile;
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

    const { error } = await supabaseAdmin.rpc("reset_player_progress", {
      _user_id: userId,
    });

    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { error } = await supabaseAdmin.rpc("delete_player_account", {
      _user_id: userId,
    });

    if (error) throw new Error(error.message);

    // The account is already gone at this point. Storage cleanup is best-effort
    // so a temporary Storage failure can never leave a half-deleted account.
    try {
      await removeAvatarFiles(userId);
      return { ok: true, cleanupComplete: true };
    } catch (cleanupError) {
      console.error("[profile] deleted account but failed to clean avatar files", {
        userId,
        message: cleanupError instanceof Error ? cleanupError.message : "unknown_error",
      });
      return { ok: true, cleanupComplete: false };
    }
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
  age: z.number().int().min(18, "גיל לא תקין").max(100, "גיל לא תקין"),
  playerLevel: z.number().int().min(1).max(5),
});

export const confirmDisplayName = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => confirmSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("display_name_confirmed")
      .eq("id", userId)
      .single();

    if (existing?.display_name_confirmed) {
      throw new Error("הכינוי כבר אושר ולא ניתן לשנותו");
    }

    const { data: confirmed, error } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: data.displayName,
        display_name_confirmed: true,
        age: data.age,
        player_level: data.playerLevel,
      })
      .eq("id", userId)
      .eq("display_name_confirmed", false)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!confirmed) throw new Error("הכינוי כבר אושר ולא ניתן לשנותו");

    return { ok: true };
  });

// Player level is editable in profile (age/nickname are immutable).
export const updatePlayerLevel = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        playerLevel: z.number().int().min(1).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        player_level: data.playerLevel,
      })
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
export const getDisplayNameStatus = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { claims } = context as typeof context & {
      claims?: { user_metadata?: Record<string, unknown> };
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, display_name_confirmed, username")
      .eq("id", userId)
      .single();

    // Try to extract a suggested name from JWT user_metadata
    const meta = claims?.user_metadata ?? {};
    const suggested =
      [meta.full_name, meta.name, meta.display_name, profile?.display_name].find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ) ?? null;

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

export const updatePreferences = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => prefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.rpc("update_profile_preferences_atomic", {
      _user_id: context.userId,
      _is_private: data.is_private ?? null,
      _auto_next: data.auto_next ?? null,
      _notification_patch: data.notification_prefs ?? null,
      _accessibility_patch: data.accessibility_prefs ?? null,
    });

    if (error) {
      if (error.message.includes("premium_required")) throw new Error("premium_required");
      throw new Error(error.message);
    }

    return { ok: true };
  });

// ---- Avatar: save path & get signed URL ----
export const setAvatarPath = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        path: z.string().max(300).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.path && !isOwnedAvatarPath(context.userId, data.path)) {
      if (isAvatarPathInOwnedFolder(context.userId, data.path)) {
        await discardUploadedAvatar(data.path);
      }
      throw new Error("avatar_path_invalid");
    }

    if (data.path) {
      try {
        await validateUploadedAvatar(context.userId, data.path);
      } catch (validationError) {
        await discardUploadedAvatar(data.path);
        throw validationError;
      }
    }

    const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .single();

    if (currentProfileError) {
      await discardUploadedAvatar(data.path);
      throw new Error(currentProfileError.message);
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        avatar_url: data.path,
      })
      .eq("id", context.userId);

    if (error) {
      await discardUploadedAvatar(data.path);
      throw new Error(error.message);
    }

    try {
      await removeAvatarFiles(context.userId, data.path);
    } catch (cleanupError) {
      console.error("[profile] avatar cleanup failed", {
        userId: context.userId,
        previousPath: currentProfile.avatar_url,
        nextPath: data.path,
        message: cleanupError instanceof Error ? cleanupError.message : "unknown_error",
      });
      return { ok: true, cleanupComplete: false };
    }

    return { ok: true, cleanupComplete: true };
  });

export const getAvatarUrl = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .single();

    if (profileError) throw new Error(profileError.message);

    if (!profile?.avatar_url || !isOwnedAvatarPath(context.userId, profile.avatar_url)) {
      return {
        url: null as string | null,
      };
    }

    const { data: signed, error: signedUrlError } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 60 * 60 * 24);

    if (signedUrlError) throw new Error(signedUrlError.message);

    return {
      url: signed?.signedUrl ?? null,
    };
  });
