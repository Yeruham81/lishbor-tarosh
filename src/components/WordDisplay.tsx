import { normalizeLetter } from "@/lib/hebrew";

interface Props { answer: string; revealed: string[]; }

export function WordDisplay({ answer, revealed }: Props) {
  const letters = answer.split("");
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" dir="rtl">
      {letters.map((ch, i) => {
        if (ch === " ") return <div key={i} className="w-3 sm:w-4" />;
        const shown = revealed.includes(normalizeLetter(ch));
        return (
          <div key={i} className={`w-9 h-11 sm:w-11 sm:h-14 rounded-lg flex items-center justify-center font-display font-extrabold text-xl sm:text-2xl border-b-4 ${shown ? "bg-card border-primary text-foreground shadow-card animate-letter-pop" : "bg-muted/40 border-border text-transparent"}`}>
            {shown ? ch : "_"}
          </div>
        );
      })}
    </div>
  );
}

// Variant without knowing the answer (server hides it) — uses length
export function WordSlots({ length, revealedMask }: { length: number; revealedMask: (string | null)[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" dir="rtl">
      {Array.from({ length }).map((_, i) => {
        const ch = revealedMask[i];
        return (
          <div key={i} className={`w-9 h-11 sm:w-11 sm:h-14 rounded-lg flex items-center justify-center font-display font-extrabold text-xl sm:text-2xl border-b-4 ${ch ? "bg-card border-primary text-foreground shadow-card animate-letter-pop" : "bg-muted/40 border-border"}`}>
            {ch ?? ""}
          </div>
        );
      })}
    </div>
  );
}
