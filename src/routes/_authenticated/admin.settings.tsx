import { createFileRoute } from "@tanstack/react-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetSettings, adminSetSetting, adminExport } from "@/lib/admin.functions";
import { downloadXLSX } from "@/lib/admin-export";
import { Download, Save, RotateCcw, ChevronDown, AlertTriangle } from "lucide-react";
import { ALL_SCREENS, SCREEN_LABEL_HE, screenSettingKey } from "@/lib/ads/screens";
import type { AdScreen } from "@/lib/ads/types";

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
  {
    key: "base_points_per_definition",
    label: "נקודות בסיס להגדרה",
    hint: "נקודות שמתקבלות על פתרון הגדרה",
    type: "number",
    default: 10,
    min: 0,
    max: 10000,
  },
  {
    key: "points_penalty_per_mistake",
    label: "הפחתת נקודות על טעות",
    hint: "כמה נקודות יורדות על כל ניסיון שגוי",
    type: "number",
    default: 1,
    min: 0,
    max: 1000,
  },
  {
    key: "points_penalty_per_hint",
    label: "הפחתת נקודות על רמז",
    hint: "כמה נקודות יורדות על שימוש ברמז",
    type: "number",
    default: 2,
    min: 0,
    max: 1000,
  },
];

const GAMEPLAY_BOOL_FIELDS: Field[] = [
  { key: "allow_skip", label: "אפשר דילוג", hint: "הצגת כפתור הדילוג בעת משחק", type: "boolean", default: true },
  { key: "allow_hints", label: "אפשר רמזים", hint: "הצגת כפתור הרמז בעת משחק", type: "boolean", default: true },
  {
    key: "allow_player_submissions",
    label: "אפשר הגשות שחקנים",
    hint: "הצגת טופס הגשת הגדרות",
    type: "boolean",
    default: true,
  },
  {
    key: "allow_new_registrations",
    label: "אפשר הרשמות חדשות",
    hint: "אפשר ליצור חשבונות חדשים",
    type: "boolean",
    default: true,
  },
  {
    key: "leaderboard_visible",
    label: "הצגת לוח התוצאות",
    hint: "הסתרת הלוח מסתירה אותו לכל השחקנים",
    type: "boolean",
    default: true,
  },
  {
    key: "disable_ads_button_visible",
    label: 'הצגת כפתור "ביטול פרסומות"',
    hint: "הצגת/הסתרת הכפתור (בקרוב — לפי תכונה עתידית)",
    type: "boolean",
    default: true,
  },
];

const GAMEPLAY_NUM_FIELDS: Field[] = [
  { key: "max_wrong_attempts", label: "מקסימום ניסיונות שגויים", type: "number", default: 5, min: 1, max: 100 },
  { key: "daily_streak_bonus", label: "בונוס רצף יומי", type: "number", default: 5, min: 0, max: 1000 },
  { key: "max_streak_multiplier", label: "מכפיל רצף מקסימלי", type: "number", default: 3, min: 1, max: 20 },
  { key: "required_streak_days", label: "ימים נדרשים לרצף", type: "number", default: 7, min: 1, max: 365 },
  {
    key: "submission_cooldown_minutes",
    label: "המתנה בין הגשות (דקות)",
    type: "number",
    default: 60,
    min: 0,
    max: 10000,
  },
  { key: "max_submissions_per_day", label: "מקסימום הגשות ביום", type: "number", default: 5, min: 0, max: 1000 },
];

const CONTENT_FIELDS: Field[] = [
  {
    key: "global_announcement_banner",
    label: "באנר הודעה גלובלי",
    hint: "טקסט שמופיע בראש האפליקציה",
    type: "text",
    default: "",
  },
  {
    key: "popup_announcement_text",
    label: "טקסט הודעת פופאפ",
    hint: "מוצג בעלייה ראשונית",
    type: "textarea",
    default: "",
  },
  {
    key: "minimum_supported_app_version",
    label: "גרסת מינימום נתמכת",
    hint: "לדוגמה: 1.4.0",
    type: "text",
    default: "",
  },
];

