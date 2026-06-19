import { createFileRoute } from "@tanstack/react-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetSettings, adminSetSetting, adminExport } from "@/lib/admin.functions";
import { downloadXLSX } from "@/lib/admin-export";
import { Download, Save, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

// ------------------------------------------------------------------
// Setting definitions — English keys, Hebrew UI labels
// ------------------------------------------------------------------
type FieldType = "boolean" | "number" | "text" | "textarea";
type Field = {
  key: string;
  label: string;
  hint?: string;
  type: FieldType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
};

const SCORING_FIELDS: Field[] = [
  { key: "base_points_per_definition", label: "נקודות בסיס להגדרה", hint: "נקודות שמתקבלות על פתרון הגדרה", type: "number", default: 10, min: 0, max: 10000 },
  { key: "points_penalty_per_mistake", label: "הפחתת נקודות על טעות", hint: "כמה נקודות יורדות על כל ניסיון שגוי", type: "number", default: 1, min: 0, max: 1000 },
  { key: "points_penalty_per_hint", label: "הפחתת נקודות על רמז", hint: "כמה נקודות יורדות על שימוש ברמז", type: "number", default: 2, min: 0, max: 1000 },
];

const GAMEPLAY_BOOL_FIELDS: Field[] = [
  { key: "allow_skip", label: "אפשר דילוג", hint: "הצגת כפתור הדילוג בעת משחק", type: "boolean", default: true },
  { key: "allow_hints", label: "אפשר רמזים", hint: "הצגת כפתור הרמז בעת משחק", type: "boolean", default: true },
  { key: "allow_player_submissions", label: "אפשר הגשות שחקנים", hint: "הצגת טופס הגשת הגדרות", type: "boolean", default: true },
  { key: "allow_new_registrations", label: "אפשר הרשמות חדשות", hint: "אפשר ליצור חשבונות חדשים", type: "boolean", default: true },
  { key: "leaderboard_visible", label: "אפשר הצגת לוח התוצאות", hint: "הסתרת הלוח מסתירה אותו לכל השחקנים", type: "boolean", default: true },
  { key: "disable_ads_button_visible", label: "אפשר לבטל פרסומות", hint: 'הצגת כפתור "ביטול פרסומות"', type: "boolean", default: true },
];

const GAMEPLAY_NUM_FIELDS: Field[] = [
  { key: "max_wrong_attempts", label: "מקסימום ניסיונות שגויים", type: "number", default: 5, min: 1, max: 100 },
  { key: "daily_streak_bonus", label: "בונוס רצף יומי", type: "number", default: 5, min: 0, max: 1000 },
  { key: "max_streak_multiplier", label: "מכפיל רצף מקסימלי", type: "number", default: 3, min: 1, max: 20 },
  { key: "required_streak_days", label: "ימים נדרשים לרצף", type: "number", default: 7, min: 1, max: 365 },
  { key: "submission_cooldown_minutes", label: "המתנה בין הגשות (דקות)", type: "number", default: 60, min: 0, max: 10000 },
  { key: "max_submissions_per_day", label: "מקסימום הגשות ביום", type: "number", default: 5, min: 0, max: 1000 },
];

const CONTENT_FIELDS: Field[] = [
  { key: "global_announcement_banner", label: "באנר הודעה גלובלי", hint: "טקסט שמופיע בראש המשחק", type: "text", default: "" },
  { key: "popup_announcement_text", label: "חלונית הודעת פופאפ", hint: "טקסט שמופיע בכניסה ראשונית למשחק", type: "textarea", default: "" },
  { key: "minimum_supported_app_version", label: "גרסת מינימום נתמכת", hint: "לדוגמה: 1.4.0", type: "text", default: "" },
];

const MAINTENANCE_FIELDS: Field[] = [
  { key: "maintenance_mode", label: "מצב תחזוקה", hint: "כאשר פעיל, שחקנים ללא הרשאת מנהל יראו הודעת תחזוקה", type: "boolean", default: false },
  { key: "maintenance_message", label: "הודעת תחזוקה", hint: "הטקסט שיוצג לשחקנים בעת הפעלת מצב תחזוקה", type: "textarea", default: "המערכת בתחזוקה. נחזור בקרוב." },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function coerceValue(field: Field, raw: any): any {
  if (raw === undefined || raw === null) return field.default;
  if (field.type === "boolean") {
    if (raw === true || raw === "true") return true;
    if (raw === false || raw === "false") return false;
    return field.default;
  }
  if (field.type === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : field.default;
  }
  // text / textarea
  return typeof raw === "string" ? raw : String(raw ?? "");
}

function validateNumber(field: Field, v: any): string | null {
  if (field.type !== "number") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "ערך לא תקין";
  if (field.min !== undefined && n < field.min) return `מינימום ${field.min}`;
  if (field.max !== undefined && n > field.max) return `מקסימום ${field.max}`;
  return null;
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSettings);
  const setFn = useServerFn(adminSetSetting);
  const exportFn = useServerFn(adminExport);

  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const data: any = settings.data ?? {};

  const runSnapshot = async (dataset: "definitions" | "submissions" | "players" | "snapshot") => {
    try {
      const res: any = await exportFn({ data: { dataset, includeDeleted: true } });
      const sheets: Record<string, any[]> = {};
      if (res.definitions) sheets.definitions = res.definitions;
      if (res.submissions) sheets.submissions = res.submissions;
      if (res.players) sheets.players = res.players;
      if (Object.keys(sheets).length === 0) {
        toast.message("אין נתונים");
        return;
      }
      downloadXLSX(sheets, `backup-${dataset}`);
      toast.success("הגיבוי הורד");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveMany = async (entries: { key: string; value: any }[]) => {
    for (const e of entries) {
      await setFn({ data: e });
    }
    await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };

  return (
    <div>
      <PageHeader title="ניהול המערכת" description="ניהול כל הגדרות המשחק" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title="ניקוד"
          description="נקודות בסיס וקנסות"
          fields={SCORING_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="הגדרות משחק - הפעלות"
          description="הפעלה/השבתה של רכיבי משחק"
          fields={GAMEPLAY_BOOL_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="הגדרות משחק - מספרים"
          description="פרמטרים מספריים של המשחק"
          fields={GAMEPLAY_NUM_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="הודעות ותוכן"
          description="טקסטים גלובליים שמוצגים לשחקנים"
          fields={CONTENT_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="מצב תחזוקה"
          description="השהיית המשחק באופן זמני"
          fields={MAINTENANCE_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">גיבוי וייצוא</CardTitle>
            <CardDescription>הורדת תמונת מצב של המערכת</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <BackupRow label="הגדרות" onClick={() => runSnapshot("definitions")} />
            <BackupRow label="שחקנים" onClick={() => runSnapshot("players")} />
            <BackupRow label="כל בסיס הנתונים" onClick={() => runSnapshot("snapshot")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Section
// ------------------------------------------------------------------
function Section({
  title,
  description,
  fields,
  values,
  loading,
  onSave,
}: {
  title: string;
  description?: string;
  fields: Field[];
  values: Record<string, any>;
  loading: boolean;
  onSave: (entries: { key: string; value: any }[]) => Promise<void>;
}) {
  const initial = useMemo(() => {
    const o: Record<string, any> = {};
    for (const f of fields) o[f.key] = coerceValue(f, values[f.key]);
    return o;
  }, [fields, values]);

  const [draft, setDraft] = useState<Record<string, any>>(initial);

  // Reset draft when underlying values arrive/change and there are no unsaved changes
  useEffect(() => {
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  const dirtyKeys = useMemo(
    () => fields.filter((f) => JSON.stringify(draft[f.key]) !== JSON.stringify(initial[f.key])).map((f) => f.key),
    [draft, initial, fields],
  );
  const dirty = dirtyKeys.length > 0;

  const [busy, setBusy] = useState(false);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    for (const f of fields) {
      const err = validateNumber(f, draft[f.key]);
      if (err) e[f.key] = err;
    }
    return e;
  }, [draft, fields]);
  const hasErrors = Object.keys(errors).length > 0;

  const onSaveClick = async () => {
    if (hasErrors) {
      toast.error("יש שדות לא תקינים");
      return;
    }
    setBusy(true);
    try {
      const entries = dirtyKeys.map((k) => {
        const f = fields.find((x) => x.key === k)!;
        let v: any = draft[k];
        if (f.type === "number") v = Number(v);
        return { key: k, value: v };
      });
      await onSave(entries);
      toast.success("ההגדרות נשמרו");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    const d: Record<string, any> = {};
    for (const f of fields) d[f.key] = f.default;
    setDraft(d);
    toast.message("ערכי ברירת מחדל נטענו — לחץ שמירה כדי לאשר");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium whitespace-nowrap">שינויים שלא נשמרו</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={draft[f.key]}
            error={errors[f.key]}
            disabled={loading || busy}
            onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
          />
        ))}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button size="sm" variant="ghost" onClick={onReset} disabled={busy}>
            <RotateCcw className="size-3.5 ml-1" /> ברירת מחדל
          </Button>
          <Button size="sm" onClick={onSaveClick} disabled={!dirty || hasErrors || busy}>
            <Save className="size-3.5 ml-1" /> {busy ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: Field;
  value: any;
  error?: string;
  disabled?: boolean;
  onChange: (v: any) => void;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{field.label}</div>
          {field.hint && <div className="text-xs text-muted-foreground mt-0.5">{field.hint}</div>}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{field.label}</Label>
        {field.hint && <div className="text-xs text-muted-foreground">{field.hint}</div>}
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{field.label}</Label>
      {field.hint && <div className="text-xs text-muted-foreground">{field.hint}</div>}
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(field.type === "number" ? e.target.value : e.target.value)}
        disabled={disabled}
        min={field.min}
        max={field.max}
        step={field.step}
      />
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}

function BackupRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
      <span className="text-sm">{label}</span>
      <Button variant="outline" size="sm" onClick={onClick}>
        <Download className="size-4 ml-1" /> הורדה
      </Button>
    </div>
  );
}
