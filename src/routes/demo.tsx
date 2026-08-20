import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HebrewKeyboard } from "@/components/HebrewKeyboard";
import { WordBoxes } from "@/components/WordDisplay";
import { ShareButtons } from "@/components/ShareButtons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trophy, Flame, Star, Lightbulb, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { normalizeLetter, normalizeWord, buildRevealMask, wordLengths } from "@/lib/hebrew";
import { SCORING, computeSolveScore, currentSolveValue } from "@/lib/progression";
import { DEMO_CLUES } from "@/lib/demo-clues";
import { canonical, publicPageMeta, gameApplicationJsonLd, jsonLdScript } from "@/lib/site";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: publicPageMeta({
      title: "משחק הגדרות היגיון לדוגמה — לשבור ת'ראש",
      description: "שלוש הגדרות היגיון מקוריות לטעימה. שחקו בחינם ללא הרשמה, קבלו הסברים וגלו איך המשחק עובד.",
      path: "/demo",
    }),
    links: [canonical("/demo")],
    scripts: [
      jsonLdScript(
        gameApplicationJsonLd({
          name: "לשבור ת'ראש - משחק לדוגמה",
          description: "שלוש הגדרות היגיון לטעימה. שחקו בחינם ללא הרשמה וגלו איך זה עובד.",
          path: "/demo",
        }),
      ),
    ],
  }),
});

type Rating = 1 | -1 | null;

function DemoPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [shake, setShake] = useState(false);
  const [rating, setRating] = useState<Rating>(null);
  const [showFinal, setShowFinal] = useState(false);

  const clue = DEMO_CLUES[index];
  const answerNorm = useMemo(() => normalizeWord(clue.answer), [clue]);
  const currentScore = currentSolveValue(wrong.length, hintsUsed);
  const mask = buildRevealMask(clue.answer, revealed);
  const lengths = wordLengths(clue.answer);
  const progress = `${index + (isSolved ? 1 : 0)}/${DEMO_CLUES.length}`;

  const resetForClue = (newIndex: number) => {
    setIndex(newIndex);
    setRevealed([]);
    setWrong([]);
    setHintsUsed(0);
    setIsSolved(false);
    setRating(null);
  };

  const onLetter = (raw: string) => {
    if (isSolved) return;
    const letter = normalizeLetter(raw);
    if (revealed.includes(letter) || wrong.includes(letter)) return;

    const stripped = answerNorm.replace(/\s/g, "");
    const isCorrect = stripped.includes(letter);

    if (isCorrect) {
      const nextRevealed = [...revealed, letter];
      setRevealed(nextRevealed);
      const solved = answerNorm.split("").every((c) => c === " " || nextRevealed.includes(c));
      if (solved) {
        const earned = computeSolveScore(wrong.length, hintsUsed);
        const perfect = hintsUsed === 0 && wrong.length <= SCORING.FREE_WRONGS;
        setTotalScore((s) => s + earned);
        setStreak((s) => (perfect ? s + 1 : 0));
        setIsSolved(true);
        toast.success(`🎉 פתרת את ההגדרה! +${earned} נקודות`);
      }
    } else {
      setWrong((w) => [...w, letter]);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const onHint = () => {
    if (isSolved) return;
    if (wrong.length < 2) {
      toast.info("הרמז זמין אחרי 2 טעויות");
      return;
    }
    const candidates = Array.from(new Set(answerNorm.split("").filter((c) => c !== " " && !revealed.includes(c))));
    if (candidates.length === 0) return;
    const letter = candidates[Math.floor(Math.random() * candidates.length)];
    const nextRevealed = [...revealed, letter];
    const nextHints = hintsUsed + 1;
    setRevealed(nextRevealed);
    setHintsUsed(nextHints);
    const solved = answerNorm.split("").every((c) => c === " " || nextRevealed.includes(c));
    if (solved) {
      const earned = computeSolveScore(wrong.length, nextHints);
      setTotalScore((s) => s + earned);
      setStreak(0);
      setIsSolved(true);
      toast.success("🎉 נפתר עם רמז!");
    } else {
      toast.info("נחשפה אות חדשה");
    }
  };

  const onNext = () => {
    if (index + 1 >= DEMO_CLUES.length) {
      setShowFinal(true);
      return;
    }
    resetForClue(index + 1);
  };

  const clickRating = (v: 1 | -1) => {
    setRating((prev) => (prev === v ? null : v));
    toast.success(v === 1 ? "תודה על המשוב 💛" : "תודה, נשתפר 🙏");
  };

  if (showFinal) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-12 max-w-lg">
          <div className="bg-card border rounded-3xl shadow-card p-6 sm:p-10 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="font-display text-3xl font-extrabold text-gradient-sunset mb-3">רוצים להמשיך לשחק?</h1>
            <h2 className="font-display text-xl font-bold mb-4">עוד המון הגדרות מחכות לכם!</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              לאחר הליך הרשמה קצרצר תוכלו לשמור את הניקוד שצברתם, לעבור שלבים, להשלים אתגרים, לצפות בסטטיסטיקות אישיות
              ולעקוב אחר ההתקדמות שלכם. כמו כן בכל זמן שתרצו תוכלו להתחבר ולהמשיך לשחק בדיוק מאותה נקודה שבה הפסקתם.
            </p>
            <button
              onClick={() =>
                navigate({
                  to: "/auth",
                  search: { mode: "signup" },
                })
              }
              className="w-full px-8 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 active:scale-95 transition"
            >
              הרשמה
            </button>
            <Link to="/" className="block mt-4 text-sm text-muted-foreground hover:text-foreground">
              ← חזרה למסך הבית
            </Link>
          </div>
          <DemoInformation />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-3 max-w-3xl">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-gradient-sunset text-center mb-3">
          משחק לדוגמה — הגדרות היגיון
        </h1>
        {/* Local top bar — demo scoped, no auth-only links */}

        <div className="grid grid-cols-3 gap-3 mb-4 items-stretch">
          <Stat label="ניקוד" value={totalScore} icon={<Trophy className="size-4" />} />
          <Stat label="שלב" value={1} icon={<Star className="size-4 text-warning" />} />
          <Stat label="רצף" value={streak} icon={<Flame className="size-4 text-orange-500" />} />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium">
            משחק לדוגמה
          </span>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← יציאה
          </Link>
        </div>

        <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-8">
          {!isSolved && (
            <div className="grid grid-cols-3 items-center mb-4">
              <div className="text-sm text-muted-foreground justify-self-start">
                נקודות: <b className="text-foreground">{currentScore}</b>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={onHint}
                  disabled={wrong.length < 2}
                  title={wrong.length < 2 ? "זמין אחרי 2 טעויות" : ""}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Lightbulb className="size-4" /> רמז
                </button>
              </div>
              <div className="flex gap-1.5 justify-self-end" aria-label="טעויות">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`size-3 rounded-full border ${
                      i < wrong.length ? "bg-destructive border-destructive" : "bg-muted border-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center my-5 leading-snug">{clue.clue}</h2>

          <div className="my-6">
            <WordBoxes wordLengths={lengths} mask={mask} shake={shake} />
          </div>

          {!isSolved ? (
            <div className="mb-2">
              <HebrewKeyboard onLetter={onLetter} revealed={revealed} wrong={wrong} disabled={false} />
            </div>
          ) : (
            <div className="py-6 animate-fade-in space-y-6">
              <Accordion type="single" collapsible className="text-right">
                <AccordionItem value="explanation" className="border rounded-xl bg-muted/30 px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    לא סגורים על הפתרון? קבלו הסבר:
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed text-center">
                    {clue.explanation}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="text-center">
                <div className="text-6xl mb-3 animate-letter-pop">🎉</div>
                <h3 className="font-display text-2xl font-bold mb-1">כל הכבוד!</h3>
                <p className="text-muted-foreground">+{currentScore} נקודות</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
                <div className="order-2 sm:order-1 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground font-medium">מה דעתכם על ההגדרה?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => clickRating(1)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        rating === 1 ? "bg-gradient-sunset text-white border-transparent" : "bg-card hover:bg-muted"
                      }`}
                    >
                      <ThumbsUp className="size-4" /> אהבתי
                    </button>
                    <button
                      onClick={() => clickRating(-1)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        rating === -1 ? "bg-destructive text-white border-transparent" : "bg-card hover:bg-muted"
                      }`}
                    >
                      <ThumbsDown className="size-4" /> לא אהבתי
                    </button>
                  </div>
                </div>
                <div className="order-1 sm:order-2 flex flex-col items-center gap-2">
                  <button
                    onClick={onNext}
                    className="px-10 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-lg shadow-glow hover:scale-105 transition"
                  >
                    להגדרה הבאה
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">שתפו את ההישג ואתגרו חברים</p>
                <ShareButtons text={`ניסיתי את "לשבור ת'ראש" 🧠 בואו לשחק גם!`} />
              </div>
            </div>
          )}
        </div>

        <DemoInformation />
      </div>
    </AppShell>
  );
}

function DemoInformation() {
  return (
    <section className="mt-8 space-y-6 text-right" aria-labelledby="demo-about-title">
      <div className="rounded-3xl border bg-card shadow-card p-6 sm:p-8">
        <h2 id="demo-about-title" className="font-display text-2xl sm:text-3xl font-bold">
          מהו משחק הגדרות היגיון?
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          הגדרת היגיון היא חידה קצרה שבה הניסוח עצמו מוביל לפתרון. לפעמים התשובה מבוססת על כפל משמעות, פירוק של מילה,
          קיצור, צליל דומה או חיבור מפתיע בין רעיונות. לא מספיק להכיר עובדות — צריך להתבונן בכל מילה ולשאול אם היא יכולה
          להתפרש בדרך נוספת.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          בדמו של לשבור ת'ראש מחכות שלוש הגדרות מקוריות. בכל אחת מהן אפשר לבחור אותיות, לצבור נקודות, לקבל רמז לאחר שתי
          טעויות ולקרוא הסבר מלא לאחר הפתרון. אין צורך להירשם והניקוד נשמר רק במהלך הביקור הנוכחי.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <InfoCard title="קוראים אחרת">
          בודקים אם למילים בהגדרה יש משמעות נוספת, צליל דומה או תפקיד לא צפוי במשפט.
        </InfoCard>
        <InfoCard title="נעזרים באותיות">
          כל אות נכונה נחשפת בתשובה ומצמצמת את האפשרויות עד שאפשר לזהות את המילה או הביטוי.
        </InfoCard>
        <InfoCard title="לומדים מההסבר">
          לאחר כל פתרון אפשר להבין את דרך החשיבה ולזהות תבניות שיעזרו בהגדרות הבאות.
        </InfoCard>
      </div>

      <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6 sm:p-8 text-center">
        <h2 className="font-display text-2xl font-bold">רוצים להבין את כל הכללים?</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          בעמוד ההוראות תמצאו הסבר על הניקוד, הרמזים, הפתרון המושלם וטיפים לזיהוי משחקי מילים נפוצים.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/instructions"
            className="px-7 py-3 rounded-2xl border-2 border-primary text-primary bg-card font-display font-bold hover:bg-muted transition"
          >
            הוראות וטיפים
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-7 py-3 rounded-2xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition"
          >
            הרשמה למשחק המלא
          </Link>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </article>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-2 text-center shadow-card">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
