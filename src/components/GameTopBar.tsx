import { Link } from "@tanstack/react-router";
import { Trophy, Flame, Star, HelpCircle, X } from "lucide-react";
import { STAGE_THRESHOLDS, stageFromScore, nextStageInfo } from "@/lib/progression";

type Profile =
  | {
      total_score: number;
      level: number;
      current_streak: number;
    }
  | null
  | undefined;

export function GameTopBar({ profile, helpVariant }: { profile: Profile; helpVariant: "help" | "close" }) {
  const totalScore = profile?.total_score ?? 0;
  const currentStage = stageFromScore(totalScore);
  const next = nextStageInfo(totalScore);
  const progressPct = next
    ? (() => {
        const prev = STAGE_THRESHOLDS[currentStage - 1] ?? 0;
        const span = Math.max(1, next.required - prev);
        return Math.min(100, Math.max(0, ((totalScore - prev) / span) * 100));
      })()
    : 100;

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 md:gap-2.5 mb-3 items-stretch">
        <Stat label="ניקוד כולל" value={totalScore} icon={<Trophy className="size-4" />} />
        <Stat label="שלב נוכחי" value={currentStage} icon={<Star className="size-4 text-warning" />} />
        <Stat label="רצף" value={profile?.current_streak ?? 0} icon={<Flame className="size-4 text-orange-500" />} />
        <Link
          to={helpVariant === "help" ? "/instructions" : "/play"}
          aria-label={helpVariant === "help" ? "הוראות" : "חזרה למשחק"}
          className="hidden md:flex aspect-square h-full min-h-[44px] items-center justify-center rounded-xl bg-muted/70 hover:bg-muted border border-border shadow-lg hover:shadow-xl transition"
        >
          {helpVariant === "help" ? (
            <HelpCircle className="size-6 text-foreground" />
          ) : (
            <X className="size-6 text-foreground" />
          )}
        </Link>
      </div>

      {profile && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>שלב {currentStage}</span>
            <span>
              {next
                ? `${totalScore.toLocaleString("he-IL")} / ${next.required.toLocaleString("he-IL")}`
                : totalScore.toLocaleString("he-IL")}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-sunset transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl px-2 py-1.5 md:py-1 text-center shadow-card">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-display text-xl md:text-[1.35rem] font-extrabold text-gradient-sunset leading-tight">
        {value}
      </div>
    </div>
  );
}
