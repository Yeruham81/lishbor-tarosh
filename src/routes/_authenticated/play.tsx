import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { HebrewKeyboard } from "@/components/HebrewKeyboard";
import { WordBoxes } from "@/components/WordDisplay";
import { ShareButtons } from "@/components/ShareButtons";
import { ClueRating } from "@/components/ClueRating";
import { getNextClue, guessLetter, useHint, skipClue, getProfile, getClueState } from "@/lib/game.functions";
import { toast } from "sonner";
import { Lightbulb, SkipForward } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GameTopBar } from "@/components/GameTopBar";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { useSolveNotifications, type SolveEvent } from "@/components/SolveNotifications";
import { PageAdLayout } from "@/components/ads/PageAdLayout";
import { type AccessibilityPrefs, type NotificationPrefs } from "@/lib/profile-preferences";

export const Route = createFileRoute("/_authenticated/play")({ component: Play });

type ClueState = Awaited<ReturnType<typeof getNextClue>>;

function solveEventsFrom(result: unknown): SolveEvent[] | undefined {
  if (typeof result !== "object" || result === null || !("events" in result)) return undefined;
  return Array.isArray(result.events) ? (result.events as SolveEvent[]) : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "אירעה שגיאה. נסו שוב";
}

function Play() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const fetchClue = useServerFn(getNextClue);
  const fetchClueState = useServerFn(getClueState);
  const fetchProfile = useServerFn(getProfile);
  const doGuess = useServerFn(guessLetter);
  const doHint = useServerFn(useHint);
  const doSkip = useServerFn(skipClue);
  const qc = useQueryClient();
  const flags = useFeatureFlags();

  // localStorage key — per-user so different accounts on the same browser don't collide.
  const storageKey = user ? `play:currentClueId:${user.id}` : null;
  const readStoredClueId = () => {
    if (!storageKey || typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };
  const writeStoredClueId = (id: string | null) => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  };

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  // Resume by stored clue id first (handles solved-but-not-advanced + post-refresh).
  // Falls back to getNextClue when there's no stored id or it can no longer be resolved.
  const clueQ = useQuery({
    queryKey: ["clue", user?.id ?? "anon"],
    queryFn: async () => {
      const storedId = readStoredClueId();
      if (storedId) {
        try {
          const restored = await fetchClueState({ data: { clueId: storedId } });
          if (restored) return restored;
        } catch {
          /* fall through */
        }
        writeStoredClueId(null);
      }
      const next = await fetchClue();
      if (next && !("exhausted" in next)) writeStoredClueId(next.id);
      return next;
    },
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const [state, setState] = useState<ClueState | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const prevRevealedCount = useRef(0);
  const notificationPrefs = (profileQ.data?.notification_prefs ?? {}) as NotificationPrefs;
  const accessibilityPrefs = (profileQ.data?.accessibility_prefs ?? {}) as AccessibilityPrefs;
  const notif = useSolveNotifications({
    muteLevelUp: !!notificationPrefs.mute_level_up,
    muteChallenges: !!notificationPrefs.mute_challenge,
    screenReader: !!accessibilityPrefs.screen_reader,
  });

  // Auto-advance countdown (seconds remaining, or null when inactive)
  const [countdown, setCountdown] = useState<number | null>(null);
  // Once the user interacts with the success screen (other than "next"),
  // we cancel the auto-advance for THIS solved clue permanently.
  const [autoCancelled, setAutoCancelled] = useState(false);
  const lastClueIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (clueQ.data && !("exhausted" in clueQ.data)) {
      setState(clueQ.data);
      prevRevealedCount.current = clueQ.data.revealed.length;
      writeStoredClueId(clueQ.data.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clueQ.data]);

  // Prefer derived state from query so the first render after restore
  // immediately shows letters without waiting for setState/useEffect.
  const liveState: ClueState | null = state ?? clueQ.data ?? null;
  const exhausted = liveState && "exhausted" in liveState;
  const clue = liveState && !("exhausted" in liveState) ? liveState : null;

  // Reset cancellation flag whenever the active clue changes
  useEffect(() => {
    if (clue?.id && clue.id !== lastClueIdRef.current) {
      lastClueIdRef.current = clue.id;
      setAutoCancelled(false);
      setCountdown(null);
    }
  }, [clue?.id]);

  // Drive the auto-advance countdown after a solve, if the user opted in
  // and they haven't cancelled by interacting with the success screen.
  useEffect(() => {
    if (!clue?.isSolved || !profileQ.data?.is_paid || !profileQ.data?.auto_next || autoCancelled) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [clue?.isSolved, clue?.id, profileQ.data?.is_paid, profileQ.data?.auto_next, autoCancelled]);

  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      onSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const cancelAutoAdvance = () => {
    if (!autoCancelled) setAutoCancelled(true);
    setCountdown(null);
  };

  const onLetter = async (l: string) => {
    if (!clue || clue.isSolved || busy) return;
    setBusy(true);
    try {
      const r = await doGuess({ data: { clueId: clue.id, letter: l } });
      const isCorrect = r.revealed.length > prevRevealedCount.current;
      prevRevealedCount.current = r.revealed.length;
      setState(r);
      qc.setQueryData(["clue", user?.id ?? "anon"], r);
      if (!isCorrect) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
      if (r.isSolved) {
        toast.success(`🎉 פתרת את ההגדרה! +${r.currentScore} נקודות`);
        qc.invalidateQueries({ queryKey: ["profile"] });
      }
      notif.emit(solveEventsFrom(r));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onHint = async () => {
    if (!clue || clue.isSolved || busy) return;
    setBusy(true);
    try {
      const r = await doHint({ data: { clueId: clue.id } });
      prevRevealedCount.current = r.revealed.length;
      setState(r);
      qc.setQueryData(["clue", user?.id ?? "anon"], r);
      if (r.isSolved) {
        toast.success("🎉 נפתר עם רמז!");
        qc.invalidateQueries({ queryKey: ["profile"] });
      } else toast.info("נחשפה אות חדשה");
      notif.emit(solveEventsFrom(r));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    if (!clue || busy) return;
    if (!clue.isSolved && !confirm("לדלג על ההגדרה? תאבדו את הרצף ו-10 נקודות.")) return;
    setBusy(true);
    try {
      if (!clue.isSolved) await doSkip({ data: { clueId: clue.id } });
      // The user explicitly advances — clear the stored id so the next fetch picks fresh.
      writeStoredClueId(null);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      const next = await fetchClue();
      if (next && !("exhausted" in next)) {
        prevRevealedCount.current = next.revealed.length;
        setState(next);
        writeStoredClueId(next.id);
      }
      qc.setQueryData(["clue", user?.id ?? "anon"], next);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const profile = profileQ.data;

  // Ad cycle: shared across all /play placements. Changes ONLY when a new
  // clue.id is active. Solved-state UI, score, hints, likes, shares and
  // rerenders leave it unchanged, so ads are not replaced mid-clue.
  const adCycleKey = clue?.id ?? "no-clue";

  return (
    <AppShell>
      {notif.progressModal}
      {notif.screenReaderAnnouncement}
      <PageAdLayout screen="play" cycleKey={adCycleKey}>
        <div className="container mx-auto px-4 py-2 max-w-4xl">
          <GameTopBar profile={profile} helpVariant="help" />

          {clueQ.isLoading && <div className="text-center py-20 text-muted-foreground">טוען הגדרה...</div>}
          {clueQ.error && <div className="text-center py-20 text-destructive">{(clueQ.error as Error).message}</div>}
          {exhausted && (
            <div className="text-center py-16 bg-card border rounded-3xl shadow-card">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="font-display text-2xl font-bold mb-2">פתרת את כל ההגדרות הזמינות!</h2>
              <p className="text-muted-foreground">הגדרות חדשות בדרך — חזרו בקרוב.</p>
            </div>
          )}

          {clue && (
            <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-6 lg:p-5">
              {!clue.isSolved && (
                <div className="grid grid-cols-3 items-center mb-3 sm:mb-2">
                  <div className="text-sm text-muted-foreground justify-self-start">
                    נקודות: <b className="text-foreground">{clue.currentScore}</b>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {flags.allowHints && (
                      <button
                        onClick={onHint}
                        disabled={busy || clue.wrong.length < 2}
                        title={clue.wrong.length < 2 ? "זמין אחרי 2 טעויות" : ""}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Lightbulb className="size-4" /> רמז
                      </button>
                    )}
                    {flags.allowSkip && (
                      <button
                        onClick={onSkip}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-sm hover:bg-muted transition disabled:opacity-50"
                      >
                        <SkipForward className="size-4" /> דלג
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 justify-self-end" aria-label="טעויות">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`size-3 rounded-full border ${
                          i < clue.wrong.length ? "bg-destructive border-destructive" : "bg-muted border-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Top area: on sm+ when solved, show celebration to the right of the clue/answer */}
              <div
                className={
                  clue.isSolved ? "sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-6 sm:items-start" : ""
                }
              >
                <div className="min-w-0">
                  {clue.category && (
                    <div className="flex justify-center mb-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                        {clue.category}
                      </span>
                    </div>
                  )}

                  <h2 className="font-display text-2xl sm:text-[1.65rem] lg:text-[1.7rem] font-bold text-center my-4 sm:my-3 leading-snug">
                    {clue.clue}
                  </h2>
                  {clue.credit && clue.credit.trim() && (
                    <div dir="rtl" className="text-center text-xs text-muted-foreground -mt-3 mb-2">
                      הגדרה מאת: {clue.credit}
                    </div>
                  )}

                  {/* Word boxes */}
                  <div className="my-4 sm:my-3">
                    <WordBoxes wordLengths={clue.wordLengths} mask={clue.mask} shake={shake} />
                  </div>
                </div>

                {clue.isSolved && (
                  <div className="hidden sm:flex flex-col items-center justify-center text-center animate-fade-in py-2">
                    <div className="text-6xl mb-3 animate-letter-pop">🎉</div>
                    <h3 className="font-display text-2xl font-bold mb-1">כל הכבוד!</h3>
                    <p className="text-muted-foreground">+{clue.currentScore} נקודות</p>
                  </div>
                )}
              </div>

              {!clue.isSolved ? (
                <div className="mb-0">
                  <HebrewKeyboard onLetter={onLetter} revealed={clue.revealed} wrong={clue.wrong} disabled={busy} />
                </div>
              ) : (
                <div
                  className="py-6 animate-fade-in space-y-3 sm:space-y-8"
                  onPointerDownCapture={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest('[data-next-button="true"]')) return;
                    cancelAutoAdvance();
                  }}
                  onKeyDownCapture={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest('[data-next-button="true"]')) return;
                    cancelAutoAdvance();
                  }}
                >
                  {clue.explanation && clue.explanation.trim() && (
                    <Accordion type="single" collapsible className="text-right">
                      <AccordionItem value="explanation" className="border rounded-xl bg-muted/30 px-4">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          לא סגורים על הפתרון? קבלו הסבר:
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed text-center">
                          {clue.explanation}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  {/* Mobile-only celebration block (desktop/tablet shows it next to the clue) */}
                  <div className="text-center sm:hidden">
                    <div className="text-6xl mb-3 animate-letter-pop">🎉</div>
                    <h3 className="font-display text-2xl font-bold mb-1">כל הכבוד!</h3>
                    <p className="text-muted-foreground">+{clue.currentScore} נקודות</p>
                  </div>

                  {/* Action area: two columns on sm+ — rating (right in RTL) and CTA (left) */}
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
                    <div className="order-2 sm:order-1 flex justify-center">
                      <ClueRating clueId={clue.id} />
                    </div>
                    <div className="order-1 sm:order-2 flex flex-col items-center gap-2">
                      <button
                        data-next-button="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkip();
                        }}
                        disabled={busy}
                        className="px-10 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 transition disabled:opacity-50"
                      >
                        להגדרה הבאה
                      </button>
                      {countdown !== null && countdown > 0 && (
                        <p className="text-sm text-muted-foreground" aria-live="polite">
                          {countdown === 3 ? "מעבר להגדרה הבאה בעוד 3 שניות..." : `להגדרה הבאה: ${countdown}...`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mt-4 sm:mt-0 text-center">
                    <p className="text-xs text-muted-foreground font-medium">שתפו את ההישג ואתגרו חברים</p>
                    <ShareButtons
                      text={`פתרתי "${clue.clue}" ב‑לשבור ת'ראש 🧠 ניקוד: ${clue.currentScore}${profile ? ` | רצף: ${profile.current_streak}` : ""}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageAdLayout>
    </AppShell>
  );
}
