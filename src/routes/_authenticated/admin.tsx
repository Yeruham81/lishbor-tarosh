import { createFileRoute, Link, Outlet, isRedirect, redirect, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Users,
  Mail,
  Tags,
  Settings as SettingsIcon,
  Bell,
  Search,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminSearchProvider, useAdminSearchContext } from "@/components/admin/admin-search-context";
import { getMyRole } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const { isAdmin } = await getMyRole();
      if (!isAdmin) throw redirect({ to: "/" });
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "מרכז הבקרה", icon: LayoutDashboard, exact: true },
  { to: "/admin/definitions", label: "הגדרות", icon: FileText },
  { to: "/admin/submissions", label: "הגדרות מוצעות", icon: Inbox },
  { to: "/admin/players", label: "שחקנים", icon: Users },
  { to: "/admin/paying", label: "שחקנים משלמים", icon: Users },
  { to: "/admin/messages", label: "פניות שהתקבלו", icon: Mail },
  { to: "/admin/taxonomy", label: "תגיות", icon: Tags },
  { to: "/admin/settings", label: "ניהול המערכת", icon: SettingsIcon },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="px-3 py-4">
        <div className="font-display text-lg font-extrabold text-gradient-sunset">לשבור ת'ראש</div>
        <div className="text-xs text-muted-foreground mt-0.5">ניהול התוכן והגדרות המערכת</div>
      </div>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as string}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearchBox() {
  const { globalSearch, setGlobalSearch } = useAdminSearchContext();
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        placeholder="חיפוש כללי..."
        className="pr-9"
        value={globalSearch}
        onChange={(e) => setGlobalSearch(e.target.value)}
      />
    </div>
  );
}

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <AdminSearchProvider>
      <div className="min-h-screen bg-muted/30" dir="rtl">
        <div className="flex">
          {/* Sidebar desktop */}
          <aside className="hidden lg:flex w-64 shrink-0 border-l bg-background min-h-screen sticky top-0 h-screen overflow-y-auto">
            <div className="w-full">
              <SidebarContent />
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b">
              <div className="flex items-center gap-3 px-4 h-14">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 p-0">
                    <SidebarContent onNavigate={() => setMobileOpen(false)} />
                  </SheetContent>
                </Sheet>

                <GlobalSearchBox />

                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  <span className="absolute top-1.5 left-1.5 size-2 rounded-full bg-destructive" />
                </Button>

                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>אד</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-semibold leading-tight">מנהל המערכת</div>
                    <div className="text-xs text-muted-foreground">lishbor-tarosh</div>
                  </div>
                </div>
              </div>
            </header>

            <main className="p-4 md:p-6 flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AdminSearchProvider>
  );
}
