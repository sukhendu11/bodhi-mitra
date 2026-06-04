import { Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { LangToggle } from "./LangToggle";

interface MobileNavItem {
  to: string;
  label: string;
  active?: boolean;
}

interface MobileNavProps {
  items: MobileNavItem[];
  isAdmin?: boolean;
  isSignedIn?: boolean;
  adminLabel?: string;
  signInLabel?: string;
  signOutLabel?: string;
  onSignOut?: () => void;
  loginSearch?: { message: string; redirect: string };
  children?: React.ReactNode;
}

export function MobileNav({
  items,
  isAdmin,
  isSignedIn,
  adminLabel,
  signInLabel,
  signOutLabel,
  onSignOut,
  loginSearch,
}: MobileNavProps) {
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
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <SheetClose key={item.to} asChild>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-4 py-3 text-base text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                activeProps={{ className: "text-foreground bg-secondary/40 font-medium" }}
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
          {isAdmin && adminLabel && (
            <SheetClose key="/admin" asChild>
              <Link
                to="/admin"
                className="rounded-md px-4 py-3 text-base text-foreground font-medium hover:bg-secondary/60 transition-colors"
              >
                {adminLabel}
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {signOutLabel}
            </button>
          ) : (
            <SheetClose asChild>
              <Link
                to="/login"
                search={loginSearch ?? { message: "", redirect: "/" }}
                className="px-4 py-1.5 text-xs uppercase tracking-[0.2em] rounded-sm text-white transition-colors"
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