const MAINTENANCE_FIELDS: Field[] = [
  {
    key: "maintenance_mode",
    label: "מצב תחזוקה",
    hint: "כאשר פעיל, שחקנים שאינם מנהלים יראו הודעת תחזוקה במקום האפליקציה",
    type: "boolean",
    default: false,
  },
  {
    key: "maintenance_message",
    label: "הודעת תחזוקה",
    hint: "ההודעה שתוצג לשחקנים בעת מצב תחזוקה",
    type: "textarea",
    default: "המשחק בתחזוקה, נחזור בקרוב.",
  },
];

const ADS_FIELDS: Field[] = [
  {
    key: "ads_enabled",
    label: "פרסומות (מתג ראשי)",
    hint: "מתג חירום כללי. כשכבוי, לא מוצגות פרסומות באף מסך",
    type: "boolean",
    default: false,
  },
  {
    key: "ads_static_enabled",
    label: "פרסומות סטטיות מוגדרות ידנית",
    hint: "מפעיל את כל המיקומים הידניים שהוגדרו במסכי המשחק",
    type: "boolean",
    default: false,
  },
  {
    key: "ads_test_mode",
    label: "מצב בדיקה",
    hint: "כאשר פעיל מוצגים מיקומי בדיקה פנימיים בלבד. אף פנייה ל‑Google לא מתבצעת",
    type: "boolean",
    default: false,
  },
  {
    key: "h5_ads_enabled",
    label: "פרסומות מעבר עתידיות (H5)",
    hint: "שמור לשלב עתידי בלבד — אינו פעיל כרגע",
    type: "boolean",
    default: false,
  },
  {
    key: "adsense_live_enabled",
    label: "AdSense אמיתי (טעינת סקריפט Google)",
    hint: "יש להשאיר כבוי עד לאישור Google וסיום שלב הסכמות והתאמה לרגולציה",
    type: "boolean",
    default: false,
  },
  {
    key: "adsense_publisher_id",
    label: "מזהה מפרסם AdSense",
    hint: "פורמט חובה: ca-pub-XXXXXXXXXXXXXX. מזהה ריק או שגוי לא יטען כל סקריפט",
    type: "text",
    default: "",
  },
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
    await qc.invalidateQueries({ queryKey: ["public", "settings"] });
  };

  return (
    <div>
      <PageHeader title="ניהול המשחק" description="הגדרה והפעלה של אפשרויות המשחק" />

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
          title="אפשרויות"
          description="הפעלה/השבתה של אפשרויות במשחק"
          fields={GAMEPLAY_BOOL_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="מספרים"
          description="פרמטרים מספריים של המשחק"
          fields={GAMEPLAY_NUM_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <Section
          title="הודעות ותוכן"
          description="הצגת טקסטים גלובליים לשחקנים"
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

        <Section
          title="פרסומות"
          description="בקרות ראשיות למערך הפרסום. בשלב זה AdSense אמיתי חייב להישאר כבוי — עד לאישור Google וסיום שלב ההסכמות והרגולציה."
          fields={ADS_FIELDS}
          values={data}
          loading={settings.isLoading}
          onSave={saveMany}
        />

        <div className="lg:col-span-2">
          <PlacementsSection values={data} loading={settings.isLoading} onSave={saveMany} />
        </div>

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
        else if (f.type === "text" || f.type === "textarea") v = typeof v === "string" ? v.trim() : v;
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
          {dirty && <span className="text-xs text-amber-600 font-medium whitespace-nowrap">שינויים שלא נשמרו</span>}
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

// ------------------------------------------------------------------
// Advanced: per-screen ad placement settings (collapsed by default)
// ------------------------------------------------------------------

function PlacementsSection({
  values,
  loading,
  onSave,
}: {
  values: Record<string, any>;
  loading: boolean;
  onSave: (entries: { key: string; value: any }[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-right">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">הגדרות מיקומי פרסומות</CardTitle>
                <CardDescription>הפעלה נפרדת לכל מסך ומזהי המודעות במיקומים השונים</CardDescription>
              </div>
              <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                AdSense אמיתי חייב להישאר כבוי עד לאישור Google וסיום שלב ההסכמות (Consent) והרגולציה. מיקומים ומזהים
                שנשמרים כאן לא יטענו פרסומות בזמן שהמתג הראשי או "AdSense אמיתי" כבויים.
              </span>
            </div>
            {ALL_SCREENS.map((screen) => (
              <ScreenPlacementBlock key={screen} screen={screen} values={values} loading={loading} onSave={onSave} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ScreenPlacementBlock({
  screen,
  values,
  loading,
  onSave,
}: {
  screen: AdScreen;
  values: Record<string, any>;
  loading: boolean;
  onSave: (entries: { key: string; value: any }[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const screenEnabledKey = screenSettingKey("ads", screen, "enabled");

  const initial = useMemo(() => {
    const rawEnabled = values[screenEnabledKey];

    return {
      enabled: rawEnabled === true || rawEnabled === "true",
      leftSlot: String(values[screenSettingKey("adsense", screen, "left_slot_id")] ?? ""),
      rightSlot: String(values[screenSettingKey("adsense", screen, "right_slot_id")] ?? ""),
      bottomSlot: String(values[screenSettingKey("adsense", screen, "bottom_slot_id")] ?? ""),
    };
  }, [values, screen, screenEnabledKey]);

  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const onSaveClick = async () => {
    setBusy(true);

    try {
      await onSave([
        {
          key: screenEnabledKey,
          value: !!draft.enabled,
        },
        {
          key: screenSettingKey("adsense", screen, "left_slot_id"),
          value: draft.leftSlot.trim(),
        },
        {
          key: screenSettingKey("adsense", screen, "right_slot_id"),
          value: draft.rightSlot.trim(),
        },
        {
          key: screenSettingKey("adsense", screen, "bottom_slot_id"),
          value: draft.bottomSlot.trim(),
        },
      ]);

      toast.success("נשמר");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="w-full text-right">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{SCREEN_LABEL_HE[screen]}</div>

            <div className="text-xs text-muted-foreground">
              {draft.enabled ? "הצגת פרסומות פעילה במסך" : "הצגת פרסומות כבויה במסך"}
            </div>
          </div>

          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t p-3">
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">הצגת פרסומות במסך</div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                בדסקטופ תיבחר באקראי תצורה של שתי מודעות. במובייל תוצג מודעה תחתונה בלבד.
              </div>
            </div>

            <Switch
              checked={draft.enabled}
              onCheckedChange={(enabled) =>
                setDraft((current) => ({
                  ...current,
                  enabled,
                }))
              }
              disabled={loading || busy}
            />
          </div>

          {(["left", "right", "bottom"] as const).map((position) => {
            const slotKey = `${position}Slot` as const;

            const label =
              position === "left"
                ? "מזהה מודעה — צד שמאל"
                : position === "right"
                  ? "מזהה מודעה — צד ימין"
                  : "מזהה מודעה — תחתית";

            return (
              <div key={position} className="space-y-2 rounded-md border p-3">
                <Label className="text-sm font-medium">{label}</Label>

                <Input
                  placeholder="Slot ID — ספרות בלבד"
                  value={draft[slotKey]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [slotKey]: event.target.value,
                    }))
                  }
                  disabled={loading || busy}
                  dir="ltr"
                />
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button size="sm" onClick={onSaveClick} disabled={!dirty || busy}>
              <Save className="size-3.5 ml-1" />
              {busy ? "שומר..." : "שמירה"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
