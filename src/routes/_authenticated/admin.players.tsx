import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  TableToolbar,
  SortableHead,
  StatusBadge,
  DataTableShell,
  StatCard,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/players")({
  component: PlayersPage,
});

const MOCK = Array.from({ length: 12 }).map((_, i) => ({
  id: `#P${88 - i}`,
  user: ["alon99", "shira_k", "noam.b", "dana_l", "yossi", "michal_r", "ori99", "tal_e"][i % 8],
  email: "user@example.com",
  age: 18 + (i % 30),
  level: (i % 10) + 1,
  score: 4520 - i * 230,
  solved: 180 - i * 8,
  submitted: 12 - (i % 6),
  likes: 64 - i * 2,
  dislikes: 3 + i,
  streak: 14 - (i % 10),
  highestStreak: 28 - (i % 15),
  last: ["לפני 5 דק'", "לפני שעה", "אתמול", "לפני שבוע"][i % 4],
  status: ["פעיל", "פעיל", "נחסם", "פעיל"][i % 4],
}));

function PlayersPage() {
  return (
    <div>
      <PageHeader title="ניהול שחקנים" description="כל השחקנים במערכת" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="סה״כ שחקנים" value="3,482" tone="primary" />
        <StatCard label="פעילים השבוע" value="1,204" tone="success" />
        <StatCard label="שחקנים חדשים" value="124" hint="השבוע" />
        <StatCard label="נחסמו" value="8" />
      </div>

      <TableToolbar
        searchPlaceholder="חיפוש לפי שם משתמש / אימייל..."
        filters={[
          { label: "סטטוס", options: ["פעיל", "נחסם"] },
          { label: "רמה", options: ["1", "2", "3", "4", "5"] },
        ]}
        columns={["מזהה", "שם משתמש", "אימייל", "רמה", "ניקוד", "פתורים", "סטטוס"]}
      />

      <DataTableShell
        headers={
          <>
            <SortableHead>מזהה</SortableHead>
            <TableHead>שחקן</TableHead>
            <TableHead className="hidden md:table-cell">אימייל</TableHead>
            <TableHead className="hidden lg:table-cell">גיל</TableHead>
            <SortableHead>רמה</SortableHead>
            <SortableHead>ניקוד</SortableHead>
            <SortableHead>פתורים</SortableHead>
            <TableHead className="hidden lg:table-cell">הצעות</TableHead>
            <TableHead className="hidden xl:table-cell">לייקים</TableHead>
            <TableHead className="hidden xl:table-cell">דיסלייקים</TableHead>
            <SortableHead>רצף</SortableHead>
            <TableHead className="hidden lg:table-cell">רצף שיא</TableHead>
            <TableHead>פעילות אחרונה</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={MOCK.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">{r.user.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{r.user}</span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.email}</TableCell>
            <TableCell className="hidden lg:table-cell">{r.age}</TableCell>
            <TableCell>{r.level}</TableCell>
            <TableCell className="font-semibold">{r.score.toLocaleString("he-IL")}</TableCell>
            <TableCell>{r.solved}</TableCell>
            <TableCell className="hidden lg:table-cell">{r.submitted}</TableCell>
            <TableCell className="hidden xl:table-cell">{r.likes}</TableCell>
            <TableCell className="hidden xl:table-cell">{r.dislikes}</TableCell>
            <TableCell>{r.streak}</TableCell>
            <TableCell className="hidden lg:table-cell">{r.highestStreak}</TableCell>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.last}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-left">
              <PlayerActions user={r.user} />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

function PlayerActions({ user }: { user: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1 justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8">
            <Eye className="size-4" />
          </Button>
        </DialogTrigger>
        <PlayerProfileDialog user={user} />
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>הצג פרופיל</DropdownMenuItem>
          <DropdownMenuItem>חסימה / שחרור</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>הוסף נקודות</DropdownMenuItem>
          <DropdownMenuItem>הסר נקודות</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">איפוס התקדמות</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PlayerProfileDialog({ user }: { user: string }) {
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>פרופיל שחקן — {user}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="ניקוד" value="4,520" tone="primary" />
        <StatCard label="פתורים" value="180" />
        <StatCard label="רצף נוכחי" value="14" />
        <StatCard label="רצף שיא" value="28" />
      </div>
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList>
          <TabsTrigger value="overview">סקירה</TabsTrigger>
          <TabsTrigger value="submissions">הצעות</TabsTrigger>
          <TabsTrigger value="solved">נפתרו</TabsTrigger>
          <TabsTrigger value="rewards">תגמולים</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="text-sm text-muted-foreground py-4">
          סקירה כללית של פעילות השחקן, רמה, היסטוריית כניסות וסטטיסטיקות.
        </TabsContent>
        <TabsContent value="submissions" className="text-sm text-muted-foreground py-4">
          רשימת ההצעות שהשחקן הגיש לאישור.
        </TabsContent>
        <TabsContent value="solved" className="text-sm text-muted-foreground py-4">
          רשימת ההגדרות שהשחקן פתר.
        </TabsContent>
        <TabsContent value="rewards" className="text-sm text-muted-foreground py-4">
          הישגים, מדליות ותגמולים שזכה בהם השחקן.
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
