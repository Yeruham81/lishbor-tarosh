import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getLeaderboard } from "@/lib/game.functions";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({ component: LB });

function LB() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const fetch = useServerFn(getLeaderboard);
  const { data } = useQuery({ queryKey: ["lb"], queryFn: () => fetch(), enabled: !!user });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <Trophy className="size-12 mx-auto text-primary mb-2" />
          <h1 className="font-display text-4xl font-extrabold text-gradient-sunset">טבלת המובילים</h1>
        </div>
        <div className="bg-card border rounded-3xl shadow-card overflow-hidden">
          {(data ?? []).map((row: any, i: number) => (
            <div key={row.id} className={`flex items-center gap-3 p-4 ${i !== 0 ? "border-t" : ""} ${row.id === user?.id ? "bg-primary/10" : ""}`}>
              <div className={`size-10 rounded-full flex items-center justify-center font-display font-extrabold ${i < 3 ? "bg-gradient-sunset text-white" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold">{row.display_name ?? row.username}</div>
                <div className="text-xs text-muted-foreground">רמה {row.level} • {row.solved_count} פתרונות • שיא רצף {row.best_streak}</div>
              </div>
              <div className="font-display text-2xl font-extrabold text-gradient-sunset">{row.total_score}</div>
            </div>
          ))}
          {(!data || data.length === 0) && <div className="p-8 text-center text-muted-foreground">אין עדיין שחקנים</div>}
        </div>
      </div>
    </AppShell>
  );
}
