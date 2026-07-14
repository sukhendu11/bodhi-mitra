import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Clock, Star, Trash2 } from "lucide-react";

const KEYS = {
  sidebarCollapsed: "admin-sidebar-collapsed",
  inspectorCollapsed: "admin-inspector-collapsed",
  recentItems: "admin-recent-items",
  favorites: "admin-favorites",
} as const;

interface PreferencesPanelProps {
  open: boolean;
  onClose: () => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (v: boolean) => void;
  inspectorCollapsed: boolean;
  onInspectorCollapsedChange: (v: boolean) => void;
  onClearRecent: () => void;
  onClearFavorites: () => void;
}

export function PreferencesPanel({
  open,
  onClose,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  inspectorCollapsed,
  onInspectorCollapsedChange,
  onClearRecent,
  onClearFavorites,
}: PreferencesPanelProps) {
  const handleSidebarChange = (v: boolean) => {
    onSidebarCollapsedChange(v);
    localStorage.setItem(KEYS.sidebarCollapsed, String(v));
  };

  const handleInspectorChange = (v: boolean) => {
    onInspectorCollapsedChange(v);
    localStorage.setItem(KEYS.inspectorCollapsed, String(v));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Customize your admin experience.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Layout */}
          <div>
            <h4 className="text-xs font-semibold flex items-center gap-2 mb-3">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground/60" />
              Layout
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Collapsed Sidebar</Label>
                  <p className="text-[0.55rem] text-muted-foreground mt-0.5">
                    Default to collapsed sidebar on load
                  </p>
                </div>
                <Switch checked={sidebarCollapsed} onCheckedChange={handleSidebarChange} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Collapsed Inspector</Label>
                  <p className="text-[0.55rem] text-muted-foreground mt-0.5">
                    Default to collapsed inspector panel on load
                  </p>
                </div>
                <Switch checked={inspectorCollapsed} onCheckedChange={handleInspectorChange} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Data */}
          <div>
            <h4 className="text-xs font-semibold flex items-center gap-2 mb-3">
              <Star className="h-3.5 w-3.5 text-muted-foreground/60" />
              Data
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-8"
                onClick={onClearRecent}
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                Clear Recent Items
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-8"
                onClick={onClearFavorites}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                Clear All Favorites
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
