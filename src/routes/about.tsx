import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { canonical, publicPageMeta } from "@/lib/site";
import { Brain, Mail, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: publicPageMeta({
      title: "אודות לשבור ת'ראש — משחק הגדרות היגיון בעברית",
      description:
        "הכירו את לשבור ת'ראש: משחק הגדרות היגיון עברי מקורי המשלב ידע כללי, שעשועי מילים וחשיבה יצירתית.",
      path: "/about",
    }),
    links: [canonical("/about")],
  }),
});

function AboutPage() {
  return (
    <AppShell>
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
        <article className="space-y-8">
          <header className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
              <Brain className="size-7" />
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-gradient-sunset">
              אודות לשבור ת'ראש
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              לשבור ת'ראש הוא משחק הגדרות היגיון בעברית, המשלב ידע כללי, שעשועי מילים וחשיבה יצירתית. בכל סיבוב
              מוצגת הגדרה קצרה בעלת פתרון מאתגר ומפתיע. המטרה במשחק היא להפעיל את הראש, לפתור את ההגדרה ולזהות את
              דרך החשיבה שעומדת מאחוריה.
            </p>
          </header>

          <AboutSection icon={<Sparkles className="size-6" />} title="זה ממש לא רק ידע">
            <p>
              כדי לפתור הגדרת היגיון צריך מידה מסוימת של ידע והיכרות עם הנושא שעליו היא מדברת, אבל זה כשלעצמו לא
              תמיד מספיק. הגדרת היגיון טובה דורשת לחשוב מחוץ לקופסה, לקרוא או לפרש את הכתוב בדרך קצת אחרת, לזהות
              כפל משמעות, לפצל או לחבר מילים, לשנות את סדר האותיות, לאתר קיצורים וראשי תיבות, להשתמש בגימטריה —
              ובעיקר לצפות לכך שהפתרון עשוי להגיע מכיוון מפתיע.
            </p>
            <p>
              האותיות הנחשפות במהלך המשחק מספקות רמזים נוספים ועוזרות לצמצם בהדרגה את האפשרויות. בתום הסיבוב ניתן
              לקרוא את ההסבר ולגלות כיצד כל חלק בהגדרה הוביל לתשובה.
            </p>
          </AboutSection>

          <AboutSection icon={<Brain className="size-6" />} title="הרעיון מאחורי המשחק">
            <p>
              לשבור ת'ראש נוצר מתוך רצון ליצור משחק עברי מקורי, ידידותי ופשוט להפעלה, שיחדד את המחשבה ובאותו זמן
              יגרום הנאה. אפשר להיכנס אליו כשיש לכם כמה דקות פנויות, לפתור מספר הגדרות ולחזור אליו מאוחר יותר — בכל
              פעם מחדש תפגשו הגדרות מפתיעות, מקוריות ומהנות.
            </p>
            <p>
              לשבור ת'ראש אינו מבחן ידע או בדיקת רמה. הוא מזמין את כל מי שמשחק בו לנסות, לחשוב, לטעות וללמוד לזהות
              בהדרגה את התבניות החוזרות והטריקים הנפוצים שעומדים בבסיסן של רוב הגדרות ההיגיון.
            </p>
          </AboutSection>

          <AboutSection icon={<Users className="size-6" />} title="למי המשחק מתאים?">
            <p>
              המשחק מתאים לחובבי חידות, תשבצים ומשחקי מילים, אך כדי לשחק בו לא נדרש ניסיון קודם. פותרים מתחילים
              יכולים ללמוד מההסברים ולהשתפר מהגדרה להגדרה. חובבי תשבצי היגיון ותיקים יכולים למצוא בכל סיבוב אתגר
              חדש.
            </p>
            <p>
              אפשר להתחיל במשחק לדוגמה שאינו דורש הרשמה. המשחק המלא זמין בחינם ומאפשר לשמור את ההתקדמות, לצבור
              נקודות, לעבור שלבים, להשלים אתגרים ולעקוב אחר ההישגים האישיים.
            </p>
          </AboutSection>

          <AboutSection icon={<Sparkles className="size-6" />} title="הגדרות מקוריות ומשחק שמתפתח">
            <p>
              מאגר ההגדרות העצום של לשבור ת'ראש כולל הגדרות מקוריות במגוון נושאים וברמות קושי שונות. הגדרות חדשות
              מתווספות כל הזמן, והמשוב של השחקנים עוזר לזהות אילו הגדרות מוצלחות במיוחד ואילו דורשות שיפור או בחינה
              מחדש.
            </p>
            <p>
              שחקנים רשומים יכולים גם להציע הגדרות מקוריות משלהם. הגדרות מתאימות משולבות במשחק ומזכות את השחקנים
              שהציעו אותן בניקוד בונוס.
            </p>
          </AboutSection>

          <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6 sm:p-8 text-center">
            <Mail className="size-8 mx-auto text-primary" />
            <h2 className="font-display text-2xl font-bold mt-3">נשמח לשמוע מכם</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              מצאתם תקלה? יש לכם רעיון לשיפור? אתם רוצים לשתף אותנו במשוב? נשמח אם תפנו אלינו בכתובת:
            </p>
            <a
              href="mailto:admin@lishbor-tarosh.fun"
              className="inline-block mt-3 text-primary font-semibold underline underline-offset-4 hover:opacity-80"
            >
              admin@lishbor-tarosh.fun
            </a>
          </section>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/demo"
              className="px-8 py-3 rounded-2xl border-2 border-primary text-primary bg-card font-display font-bold hover:bg-muted transition"
            >
              נסו משחק לדוגמה
            </Link>
            <Link
              to="/instructions"
              className="px-8 py-3 rounded-2xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition"
            >
              איך משחקים?
            </Link>
          </div>
        </article>
      </main>
    </AppShell>
  );
}

function AboutSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-card shadow-card p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4 text-primary">
        {icon}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}
