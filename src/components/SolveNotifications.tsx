/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState } from "react";
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
  | {
      id: number;
      kind: "achievement";
      title: string;
      category: "solved" | "perfect" | "perfect_streak" | "play_days";
    };

type SolveNotificationOptions = {
  muteLevelUp?: boolean;
  muteChallenges?: boolean;
  screenReader?: boolean;
};

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
export function useSolveNotifications(options: SolveNotificationOptions = {}) {
  const [queue, setQueue] = useState<ModalEvent[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [spokenUpdate, setSpokenUpdate] = useState("");

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
    const spokenParts: string[] = [];
    let toastDelay = 0;
    let idSeed = Date.now();
    for (const ev of sorted) {
      if (ev.kind === "stage_up") {
        if (options.muteLevelUp) continue;
        toEnqueue.push({ id: ++idSeed, kind: "stage_up", stage: ev.stage });
        spokenParts.push(`עלית לשלב ${ev.stage}`);
      } else if (ev.kind === "achievement") {
        if (options.muteChallenges) continue;
        toEnqueue.push({
          id: ++idSeed,
          kind: "achievement",
          title: ev.title,
          category: ev.category,
        });
        spokenParts.push(`השלמת אתגר: ${ev.title}`);
      } else if (ev.kind === "perfect_bonus") {
        const delay = toastDelay;
        toastDelay += 400;
        setTimeout(() => {
          toast.success(`🔥 רצף מושלם ×${ev.streak}! בונוס +${ev.points} נקודות`, {
            duration: 4000,
          });
        }, delay);
        spokenParts.push(`רצף מושלם ${ev.streak}. בונוס ${ev.points} נקודות`);
      } else if (ev.kind === "score") {
        const id = Date.now() + Math.random();
        setBursts((b) => [...b, { id, text: `+${ev.points}` }]);
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
        spokenParts.push(`נוספו ${ev.points} נקודות`);
      }
    }
    if (toEnqueue.length) setQueue((q) => [...q, ...toEnqueue]);
    if (options.screenReader && spokenParts.length) {
      setSpokenUpdate("");
      window.setTimeout(() => setSpokenUpdate(spokenParts.join(". ")), 0);
    }
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

  const screenReaderAnnouncement = options.screenReader ? (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {spokenUpdate}
    </p>
  ) : null;

  // Backward-compat alias: previous API exposed `stageBanner`.
  return { emit, progressModal, stageBanner: progressModal, scoreBurst, screenReaderAnnouncement };
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  // Escape is a dialog-level shortcut. Enter/Space are left to focused
  // buttons so one key press cannot dismiss two queued messages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (!controls.length) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = controls[0];
        const last = controls[controls.length - 1];
        const active = document.activeElement;

        if (!controls.includes(active as HTMLElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const isStage = event.kind === "stage_up";

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`progression-title-${event.id}`}
      aria-describedby={`progression-description-${event.id}`}
      tabIndex={-1}
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
            <div id={`progression-title-${event.id}`} className="font-display text-5xl font-extrabold my-2 drop-shadow">
              שלב {event.stage}
            </div>
            <div id={`progression-description-${event.id}`} className="text-base opacity-95">
              המון הגדרות חדשות מחכות לך
            </div>
            <Trophy aria-hidden="true" className="absolute -top-4 -right-4 size-10 text-yellow-300 drop-shadow" />
          </>
        ) : (
          <>
            <div className="text-sm font-medium opacity-90">הישג חדש נפתח</div>
            <div
              id={`progression-title-${event.id}`}
              className="font-display text-2xl sm:text-3xl font-extrabold my-2 drop-shadow"
            >
              {event.title}
            </div>
            <div id={`progression-description-${event.id}`} className="text-sm opacity-90">
              כל הכבוד! 🏆
            </div>
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
