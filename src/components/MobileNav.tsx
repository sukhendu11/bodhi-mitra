import { Menu, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LangToggle } from "./LangToggle";

interface MobileNavItem {
  to: string;
  label: string;
}

interface MobileNavGroup {
  label: string;
  items: MobileNavItem[];
}

interface MobileNavProps {
  items: MobileNavItem[];
  groups?: MobileNavGroup[];
  isAdmin?: boolean;
  isSignedIn?: boolean;
  adminLabel?: string;
  libraryLabel?: string;
  bookmarksLabel?: string;
  profileLabel?: string;
  signInLabel?: string;
  signOutLabel?: string;
  onSignOut?: () => void;
  loginSearch?: { message: string; redirect: string };
  children?: React.ReactNode;
}

export function MobileNav({
  items,
  groups,
  isAdmin,
  isSignedIn,
  adminLabel,
  libraryLabel,
  bookmarksLabel,
  profileLabel,
  signInLabel,
  signOutLabel,
  onSignOut,
  loginSearch,
}: MobileNavProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open navigation menu"
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 sm:w-80 p-6 pt-16">
        <nav className="flex flex-col gap-0.5">
          {/* Top-level items */}
          {items.map((item) => (
            <SheetClose key={item.to} asChild>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-4 py-3 text-base text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
                activeProps={{ className: "text-foreground bg-secondary/40 font-medium" }}
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}

          {/* Grouped dropdown items with expand/collapse */}
          {groups?.map((group) => (
            <div key={group.label} className="mt-1">
              <button
                onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                className="flex items-center justify-between w-full rounded-md px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              >
                <span>{group.label}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    openGroup === group.label ? "rotate-90" : ""
                  }`}
                />
              </button>
              {openGroup === group.label && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-border/60 pl-3">
                  {group.items.map((item) => (
                    <SheetClose key={item.to} asChild>
                      <Link
                        to={item.to}
                        className="block rounded-md px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:translate-x-0.5 transition-all duration-200"
                        activeProps={{ className: "text-foreground bg-secondary/30 font-medium" }}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isAdmin && adminLabel && (
            <SheetClose key="/admin" asChild>
              <Link
                to="/admin"
                className="mt-2 rounded-md px-4 py-3 text-base text-foreground font-medium hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              >
                {adminLabel}
              </Link>
            </SheetClose>
          )}
          {isSignedIn && libraryLabel && (
            <SheetClose key="/books/library" asChild>
              <Link
                to="/books/library"
                search={{ search: "", page: 1 }}
                className="mt-1 rounded-md px-4 py-3 text-base text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              >
                {libraryLabel}
              </Link>
            </SheetClose>
          )}
          {isSignedIn && bookmarksLabel && (
            <SheetClose key="/bookmarks" asChild>
              <Link
                to="/bookmarks"
                className="mt-1 rounded-md px-4 py-3 text-base text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              >
                {bookmarksLabel}
              </Link>
            </SheetClose>
          )}
          {isSignedIn && profileLabel && (
            <SheetClose key="/profile" asChild>
              <Link
                to="/profile"
                className="mt-1 rounded-md px-4 py-3 text-base text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              >
                {profileLabel}
              </Link>
            </SheetClose>
          )}
        </nav>

        <hr className="my-5 border-border/60" />

        <div className="flex items-center justify-between px-1">
          <LangToggle className="ml-0" />
          {isSignedIn ? (
            <button
              onClick={onSignOut}
              className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200"
            >
              {signOutLabel}
            </button>
          ) : (
            <SheetClose asChild>
              <Link
                to="/login"
                search={loginSearch ?? { message: "", redirect: "/" }}
                className="px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 hover:brightness-110"
                style={{ backgroundColor: "var(--color-saffron)" }}
              >
                {signInLabel}
              </Link>
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
