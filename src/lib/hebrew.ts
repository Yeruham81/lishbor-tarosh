// Hebrew letter utilities. Treats final letters as equivalent to their regular forms.
export const HEBREW_LETTERS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר",
  "ש", "ת",
] as const;

const FINAL_MAP: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};

const TO_FINAL: Record<string, string> = {
  "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ",
};

export function normalizeLetter(ch: string): string {
  if (!ch) return ch;
  return FINAL_MAP[ch] ?? ch;
}

export function toFinalForm(ch: string): string {
  return TO_FINAL[ch] ?? ch;
}

export function normalizeWord(word: string): string {
  return word.split("").map(normalizeLetter).join("");
}

export function levelFromScore(score: number): number {
  return Math.max(1, Math.floor(Math.sqrt(score / 125)) + 1);
}

export function scoreForNextLevel(level: number): number {
  return Math.pow(level, 2) * 125;
}

/**
 * Build a positional mask of the answer.
 * For each position: if the letter (normalized) is in revealed[], return its
 * display form (with final form when at end of word). Otherwise null.
 * Spaces are returned as " ".
 */
export function buildRevealMask(answer: string, revealed: string[]): (string | null)[] {
  const words = answer.split(" ");
  const out: (string | null)[] = [];
  words.forEach((word, wi) => {
    const chars = word.split("");
    chars.forEach((ch, i) => {
      const base = normalizeLetter(ch);
      if (revealed.includes(base)) {
        const isLast = i === chars.length - 1;
        out.push(isLast ? toFinalForm(base) : base);
      } else {
        out.push(null);
      }
    });
    if (wi < words.length - 1) out.push(" ");
  });
  return out;
}

export function wordLengths(answer: string): number[] {
  return answer.split(" ").map((w) => w.length);
}
