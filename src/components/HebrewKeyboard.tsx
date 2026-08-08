import { HEBREW_LETTERS } from "@/lib/hebrew";

interface Props {
  onLetter: (l: string) => void;
  disabled?: boolean;
  revealed: string[];
  wrong: string[];
}

// 22 Hebrew letters split into 3 balanced rows (8 / 8 / 6)
const ROWS: string[][] = [
  ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"],
  ["ט", "י", "כ", "ל", "מ", "נ", "ס", "ע"],
  ["פ", "צ", "ק", "ר", "ש", "ת"],
];

// Safety guard in case HEBREW_LETTERS gets out of sync
void HEBREW_LETTERS;

export function HebrewKeyboard({ onLetter, disabled, revealed, wrong }: Props) {
  return (
    <div className="space-y-1.5 sm:space-y-2 max-w-2xl mx-auto" dir="rtl">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map((l) => {
            const isCorrect = revealed.includes(l);
            const isWrong = wrong.includes(l);
            const used = isCorrect || isWrong;
            return (
              <button
                key={l}
                disabled={disabled || used}
                onClick={() => onLetter(l)}
                className={`flex-1 max-w-[12%] aspect-[5/6] sm:aspect-[6/5] lg:aspect-[5/4] min-h-[40px] sm:min-h-[48px] rounded-lg font-display font-bold text-base sm:text-xl transition shadow-key
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
      ))}
    </div>
  );
}
