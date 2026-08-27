import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { PageAdLayout } from "@/components/ads/PageAdLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getStats,
  deleteAccount,
  resetAccount,
  updatePreferences,
  setAvatarPath,
  getAvatarUrl,
  updatePlayerLevel,
} from "@/lib/account.functions";
import { PLAYER_LEVELS } from "@/components/DisplayNameSetup";
import { PremiumUpgradeCard } from "@/components/PremiumUpgradeCard";

import { openCookiePreferences } from "@/lib/ads/consent";
import { Cookie } from "lucide-react";

import { PALETTES, type Palette } from "@/hooks/use-theme";
import {
  applyAccessibilityPreferences,
  type AccessibilityPrefs,
  type NotificationPrefs,
} from "@/lib/profile-preferences";
import { toast } from "sonner";
import {
  Award,
  Sun,
  Moon,
  Palette as PaletteIcon,
  Trash2,
  Eraser,
  UserCircle2,
  KeyRound,
  EyeOff,
  BellOff,
  Gamepad2,
  Accessibility,
  Camera,
  X,
  Type,
  LogOut,
  RotateCcw,
} from "lucide-react";

type PreferencePatch = {
  is_private?: boolean;
  auto_next?: boolean;
  notification_prefs?: Partial<NotificationPrefs>;
  accessibility_prefs?: Partial<AccessibilityPrefs>;
};

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

// Upload limits — single source of truth
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AVATAR_HINT_FORMATS = "PNG, JPG, WEBP, GIF";

function getProfileErrorMessage(error: unknown, fallback: string): string {
  const details =
    typeof error === "object" && error !== null
      ? (error as { message?: unknown; code?: unknown; status?: unknown })
      : {};
  const originalMessage = typeof details.message === "string" ? details.message : "";
  const message = originalMessage.toLowerCase();
  const code = String(details.code ?? "").toLowerCase();

  // Keep Hebrew messages created by the application unchanged.
  if (/[\u0590-\u05FF]/.test(originalMessage)) {
    return originalMessage;
  }

  if (
    details.status === 401 ||
    code === "unauthorized" ||
    code === "session_expired" ||
    code === "session_not_found" ||
    code === "bad_jwt" ||
    message.includes("unauthorized") ||
    message.includes("not authenticated") ||
    message.includes("jwt")
  ) {
    return "פג תוקף ההתחברות. התחברו מחדש ונסו שוב";
  }

  if (
    details.status === 403 ||
    code === "forbidden" ||
    code === "permission_denied" ||
    message.includes("permission denied") ||
    message.includes("forbidden")
  ) {
    return "אין לכם הרשאה לבצע את הפעולה";
  }

  if (code === "weak_password" || message.includes("weak password")) {
    return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר";
  }

  if (code === "same_password" || message.includes("same password")) {
    return "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית";
  }

  if (code.includes("rate_limit") || message.includes("rate limit") || message.includes("too many requests")) {
    return "בוצעו יותר מדי ניסיונות. המתינו מעט ונסו שוב";
  }

  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch failed")) {
    return "לא ניתן להתחבר לשרת. בדקו את החיבור ונסו שוב";
  }

  if (message.includes("payload too large") || message.includes("file too large")) {
    return "הקובץ שנבחר גדול מדי";
  }

  return fallback;
}

