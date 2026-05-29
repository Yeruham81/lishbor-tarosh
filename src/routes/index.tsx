import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Trophy, Zap, Brain } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user } = useAuth();
  return (
    <AppShell>
      <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-sm font-medium mb-6">
          <Sparkles className="size-4 text-primary" /> משחק חידות בעברית
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-black leading-tight mb-4">
          <span className="text-gradient-sunset">מילה חמה</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          נחשו את המילה הנסתרת מתוך רמז עברי. צברו נקודות, שברו שיאי רצף, וטפסו בטבלת המובילים.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={user ? "/play" : "/auth"} className="px-8 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 active:scale-95 transition">
            {user ? "המשך לשחק" : "התחילו עכשיו"}
          </Link>
          <Link to="/leaderboard" className="px-8 py-4 rounded-2xl bg-card border font-display font-bold text-lg hover:bg-muted transition">
            טבלת מובילים
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-16">
          {[
            { icon: <Brain className="size-7" />, t: "חידות מאתגרות", d: "מאות חידות עבריות ברמות קושי משתנות" },
            { icon: <Zap className="size-7" />, t: "בונוסי רצף", d: "פתרו ברצף וקבלו בונוס נקודות הולך וגדל" },
            { icon: <Trophy className="size-7" />, t: "תחרו על המקום הראשון", d: "טבלת מובילים גלובלית מתעדכנת בזמן אמת" },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border shadow-card text-right">
              <div className="inline-flex p-3 rounded-xl bg-gradient-flame text-white mb-3">{f.icon}</div>
              <h3 className="font-display text-xl font-bold mb-1">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
