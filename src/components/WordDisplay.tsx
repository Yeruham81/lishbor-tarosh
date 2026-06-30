interface Props {
  wordLengths: number[];
  mask: (string | null)[]; // includes spaces between words
  shake?: boolean;
}

export function WordBoxes({ wordLengths, mask, shake }: Props) {
  // Split mask into word groups by spaces
  const groups: (string | null)[][] = [];
  let cur: (string | null)[] = [];
  for (const m of mask) {
    if (m === " ") { groups.push(cur); cur = []; }
    else cur.push(m);
  }
  groups.push(cur);

  // Fallback: if mask empty/mismatched, build from lengths
  const finalGroups = groups.length === wordLengths.length
    ? groups
    : wordLengths.map((len) => Array.from({ length: len }, () => null as string | null));

  // Adapt tile sizing for long answers so all letters fit in one row on mobile
  // without horizontal scrolling. Desktop sizing is unchanged.
  const maxLen = Math.max(1, ...wordLengths);
  const tileClass =
    maxLen <= 8
      ? "w-9 h-11 sm:w-12 sm:h-14 text-xl sm:text-2xl"
      : maxLen <= 10
      ? "w-7 h-9 sm:w-12 sm:h-14 text-base sm:text-2xl"
      : "w-6 h-8 sm:w-12 sm:h-14 text-sm sm:text-2xl";
  const letterGap = maxLen <= 8 ? "gap-1.5 sm:gap-2" : "gap-0.5 sm:gap-2";
  const wordGap = maxLen <= 8 ? "gap-x-4 sm:gap-x-6" : "gap-x-2 sm:gap-x-6";

  return (
    <div
      className={`flex flex-wrap justify-center ${wordGap} gap-y-2 sm:gap-y-3 max-w-full ${shake ? "animate-shake" : ""}`}
      dir="rtl"
    >
      {finalGroups.map((group, gi) => (
        <div key={gi} className={`flex ${letterGap}`} dir="rtl">
          {group.map((ch, i) => (
            <div
              key={i}
              className={`${tileClass} rounded-lg flex items-center justify-center font-display font-extrabold border-b-4 transition-all
                ${ch
                  ? "bg-card border-primary text-foreground shadow-card animate-letter-pop"
                  : "bg-muted border-border shadow-sm"}`}
            >
              {ch ?? ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
