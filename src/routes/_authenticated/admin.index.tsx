import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/admin/AdminUI";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Users, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const recentDefs = [
  { id: "#1042", def: "כלי שמשמש לחיתוך", sol: "מספריים", status: "פעיל" },
  { id: "#1041", def: "צבע השמיים בבוקר", sol: "תכלת", status: "טיוטה" },
  { id: "#1040", def: "חיה הנובחת", sol: "כלב", status: "פעיל" },
  { id: "#1039", def: "מתוק וצהוב", sol: "דבש", status: "לא פעיל" },
];
const recentSubs = [
  { id: "#S204", user: "דנה לוי", def: "חמש אצבעות", status: "ממתין" },
  { id: "#S203", user: "יוסי כהן", def: "מנגן בנעימות", status: "ממתין" },
  { id: "#S202", user: "מיכל רון", def: "ירוק וגדל", status: "אושר" },
];
const recentPlayers = [
  { id: "#P88", user: "alon99", score: 4520, last: "לפני 5 דק'" },
  { id: "#P87", user: "shira_k", score: 3890, last: "לפני שעה" },
  { id: "#P86", user: "noam.b", score: 2750, last: "אתמול" },
];

function AdminDashboard() {
  return (
    <div>
      <PageHeader
        title="לוח בקרה"
        description="סקירה כללית של המערכת"
        actions={
          <>
            <Button asChild>
              <Link to="/admin/definitions"><Plus className="size-4 ml-1" /> הגדרה חדשה</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/submissions">הצעות</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/players">שחקנים</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        <StatCard label="שחקנים" value="3,482" hint="+124 השבוע" tone="primary" />
        <StatCard label="הגדרות" value="1,209" hint="פעילות: 1,041" />
        <StatCard label="ממתינות לאישור" value="27" hint="הצעות שחקנים" tone="warning" />
        <StatCard label="סה״כ נפתרו" value="48,217" tone="success" />
        <StatCard label="אחוז הצלחה" value="74%" hint="ממוצע 30 יום" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><FileText className="size-4 inline ml-1" /> הגדרות אחרונות</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/definitions">הצג הכל</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מזהה</TableHead>
                  <TableHead>הגדרה</TableHead>
                  <TableHead>פתרון</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDefs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.def}</TableCell>
                    <TableCell className="font-semibold">{r.sol}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><AlertTriangle className="size-4 inline ml-1 text-amber-500" /> דורש תשומת לב</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttentionRow count={12} label="הגדרות עם אחוז הצלחה נמוך" tone="warning" />
            <AttentionRow count={5} label="הגדרות עם הרבה דיסלייקים" tone="destructive" />
            <AttentionRow count={18} label="חסר רמז" />
            <AttentionRow count={7} label="חסר הסבר" />
            <AttentionRow count={27} label="הצעות ממתינות לאישור" tone="warning" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">הצעות אחרונות</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/submissions">הצג הכל</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מזהה</TableHead>
                  <TableHead>שחקן</TableHead>
                  <TableHead>הגדרה</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.user}</TableCell>
                    <TableCell>{r.def}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><Users className="size-4 inline ml-1" /> שחקנים אחרונים</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/players">הצג הכל</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מזהה</TableHead>
                  <TableHead>שם משתמש</TableHead>
                  <TableHead>ניקוד</TableHead>
                  <TableHead>פעילות אחרונה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPlayers.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.user}</TableCell>
                    <TableCell className="font-semibold">{r.score.toLocaleString("he-IL")}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.last}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AttentionRow({
  count,
  label,
  tone = "default",
}: {
  count: number;
  label: string;
  tone?: "default" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : tone === "destructive"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "";
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition">
      <span className="text-sm">{label}</span>
      <Badge variant="outline" className={toneClass}>{count}</Badge>
    </div>
  );
}
