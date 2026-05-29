import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getProfile } from "@/lib/game.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { Lock, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/levels")({ component: Levels });

function Levels() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const fetch = useServerFn(getProfile);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fetch(), enabled: !!user });
  const cur = p?.level ?? 1;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold text-center mb-2 text-gradient-sunset">רמות</h1>
        <p className="text-center text-muted-foreground mb-6">פתרו חידות כדי לעלות ברמות ולשחרר חידות קשות יותר</p>
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => {
            const lvl = i + 1;
            const required = scoreForNextLevel(lvl - 1);
            const unlocked = cur >= lvl;
            const current = cur === lvl;
            return (
              <div key={lvl} className={`flex items-center gap-4 p-4 rounded-2xl border ${current ? "bg-gradient-sunset text-white shadow-glow" : unlocked ? "bg-card" : "bg-muted/30"}`}>
                <div className={`size-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg ${current ? "bg-white/20" : unlocked ? "bg-gradient-sunset text-white" : "bg-muted text-muted-foreground"}`}>
                  {unlocked ? lvl : <Lock className="size-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold">רמה {lvl}</div>
                  <div className={`text-xs ${current ? "text-white/80" : "text-muted-foreground"}`}>נדרשים {required} נק׳</div>
                </div>
                {unlocked && !current && <Check className="size-5 text-success" />}
                {current && <Link to="/play" className="px-4 py-2 rounded-lg bg-white text-primary font-bold text-sm">המשך</Link>}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
