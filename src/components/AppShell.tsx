import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, User, Home, Gamepad2, LogOut, BarChart3 } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-xl">
            <span className="text-2xl">🔤</span>
            <span className="text-gradient-sunset">מילה חמה</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/" icon={<Home className="size-4" />}>בית</NavLink>
            {user && <NavLink to="/play" icon={<Gamepad2 className="size-4" />}>שחק</NavLink>}
            {user && <NavLink to="/levels" icon={<BarChart3 className="size-4" />}>רמות</NavLink>}
            <NavLink to="/leaderboard" icon={<Trophy className="size-4" />}>טבלת מובילים</NavLink>
            {user && <NavLink to="/profile" icon={<User className="size-4" />}>פרופיל</NavLink>}
          </nav>
          <div>
            {user ? (
              <button onClick={signOut} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg hover:bg-muted transition">
                <LogOut className="size-4" /> יציאה
              </button>
            ) : (
              <Link to="/auth" className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-sunset text-white font-semibold text-sm shadow-glow hover:opacity-90 transition">
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
      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden sticky bottom-0 border-t bg-background/95 backdrop-blur-xl">
          <div className="grid grid-cols-5 text-xs">
            <MobileLink to="/"><Home className="size-5" /><span>בית</span></MobileLink>
            <MobileLink to="/play"><Gamepad2 className="size-5" /><span>שחק</span></MobileLink>
            <MobileLink to="/levels"><BarChart3 className="size-5" /><span>רמות</span></MobileLink>
            <MobileLink to="/leaderboard"><Trophy className="size-5" /><span>טבלה</span></MobileLink>
            <MobileLink to="/profile"><User className="size-5" /><span>פרופיל</span></MobileLink>
          </div>
        </nav>
      )}
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted transition font-medium" activeProps={{ className: "bg-muted text-primary" }}>
      {icon} {children}
    </Link>
  );
}

function MobileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground" activeProps={{ className: "text-primary" }}>
      {children}
    </Link>
  );
}
