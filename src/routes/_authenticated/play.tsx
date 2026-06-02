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
import { getNextClue, guessLetter, useHint, skipClue, getProfile } from "@/lib/game.functions";
import { scoreForNextLevel } from "@/lib/hebrew";
import { toast } from "sonner";
import { Lightbulb, SkipForward, Trophy, Flame, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play")({ component: Play });

type ClueState = Awaited<ReturnType<typeof getNextClue>>;

function Play() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const fetchClue = useServerFn(getNextClue);
  const fetchProfile = useServerFn(getProfile);
  const doGuess = useServerFn(guessLetter);
  const doHint = useServerFn(useHint);
  const doSkip = useServerFn(skipClue);
  const qc = useQueryClient();

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });
  const clueQ = useQuery({ queryKey: ["clue"], queryFn: () => fetchClue(), enabled: !!user, staleTime: Infinity });

  const [state, setState] = useState<ClueState | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const prevRevealedCount = useRef(0);

  useEffect(() => {
    if (clueQ.data && !("exhausted" in clueQ.data)) {
      setState(clueQ.data);
      prevRevealedCount.current = clueQ.data.revealed.length;
    }
  }, [clueQ.data]);

  const exhausted = clueQ.data && "exhausted" in clueQ.data;
  const clue = state && !("exhausted" in state) ? state : null;

  const onLetter = async (l: string) => {
    if (!clue || clue.isSolved || busy) return;
    setBusy(true);
    try {
      const r = await doGuess({ data: { clueId: clue.id, letter: l } });
      const isCorrect = r.revealed.length > prevRevealedCount.current;
      prevRevealedCount.current = r.revealed.length;
      setState(r);
      if (!isCorrect) { setShake(true); setTimeout(() => setShake(false), 400); }
      if (r.isSolved) {
        toast.success(`🎉 פתרת את החידה! +${r.currentScore} נקודות`);
        qc.invalidateQueries({ queryKey: ["profile"] });
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onHint = async () => {
    if (!clue || clue.isSolved || busy) return;
    setBusy(true);
    try {
      const r = await doHint({ data: { clueId: clue.id } });
      prevRevealedCount.current = r.revealed.length;
      setState(r);
      if (r.isSolved) { toast.success("🎉 נפתר עם רמז!"); qc.invalidateQueries({ queryKey: ["profile"] }); }
      else toast.info("נחשפה אות חדשה");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onSkip = async () => {
    if (!clue || busy) return;
    if (!clue.isSolved && !confirm("לדלג על החידה? תאבדו את הרצף ו-10 נקודות.")) return;
    setBusy(true);
    try {
      if (!clue.isSolved) await doSkip({ data: { clueId: clue.id } });
      await qc.invalidateQueries({ queryKey: ["clue"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      const next = await fetchClue();
      if (!("exhausted" in next)) {
        prevRevealedCount.current = next.revealed.length;
        setState(next);
      }
      qc.setQueryData(["clue"], next);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const profile = profileQ.data;
  const nextLevelAt = profile ? scoreForNextLevel(profile.level) : 0;
  const prevLevelAt = profile ? scoreForNextLevel(profile.level - 1) : 0;
  const levelProgress = profile && nextLevelAt > prevLevelAt
    ? Math.min(100, Math.max(0, ((profile.total_score - prevLevelAt) / (nextLevelAt - prevLevelAt)) * 100))
    : 0;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="ניקוד" value={profile?.total_score ?? 0} icon={<Trophy className="size-4" />} />
          <Stat label="רמה" value={profile?.level ?? 1} icon={<Star className="size-4 text-warning" />} />
          <Stat label="רצף" value={profile?.current_streak ?? 0} icon={<Flame className="size-4 text-orange-500" />} />
        </div>

        {/* Level progress */}
        {profile && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>רמה {profile.level}</span>
              <span>{profile.total_score} / {nextLevelAt}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-sunset transition-all duration-500" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        )}

        {clueQ.isLoading && <div className="text-center py-20 text-muted-foreground">טוען חידה...</div>}
        {clueQ.error && <div className="text-center py-20 text-destructive">{(clueQ.error as Error).message}</div>}
        {exhausted && (
          <div className="text-center py-16 bg-card border rounded-3xl shadow-card">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold mb-2">פתרת את כל החידות הזמינות!</h2>
            <p className="text-muted-foreground">חידות חדשות בדרך — חזרו בקרוב.</p>
          </div>
        )}

        {clue && (
          <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-8">
            <div className="flex items-center justify-between mb-2 text-xs">
              {clue.category && <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{clue.category}</span>}
              <span className="text-muted-foreground">קושי: {"★".repeat(clue.difficulty)}</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center my-5 leading-snug">{clue.clue}</h2>

            {/* Word boxes */}
            <div className="my-6">
              <WordBoxes wordLengths={clue.wordLengths} mask={clue.mask} shake={shake} />
            </div>

            {/* Score for this puzzle */}
            <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground mb-4">
              <span>שווי: <b className="text-foreground">{clue.currentScore}</b></span>
              {clue.wrong.length > 0 && <span>טעויות: <b className="text-destructive">{clue.wrong.length}</b></span>}
              {clue.hintsUsed > 0 && <span>רמזים: <b className="text-warning">{clue.hintsUsed}</b></span>}
            </div>

            {!clue.isSolved ? (
              <>
                <div className="mb-6">
                  <HebrewKeyboard onLetter={onLetter} revealed={clue.revealed} wrong={clue.wrong} disabled={busy} />
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={onHint}
                    disabled={busy || clue.wrong.length < 2}
                    title={clue.wrong.length < 2 ? "זמין אחרי 2 טעויות" : ""}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-warning-foreground font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Lightbulb className="size-4" /> רמז (-15)
                  </button>
                  <button
                    onClick={onSkip}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition disabled:opacity-50"
                  >
                    <SkipForward className="size-4" /> דלג (-10)
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 animate-fade-in space-y-6">
                <div>
                  <div className="text-6xl mb-3 animate-letter-pop">🎉</div>
                  <h3 className="font-display text-2xl font-bold mb-1">כל הכבוד!</h3>
                  <p className="text-muted-foreground">+{clue.currentScore} נקודות</p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={onSkip}
                    disabled={busy}
                    className="px-10 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 transition disabled:opacity-50"
                  >
                    להגדרה הבאה ←
                  </button>
                </div>

                <ClueRating clueId={clue.id} />

                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">שתפו את ההישג ואתגרו חברים</p>
                  <ShareButtons
                    text={`פתרתי "${clue.clue}" ב‑מילה חמה 🔥 ניקוד: ${clue.currentScore}${profile ? ` | רצף: ${profile.current_streak}` : ""}`}
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
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</div>
      <div className="font-display text-2xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
