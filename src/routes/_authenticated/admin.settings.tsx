import { createFileRoute } from "@tanstack/react-router";
import { ReactNode } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminGetSettings, adminSetSetting, adminExport } from "@/lib/admin.functions";
import { downloadXLSX } from "@/lib/admin-export";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSettings);
  const setFn = useServerFn(adminSetSetting);
  const exportFn = useServerFn(adminExport);

  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getFn() });
  const data: any = settings.data ?? {};

  const updateSetting = useMutation({
    mutationFn: (v: { key: string; value: any }) => setFn({ data: v }),
    onSuccess: () => { toast.success("ההגדרה נשמרה"); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const runSnapshot = async (dataset: "definitions" | "submissions" | "players" | "snapshot") => {
    try {
      const res: any = await exportFn({ data: { dataset, includeDeleted: true } });
      const sheets: Record<string, any[]> = {};
      if (res.definitions) sheets.definitions = res.definitions;
      if (res.submissions) sheets.submissions = res.submissions;
      if (res.players) sheets.players = res.players;
      if (Object.keys(sheets).length === 0) { toast.message("אין נתונים"); return; }
      downloadXLSX(sheets, `backup-${dataset}`);
      toast.success("הגיבוי הורד");
    } catch (e: any) { toast.error(e.message); }
  };

  const submissionsEnabled = boolish(data.allow_player_submissions, true);

  return (
    <div>
      <PageHeader title="הגדרות מערכת" description="ניהול הגדרות כלליות של המשחק" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="הגדרות הצעות" description="ניהול הגשת הגדרות מהקהילה">
          <Toggle
            label="לאפשר הצעות שחקנים"
            hint="טופס הגשת הגדרה זמין לשחקנים"
            checked={submissionsEnabled}
            disabled={settings.isLoading || updateSetting.isPending}
            onCheckedChange={(v) => updateSetting.mutate({ key: "allow_player_submissions", value: v })}
          />
        </Section>

        <Section title="גיבוי וייצוא מלא" description="הורדת תמונת מצב של המערכת">
          <BackupRow label="הגדרות (כולל מחוקות)" onClick={() => runSnapshot("definitions")} />
          <BackupRow label="הצעות שחקנים" onClick={() => runSnapshot("submissions")} />
          <BackupRow label="שחקנים" onClick={() => runSnapshot("players")} />
          <BackupRow label="תמונת מצב מלאה (כל הנתונים)" onClick={() => runSnapshot("snapshot")} />
        </Section>
      </div>
    </div>
  );
}

function boolish(v: any, fallback: boolean) {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

function Toggle({
  label, hint, checked, onCheckedChange, disabled,
}: { label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
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
