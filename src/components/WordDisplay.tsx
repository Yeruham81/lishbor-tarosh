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

  return (
    <div className={`flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-3 ${shake ? "animate-shake" : ""}`} dir="rtl">
      {finalGroups.map((group, gi) => (
        <div key={gi} className="flex gap-1.5 sm:gap-2" dir="rtl">
          {group.map((ch, i) => (
            <div
              key={i}
              className={`w-9 h-11 sm:w-12 sm:h-14 rounded-lg flex items-center justify-center font-display font-extrabold text-xl sm:text-2xl border-b-4 transition-all
                ${ch
                  ? "bg-card border-primary text-foreground shadow-card animate-letter-pop"
                  : "bg-muted/30 border-border/60"}`}
            >
              {ch ?? ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