function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const fetchStats = useServerFn(getStats);
  const doDelete = useServerFn(deleteAccount);
  const doReset = useServerFn(resetAccount);
  const doUpdatePrefs = useServerFn(updatePreferences);
  const doSetAvatar = useServerFn(setAvatarPath);
  const fetchAvatar = useServerFn(getAvatarUrl);
  const doUpdateLevel = useServerFn(updatePlayerLevel);
  const qc = useQueryClient();

  const statsQ = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: () => fetchStats(),
    enabled: !!user,
  });
  const avatarQ = useQuery({
    queryKey: ["avatar-url", user?.id],
    queryFn: () => fetchAvatar(),
    enabled: !!user,
  });

  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Password change (email auth only)
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  if (statsQ.isError)
    return (
      <AppShell>
        <div className="text-center py-20 space-y-4">
          <p className="text-destructive">לא ניתן לטעון את נתוני הפרופיל כרגע</p>
          <button
            type="button"
            onClick={() => statsQ.refetch()}
            className="px-4 py-2 rounded-xl border bg-card hover:bg-muted transition font-medium"
          >
            ניסיון נוסף
          </button>
        </div>
      </AppShell>
    );

  if (!statsQ.data?.profile)
    return (
      <AppShell>
        <div className="text-center py-20 text-muted-foreground">טוען...</div>
      </AppShell>
    );
  const p = statsQ.data.profile;
  const a11y: AccessibilityPrefs = (p.accessibility_prefs ?? {}) as AccessibilityPrefs;
  const mutes: NotificationPrefs = (p.notification_prefs ?? {}) as NotificationPrefs;
  const isEmailAuth = (p.auth_provider ?? "email") === "email";

  const refresh = () => qc.invalidateQueries({ queryKey: ["stats"] });
  const setPref = async (patch: PreferencePatch) => {
    try {
      await doUpdatePrefs({ data: patch });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["stats"] }),
        qc.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      return true;
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן לשמור את ההגדרות כרגע. נסו שוב"));
      return false;
    }
  };
  const setA11y = async (patch: Partial<AccessibilityPrefs>) => {
    // Apply immediately to <html> so the user sees the change without refresh.
    const merged = { ...a11y, ...patch } as AccessibilityPrefs;
    applyAccessibilityPreferences(merged);
    const saved = await setPref({ accessibility_prefs: patch });
    if (!saved) applyAccessibilityPreferences(a11y);
    return saved;
  };
  const resetDisplaySettings = async () => {
    const reset: Partial<AccessibilityPrefs> = {
      text_size: "normal",
      high_contrast: false,
      colorblind: false,
      palette: "sunset",
      mode: "light",
    };
    const saved = await setA11y(reset);
    if (saved) toast.success("הגדרות התצוגה אופסו");
  };
  // muted=true means the notification is OFF. Toggle UI shows checked when MUTED.
  const setMute = (patch: Partial<NotificationPrefs>) => setPref({ notification_prefs: patch });

  const onAvatarPick = async (file: File) => {
    if (!user) return;
    if (!AVATAR_ACCEPTED_MIMES.includes(file.type)) {
      toast.error(`פורמט לא נתמך. ניתן להעלות ${AVATAR_HINT_FORMATS}`);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(`הקובץ גדול מדי. הגודל המרבי הוא ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const result = await doSetAvatar({ data: { path } });
      if (result.cleanupComplete) toast.success("התמונה עודכנה");
      else toast.warning("התמונה עודכנה, אך ניקוי הקובץ הקודם לא הושלם");
      await qc.invalidateQueries({ queryKey: ["avatar-url"] });
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן להעלות את תמונת הפרופיל כרגע. נסו שוב"));
    } finally {
      setUploading(false);
    }
  };
  const onAvatarRemove = async () => {
    if (!confirm("להסיר את התמונה?")) return;
    setUploading(true);
    try {
      const result = await doSetAvatar({ data: { path: null } });
      await qc.invalidateQueries({ queryKey: ["avatar-url"] });
      if (result.cleanupComplete) toast.success("התמונה הוסרה");
      else toast.warning("התמונה הוסרה מהפרופיל, אך ניקוי הקובץ לא הושלם");
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן להסיר את תמונת הפרופיל כרגע. נסו שוב"));
    } finally {
      setUploading(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    if (pwd !== pwd2) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    setPwdBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("הסיסמה עודכנה");
      setPwd("");
      setPwd2("");
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן לעדכן את הסיסמה כרגע. נסו שוב"));
    } finally {
      setPwdBusy(false);
    }
  };

  const onForgetMe = async () => {
    if (!confirm("פעולה זו תאפס את ההיסטוריה וההתקדמות שלך (הניקוד, הרצפים, הפתרונות). להמשיך?")) return;
    if (!confirm("בטוחים? לא ניתן לשחזר את הנתונים לאחר האיפוס.")) return;
    setResetting(true);
    try {
      await doReset();
      if (user) {
        try {
          window.localStorage.removeItem(`play:currentClueId:${user.id}`);
        } catch {
          // Storage can be unavailable in privacy-restricted browsers.
        }
        qc.removeQueries({ queryKey: ["clue", user.id] });
      }
      await qc.invalidateQueries();
      toast.success("הפרופיל אופס. ברוך הבא מחדש!");
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן לאפס את נתוני המשחק כרגע. נסו שוב"));
    } finally {
      setResetting(false);
    }
  };

  const onDelete = async () => {
    if (
      !confirm("מחיקת הפרופיל היא פעולה בלתי הפיכה. החשבון ונתוני המשחק יימחקו לצמיתות בהתאם למדיניות הפרטיות. להמשיך?")
    )
      return;
    if (!confirm("בטוחים לחלוטין? פעולה זו אינה הפיכה.")) return;
    setDeleting(true);
    try {
      const result = await doDelete();
      if (user) {
        try {
          window.localStorage.removeItem(`play:currentClueId:${user.id}`);
        } catch {
          // Storage can be unavailable in privacy-restricted browsers.
        }
      }
      await signOut();
      qc.clear();
      if (result.cleanupComplete) toast.success("הפרופיל נמחק");
      else toast.warning("הפרופיל נמחק, אך ניקוי תמונת הפרופיל מהאחסון לא הושלם");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(getProfileErrorMessage(e, "לא ניתן למחוק את הפרופיל כרגע. נסו שוב"));
    } finally {
      setDeleting(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <PageAdLayout screen="profile">
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          {/* Header card */}
          <div className="bg-gradient-sunset rounded-3xl p-6 text-white shadow-glow">
            <div className="flex items-center gap-4">
              <div className="size-20 rounded-full bg-white/20 flex items-center justify-center overflow-hidden text-3xl font-display font-extrabold">
                {avatarQ.data?.url ? (
                  <img src={avatarQ.data.url} alt="תמונת פרופיל" className="size-full object-cover" />
                ) : (
                  (p.display_name?.[0] ?? p.username[0])
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-extrabold truncate">{p.display_name ?? p.username}</h1>
                <p className="text-white/80 truncate" dir="ltr">
                  {user?.email ?? `@${p.username}`}
                </p>
              </div>
            </div>
          </div>

          {/* Premium */}
          <PremiumUpgradeCard />

          {/* Account management */}
          <Card icon={<UserCircle2 className="size-5 text-primary" />} title="ניהול החשבון">
            {/* Nickname (permanent) — shown before avatar */}
            <div>
              <div className="text-sm font-medium mb-2">כינוי</div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-muted/30">
                <span className="font-display text-lg font-bold truncate">{p.display_name ?? p.username}</span>
                <span className="text-xs text-muted-foreground shrink-0">קבוע</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">הכינוי נקבע בעת ההרשמה למשחק ואינו ניתן לשינוי</p>
            </div>

            {/* Avatar */}
            <div>
              <div className="text-sm font-medium mb-2">תמונת פרופיל</div>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                  {avatarQ.data?.url ? (
                    <img src={avatarQ.data.url} alt="תמונת פרופיל" className="size-full object-cover" />
                  ) : (
                    <UserCircle2 className="size-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept={AVATAR_ACCEPTED_MIMES.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onAvatarPick(file);
                    }}
                  />
                  <button
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted text-sm font-medium transition disabled:opacity-50"
                  >
                    <Camera className="size-4" /> {avatarQ.data?.url ? "החלפת תמונה" : "העלאת תמונה"}
                  </button>
                  {avatarQ.data?.url && (
                    <button
                      onClick={onAvatarRemove}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm font-medium transition"
                    >
                      <X className="size-4" /> הסרה
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                גודל מרבי: {Math.round(AVATAR_MAX_BYTES / 1024 / 1024)}MB · פורמטים נתמכים: {AVATAR_HINT_FORMATS}
              </p>
            </div>

            {/* Password change (email auth only) */}
            {isEmailAuth && (
              <form onSubmit={onChangePassword} className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="size-4" /> החלפת סיסמה
                </div>
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  minLength={6}
                  placeholder="סיסמה חדשה (לפחות 6 תווים)"
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-left"
                  dir="ltr"
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  minLength={6}
                  placeholder="אימות סיסמה"
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-left"
                  dir="ltr"
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={pwdBusy || !pwd || !pwd2}
                  className="w-full py-2.5 rounded-xl bg-card border hover:bg-muted transition font-medium disabled:opacity-50"
                >
                  {pwdBusy ? "מעדכן..." : "עדכון סיסמה"}
                </button>
              </form>
            )}

            {/* Private mode */}
            <Toggle
              icon={<EyeOff className="size-4" />}
              label="מצב פרטי"
              hint="הסתרת הפרופיל משחקנים אחרים"
              checked={!!p.is_private}
              onChange={(v) => setPref({ is_private: v })}
            />

            {/* Account actions — single horizontal row (RTL): נתק (right) | שכח (center) | מחק (left) */}
            <div className="pt-3 border-t">
              <div dir="rtl" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={onSignOut}
                  className="inline-flex items-center justify-center gap-2 py-3 px-2 rounded-xl border bg-card hover:bg-muted transition font-medium text-sm sm:text-base"
                >
                  <LogOut className="size-4 shrink-0" />
                  <div className="flex flex-col items-center min-w-0 leading-tight">
                    <span className="truncate">נתק אותי</span>
                    <span className="truncate text-[12px] font-normal opacity-70">התנתקות ויציאה מהמשחק</span>
                  </div>
                </button>
                <button
                  onClick={onForgetMe}
                  disabled={resetting}
                  className="inline-flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-warning/40 text-warning hover:bg-warning hover:text-warning-foreground transition font-medium text-sm sm:text-base disabled:opacity-50"
                >
                  <Eraser className="size-4 shrink-0" />
                  <div className="flex flex-col items-center min-w-0 leading-tight">
                    <span className="truncate">{resetting ? "מאפס..." : "שכח אותי"}</span>
                    <span className="truncate text-[12px] font-normal opacity-70">איפוס ההיסטוריה והניקוד</span>
                  </div>
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition font-medium text-sm sm:text-base disabled:opacity-50"
                >
                  <Trash2 className="size-4 shrink-0" />
                  <div className="flex flex-col items-center min-w-0 leading-tight">
                    <span className="truncate">{deleting ? "מוחק..." : "מחק אותי"}</span>
                    <span className="truncate text-[12px] font-normal opacity-70">מחיקת הפרופיל לצמיתות</span>
                  </div>
                </button>
              </div>
            </div>
          </Card>

          {/* Game settings */}
          <Card icon={<Gamepad2 className="size-5 text-primary" />} title="ניהול המשחק">
            <div>
              <div className="text-sm font-medium mb-2">רמה</div>
              <select
                value={p.player_level ?? ""}
                onChange={async (e) => {
                  const n = Number(e.target.value);
                  if (!Number.isInteger(n) || n < 1 || n > 5) return;
                  try {
                    await doUpdateLevel({ data: { playerLevel: n } });
                    refresh();
                    toast.success("רמת השחקן עודכנה");
                  } catch (err) {
                    toast.error(getProfileErrorMessage(err, "לא ניתן לעדכן את רמת השחקן כרגע. נסו שוב"));
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-right"
              >
                <option value="">איך אתם בפתירת הגדרות היגיון?</option>
                {PLAYER_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <Toggle
              label="מעבר אוטומטי להגדרה הבאה"
              hint={
                p.is_paid ? "לאחר פתרון הגדרה, המשחק יעבור אוטומטית להגדרה הבאה תוך 3 שניות" : "זמין לשחקנים ששילמו"
              }
              checked={!!p.is_paid && !!p.auto_next}
              disabled={!p.is_paid}
              onChange={(v) => setPref({ auto_next: v })}
            />
            <div className="pt-3 border-t space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <BellOff className="size-4" /> ביטול התראות
              </div>
              <p className="text-xs text-muted-foreground -mt-1">הפעלת מתג משתיקה את ההתראה המתאימה</p>
              <Toggle
                small
                label="ביטול התראות על מעבר שלבים"
                checked={!!mutes.mute_level_up}
                onChange={(v) => setMute({ mute_level_up: v })}
              />
              <Toggle
                small
                label="ביטול התראות על השלמת אתגרים"
                checked={!!mutes.mute_challenge}
                onChange={(v) => setMute({ mute_challenge: v })}
              />
              <Toggle
                small
                label="ביטול הכרזות על תכונות חדשות"
                checked={!!mutes.mute_announcements}
                onChange={(v) => setMute({ mute_announcements: v })}
              />
            </div>
          </Card>

          {/* Display & colors */}
          <Card icon={<PaletteIcon className="size-5 text-primary" />} title="תצוגה וצבעים">
            <div>
              <div className="text-sm font-medium mb-2">מצב תצוגה</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setA11y({ mode: "light" })}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${(a11y.mode ?? "light") === "light" ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}
                >
                  <Sun className="size-4" /> בהיר
                </button>
                <button
                  onClick={() => setA11y({ mode: "dark" })}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition ${a11y.mode === "dark" ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}
                >
                  <Moon className="size-4" /> כהה
                </button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">פלטת צבעים</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PALETTES.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setA11y({ palette: pl.id as Palette })}
                    className={`p-3 rounded-xl border transition text-center ${(a11y.palette ?? "sunset") === pl.id ? "ring-2 ring-primary border-transparent" : "hover:bg-muted"}`}
                  >
                    <div className="h-10 rounded-lg mb-2" style={{ background: pl.swatch }} />
                    <div className="text-sm font-medium">{pl.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              label="צבעים ידידותיים לעיוורי צבעים"
              checked={!!a11y.colorblind}
              onChange={(v) => setA11y({ colorblind: v })}
            />
            <Toggle
              label="ניגודיות גבוהה"
              checked={!!a11y.high_contrast}
              onChange={(v) => setA11y({ high_contrast: v })}
            />

            {/* Reset display settings */}
            <button
              onClick={resetDisplaySettings}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border bg-card hover:bg-muted transition font-medium text-sm"
            >
              <RotateCcw className="size-4" /> איפוס הגדרות תצוגה
            </button>
          </Card>

          {/* Accessibility */}
          <Card icon={<Accessibility className="size-5 text-primary" />} title="נגישות">
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Type className="size-4" /> גודל טקסט
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["small", "קטן"],
                    ["normal", "רגיל"],
                    ["large", "גדול"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setA11y({ text_size: v })}
                    className={`px-3 py-2.5 rounded-xl border transition ${(a11y.text_size ?? "normal") === v ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              label="תמיכה בקורא מסך"
              hint="הפעלת הכרזות קוליות מורחבות על ניקוד, שלבים, הישגים ומעבר בין עמודים"
              checked={!!a11y.screen_reader}
              onChange={(v) => setA11y({ screen_reader: v })}
            />
          </Card>

          {/* Cookie preferences — subtle action at the bottom of the profile */}
          <div dir="rtl" className="pt-2 text-center">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition"
            >
              <Cookie className="size-3.5" />
              ניהול העדפות עוגיות
            </button>
          </div>
        </div>
      </PageAdLayout>
    </AppShell>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-3xl p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  hint,
  icon,
  checked,
  onChange,
  small,
  disabled,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  small?: boolean;
  disabled?: boolean;
}) {
  const labelId = useId();
  const hintId = useId();

  return (
    <label
      className={`flex items-center justify-between gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${small ? "py-1" : ""}`}
    >
      <div className="min-w-0">
        <div id={labelId} className={`font-medium flex items-center gap-2 ${small ? "text-sm" : ""}`}>
          {icon}
          {label}
        </div>
        {hint && (
          <div id={hintId} className="text-xs text-muted-foreground mt-0.5">
            {hint}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition shrink-0 disabled:cursor-not-allowed ${checked ? "bg-gradient-sunset" : "bg-muted border"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "right-0.5" : "right-[1.4rem]"}`}
        />
      </button>
    </label>
  );
}
