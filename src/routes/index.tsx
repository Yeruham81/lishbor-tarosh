import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Trophy, Zap, Brain } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();

  return (
    <AppShell>
      <section className="container mx-auto px-4 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-sm font-medium mb-6">
            <Sparkles className="size-4 text-primary" />
            המשחק שעושה היגיון
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-black leading-tight mb-4">
            <span className="text-gradient-sunset">לשבור ת'ראש</span>
          </h1>

          <p className="text-[clamp(0.85rem,4vw,1.25rem)] sm:text-xl whitespace-nowrap tracking-tighter text-muted-foreground text-center w-[calc(100%+1rem)] -mx-2 sm:w-auto sm:mx-auto mb-8">
            זה לא רק מה אתם יודעים — זה גם איך אתם חושבים
          </p>

          <div className="flex flex-col justify-center items-center gap-3">
            <Link
              to={user ? "/play" : "/auth"}
              className="px-10 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-xl shadow-glow hover:scale-105 active:scale-95 transition"
            >
              {user ? "חזרה למשחק" : "התחילו לשחק"}
            </Link>

            {!loading && !user && (
              <Link
                to="/demo"
                className="px-7 py-3 rounded-2xl border-2 border-primary text-primary font-display font-bold text-base bg-card hover:bg-muted hover:scale-105 active:scale-95 transition"
              >
                נסו משחק לדוגמה
              </Link>
            )}
          </div>
        </div>

        {/* About the game */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
          <div className="text-center max-w-3xl lg:max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4">
              <Brain className="size-7" />
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-5">הכול מתחיל בראש</h2>

            <p className="text-lg sm:text-lg text-muted-foreground leading-relaxed text-right">
              "לשבור ת'ראש” הוא משחק מקורי וייחודי שבו עליכם לפתור הגדרות היגיון בעברית בעזרת ידע כללי, משחקי מילים
              וחשיבה יצירתית. כל הגדרה תדרוש מכם לחשוב מחוץ לקופסה, להפגין ידע ולשים לב לפרטים.
            </p>
          </div>

          {/* Detailed benefit cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="rounded-3xl bg-card border shadow-card p-6 sm:p-8 text-right">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-flame text-white mb-5">
                <Sparkles className="size-7" />
              </div>

              <h3 className="font-display text-2xl font-bold mb-4">אתגר חדש בכל הגדרה</h3>

              <ul className="space-y-3 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>מאגר ענק של הגדרות היגיון איכותיות במגוון רחב של נושאים וברמות קושי שונות.</span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>
                    מתאים לפותרים מתחילים שרוצים לצבור ניסיון ולהשתפר, ולחובבי תשבצי היגיון ותיקים שמחפשים אתגר אמיתי.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>הגדרות חדשות מתעדכנות כל הזמן כדי שתוכלו להמשיך לפתור וליהנות בכל פעם שתחזרו לשחק.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-card border shadow-card p-6 sm:p-8 text-right">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-flame text-white mb-5">
                <Trophy className="size-7" />
              </div>

              <h3 className="font-display text-2xl font-bold mb-4">נקודות, אתגרים ושיאים</h3>

              <ul className="space-y-3 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>
                    במהלך המשחק תוכלו לצבור נקודות, לעבור שלבים, להשלים אתגרים ולהתמודד על המקום הראשון בטבלת השחקנים
                    המובילים.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>
                    ככל שתשחקו יותר, תשתפרו ותצברו ניסיון. עמוד הסטטיסטיקות האישיות יעזור לכם לעקוב אחר ההתקדמות שלכם.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>יצאתם מהמשחק? תוכלו להתחבר שוב בכל שלב ולהמשיך לשחק בדיוק מהנקודה שבה הפסקתם.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-8 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-secondary/10 shadow-card p-7 sm:p-10 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-sunset text-white mb-5">
              <Zap className="size-7" />
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-4 whitespace-nowrap tracking-tight">
              מוכנים לאתגר את עצמכם?
            </h2>

            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed text-right sm:text-center">
              המשחק זמין בחינם לכולם וללא הגבלה. נרשמים עם כתובת אימייל וסיסמה, או באמצעות דרך חשבון גוגל או אפל — ופשוט
              מתחילים לשחק.
            </p>

            <p className="max-w-3xl mx-auto mt-5 text-lg sm:text-xl font-display font-bold leading-relaxed">
              מכורים להגדרות של תשבצי היגיון? אוהבים חידות לחידוד החשיבה? בואו לשבור ת'ראש!
            </p>

            <div className="flex flex-col items-center gap-3 mt-8">
              <Link
                to={user ? "/play" : "/auth"}
                className="px-10 py-4 rounded-2xl bg-gradient-sunset text-white font-display font-bold text-xl shadow-glow hover:scale-105 active:scale-95 transition"
              >
                {user ? "חזרה למשחק" : "התחילו לשחק"}
              </Link>

              {!loading && !user && (
                <Link
                  to="/demo"
                  className="px-7 py-3 rounded-2xl border-2 border-primary text-primary font-display font-bold text-base bg-card hover:bg-muted hover:scale-105 active:scale-95 transition"
                >
                  נסו משחק לדוגמה
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
