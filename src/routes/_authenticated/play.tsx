import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { HebrewKeyboard } from "@/components/HebrewKeyboard";
import { WordSlots } from "@/components/WordDisplay";
import { getNextClue, guessLetter, useHint, guessFullAnswer, getProfile } from "@/lib/game.functions";
import { toast } from "sonner";
import { Lightbulb, RotateCw, Trophy, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/play")({ component: Play });

function Play() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const fetchClue = useServerFn(getNextClue);
  const fetchProfile = useServerFn(getProfile);
  const doGuess = useServerFn(guessLetter);
  const doHint = useServerFn(useHint);
  const doFull = useServerFn(guessFullAnswer);
  const qc = useQueryClient();

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });
  const clueQ = useQuery({ queryKey: ["clue"], queryFn: () => fetchClue(), enabled: !!user });

  const [revealed, setRevealed] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [fullGuess, setFullGuess] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (clueQ.data) {
      setRevealed(clueQ.data.progress.revealed_letters || []);
      setWrong((clueQ.data.progress.wrong_guesses || []).filter((w: string) => !w.startsWith("__full")));
      setSolved(clueQ.data.progress.is_solved);
    }
  }, [clueQ.data]);

  const clue = clueQ.data?.clue;

  const onLetter = async (l: string) => {
    if (!clue || solved) return;
    try {
      const r = await doGuess({ data: { clueId: clue.id, letter: l } });
      setRevealed(r.revealed);
      setWrong(r.wrong.filter((w: string) => !w.startsWith("__full")));
      if (!r.isCorrect) { setShake(true); setTimeout(() => setShake(false), 400); }
      if (r.solved) { setSolved(true); toast.success("🎉 פתרת את החידה!"); qc.invalidateQueries({ queryKey: ["profile"] }); }
    } catch (e: any) { toast.error(e.message); }
  };

  const onHint = async () => {
    if (!clue || solved) return;
    try {
      const r = await doHint({ data: { clueId: clue.id } });
      setRevealed(r.revealed);
      if (r.solved) { setSolved(true); toast.success("🎉 נפתר עם רמז!"); qc.invalidateQueries({ queryKey: ["profile"] }); }
      else toast.info(`רמז: האות "${r.letter}" נחשפה`);
    } catch (e: any) { toast.error(e.message); }
  };

  const onFull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clue || !fullGuess.trim()) return;
    try {
      const r = await doFull({ data: { clueId: clue.id, guess: fullGuess.trim() } });
      if (r.correct) { setSolved(true); toast.success(`🎉 +${r.earned} נקודות!`); qc.invalidateQueries({ queryKey: ["profile"] }); }
      else { setShake(true); setTimeout(() => setShake(false), 400); toast.error("לא נכון, נסו שוב"); }
      setFullGuess("");
    } catch (e: any) { toast.error(e.message); }
  };

  const next = () => { qc.invalidateQueries({ queryKey: ["clue"] }); setFullGuess(""); };

  // Build mask for slots
  const mask: (string | null)[] = clue ? Array.from({ length: clue.length }).map((_, i) => {
    // we don't know answer client-side; show revealed letters at known positions only if solved data has them
    // For UX: when revealed list has letters, we can't position without answer. So we show revealed count via question text.
    return null;
  }) : [];
  // Better: rely on revealed letters fully when solved (server returns full revealed for solved).
  // For unsolved state, show count of "revealed" letters across slots based on first-match positions — we'd need the answer.
  // Simplification: show revealed letters as a list above, and slots empty until solved.

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="ניקוד" value={profileQ.data?.total_score ?? 0} icon={<Trophy className="size-4" />} />
          <Stat label="רמה" value={profileQ.data?.level ?? 1} />
          <Stat label="רצף" value={profileQ.data?.current_streak ?? 0} icon={<Flame className="size-4 text-orange-500" />} />
        </div>

        {clueQ.isLoading && <div className="text-center py-20 text-muted-foreground">טוען חידה...</div>}

        {clue && (
          <div className={`bg-card border rounded-3xl shadow-card p-6 sm:p-8 ${shake ? "animate-shake" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              {clue.category && <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{clue.category}</span>}
              <span className="text-xs text-muted-foreground">קושי: {"★".repeat(clue.difficulty)}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center my-6">{clue.clue}</h2>

            {/* Revealed letters chips */}
            <div className="flex justify-center gap-2 mb-4 min-h-[3.5rem] flex-wrap">
              {revealed.length === 0 ? (
                <p className="text-sm text-muted-foreground">אורך התשובה: {clue.length} אותיות</p>
              ) : (
                revealed.map((l, i) => (
                  <div key={i} className="w-11 h-11 rounded-lg bg-gradient-sunset text-white font-display font-extrabold text-xl flex items-center justify-center shadow-glow animate-letter-pop">{l}</div>
                ))
              )}
            </div>

            {!solved ? (
              <>
                <div className="mb-6">
                  <HebrewKeyboard onLetter={onLetter} revealed={revealed} wrong={wrong} />
                </div>

                <form onSubmit={onFull} className="flex gap-2 mb-4">
                  <input value={fullGuess} onChange={(e) => setFullGuess(e.target.value)} placeholder="ניחוש מלא של המילה..." dir="rtl"
                    className="flex-1 px-4 py-3 rounded-xl border bg-background text-right" />
                  <button className="px-5 py-3 rounded-xl bg-accent text-accent-foreground font-bold hover:opacity-90 transition">נחש</button>
                </form>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button onClick={onHint} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warning text-warning-foreground font-medium hover:opacity-90 transition">
                    <Lightbulb className="size-4" /> רמז (-15 נק׳)
                  </button>
                  <button onClick={next} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-card hover:bg-muted transition">
                    <RotateCw className="size-4" /> דלג
                  </button>
                </div>

                {wrong.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">ניחושים שגויים: {wrong.length}</p>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-display text-2xl font-bold mb-4">כל הכבוד!</h3>
                <button onClick={next} className="px-6 py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:scale-105 transition">
                  חידה הבאה →
                </button>
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
