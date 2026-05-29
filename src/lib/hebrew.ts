// Hebrew letter utilities. Treats final letters as equivalent to their regular forms.
export const HEBREW_LETTERS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר",
  "ש", "ת",
] as const;

const FINAL_MAP: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};

export function normalizeLetter(ch: string): string {
  if (!ch) return ch;
  return FINAL_MAP[ch] ?? ch;
}

export function normalizeWord(word: string): string {
  return word.split("").map(normalizeLetter).join("");
}

export function levelFromScore(score: number): number {
  // Quadratic-ish progression: level n requires n*250 points
  return Math.max(1, Math.floor(Math.sqrt(score / 125)) + 1);
}

export function scoreForNextLevel(level: number): number {
  return Math.pow(level, 2) * 125;
}
