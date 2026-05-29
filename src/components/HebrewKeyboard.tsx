import { HEBREW_LETTERS } from "@/lib/hebrew";

interface Props {
  onLetter: (l: string) => void;
  disabled?: boolean;
  revealed: string[];
  wrong: string[];
}

export function HebrewKeyboard({ onLetter, disabled, revealed, wrong }: Props) {
  return (
    <div className="grid grid-cols-7 sm:grid-cols-11 gap-1.5 sm:gap-2 max-w-2xl mx-auto" dir="rtl">
      {HEBREW_LETTERS.map((l) => {
        const isCorrect = revealed.includes(l);
        const isWrong = wrong.includes(l);
        const used = isCorrect || isWrong;
        return (
          <button
            key={l}
            disabled={disabled || used}
            onClick={() => onLetter(l)}
            className={`h-11 sm:h-12 rounded-lg font-display font-bold text-lg sm:text-xl transition shadow-key
              ${isCorrect ? "bg-success text-success-foreground" : ""}
              ${isWrong ? "bg-destructive/80 text-destructive-foreground opacity-60" : ""}
              ${!used ? "bg-card hover:bg-primary hover:text-primary-foreground active:scale-95" : ""}
              disabled:cursor-not-allowed`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
