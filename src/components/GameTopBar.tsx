import { Link } from "@tanstack/react-router";
import { Trophy, Flame, Star, HelpCircle, X } from "lucide-react";
import { scoreForNextLevel } from "@/lib/hebrew";

type Profile = {
  total_score: number;
  level: number;
  current_streak: number;
} | null | undefined;

export function GameTopBar({
  profile,
  helpVariant,
}: {
  profile: Profile;
  helpVariant: "help" | "close";
}) {
  const nextLevelAt = profile ? scoreForNextLevel(profile.level) : 0;
  const prevLevelAt = profile ? scoreForNextLevel((profile?.level ?? 1) - 1) : 0;
  const levelProgress =
    profile && nextLevelAt > prevLevelAt
      ? Math.min(100, Math.max(0, ((profile.total_score - prevLevelAt) / (nextLevelAt - prevLevelAt)) * 100))
      : 0;

  const HelpButton = ({ className, iconClassName }: { className: string; iconClassName: string }) => (
    <Link
      to={helpVariant === "help" ? "/instructions" : "/play"}
      aria-label={helpVariant === "help" ? "הוראות" : "חזרה למשחק"}
      className={className}
    >
      {helpVariant === "help" ? (
        <HelpCircle className={iconClassName} />
      ) : (
        <X className={iconClassName} />
      )}
    </Link>
  );

  return (
    <>
      {/* Mobile-only sticky header with help/close button on the left */}
      <div className="sm:hidden sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/90 backdrop-blur border-b border-border mb-2 flex items-center">
        <HelpButton
          className="size-9 flex items-center justify-center rounded-xl bg-muted/70 hover:bg-muted border border-border shadow transition"
          iconClassName="size-5 text-foreground"
        />
      </div>

      {/* Stats row: 3 evenly distributed on mobile; original 4-col layout (with help button) on desktop */}
      <div className="grid grid-cols-3 gap-2 mb-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-3 sm:mb-4 items-stretch">
        <Stat label="ניקוד כולל" value={profile?.total_score ?? 0} icon={<Trophy className="size-4" />} />
        <Stat label="שלב נוכחי" value={profile?.level ?? 1} icon={<Star className="size-4 text-warning" />} />
        <Stat label="רצף" value={profile?.current_streak ?? 0} icon={<Flame className="size-4 text-orange-500" />} />
        <HelpButton
          className="hidden sm:flex aspect-square h-full min-h-[48px] items-center justify-center rounded-2xl bg-muted/70 hover:bg-muted border border-border shadow-lg hover:shadow-xl transition"
          iconClassName="size-7 text-foreground"
        />
      </div>

      {profile && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>שלב {profile.level}</span>
            <span>
              {profile.total_score} / {nextLevelAt}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-sunset transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}


function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-2 text-center shadow-card">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
