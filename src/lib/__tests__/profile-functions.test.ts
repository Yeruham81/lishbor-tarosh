import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("profile functions", () => {
  it("resets player progress transactionally without deleting the account or avatar", () => {
    const migration = read("supabase/migrations/20260827030000_profile_account_actions.sql");
    const account = read("src/lib/account.functions.ts");
    const resetFunction = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.reset_player_progress"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.delete_player_account"),
    );

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.reset_player_progress");
    expect(migration).toContain("DELETE FROM public.game_progress");
    expect(migration).toContain("DELETE FROM public.hint_usage");
    expect(migration).toContain("DELETE FROM public.clue_ratings");
    expect(migration).toContain("DELETE FROM public.challenges");
    expect(migration).toContain("total_score = 0");
    expect(resetFunction).not.toContain("DELETE FROM auth.users");
    expect(account).toContain('supabaseAdmin.rpc("reset_player_progress"');
  });

  it("deletes the account and all user-owned records in one database function", () => {
    const migration = read("supabase/migrations/20260827030000_profile_account_actions.sql");
    const account = read("src/lib/account.functions.ts");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.delete_player_account");
    expect(migration).toContain("DELETE FROM public.feedback");
    expect(migration).toContain("DELETE FROM public.puzzle_submissions");
    expect(migration).toContain("DELETE FROM auth.users");
    expect(migration).toContain("TO service_role");
    expect(account).toContain("await removeAvatarFiles(userId)");
    expect(account).toContain('supabaseAdmin.rpc("delete_player_account"');
  });

  it("cleans replaced avatar files and validates that the path belongs to the player", () => {
    const account = read("src/lib/account.functions.ts");
    const profile = read("src/routes/_authenticated/profile.tsx");

    expect(account).toContain("isOwnedAvatarPath(context.userId, data.path)");
    expect(account).toContain("removeAvatarFiles(context.userId, data.path)");
    expect(account).toContain("cleanupComplete: false");
    expect(profile).toContain("result.cleanupComplete");
    expect(profile).toContain('e.target.value = ""');
  });

  it("connects only level-up, challenge and announcement mute preferences", () => {
    const profile = read("src/routes/_authenticated/profile.tsx");
    const notifications = read("src/components/SolveNotifications.tsx");
    const shell = read("src/components/AppShell.tsx");

    expect(profile).toContain("ביטול התראות על מעבר שלבים");
    expect(profile).toContain("ביטול התראות על השלמת אתגרים");
    expect(profile).toContain("ביטול הכרזות על תכונות חדשות");
    expect(profile).not.toContain("ביטול התראות על אתגר יומי חדש");
    expect(profile).not.toContain("ביטול התראות על אירועים מיוחדים");
    expect(notifications).toContain("if (options.muteLevelUp) continue");
    expect(notifications).toContain("if (options.muteChallenges) continue");
    expect(shell).toContain("announcementsAllowed");
    expect(shell).toContain("notificationPrefs.mute_announcements");
  });

  it("merges preference patches atomically so quick toggles cannot overwrite siblings", () => {
    const account = read("src/lib/account.functions.ts");
    const migration = read("supabase/migrations/20260827104000_profile_preferences_avatar_hardening.sql");

    expect(account).toContain('supabaseAdmin.rpc("update_profile_preferences_atomic"');
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("COALESCE(notification_prefs, '{}'::jsonb) || _notification_patch");
    expect(migration).toContain("COALESCE(accessibility_prefs, '{}'::jsonb) || _accessibility_patch");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("FROM anon, authenticated");
  });

  it("confirms display reset only after persistence succeeds", () => {
    const profile = read("src/routes/_authenticated/profile.tsx");

    expect(profile).toContain("const saved = await setA11y(reset)");
    expect(profile).toContain('if (saved) toast.success("הגדרות התצוגה אופסו")');
    expect(profile).toContain("if (!saved) applyAccessibilityPreferences(a11y)");
  });

  it("uses dedicated ARIA regions instead of making the whole document live", () => {
    const preferences = read("src/lib/profile-preferences.ts");
    const notifications = read("src/components/SolveNotifications.tsx");
    const profile = read("src/routes/_authenticated/profile.tsx");

    expect(preferences).toContain('html.removeAttribute("aria-live")');
    expect(preferences).not.toContain('html.setAttribute("aria-live"');
    expect(notifications).toContain('role="status"');
    expect(notifications).toContain("aria-labelledby={`progression-title-${event.id}`}");
    expect(notifications).toContain("previousFocusRef.current?.focus()");
    expect(profile).toContain("aria-labelledby={labelId}");
    expect(profile).toContain("aria-describedby={hint ? hintId : undefined}");
  });
});

