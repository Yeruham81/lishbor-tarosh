import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { rateClue, getMyRating } from "@/lib/social.functions";
import { toast } from "sonner";

export function ClueRating({ clueId }: { clueId: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [busy, setBusy] = useState(false);
  const rate = useServerFn(rateClue);
  const fetchMine = useServerFn(getMyRating);

  useEffect(() => {
    let active = true;
    fetchMine({ data: { clueId } })
      .then((r) => {
        if (active) setRating(r.rating);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clueId, fetchMine]);

  const click = async (v: 1 | -1) => {
    if (busy) return;
    setBusy(true);
    const prev = rating;
    setRating(v);
    try {
      await rate({ data: { clueId, rating: v } });
      toast.success(v === 1 ? "תודה על המשוב 💛" : "תודה, נשתפר 🙏");
    } catch (e: any) {
      setRating(prev);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const btn = (active: boolean, color: string) =>
    `inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition ${
      active ? `${color} text-white border-transparent` : "bg-card hover:bg-muted"
    }`;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground font-medium">מה דעתכם על ההגדרה?</p>
      <div className="flex gap-2">
        <button onClick={() => click(1)} disabled={busy} className={btn(rating === 1, "bg-gradient-sunset")}>
          <ThumbsUp className="size-4" /> אהבתי
        </button>
        <button onClick={() => click(-1)} disabled={busy} className={btn(rating === -1, "bg-destructive")}>
          <ThumbsDown className="size-4" /> לא אהבתי
        </button>
      </div>
    </div>
  );
}
