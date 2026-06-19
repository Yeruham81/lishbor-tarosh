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
} from "lucide-react";
import brandIcon from "@/assets/lishbor-icon.jpg.asset.json";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
            <img src="/lishbor-icon-new.jpg" alt="לשבור ת'ראש" className="size-9 rounded-lg shadow-card object-cover" />
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
            <NavLink to="/leaderboard" icon={<Trophy className="size-4" />}>
              מי בראש
            </NavLink>
            {user && (
              <NavLink to="/profile" icon={<User className="size-4" />}>
                פרופיל
              </NavLink>
            )}

            {flags.disableAdsButtonVisible && (
              <button
                type="button"
                onClick={onDisableAds}
                aria-label="ביטול פרסומות"
                title="ביטול פרסומות"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 transition font-medium text-foreground ms-3"
              >
                <BadgeDollarSign className="size-4" /> ביטול פרסומות
              </button>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {flags.disableAdsButtonVisible && (
              <button
                type="button"
                onClick={onDisableAds}
                aria-label="ביטול פרסומות"
                title="ביטול פרסומות"
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted transition font-medium text-sm text-muted-foreground"
              >
                <BadgeDollarSign className="size-4" />
                ביטול פרסומות
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
      {/* Ad slot */}
      <div className="container mx-auto px-4 py-4">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center py-3">
          מקום שמור למודעה (Google AdSense)
        </div>
      </div>
      {/* Footer actions: יציאה (left) | יצירת קשר (center) | הוספת הגדרה (right) */}
      <footer className="border-t bg-muted/20 mt-2">
        <div className="container mx-auto px-4 py-5 space-y-3">
          <div dir="ltr" className="grid grid-cols-3 items-center gap-2">
            {/* LEFT — יציאה */}
            <div className="flex justify-start">
              {user ? (
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
                >
                  <LogOut className="size-4" /> יציאה
                </button>
              ) : (
                <span />
              )}
            </div>
            {/* CENTER — יצירת קשר */}
            <div className="flex justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-card hover:bg-muted transition text-sm font-medium"
              >
                <Mail className="size-4" /> יצירת קשר
              </Link>
            </div>
            {/* RIGHT — הוספת הגדרה */}
            <div className="flex justify-end">
              {user && flags.allowPlayerSubmissions ? (
                <Link
                  to="/submit-puzzle"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-sunset text-white text-sm font-semibold shadow-glow hover:opacity-90 transition"
                >
                  <PlusCircle className="size-4" /> הוספת הגדרה
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} לשבור ת'ראש</div>
        </div>
      </footer>
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