describe("profile hardening follow-up", () => {
  it("blocks direct authenticated profile updates while keeping server-controlled writes", () => {
    const migration = read("supabase/migrations/20260827093000_profile_write_hardening.sql");
    const account = read("src/lib/account.functions.ts");

    expect(migration).toContain("REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("DROP POLICY IF EXISTS profiles_update_own");
    expect(account).toContain('supabaseAdmin.rpc("update_profile_preferences_atomic"');
    expect(account).toContain('.eq("display_name_confirmed", false)');
    expect(account).not.toContain('context.supabase\n      .from("profiles")\n      .update(');
  });

  it("keeps screen-reader preference out of display reset", () => {
    const profile = read("src/routes/_authenticated/profile.tsx");
    const resetBlock = profile.slice(
      profile.indexOf("const resetDisplaySettings"),
      profile.indexOf("// muted=true means", profile.indexOf("const resetDisplaySettings")),
    );

    expect(resetBlock).toContain('text_size: "normal"');
    expect(resetBlock).toContain('palette: "sunset"');
    expect(resetBlock).not.toContain("screen_reader");
  });

  it("applies profile display preferences and page announcements globally", () => {
    const root = read("src/routes/__root.tsx");
    const authenticated = read("src/routes/_authenticated.tsx");
    const preferences = read("src/lib/profile-preferences.ts");

    expect(root).toContain("<GlobalProfilePreferences />");
    expect(root).toContain("screenReaderRouteName(pathname)");
    expect(root).toContain('aria-live="polite"');
    expect(authenticated).not.toContain("usePrefsApplier");
    expect(preferences).toContain('"/contact": "יצירת קשר"');
    expect(preferences).toContain('pathname.startsWith("/challenge/")');
  });

  it("shows safe signed avatars in leaderboard rows", () => {
    const game = read("src/lib/game.functions.ts");
    const leaderboard = read("src/routes/leaderboard.tsx");

    expect(game).toContain("isSafeLeaderboardAvatarPath");
    expect(game).toContain('storage.from("avatars").createSignedUrl');
    expect(game).toContain("withSignedLeaderboardAvatars");
    expect(leaderboard).toContain("row.avatar_url");
    expect(leaderboard).toContain("<UserCircle2");
  });

  it("removes private players completely from every leaderboard period without changing shared challenges", () => {
    const game = read("src/lib/game.functions.ts");
    const profile = read("src/routes/_authenticated/profile.tsx");
    const social = read("src/lib/social.functions.ts");

    expect(game).toContain('.eq("is_private", false)');
    expect(game).toContain("profile.is_private === false");
    expect(game).toContain("return !!profile");
    expect(profile).toContain('hint="הסתרת הפרופיל משחקנים אחרים"');
    expect(social).toContain('select("username, display_name")');
    expect(social).not.toContain('select("username, display_name, is_private")');
  });

  it("scopes profile caches by user and restores guest display preferences on sign-out", () => {
    const applier = read("src/hooks/use-prefs-applier.tsx");
    const shell = read("src/components/AppShell.tsx");
    const play = read("src/routes/_authenticated/play.tsx");
    const levels = read("src/routes/_authenticated/levels.tsx");

    expect(applier).toContain('queryKey: ["profile", userId ?? "anon"]');
    expect(applier).toContain("getStoredThemePreferences");
    expect(applier).toContain("screen_reader: false");
    expect(shell).toContain('queryKey: ["profile", user?.id ?? "anon"]');
    expect(shell).toContain('queryKey: ["my-role", user?.id ?? "anon"]');
    expect(play).toContain('queryKey: ["profile", user?.id ?? "anon"]');
    expect(levels).toContain('queryKey: ["stats", user?.id ?? "anon"]');
  });

  it("enforces avatar ownership, size and MIME in Storage as well as on the server", () => {
    const migration = read("supabase/migrations/20260827104000_profile_preferences_avatar_hardening.sql");
    const account = read("src/lib/account.functions.ts");
    const profile = read("src/routes/_authenticated/profile.tsx");

    expect(migration).toContain("file_size_limit");
    expect(migration).toContain("2097152");
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("CREATE POLICY avatars_insert_own");
    expect(migration).toContain("storage.foldername(name)");
    expect(migration).toContain("storage.filename(name)");
    expect(account).toContain("validateUploadedAvatar");
    expect(account).toContain("AVATAR_ALLOWED_MIMES");
    expect(profile).toContain("AVATAR_EXTENSION_BY_MIME");
    expect(profile).toContain("upsert: false");
  });

  it("exposes selected display controls to assistive technology and keeps dialog keyboard handling single-fire", () => {
    const profile = read("src/routes/_authenticated/profile.tsx");
    const notifications = read("src/components/SolveNotifications.tsx");

    expect(profile).toContain('aria-pressed={(a11y.mode ?? "light") === "light"}');
    expect(profile).toContain('aria-pressed={(a11y.palette ?? "sunset") === pl.id}');
    expect(profile).toContain('aria-pressed={(a11y.text_size ?? "normal") === v}');
    expect(profile).toContain("htmlFor={playerLevelId}");
    expect(profile).toContain("htmlFor={newPasswordId}");
    expect(profile).toContain("htmlFor={confirmPasswordId}");
    expect(notifications).toContain('if (e.key === "Escape")');
    expect(notifications).not.toContain('e.key === "Enter" || e.key === " " || e.key === "Escape"');
    expect(notifications).toContain("!controls.includes(active as HTMLElement)");
  });

  it("keeps high contrast readable and account helper text scalable", () => {
    const css = read("src/styles.css");
    const profile = read("src/routes/_authenticated/profile.tsx");

    expect(css).toContain("--gradient-sunset: linear-gradient(135deg, var(--primary), var(--primary))");
    expect(css).toContain("--shadow-glow: none");
    expect(profile).not.toContain("text-[12px] font-normal opacity-70");
    expect(profile).toContain("text-xs font-normal opacity-70");
  });

  it("deletes the database account before best-effort avatar cleanup", () => {
    const account = read("src/lib/account.functions.ts");
    const deleteBlock = account.slice(
      account.indexOf("export const deleteAccount"),
      account.indexOf("// Confirm a display name", account.indexOf("export const deleteAccount")),
    );

    expect(deleteBlock.indexOf('supabaseAdmin.rpc("delete_player_account"')).toBeGreaterThanOrEqual(0);
    expect(deleteBlock.indexOf("await removeAvatarFiles(userId)")).toBeGreaterThan(
      deleteBlock.indexOf('supabaseAdmin.rpc("delete_player_account"'),
    );
    expect(deleteBlock).toContain("cleanupComplete: false");
  });
});
