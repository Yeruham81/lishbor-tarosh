import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, User, Home, Gamepad2, LogOut, BarChart3, Mail, PlusCircle } from "lucide-react";
import brandIcon from "@/assets/lishbor-icon.jpg.asset.json";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
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
                לוח הבקרה
              </NavLink>
            )}
          </nav>
          <div>
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
              {user ? (
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
              <span>שחק</span>
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
              <span>לוח</span>
            </MobileLink>
          </div>
        </nav>
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
