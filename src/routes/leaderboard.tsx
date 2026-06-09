import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { getLeaderboardByPeriod } from "@/lib/game.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({ component: LB });

type Period = "today" | "week" | "month";
const TABS: { value: Period; label: string }[] = [
  { value: "today", label: "היום" },
  { value: "week", label: "השבוע" },
  { value: "month", label: "החודש" },
];

function LB() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  const [period, setPeriod] = useState<Period>("today");

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <Trophy className="size-12 mx-auto text-primary mb-2" />
          <h1 className="font-display text-4xl font-extrabold text-gradient-sunset">טבלת המובילים</h1>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} dir="rtl">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <Board period={t.value} currentUserId={user?.id} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}

function Board({ period, currentUserId }: { period: Period; currentUserId?: string }) {
  const fetchLB = useServerFn(getLeaderboardByPeriod);
  const { data, isLoading } = useQuery({
    queryKey: ["lb", period],
    queryFn: () => fetchLB({ data: { period } }),
    enabled: true,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">טוען...</div>;
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return <div className="bg-card border rounded-3xl shadow-card p-8 text-center text-muted-foreground">אין עדיין שחקנים בתקופה זו</div>;
  }

  return (
    <div className="bg-card border rounded-3xl shadow-card overflow-hidden">
      {rows.map((row: any, i: number) => (
        <Row key={row.id} row={row} rank={i + 1} isMe={row.id === currentUserId} hasBorder={i !== 0} />
      ))}
    </div>
  );
}

function Row({ row, rank, isMe, hasBorder }: { row: any; rank: number; isMe: boolean; hasBorder: boolean }) {
  const medal = rankStyles(rank);
  return (
    <div className={`flex items-center gap-3 p-4 ${hasBorder ? "border-t" : ""} ${isMe ? "bg-primary/10" : ""}`}>
      <div
        className={`size-10 rounded-full flex items-center justify-center font-display font-extrabold shrink-0 ${medal.badge}`}
        style={medal.style}
      >
        {medal.icon ?? rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{row.display_name ?? row.username}</div>
        <div className="text-xs text-muted-foreground">שלב {row.level} • {row.solved_count} פתרונות • שיא רצף {row.best_streak}</div>
      </div>
      <div
        className="font-display text-2xl font-extrabold text-gradient-sunset"
        style={medal.scoreStyle}
      >
        {row.score}
      </div>
    </div>
  );
}

function rankStyles(rank: number): {
  badge: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  scoreStyle?: React.CSSProperties;
} {
  if (rank === 1) {
    return {
      badge: "text-white shadow-lg",
      icon: <Trophy className="size-5" />,
      style: { background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 4px 14px rgba(255, 180, 0, 0.45)" },
      scoreStyle: { background: "linear-gradient(135deg, #FFD700, #FFA500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    };
  }
  if (rank === 2) {
    return {
      badge: "text-white shadow-md",
      icon: <Medal className="size-5" />,
      style: { background: "linear-gradient(135deg, #E5E7EB, #9CA3AF)", boxShadow: "0 4px 12px rgba(156, 163, 175, 0.45)" },
      scoreStyle: { background: "linear-gradient(135deg, #C0C0C0, #6B7280)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    };
  }
  if (rank === 3) {
    return {
      badge: "text-white shadow-md",
      icon: <Award className="size-5" />,
      style: { background: "linear-gradient(135deg, #CD7F32, #8B4513)", boxShadow: "0 4px 12px rgba(205, 127, 50, 0.45)" },
      scoreStyle: { background: "linear-gradient(135deg, #CD7F32, #8B4513)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    };
  }
  return { badge: "bg-muted text-muted-foreground" };
}
