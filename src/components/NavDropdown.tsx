import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

interface DropdownItem {
  to: string;
  label: string;
  external?: boolean;
  children?: DropdownItem[];
}

interface NavDropdownProps {
  triggerLabel: string;
  to?: string;
  items: DropdownItem[];
}

function DropdownSubItem({ item }: { item: DropdownItem }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const hasChildren = item.children && item.children.length > 0;

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // Keep the submenu open while focus moves inside it (trigger → flyout links)
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    handleLeave();
  };

  if (hasChildren) {
    return (
      <div
        className="relative"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleBlur}
      >
        {/* Parent item — clickable link; hover OR keyboard focus opens submenu */}
        <div className="flex items-center justify-between">
          <Link
            to={item.to as any}
            role="menuitem"
            className="flex-1 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            activeProps={{
              className:
                "text-foreground font-medium bg-primary/10 hover:bg-primary/15",
            }}
          >
            {item.label}
          </Link>
          <button
            aria-haspopup="menu"
            aria-expanded={open}
            onMouseEnter={handleEnter}
            className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            <ChevronRight className="h-3 w-3 opacity-50" />
          </button>
        </div>
        {/* Flyout submenu */}
        {open && (
          <div
            role="menu"
            className="absolute top-0 left-full z-50 ml-1 w-48 rounded-md border border-border/60 bg-popover text-popover-foreground p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-left-1 duration-150"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            {item.children!.map((child) => (
              <DropdownLink key={child.to} item={child} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <DropdownLink item={item} />;
}

function DropdownLink({ item }: { item: DropdownItem }) {
  const itemCls =
    "block w-full rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40";
  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        className={itemCls}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link
      to={item.to as any}
      role="menuitem"
      className={itemCls}
      activeProps={{
        className: "text-foreground font-medium bg-primary/10 hover:bg-primary/15",
      }}
    >
      {item.label}
    </Link>
  );
}

export function NavDropdown({ triggerLabel, to, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined as any);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 100);
  };

  // Keep the dropdown open while focus moves between the trigger and the panel;
  // close (with the usual delay) only when focus leaves the whole control.
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    handleLeave();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      (e.currentTarget.querySelector("a, button") as HTMLElement | null)?.focus();
    }
  };

  // Active state — bold text + a persistent saffron underline (no background
  // pill; the mobile-style tint reads too heavy in the quiet desktop header).
  const activeCls = "text-foreground font-medium [&>span]:scale-x-100 [&>span]:bg-[var(--color-saffron)]";
  const triggerCls =
    "group relative inline-flex items-center gap-1 px-2.5 py-1 text-base text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40";

  return (
    <div
      className="relative group"
      data-state={open ? "open" : "closed"}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger — opens on hover, on focus (keyboard), or on click (button variant) */}
      {to ? (
        <Link
          to={to}
          aria-haspopup="menu"
          aria-expanded={open}
          className={triggerCls}
          activeOptions={{ exact: to === "/" }}
          activeProps={{ className: activeCls }}
        >
          {triggerLabel}
          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left" />
        </Link>
      ) : (
        <button
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`${triggerCls} cursor-pointer`}
        >
          {triggerLabel}
          <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left" />
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-50 mt-2 w-56 rounded-md border border-border/60 bg-popover text-popover-foreground p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
        >
          {items.map((item) => (
            <DropdownSubItem key={item.to} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
