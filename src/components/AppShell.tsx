import { ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Trophy,
  User,
  Home,
  Gamepad2,
  LogOut,
  BarChart3,
  Mail,
  PlusCircle,
  HelpCircle,
  X,
  BadgeDollarSign,
  Wrench,
  ShieldCheck,
  FileText,
} from "lucide-react";
import brandIcon from "@/assets/lishbor-icon.jpg.asset.json";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LegalModal } from "@/components/LegalModal";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { CookiePreferencesDialog } from "@/components/CookiePreferencesDialog";
import { privacyPolicy, termsOfUse } from "@/content/legal";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/account.functions";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPlay = pathname === "/play";
  const onInstructions = pathname === "/instructions";

  const showMobileHelp = !!user && (onPlay || onInstructions);
  const flags = useFeatureFlags();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Popup announcement: show once per session per message text.
  const popupText = flags.popupAnnouncement?.trim() ?? "";
  const [popupOpen, setPopupOpen] = useState(false);
  useEffect(() => {
    if (!popupText) return;
    if (typeof window === "undefined") return;
    try {
      const key = `popup_seen:${btoa(unescape(encodeURIComponent(popupText))).slice(0, 32)}`;
      if (sessionStorage.getItem(key) === "1") return;
      setPopupOpen(true);
      sessionStorage.setItem(key, "1");
    } catch {
      setPopupOpen(true);
    }
  }, [popupText]);

  // Check if current user is admin (to bypass maintenance mode).
  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!roleQ.data?.isAdmin;

  const onDisableAds = () => {};

  // Maintenance mode: block non-admins entirely.
  if (!flags.loading && flags.maintenanceMode && !isAdmin && !(user && roleQ.isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
        <div className="max-w-md w-full bg-card border rounded-3xl shadow-card p-8 text-center space-y-4">
          <Wrench className="size-12 mx-auto text-primary" />
          <h1 className="font-display text-2xl font-extrabold text-gradient-sunset">המערכת בתחזוקה</h1>
          <p className="text-muted-foreground whitespace-pre-wrap">{flags.maintenanceMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {flags.globalAnnouncement && flags.globalAnnouncement.trim() && (
        <div className="bg-gradient-sunset text-white text-center text-sm py-2 px-4">{flags.globalAnnouncement}</div>
      )}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-xl">
            <img src={brandIcon.url} alt="לשבור ת'ראש" className="size-9 rounded-lg shadow-card object-cover" />
            <span className="text-gradient-sunset">לשבור ת'ראש</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/" icon={<Home className="size-4" />}>
              בית
            </NavLink>
            {user && (
              <NavLink to="/play" icon={<Gamepad2 className="size-4" />}>
                משחק
              </NavLink>
            )}
            {user && (
              <NavLink to="/levels" icon={<BarChart3 className="size-4" />}>
                איך אני
              </NavLink>
            )}
            {user && (
              <NavLink to="/leaderboard" icon={<Trophy className="size-4" />}>
                מי בראש
              </NavLink>
            )}
            {user && (
              <NavLink to="/profile" icon={<User className="size-4" />}>
                פרופיל
              </NavLink>
            )}

            {user && flags.disableAdsButtonVisible && (
              <button
                type="button"
                onClick={onDisableAds}
                aria-label="תנו בראש"
                title="תנו בראש"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 transition font-medium text-foreground ms-3"
              >
                <BadgeDollarSign className="size-4" /> תנו בראש
              </button>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user && flags.disableAdsButtonVisible && (
              <button
                type="button"
                onClick={onDisableAds}
                aria-label="תנו בראש"
                title="תנו בראש"
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border-2 border-primary shadow-sm transition font-medium text-sm text-muted-foreground"
              >
                תנו בראש
              </button>
            )}
            {showMobileHelp && (
              <Link
                to={onInstructions ? "/play" : "/instructions"}
                aria-label={onInstructions ? "חזרה למשחק" : "הוראות"}
                className="md:hidden inline-flex items-center justify-center size-9 rounded-lg bg-muted/70 hover:bg-muted border border-border transition"
              >
                {onInstructions ? <X className="size-5" /> : <HelpCircle className="size-5" />}
              </Link>
            )}
            {!user && (
              <Link
                to="/auth"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-sunset text-white font-semibold text-sm shadow-glow hover:opacity-90 transition"
              >
                התחברות
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* Ads are declared per-route via <AdSlot />, never globally here.
          A global slot would risk rendering on auth/legal/admin surfaces. */}
      <footer className="border-t bg-muted/20 mt-2">
        <div className="container mx-auto px-4 py-5 space-y-3">
          {/* ================= DESKTOP ================= */}
          {user ? (
            <div className="hidden md:grid grid-cols-5 items-center gap-2">
              {/* LEFT — הוספת הגדרה */}
              <div className="flex justify-start">
                {flags.allowPlayerSubmissions ? (
                  <Link
                    to="/submit-puzzle"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-sunset text-white text-sm font-semibold shadow-glow hover:opacity-90 transition"
                  >
                    הוספת הגדרה
                  </Link>
                ) : (
                  <span />
                )}
              </div>

              {/* יצירת קשר — משתמשים מחוברים בלבד */}
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <Mail className="size-4" /> יצירת קשר
              </Link>

              {/* תנאי שימוש */}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <FileText className="size-4" /> תנאי שימוש
              </button>

              {/* מדיניות פרטיות */}
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <ShieldCheck className="size-4" /> מדיניות פרטיות
              </button>

              {/* RIGHT — יציאה */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
                >
                  <LogOut className="size-4" /> יציאה
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:grid grid-cols-2 items-center gap-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <FileText className="size-4" /> תנאי שימוש
              </button>

              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <ShieldCheck className="size-4" /> מדיניות פרטיות
              </button>
            </div>
          )}

          {/* ================= MOBILE ================= */}
          {user ? (
            <div className="md:hidden space-y-2">
              {/* ROW 1 — logged-in actions */}
              <div className="grid grid-cols-3 gap-2">
                {/* LEFT — הוספת הגדרה */}
                {flags.allowPlayerSubmissions ? (
                  <Link
                    to="/submit-puzzle"
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-gradient-sunset text-white text-xs font-semibold"
                  >
                    הוספת הגדרה
                  </Link>
                ) : (
                  <div />
                )}

                {/* CENTER — יצירת קשר */}
                <Link
                  to="/contact"
                  className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg border bg-card text-xs font-medium"
                >
                  <Mail className="size-4" /> יצירת קשר
                </Link>

                {/* RIGHT — יציאה */}
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg border bg-card text-xs font-medium"
                >
                  <LogOut className="size-4" /> יציאה
                </button>
              </div>

              {/* ROW 2 — legal */}
              <div className="grid grid-cols-2 gap-2 items-center text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="inline-flex items-center justify-center px-2 py-1 rounded-md border bg-card text-xs font-medium hover:bg-muted transition cursor-pointer"
                >
                  תנאי שימוש
                </button>

                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="inline-flex items-center justify-center px-2 py-1 rounded-md border bg-card text-xs font-medium hover:bg-muted transition cursor-pointer"
                >
                  מדיניות פרטיות
                </button>
              </div>
            </div>
          ) : (
            <div className="md:hidden grid grid-cols-2 gap-2 items-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="inline-flex items-center justify-center px-2 py-2 rounded-md border bg-card text-xs font-medium hover:bg-muted transition cursor-pointer"
              >
                תנאי שימוש
              </button>

              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="inline-flex items-center justify-center px-2 py-2 rounded-md border bg-card text-xs font-medium hover:bg-muted transition cursor-pointer"
              >
                מדיניות פרטיות
              </button>
            </div>
          )}
          {/* COPYRIGHT — ALL SCREEN SIZES */}
          <div className="text-center text-xs text-muted-foreground pt-1">
            © {new Date().getFullYear()} לשבור ת'ראש. כל הזכויות שמורות.
          </div>
        </div>
      </footer>{" "}
      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden sticky bottom-0 border-t bg-background/95 backdrop-blur-xl">
          <div className="grid grid-cols-5 text-xs">
            <MobileLink to="/">
              <Home className="size-5" />
              <span>בית</span>
            </MobileLink>
            <MobileLink to="/play">
              <Gamepad2 className="size-5" />
              <span>משחק</span>
            </MobileLink>
            <MobileLink to="/levels">
              <BarChart3 className="size-5" />
              <span>איך אני</span>
            </MobileLink>
            <MobileLink to="/leaderboard">
              <Trophy className="size-5" />
              <span>מי בראש</span>
            </MobileLink>
            <MobileLink to="/profile">
              <User className="size-5" />
              <span>פרופיל</span>
            </MobileLink>
          </div>
        </nav>
      )}
      {popupText && (
        <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הודעה</DialogTitle>
            </DialogHeader>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{popupText}</div>
            <DialogFooter>
              <Button onClick={() => setPopupOpen(false)}>הבנתי</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <LegalModal open={privacyOpen} onOpenChange={setPrivacyOpen} doc={privacyPolicy} />
      <LegalModal open={termsOpen} onOpenChange={setTermsOpen} doc={termsOfUse} />
      <CookieConsentBanner />
      <CookiePreferencesDialog />
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted transition font-medium"
      activeProps={{ className: "bg-muted text-primary" }}
    >
      {icon} {children}
    </Link>
  );
}

function MobileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {children}
    </Link>
  );
}
