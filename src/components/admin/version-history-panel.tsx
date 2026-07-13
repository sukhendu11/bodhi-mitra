import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  History,
  RotateCcw,
  FileText,
  Clock,
  User,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface RevisionEntry {
  id: string;
  version: number;
  changed_by?: string;
  summary?: string;
  data?: Record<string, unknown>;
  changes?: { field: string; oldValue?: unknown; newValue?: unknown }[];
  created_at: string;
}

interface VersionHistoryPanelProps {
  revisions: RevisionEntry[];
  currentVersion?: number;
  onRestore?: (revision: RevisionEntry) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

// ============================================================================
// Version History Panel
// ============================================================================

export function VersionHistoryPanel({
  revisions,
  currentVersion,
  onRestore,
  isLoading,
  emptyMessage = "No version history available",
}: VersionHistoryPanelProps) {
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null);

  const sortedRevisions = [...revisions].sort(
    (a, b) => b.version - a.version,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">Version History</CardTitle>
          {currentVersion && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              v{currentVersion}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : sortedRevisions.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {sortedRevisions.map((revision) => {
                const isSelected = selectedRevision === revision.id;
                const isCurrent = revision.version === currentVersion;
                const date = new Date(revision.created_at);

                return (
                  <div
                    key={revision.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : isCurrent
                          ? "border-emerald-500/50 bg-emerald-50/50"
                          : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      setSelectedRevision(
                        isSelected ? null : revision.id,
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium">
                          v{revision.version}
                        </span>
                        {isCurrent && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {date.toLocaleDateString()}{" "}
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {revision.summary && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {revision.summary}
                      </p>
                    )}

                    {revision.changed_by && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3" />
                        {revision.changed_by}
                      </div>
                    )}

                    {/* Changes detail */}
                    {isSelected && revision.changes && (
                      <div className="mt-2 space-y-1 pt-2 border-t">
                        {revision.changes.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">
                            No field-level changes tracked
                          </p>
                        ) : (
                          revision.changes.map((change, i) => (
                            <div key={i} className="text-[10px] font-mono">
                              <span className="text-foreground">{change.field}</span>
                              {change.oldValue !== undefined && (
                                <span className="text-destructive ml-1">
                                  "{String(change.oldValue).slice(0, 30)}"
                                </span>
                              )}
                              {change.oldValue !== undefined && change.newValue !== undefined && (
                                <span className="text-muted-foreground"> → </span>
                              )}
                              {change.newValue !== undefined && (
                                <span className="text-emerald-600">
                                  "{String(change.newValue).slice(0, 30)}"
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Restore button */}
                    {!isCurrent && onRestore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestore(revision);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore this version
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Revisions Diff Component
// ============================================================================

interface RevisionDiffProps {
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  fields?: string[];
}

export function RevisionDiff({
  oldData = {},
  newData = {},
  fields,
}: RevisionDiffProps) {
  const allKeys = fields || [
    ...new Set([...Object.keys(oldData), ...Object.keys(newData)]),
  ];

  const changedKeys = allKeys.filter((key) => {
    const oldVal = JSON.stringify(oldData[key]);
    const newVal = JSON.stringify(newData[key]);
    return oldVal !== newVal;
  });

  if (changedKeys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No changes detected
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {changedKeys.map((key) => (
        <div key={key} className="text-xs font-mono p-2 rounded bg-muted/50">
          <div className="font-medium text-foreground mb-1">{key}</div>
          <div className="text-destructive line-through">
            {oldData[key] !== undefined ? String(oldData[key]).slice(0, 50) : "(empty)"}
          </div>
          <div className="text-emerald-600">
            {newData[key] !== undefined ? String(newData[key]).slice(0, 50) : "(empty)"}
          </div>
        </div>
      ))}
    </div>
  );
}
