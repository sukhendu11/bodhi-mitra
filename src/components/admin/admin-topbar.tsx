import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search as SearchIcon,
  ExternalLink,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";
import { signOut } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notification-bell";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { AdminThemeToggle } from "@/components/admin/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/* ─── Props ──────────────────────────────────────────────────────── */

interface TopBarProps {
  user: SupabaseUser | null;
  userRole: string | null | undefined;
  isSuperAdmin: boolean;
  openCommandPalette: () => void;
}

/* ─── Top Bar ────────────────────────────────────────────────────── */

export function AdminTopBar({ user, userRole, isSuperAdmin, openCommandPalette }: TopBarProps) {
  const navigate = useNavigate();

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";
  const displayName = user?.email?.split("@")[0] ?? "Unknown";

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <AdminBreadcrumbs />
          </div>
        </div>

        {/* Center: Search (desktop) */}
        <div className="hidden md:flex relative max-w-xs flex-1 mx-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            type="text"
            readOnly
            placeholder="Search content…"
            onClick={openCommandPalette}
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/50 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.5rem] text-muted-foreground/40 font-mono border border-border/40 rounded px-1 py-0.5 hidden sm:inline">
            ⌘K
          </kbd>
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-1.5">
          {/* Theme */}
          <AdminThemeToggle />
          <NotificationBell />

          {/* View site */}
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-medium text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:border-border hover:bg-secondary/40 transition-all"
          >
            <ExternalLink className="h-3 w-3" />
            View Site
          </Link>

          {/* User menu (shadcn DropdownMenu) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/50">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-500 text-[0.55rem] font-semibold text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight truncate max-w-[120px]">
                    {displayName}
                  </p>
                  <p className="text-[0.5rem] text-muted-foreground leading-tight mt-0.5">
                    {isSuperAdmin ? "Super Admin" : userRole || "User"}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-500 text-xs font-semibold text-white">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-[0.55rem] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/" })} className="cursor-pointer">
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                View Site
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate({ to: "/profile" })}
                className="cursor-pointer"
              >
                <User className="h-3.5 w-3.5 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate({ to: "/admin/settings" })}
                className="cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            type="text"
            readOnly
            placeholder="Search content…"
            onClick={openCommandPalette}
            className="w-full pl-9 pr-3 py-2 text-xs border border-border/50 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors focus:outline-none"
          />
        </div>
      </div>
    </header>
  );
}
