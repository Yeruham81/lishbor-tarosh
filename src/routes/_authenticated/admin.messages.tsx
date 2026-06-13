import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader,
  TableToolbar,
  SortableHead,
  StatusBadge,
  DataTableShell,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Reply } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: MessagesPage,
});

const MOCK = Array.from({ length: 10 }).map((_, i) => ({
  id: `#M${42 - i}`,
  name: ["דנה לוי", "יוסי כהן", "אורי שם טוב", "מיכל רון"][i % 4],
  email: "user@example.com",
  subject: ["בעיה בטעינת המשחק", "הצעת שיפור", "שאלה כללית", "תקלה בלוח התוצאות"][i % 4],
  message: "שלום, רציתי להתייחס ל...",
  status: ["חדש", "נקרא", "חדש", "נקרא"][i % 4],
  date: `2026-06-${(13 - i).toString().padStart(2, "0")}`,
}));

function MessagesPage() {
  return (
    <div>
      <PageHeader title="פניות יצירת קשר" description="הודעות שהגיעו מהאתר" />

      <TableToolbar
        searchPlaceholder="חיפוש לפי שם / נושא..."
        filters={[{ label: "סטטוס", options: ["חדש", "נקרא"] }]}
        columns={["מזהה", "שם", "אימייל", "נושא", "סטטוס", "תאריך"]}
      />

      <DataTableShell
        headers={
          <>
            <SortableHead>מזהה</SortableHead>
            <TableHead>שם</TableHead>
            <TableHead className="hidden md:table-cell">אימייל</TableHead>
            <TableHead>נושא</TableHead>
            <TableHead className="hidden lg:table-cell">הודעה</TableHead>
            <TableHead>סטטוס</TableHead>
            <SortableHead>תאריך</SortableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={MOCK.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.email}</TableCell>
            <TableCell>{r.subject}</TableCell>
            <TableCell className="hidden lg:table-cell max-w-[280px] truncate text-sm text-muted-foreground">{r.message}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
            <TableCell className="text-left">
              <div className="flex items-center gap-1 justify-end">
                <Button size="icon" variant="ghost" className="size-8"><Eye className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-8"><Reply className="size-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-8"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>סמן כנקרא</DropdownMenuItem>
                    <DropdownMenuItem>סמן כחדש</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">מחיקה</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}
