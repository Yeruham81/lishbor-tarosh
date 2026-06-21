import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { GameTopBar } from "@/components/GameTopBar";
import { getProfile } from "@/lib/game.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/instructions")({ component: Instructions });

const TAB_STORAGE_KEY = "instructions:activeTab";

function Instructions() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const fetchProfile = useServerFn(getProfile);
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(), enabled: !!user });

  const [tab, setTab] = useState<string>(() => {
    if (typeof window === "undefined") return "rules";
    try {
      return window.localStorage.getItem(TAB_STORAGE_KEY) || "rules";
    } catch {
      return "rules";
    }
  });

  const onTabChange = (v: string) => {
    setTab(v);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, v);
    } catch {}
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-3 max-w-3xl">
        <GameTopBar profile={profileQ.data} helpVariant="close" />

        <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-center mb-6">לשבור ת'ראש</h1>

          <Tabs value={tab} onValueChange={onTabChange} dir="rtl">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="rules">הוראות</TabsTrigger>
              <TabsTrigger value="scoring">ניקוד</TabsTrigger>
              <TabsTrigger value="tips">טיפים</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">איך משחקים?</h2>
              <p className="text-muted-foreground">
                בכל פעם תוצג לכם הגדרת היגיון שעליכם לפתור בעזרת המקלדת הוירטואלית שעל המסך.
              </p>
              <p className="text-muted-foreground">
                אם האות שבחרתם קיימת בתשובה היא תיחשף בכל המקומות שבהם היא מופיעה. אם האות שבחרתם לא קיימת בתשובה, היא תיחשב כטעות.
              </p>
              <p className="text-muted-foreground">
                לאחר שתי טעויות תוכלו להשתמש ברמז, שיחשוף אות נוספת. אם נתקעתם תוכלו ללחוץ 'דלג' ולעבור להגדרה הבאה.
              </p>
              <p className="text-muted-foreground">
                המטרה: לפתור כמה שיותר הגדרות, לצבור נקודות, לעבור שלבים ולהשלים אתגרים.
              </p>
            </TabsContent>

            <TabsContent value="scoring" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">איך מחושב הניקוד?</h2>
              <p className="text-muted-foreground">
                אתם מתחילים כל הגדרה עם 10 נקודות -&nbsp;נסו לשמור עליהן עד לפתרון.
              </p>
              <p className="text-muted-foreground">
                שלוש הטעויות הראשונות לא מורידות ניקוד. מהטעות הרביעית ואילך, כל אות שגויה מורידה נקודה אחת. שימוש ברמז מוריד שתי נקודות. דילוג ומעבר להגדרה הבאה לא מוריד נקודות, אך מאפס את הרצף.&nbsp;
              </p>
              <p className="text-muted-foreground whitespace-pre-line">
                פתרון ללא רמזים, עם שלוש טעויות או פחות, נחשב פתרון מושלם, מזכה אתכם ב-10 נקודות ונספר ברצף ההישגים שלכם.&nbsp;הניקוד המינימלי האפשרי לפתרון הוא 2 נקודות.
              </p>
              <p className="text-muted-foreground">
                ככל שתצברו יותר נקודות, תתקדמו בשלבים, תשלימו אתגרים ותזכו בנקודות בונוס. כל הישג יפתח בפניכם אפשרויות חדשות ואתגרים נוספים.
              </p>
            </TabsContent>

            <TabsContent value="tips" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">טיפים מנצחים</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                קראו את ההגדרה היטב וחשבו מחוץ לקופסה - כל מילה חשובה אבל לא בהכרח במשמעותה הפשוטה או המוכרת ביותר.
              </p>
              <p className="text-muted-foreground">
                שימו לב לאורך הפתרון - למשל מילה בת שתי אותיות היא לרוב מילת קישור או מילית. גם מספר המילים והמבנה שלהן
                יכולים לכוון אתכם לתשובה.
              </p>
              <p className="text-muted-foreground whitespace-pre-line">
                חפשו משחקי מילים&nbsp;- כפל משמעות, קיצורים וראשי תיבות, פירוק מילים, צלילים דומים, שיכול אותיות,
                גימטריה, קריאה מהסוף להתחלה ומילים משותפות - אלו רק חלק מהטריקים הנפוצים בהגדרות היגיון.
              </p>
              <p className="text-muted-foreground">
                אל תתעכבו יותר מדי - נתקעתם אחרי שתי טעויות? קחו רמז - אולי הוא יוביל אתכם לפתרון. ההגדרה לא מתחברת לכם?
                אפשר לדלג עליה ולעבור להגדרה הבאה.&nbsp;
              </p>
              <p className="text-muted-foreground">
                שחקו קצת כל יום — תוך זמן קצר תלמדו לזהות תבניות נפוצות, תחדדו את דרכי החשיבה שלכם ותשתפרו במשחק.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
