import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getProfile } from "@/lib/game.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { Trophy, Flame, Target, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const fetchProfile = useServerFn(getProfile);
  const { data: p } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });

  if (!p) return <AppShell><div className="text-center py-20 text-muted-foreground">טוען...</div></AppShell>;

  const nextLevel = scoreForNextLevel(p.level);
  const prevLevel = scoreForNextLevel(p.level - 1);
  const progress = Math.min(100, Math.round(((p.total_score - prevLevel) / (nextLevel - prevLevel)) * 100));

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-gradient-sunset rounded-3xl p-6 text-white shadow-glow mb-6">
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-display font-extrabold">
              {p.display_name?.[0] ?? p.username[0]}
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold">{p.display_name ?? p.username}</h1>
              <p className="text-white/80">@{p.username}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1"><span>רמה {p.level}</span><span>{p.total_score} / {nextLevel}</span></div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={<Trophy />} label="ניקוד כולל" value={p.total_score} />
          <StatCard icon={<Target />} label="חידות שנפתרו" value={p.solved_count} />
          <StatCard icon={<Flame />} label="רצף נוכחי" value={p.current_streak} />
          <StatCard icon={<Award />} label="שיא רצף" value={p.best_streak} />
        </div>

        <button onClick={signOut} className="w-full py-3 rounded-xl border bg-card hover:bg-destructive hover:text-destructive-foreground transition font-medium">
          התנתק
        </button>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="bg-card border rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon} {label}</div>
      <div className="font-display text-3xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
