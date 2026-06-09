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
import { scoreForNextLevel } from "@/lib/hebrew";
import { toast } from "sonner";
import { Lightbulb, SkipForward, Trophy, Flame, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play")({ component: Play });

type ClueState = Awaited<ReturnType<typeof getNextClue>>;

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
    } catch {}
  };

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });

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
    if (!clue?.isSolved || !profileQ.data?.auto_next || autoCancelled) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clue?.isSolved, clue?.id, profileQ.data?.auto_next, autoCancelled]);

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
      if (!isCorrect) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
      if (r.isSolved) {
        toast.success(`🎉 פתרת את ההגדרה! +${r.currentScore} נקודות`);
        qc.invalidateQueries({ queryKey: ["profile"] });
      }
    } catch (e: any) {
      toast.error(e.message);
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
      if (r.isSolved) {
        toast.success("🎉 נפתר עם רמז!");
        qc.invalidateQueries({ queryKey: ["profile"] });
      } else toast.info("נחשפה אות חדשה");
    } catch (e: any) {
      toast.error(e.message);
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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const profile = profileQ.data;
  const nextLevelAt = profile ? scoreForNextLevel(profile.level) : 0;
  const prevLevelAt = profile ? scoreForNextLevel(profile.level - 1) : 0;
  const levelProgress =
    profile && nextLevelAt > prevLevelAt
      ? Math.min(100, Math.max(0, ((profile.total_score - prevLevelAt) / (nextLevelAt - prevLevelAt)) * 100))
      : 0;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="ניקוד כולל" value={profile?.total_score ?? 0} icon={<Trophy className="size-4" />} />
          <Stat label="שלב נוכחי" value={profile?.level ?? 1} icon={<Star className="size-4 text-warning" />} />
          <Stat label="רצף" value={profile?.current_streak ?? 0} icon={<Flame className="size-4 text-orange-500" />} />
        </div>

        {/* Level progress */}
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
          <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-8">
            {!clue.isSolved && (
              <div className="grid grid-cols-3 items-center mb-4">
                <div className="text-sm text-muted-foreground justify-self-start">
                  נקודות: <b className="text-foreground">{clue.currentScore}</b>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={onHint}
                    disabled={busy || clue.wrong.length < 2}
                    title={clue.wrong.length < 2 ? "זמין אחרי 2 טעויות" : ""}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Lightbulb className="size-4" /> רמז
                  </button>
                  <button
                    onClick={onSkip}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-sm hover:bg-muted transition disabled:opacity-50"
                  >
                    <SkipForward className="size-4" /> דלג
                  </button>
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

            {clue.category && (
              <div className="flex justify-center mb-2">
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">{clue.category}</span>
              </div>
            )}

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center my-5 leading-snug">{clue.clue}</h2>

            {/* Word boxes */}
            <div className="my-6">
              <WordBoxes wordLengths={clue.wordLengths} mask={clue.mask} shake={shake} />
            </div>

            {/* Hints used (if any) */}
            {!clue.isSolved && clue.hintsUsed > 0 && (
              <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>
                  רמזים: <b className="text-warning">{clue.hintsUsed}</b>
                </span>
              </div>
            )}

            {!clue.isSolved ? (
              <div className="mb-2">
                <HebrewKeyboard onLetter={onLetter} revealed={clue.revealed} wrong={clue.wrong} disabled={busy} />
              </div>
            ) : (
              <div
                className="text-center py-6 animate-fade-in space-y-6"
                // Any interaction inside the success screen cancels auto-advance,
                // EXCEPT clicks on the explicit "next" button (which calls onSkip directly).
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
                <div>
                  <div className="text-6xl mb-3 animate-letter-pop">🎉</div>
                  <h3 className="font-display text-2xl font-bold mb-1">כל הכבוד!</h3>
                  <p className="text-muted-foreground">+{clue.currentScore} נקודות</p>
                </div>

                <div className="flex flex-col items-center gap-2">
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

                <ClueRating clueId={clue.id} />

                <div className="space-y-3">
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
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-3 text-center shadow-card">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
