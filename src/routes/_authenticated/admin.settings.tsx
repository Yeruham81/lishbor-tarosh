import { createFileRoute } from "@tanstack/react-router";
import { ReactNode } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="הגדרות מערכת"
        description="ניהול הגדרות כלליות של המשחק"
        actions={<Button>שמור שינויים</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="הגדרות משחק" description="פרמטרים בסיסיים של המשחק">
          <Toggle label="הצגת רמזים" hint="לאפשר לשחקנים לבקש רמזים" defaultChecked />
          <Toggle label="הצגת אנימציות" hint="אפקטים ויזואליים במהלך משחק" defaultChecked />
          <Toggle label="מצב לילה אוטומטי" hint="התאמה לשעות הערב" />
          <Separator />
          <Field label="הגדרות בטור יומי">
            <Input type="number" defaultValue={5} />
          </Field>
          <Field label="זמן ברירת מחדל לשאלה (שניות)">
            <Input type="number" defaultValue={90} />
          </Field>
        </Section>

        <Section title="הגדרות הצעות" description="ניהול הגשת הגדרות מהקהילה">
          <Toggle label="לאפשר הצעות שחקנים" hint="טופס /submit-puzzle פתוח" defaultChecked />
          <Toggle label="דרישת אישור לפני פרסום" defaultChecked />
          <Toggle label="התראת מייל למנהל בהצעה חדשה" defaultChecked />
          <Separator />
          <Field label="מינימום תווים בהגדרה">
            <Input type="number" defaultValue={5} />
          </Field>
          <Field label="מקסימום הצעות פתוחות לשחקן">
            <Input type="number" defaultValue={10} />
          </Field>
        </Section>

        <Section title="הגדרות תגמולים" description="ניקוד, רצפים והישגים">
          <Field label="נקודות בסיס לפתרון">
            <Input type="number" defaultValue={10} />
          </Field>
          <Field label="קנס לטעות (מעבר ל-3)">
            <Input type="number" defaultValue={1} />
          </Field>
          <Field label="קנס לרמז">
            <Input type="number" defaultValue={2} />
          </Field>
          <Separator />
          <Toggle label="בונוס לרצפים מושלמים" defaultChecked />
          <Toggle label="הענקת הישגים אוטומטית" defaultChecked />
        </Section>

        <Section title="הגדרות יצירת קשר" description="ניהול פניות והודעות">
          <Field label="אימייל ליצירת קשר">
            <Input type="email" defaultValue="hello@lishbor.app" />
          </Field>
          <Field label="הודעת תגובה אוטומטית">
            <Textarea
              rows={4}
              defaultValue="תודה שפנית אלינו, נחזור אליך בהקדם."
            />
          </Field>
          <Separator />
          <Toggle label="הצגת טופס יצירת קשר" defaultChecked />
          <Toggle label="התראת מייל בהודעה חדשה" defaultChecked />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Toggle({ label, hint, defaultChecked }: { label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] items-center gap-2">
      <Label className="text-sm">{label}</Label>
      <div>{children}</div>
    </div>
  );
}
