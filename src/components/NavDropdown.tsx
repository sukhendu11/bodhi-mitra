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

  if (hasChildren) {
    return (
      <div
        className="relative"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Parent item — clickable link + hover opens submenu */}
        <div className="flex items-center justify-between">
          <Link
            to={item.to as any}
            className="flex-1 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-300"
          >
            {item.label}
          </Link>
          <button
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
  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-300"
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link
      to={item.to as any}
      className="block w-full rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-300"
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

  return (
    <div
      className="relative group"
      data-state={open ? "open" : "closed"}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger */}
      {to ? (
        <Link
          to={to}
          className="group relative inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-300"
          activeOptions={{ exact: to === "/" }}
        >
          {triggerLabel}
          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left" />
        </Link>
      ) : (
        <button className="group relative inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-300 cursor-pointer">
          {triggerLabel}
          <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out origin-left" />
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-md border border-border/60 bg-popover text-popover-foreground p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
          {items.map((item) => (
            <DropdownSubItem key={item.to} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
