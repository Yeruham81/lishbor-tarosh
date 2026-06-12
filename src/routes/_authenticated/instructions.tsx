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
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-center mb-6">מסך ההוראות</h1>

          <Tabs value={tab} onValueChange={onTabChange} dir="rtl">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="rules">הוראות</TabsTrigger>
              <TabsTrigger value="scoring">ניקוד</TabsTrigger>
              <TabsTrigger value="tips">טיפים</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">איך משחקים?</h2>
              <p className="text-muted-foreground">
                המשחק מציג לכם הגדרה — משפט קצר, חידה או רמז — ועליכם לנחש את התשובה אות אחר אות באמצעות המקלדת העברית
                שבמסך.
              </p>
              <p className="text-muted-foreground">
                כל אות שתבחרו תיחשף בכל המקומות שבהם היא מופיעה בתשובה. אות שגויה נספרת כטעות. לאחר שתי טעויות נפתחת
                האפשרות לבקש רמז שיחשוף אות נוספת בעלות נקודות.
              </p>
              <p className="text-muted-foreground">
                ניתן לדלג על הגדרה בכל שלב, אך דילוג מאפס את הרצף ועלול לעלות בנקודות. השלימו הגדרה כדי להתקדם להגדרה
                הבאה ולצבור ניקוד.
              </p>
              <p className="text-muted-foreground">
                המטרה: לפתור כמה שיותר הגדרות, לבנות רצף ארוך ולעלות שלבים.
              </p>
            </TabsContent>

            <TabsContent value="scoring" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">איך מחושב הניקוד?</h2>
              <p className="text-muted-foreground">
                כל הגדרה מתחילה ב‑10 נקודות. שלוש הטעויות הראשונות אינן עולות כלום — כדי לתת לכם מרחב לחשוב.
              </p>
              <p className="text-muted-foreground">
                החל מהטעות הרביעית כל אות שגויה גורעת נקודה אחת. כל רמז גורע שתי נקודות. הציון המינימלי על פתרון הוא 2
                נקודות.
              </p>
              <p className="text-muted-foreground">
                פתרון ללא רמזים ועם עד 3 טעויות נחשב פתרון מושלם וצובר רצף הישגים. הגעה לאבני דרך ברצף הפתרונות
                המושלמים תזכה אתכם בבונוסים אוטומטיים.
              </p>
              <p className="text-muted-foreground">
                ככל שתצברו יותר נקודות תעלו שלבים — וכל שלב חדש פותח אפשרויות והישגים נוספים.
              </p>
            </TabsContent>

            <TabsContent value="tips" className="text-right leading-relaxed space-y-4">
              <h2 className="font-display text-xl font-bold">טיפים מנצחים</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                קראו את ההגדרה היטב וחשבו מחוץ לקופסה - כל מילה חשובה אבל לא בהכרח במשמעותה הפשוטה או המוכרת ביותר.
              </p>
              <p className="text-muted-foreground">
                שימו לב לאורך הפתרון - למשל מילה בת שתי אותיות היא לרוב מילת קישור או מילית. גם מספר המילים והמבנה שלהן יכולים לכוון אתכם לתשובה.
              </p>
              <p className="text-muted-foreground whitespace-pre-line">
                חפשו משחקי מילים&nbsp;- כפל משמעות, קיצורים וראשי תיבות, פירוק מילים, צלילים דומים, שיכול אותיות, גימטריה, קריאה מהסוף להתחלה ומילים משותפות - אלו רק חלק מהטריקים הנפוצים בהגדרות היגיון.
              </p>
              <p className="text-muted-foreground">
                אל תתעכבו יותר מדי - נתקעתם אחרי שתי טעויות? קחו רמז - אולי הוא יוביל אתכם לפתרון. ההגדרה לא מתחברת לכם? אפשר לדלג עליה ולעבור להגדרה הבאה.&nbsp;
              </p>
              <p className="text-muted-foreground">
                שחקו קצת כל יום — עם הזמן תלמדו לזהות תבניות נפוצות, תחדדו את דרכי החשיבה שלכם ותשתפרו במשחק.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
