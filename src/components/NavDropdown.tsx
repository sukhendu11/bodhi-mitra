import { ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DropdownItem {
  to: string;
  label: string;
}

interface NavDropdownProps {
  triggerLabel: string;
  items: DropdownItem[];
}

export function NavDropdown({ triggerLabel, items }: NavDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group relative inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all duration-200 cursor-pointer">
          {triggerLabel}
          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <span className="absolute -bottom-1 left-0 h-px w-full bg-foreground/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-56 rounded-md border border-border/60 bg-background/95 backdrop-blur-md p-1.5 shadow-lg"
      >
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild className="p-0">
            <Link
              to={item.to}
              className="block w-full rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:translate-x-0.5 transition-all duration-200"
              activeProps={{ className: "text-foreground bg-secondary/40" }}
            >
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
