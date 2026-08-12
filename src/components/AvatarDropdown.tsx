import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, LogOut } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getProfileMenuItems, PROFILE_MENU_GROUP_LABELS } from "@/lib/profile-menu";

interface AvatarDropdownProps {
  avatarUrl?: string | null;
  isAdmin?: boolean;
  strapiUrl?: string;
  onSignOut: () => void;
}

function ProfileIcon({ dropdownOpen }: { dropdownOpen: boolean }) {
  // Show the new SVG when: dropdown is open, OR hovered (group-hover)
  // Stay on initial SVG only when: dropdown closed AND not hovered
  const showNew = dropdownOpen;

  return (
    <span className="relative inline-flex items-center justify-center h-7 w-7 rounded-full border-2 border-foreground/15 transition-all duration-500">
      {/* Initial meditation icon — visible by default, hides on hover or when dropdown open */}
      <svg
        viewBox="0 0 119.683 119.683"
        fill="currentColor"
        className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-500 ${
          showNew
            ? "opacity-0 text-muted-foreground"
            : "opacity-100 text-[var(--color-saffron)] group-hover:text-muted-foreground group-hover:opacity-0"
        }`}
        style={{ pointerEvents: "none" }}
      >
        <circle cx="59.058" cy="18.729" r="18.729" />
        <path d="M103.871,101.242c-0.698-5.748-4.909-7.937-12.004-9.021c-4.976,4.548-13.326,8.022-27.24,8.022c-1.926,0-3.786-0.489-5.454-1.426c-1.668,0.937-3.528,1.426-5.456,1.426c-13.785,0-22.109-3.412-27.1-7.898c-6.38,1.253-10.152,3.544-10.806,8.896c-0.416,3.445,0.659,6.824,3.029,9.518c6.678,7.592,24.951,8.85,35.247,8.923c0.021,0,0.043,0,0.063,0c2.184,0,4.173-0.821,5.69-2.168c1.516,1.347,3.506,2.168,5.689,2.168c0.021,0,0.042,0,0.063,0c10.297-0.073,28.57-1.331,35.25-8.925C103.215,108.066,104.287,104.688,103.871,101.242z" />
        <path d="M54.024,97.725c2.176,0,4.122-0.961,5.455-2.476c1.333,1.515,3.28,2.476,5.454,2.476c20.907,0,27.621-8.242,29.574-15.16c4.568-16.186-13.771-35.102-22.188-40.263c-0.564-0.348-1.166-0.578-1.776-0.755c-2.085-1.393-4.43-2.418-6.817-3.004l-4.667,4.697l-4.526-4.749c-0.014,0.004-0.029,0.005-0.045,0.01c-3.072,0.734-6.065,2.2-8.541,4.242c-8.681,5.72-25.944,24.063-21.498,39.822C26.402,89.482,33.117,97.725,54.024,97.725z M39.889,71.49v6.197c0.489,0.223,1.511,0.877,1.519,0.948c0.854,0.621,4.245,1.954,11.81,1.954c1.928,0,3.788,0.488,5.456,1.425c1.668-0.937,3.528-1.425,5.454-1.425c6.296,0,9.693-0.922,11.153-1.591c0.986-0.202,1.972-0.451,2.947-0.73v-8.436c1.878,3.455,2.876,6.679,2.281,8.782c-0.793,2.815-6.763,4.565-15.577,4.565c-2.174,0-4.12,0.96-5.454,2.476c-1.333-1.516-3.279-2.476-5.455-2.476c-8.813,0-14.784-1.75-15.577-4.565C37.95,76.854,38.57,74.304,39.889,71.49z" />
      </svg>

      {/* New meditation icon — hidden by default, visible on hover or when dropdown open */}
      <svg
        viewBox="-351 153 256 256"
        fill="currentColor"
        className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-500 ${
          showNew
            ? "opacity-100 text-[var(--color-saffron)]"
            : "opacity-0 text-muted-foreground group-hover:text-[var(--color-saffron)] group-hover:opacity-100"
        }`}
        style={{ pointerEvents: "none" }}
      >
        <circle cx="-222.3" cy="188.5" r="31.1" />
        <path d="M-106.6,332.4c-0.4-0.6-0.9-1.1-1.4-1.6l-35.3-32.8l-22.8-49c-6.2-12.5-15.2-20.3-28.6-20.3h-57.5c-13.5,0-22.4,7.8-28.6,20.3l-22.8,49l-35.3,32.8c-0.5,0.5-1,1.1-1.4,1.6c-3.6,3.1-5.9,7.7-5.9,12.8c0,9.3,7.6,16.9,16.9,16.9c5.5,0,10.3-2.6,13.4-6.7c0.3-0.2,0.6-0.5,0.8-0.7l37.4-34.8c1.4-1.4,2.5-3,3.3-4.8l11.9-25.5l-0.6,45l-52.2,28.4c-9.5,5.2-14,16.4-10.6,26.7c3.4,10.3,13.6,16.7,24.3,15.2l78.1-20.2l78.1,20.2c10.7,1.5,21-4.9,24.3-15.2c3.4-10.3-1.1-21.5-10.6-26.7l-52.2-28.5l-0.6-45l11.9,25.5c0.8,1.8,2,3.4,3.3,4.8l37.4,34.8c0.3,0.3,0.5,0.5,0.8,0.7c3.1,4,7.9,6.7,13.4,6.7c9.3,0,16.9-7.6,16.9-16.9C-100.7,340-103,335.5-106.6,332.4z" />
      </svg>
    </span>
  );
}

export function AvatarDropdown({
  avatarUrl,
  isAdmin,
  strapiUrl,
  onSignOut,
}: AvatarDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { lang } = useLang();
  const bn = lang === "bn";
  const menuItems = getProfileMenuItems().filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center justify-center p-0.5 focus-visible:outline-none">
          {avatarUrl ? (
            <span className="relative inline-flex items-center justify-center h-7 w-7 rounded-full border-2 border-foreground/15 transition-all duration-500">
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-5 w-5 object-cover rounded-full group-hover:scale-110 transition-all duration-500"
              />
            </span>
          ) : (
            <ProfileIcon dropdownOpen={dropdownOpen} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48">
        {/* Nav destinations — order comes from PROFILE_MENU_ITEMS.sort_order,
            so a future admin backend can customize item positions. */}
        {menuItems.map((item, i) => {
            const Icon = item.icon;
            const prev = i > 0 ? menuItems[i - 1] : undefined;
            // Separator at every boundary: between groups, into/out of a
            // group, and between consecutive standalone items.
            const needSeparator =
              !!prev && (prev.group !== item.group || (!prev.group && !item.group));
            const showHeader =
              !!item.group && (!prev || prev.group !== item.group);
            return (
              <Fragment key={item.id}>
                {i > 0 && needSeparator && <DropdownMenuSeparator />}
                {item.group && showHeader && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                    {bn
                      ? PROFILE_MENU_GROUP_LABELS[item.group].labelBn
                      : PROFILE_MENU_GROUP_LABELS[item.group].label}
                  </p>
                )}
                <DropdownMenuItem asChild>
                  {item.external ? (
                    <a
                      href={item.to || strapiUrl || "http://localhost:1337"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      {bn ? item.label_bn : item.label_en}
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/40" />
                    </a>
                  ) : (
                    <Link to={item.to} className="flex items-center gap-2 cursor-pointer">
                      <Icon className="h-4 w-4" />
                      {bn ? item.label_bn : item.label_en}
                    </Link>
                  )}
                </DropdownMenuItem>
              </Fragment>
            );
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          {bn ? "সাইন আউট" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
