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
          <Sparkles className="size-4 text-primary" /> המשחק שעושה היגיון
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-black leading-tight mb-4">
          <span className="text-gradient-sunset">לשבור ת'ראש</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          כי זה לא רק מה אתם יודעים - זה גם איך אתם חושבים
        </p>
        <div className="flex justify-center">
          <Link to={user ? "/play" : "/auth"} className="px-8 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 active:scale-95 transition">
            {user ? "חזרה למשחק" : "התחילו לשחק"}
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-16">
          {[
            { icon: <Brain className="size-7" />, t: "הפעילו את הראש", d: "אתגרו את עצמכם עם הגדרות היגיון המשלבות ידע כללי וחשיבה יצירתית" },
            { icon: <Zap className="size-7" />, t: "השתפרו בכל משחק", d: "צברו נקודות, השלימו אתגרים, עברו שלבים וקבעו בכל יום שיאים חדשים" },
            { icon: <Trophy className="size-7" />, t: "כמה רחוק תגיעו?", d: "התחרו מול שחקנים אחרים, טפסו בדירוג ונסו לכבוש את המקום הראשון" },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border shadow-card text-right">
              <div className="inline-flex p-3 rounded-xl bg-gradient-flame text-white mb-3">{f.icon}</div>
              <h3 className="font-display text-xl font-bold mb-1">{f.t}</h3>
              <p className="text-muted-foreground text-base font-normal">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
