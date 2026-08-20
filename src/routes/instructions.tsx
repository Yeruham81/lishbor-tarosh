import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { canonical, publicPageMeta } from "@/lib/site";
import { BookOpen, CheckCircle2, Lightbulb, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/instructions")({
  component: InstructionsPage,
  head: () => ({
    meta: publicPageMeta({
      title: "איך משחקים לשבור ת'ראש — הוראות, ניקוד וטיפים",
      description:
        "כל מה שצריך לדעת כדי לשחק לשבור ת'ראש: חוקי המשחק, שיטת הניקוד, שימוש ברמזים וטיפים לפתרון הגדרות היגיון.",
      path: "/instructions",
    }),
    links: [canonical("/instructions")],
  }),
});

function InstructionsPage() {
  return (
    <AppShell>
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
        <header className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
            <BookOpen className="size-7" />
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-gradient-sunset">
            איך משחקים לשבור ת'ראש?
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed">
            בכל סיבוב מוצגת הגדרת היגיון קצרה. התשובה מסתתרת מאחורי משחק מילים, כפל משמעות או דרך חשיבה לא צפויה —
            והמטרה היא לחשוף אותה בעזרת המקלדת שעל המסך.
          </p>
        </header>

        <section className="mt-10 rounded-3xl border bg-card shadow-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="size-7 text-primary" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold">מהלך המשחק</h2>
          </div>
          <ol className="space-y-5">
            <Step number="1" title="קוראים את ההגדרה">
              כל מילה בהגדרה עשויה להיות משמעותית, אבל לא תמיד במשמעות הפשוטה והמוכרת שלה. לפעמים צריך לפרק מילה,
              לחבר בין שני רעיונות או לזהות רמז שמסתתר בניסוח.
            </Step>
            <Step number="2" title="בוחרים אותיות">
              אם האות שבחרתם קיימת בתשובה, היא נחשפת בכל המקומות שבהם היא מופיעה. אות שאינה קיימת בתשובה נרשמת
              כטעות, אך שלוש הטעויות הראשונות אינן מורידות נקודות.
            </Step>
            <Step number="3" title="נעזרים במבנה התשובה">
              מספר המשבצות והחלוקה למילים מראים כמה אותיות יש בכל מילה. המידע הזה יכול לעזור לזהות מיליות, שמות,
              צירופים וביטויים מוכרים.
            </Step>
            <Step number="4" title="פותרים וממשיכים">
              כאשר כל האותיות נחשפות, ההגדרה נפתרת והניקוד מתווסף לחשבון. לאחר מכן אפשר לקרוא את ההסבר לפתרון,
              לדרג את ההגדרה ולעבור לאתגר הבא.
            </Step>
          </ol>
        </section>

        <section className="mt-8 rounded-3xl border bg-card shadow-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="size-7 text-primary" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold">איך מחושב הניקוד?</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <ScoreCard title="נקודת הפתיחה" value="10 נקודות">
              כל הגדרה מתחילה בשווי של עשר נקודות. המטרה היא להגיע לפתרון תוך שמירה על כמה שיותר מהן.
            </ScoreCard>
            <ScoreCard title="טעויות" value="3 בחינם">
              שלוש הטעויות הראשונות אינן פוגעות בניקוד. מהטעות הרביעית ואילך יורדת נקודה אחת לכל אות שגויה.
            </ScoreCard>
            <ScoreCard title="רמז" value="2- נקודות">
              לאחר שתי טעויות ניתן לבקש רמז שחושף אות נכונה נוספת. כל שימוש ברמז מוריד שתי נקודות.
            </ScoreCard>
            <ScoreCard title="פתרון מושלם" value="10 נקודות">
              פתרון ללא רמזים ועם שלוש טעויות או פחות נחשב פתרון מושלם וממשיך את רצף ההישגים.
            </ScoreCard>
          </div>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            הניקוד המינימלי לפתרון הוא שתי נקודות. דילוג אינו מוריד נקודות, אך הוא מאפס את הרצף ומעביר אתכם להגדרה
            הבאה. ככל שתצברו יותר נקודות תוכלו להתקדם בשלבים, להשלים אתגרים ולעקוב אחר השיפור לאורך זמן.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border bg-card shadow-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="size-7 text-primary" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold">טיפים לפתרון הגדרות היגיון</h2>
          </div>
          <ul className="space-y-4 text-muted-foreground leading-relaxed">
            <Tip>קראו את ההגדרה כמה פעמים. לעיתים המשמעות הראשונה שקופצת לראש היא דווקא הסחת הדעת.</Tip>
            <Tip>בדקו אם אחת המילים יכולה לשמש גם כפועל, כשם עצם או במשמעות נוספת.</Tip>
            <Tip>שימו לב לקיצורים, ראשי תיבות, שיכול אותיות, גימטריה, חרוזים וצלילים דומים.</Tip>
            <Tip>נסו לפרק מילה לחלקים או לחבר שתי מילים שמופיעות בהגדרה לרעיון חדש.</Tip>
            <Tip>היעזרו באורך המילים. מילה קצרה בת שתי אותיות היא לעיתים קרובות מילת קישור או מילית.</Tip>
            <Tip>לאחר הפתרון קראו את ההסבר. הבנת הדרך חשובה לא פחות מהתשובה ותעזור לזהות תבניות בהמשך.</Tip>
          </ul>
        </section>

        <section className="mt-8 rounded-3xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold mb-5">שאלות נפוצות</h2>
          <div className="space-y-5">
            <Faq question="צריך ידע מוקדם בתשבצי היגיון?">
              לא. המשחק מתאים גם למתחילים. ככל שפותרים יותר הגדרות וקוראים את ההסברים, לומדים לזהות את הטריקים
              הנפוצים ומשתפרים בהדרגה.
            </Faq>
            <Faq question="אפשר לשחק בלי הרשמה?">
              כן. המשחק לדוגמה כולל שלוש הגדרות ואינו דורש הרשמה. המשחק המלא מחייב חשבון כדי לשמור ניקוד,
              התקדמות, שלבים והישגים.
            </Faq>
            <Faq question="מה עושים כשנתקעים?">
              אפשר לנסות אותיות נוספות, להשתמש ברמז לאחר שתי טעויות או לדלג להגדרה הבאה. אין חובה לפתור כל הגדרה
              ברצף.
            </Faq>
          </div>
        </section>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/demo"
            className="px-8 py-3 rounded-2xl border-2 border-primary text-primary bg-card font-display font-bold hover:bg-muted transition"
          >
            נסו משחק לדוגמה
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="px-8 py-3 rounded-2xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition"
          >
            עברו למשחק המלא
          </Link>
        </div>
      </main>
    </AppShell>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="shrink-0 size-9 rounded-full bg-gradient-sunset text-white flex items-center justify-center font-display font-bold">
        {number}
      </span>
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mt-1 text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function ScoreCard({ title, value, children }: { title: string; value: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border bg-muted/25 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-bold">{title}</h3>
        <span className="shrink-0 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-bold">{value}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </article>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <article>
      <h3 className="font-display font-bold text-lg">{question}</h3>
      <p className="mt-1 text-muted-foreground leading-relaxed">{children}</p>
    </article>
  );
}
