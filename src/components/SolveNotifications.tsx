import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trophy, Sparkles, Award, X } from "lucide-react";

export type SolveEvent =
  | { kind: "score"; points: number }
  | { kind: "perfect_bonus"; points: number; streak: number }
  | { kind: "stage_up"; stage: number }
  | {
      kind: "achievement";
      title: string;
      category: "solved" | "perfect" | "perfect_streak" | "play_days";
      threshold: number;
    };

type Burst = { id: number; text: string };
type ModalEvent =
  | { id: number; kind: "stage_up"; stage: number }
  | { id: number; kind: "achievement"; title: string; category: "solved" | "perfect" | "perfect_streak" | "play_days" };

/**
 * Surfaces solve events as visual notifications:
 * - score: small floating "+N" burst near the anchor (unchanged)
 * - perfect_bonus: toast notification (unchanged — clue-related)
 * - stage_up + achievement: queued blocking modal dialog (one at a time)
 *
 * The modal sits above toasts (z-[200]) and must be acknowledged before the
 * next queued event is shown. Multiple progression events from a single solve
 * are displayed sequentially.
 */
export function useSolveNotifications() {
  const [queue, setQueue] = useState<ModalEvent[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const current = queue[0] ?? null;

  // Lock background scroll & block interaction while a progression modal is open.
  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [current]);

  const dismiss = () => setQueue((q) => q.slice(1));

  const emit = (events: SolveEvent[] | undefined | null) => {
    if (!events || events.length === 0) return;
    // Sort by priority: stage > achievement > perfect_bonus > score
    const order = { stage_up: 0, achievement: 1, perfect_bonus: 2, score: 3 } as const;
    const sorted = [...events].sort((a, b) => order[a.kind] - order[b.kind]);

    const toEnqueue: ModalEvent[] = [];
    let toastDelay = 0;
    let idSeed = Date.now();
    for (const ev of sorted) {
      if (ev.kind === "stage_up") {
        toEnqueue.push({ id: ++idSeed, kind: "stage_up", stage: ev.stage });
      } else if (ev.kind === "achievement") {
        toEnqueue.push({ id: ++idSeed, kind: "achievement", title: ev.title, category: ev.category });
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
    if (toEnqueue.length) setQueue((q) => [...q, ...toEnqueue]);
  };

  const progressModal = useMemo(
    () => (current ? <ProgressionModal event={current} onDismiss={dismiss} remaining={queue.length - 1} /> : null),
    [current, queue.length],
  );

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

  // Backward-compat alias: previous API exposed `stageBanner`.
  return { emit, progressModal, stageBanner: progressModal, scoreBurst };
}

function ProgressionModal({
  event,
  onDismiss,
  remaining,
}: {
  event: ModalEvent;
  onDismiss: () => void;
  remaining: number;
}) {
  // Acknowledge via Enter / Space / Escape as well.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const isStage = event.kind === "stage_up";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      dir="rtl"
    >
      <div className="relative w-full max-w-md text-center bg-gradient-sunset text-white rounded-3xl shadow-glow border-2 border-white/30 p-6 sm:p-8 animate-fade-in">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="סגירה"
          className="absolute top-3 left-3 size-9 rounded-full bg-white/15 hover:bg-white/25 transition flex items-center justify-center"
        >
          <X className="size-5" />
        </button>

        <div className="mx-auto mb-3 size-16 rounded-2xl bg-white/20 flex items-center justify-center">
          {isStage ? <Sparkles className="size-9" /> : <Award className="size-9" />}
        </div>

        {isStage ? (
          <>
            <div className="text-sm font-medium opacity-90">כל הכבוד 🎉</div>
            <div className="font-display text-5xl font-extrabold my-2 drop-shadow">שלב {event.stage}</div>
            <div className="text-base opacity-95"> המון הגדרות חדשות מחכות לך </div>
            <Trophy className="absolute -top-4 -right-4 size-10 text-yellow-300 drop-shadow" />
          </>
        ) : (
          <>
            <div className="text-sm font-medium opacity-90">הישג חדש נפתח</div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold my-2 drop-shadow">{event.title}</div>
            <div className="text-sm opacity-90">כל הכבוד! 🏆</div>
          </>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full py-3 rounded-xl bg-white text-primary font-display font-extrabold hover:bg-white/90 transition shadow-card"
        >
          אישור
        </button>

        {remaining > 0 && (
          <div className="mt-3 text-xs opacity-80">עוד {remaining.toLocaleString("he-IL")} הודעות בהמשך</div>
        )}
      </div>
    </div>
  );
}
