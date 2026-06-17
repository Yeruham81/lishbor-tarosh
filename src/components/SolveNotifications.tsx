import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy, Sparkles } from "lucide-react";

export type SolveEvent =
  | { kind: "score"; points: number }
  | { kind: "perfect_bonus"; points: number; streak: number }
  | { kind: "stage_up"; stage: number }
  | { kind: "achievement"; title: string; category: "solved" | "perfect" | "perfect_streak" | "play_days"; threshold: number };

type Burst = { id: number; text: string };

/**
 * Surfaces solve events as visual notifications:
 * - score: small floating "+N" burst near the anchor
 * - perfect_bonus / achievement: toast notification
 * - stage_up: large centered celebration banner (auto-dismiss)
 *
 * `anchorRef` is optional — when provided, the score burst is rendered relative
 * to the parent positioned wrapper around the anchor.
 */
export function useSolveNotifications() {
  const [stageEvent, setStageEvent] = useState<{ stage: number } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Stage banner auto-dismiss
  useEffect(() => {
    if (!stageEvent) return;
    const t = setTimeout(() => setStageEvent(null), 3500);
    return () => clearTimeout(t);
  }, [stageEvent]);

  const emit = (events: SolveEvent[] | undefined | null) => {
    if (!events || events.length === 0) return;
    // Sort by priority: stage > achievement > perfect_bonus > score
    const order = { stage_up: 0, achievement: 1, perfect_bonus: 2, score: 3 } as const;
    const sorted = [...events].sort((a, b) => order[a.kind] - order[b.kind]);
    let toastDelay = 0;
    for (const ev of sorted) {
      if (ev.kind === "stage_up") {
        setStageEvent({ stage: ev.stage });
      } else if (ev.kind === "achievement") {
        const delay = toastDelay;
        toastDelay += 400;
        setTimeout(() => {
          toast.success(`🏆 הישג חדש: ${ev.title}`, { duration: 4500 });
        }, delay);
      } else if (ev.kind === "perfect_bonus") {
        const delay = toastDelay;
        toastDelay += 400;
        setTimeout(() => {
          toast.success(`🔥 רצף מושלם ×${ev.streak}! בונוס +${ev.points} נקודות`, { duration: 4000 });
        }, delay);
      } else if (ev.kind === "score") {
        const id = Date.now() + Math.random();
        setBursts((b) => [...b, { id, text: `+${ev.points}` }]);
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
      }
    }
  };

  const stageBanner = stageEvent ? <StageBanner stage={stageEvent.stage} /> : null;

  const scoreBurst = (
    <span className="pointer-events-none absolute -top-1 left-full ml-1 inline-flex">
      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute whitespace-nowrap font-display font-extrabold text-success animate-score-burst"
        >
          {b.text}
        </span>
      ))}
    </span>
  );

  return { emit, stageBanner, scoreBurst };
}

function StageBanner({ stage }: { stage: number }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative max-w-md w-full text-center bg-gradient-sunset text-white rounded-3xl shadow-glow border-2 border-white/30 p-8 animate-scale-in">
        <Sparkles className="size-10 mx-auto mb-3 opacity-90" />
        <div className="text-sm font-medium opacity-90">שלב חדש נפתח</div>
        <div className="font-display text-5xl font-extrabold my-2 drop-shadow">
          שלב {stage}
        </div>
        <div className="text-base opacity-95">הגעת לשלב {stage}!</div>
        <Trophy className="absolute -top-4 -right-4 size-10 text-yellow-300 drop-shadow" />
      </div>
    </div>
  );
}
