import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ListChecks } from "lucide-react";
import type { FieldConditionType, SingleConditionType } from "@/lib/content-validation";

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "in", label: "In list" },
  { value: "not_in", label: "Not in list" },
  { value: "empty", label: "Is empty" },
  { value: "not_empty", label: "Is not empty" },
] as const;

interface ConditionBuilderProps {
  value: FieldConditionType;
  onChange: (condition: FieldConditionType) => void;
  availableFields: { name: string; label: string }[];
}

export function ConditionBuilder({
  value,
  onChange,
  availableFields,
}: ConditionBuilderProps) {
  const conditions = value?.conditions || [];
  const logic = value?.logic || "and";

  const addCondition = useCallback(() => {
    const newCondition: SingleConditionType = {
      field: availableFields[0]?.name || "",
      operator: "eq",
      value: "",
    };
    onChange({
      logic,
      conditions: [...conditions, newCondition],
    });
  }, [conditions, logic, availableFields, onChange]);

  const removeCondition = useCallback(
    (index: number) => {
      const updated = conditions.filter((_, i) => i !== index);
      onChange({ logic, conditions: updated });
    },
    [conditions, logic, onChange],
  );

  const updateCondition = useCallback(
    (index: number, updates: Partial<SingleConditionType>) => {
      const updated = conditions.map((c, i) =>
        i === index ? { ...c, ...updates } : c,
      );
      onChange({ logic, conditions: updated });
    },
    [conditions, logic, onChange],
  );

  const toggleLogic = useCallback(() => {
    onChange({
      logic: logic === "and" ? "or" : "and",
      conditions,
    });
  }, [logic, conditions, onChange]);

  if (conditions.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Field Conditions</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Show this field only when certain conditions are met
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Condition
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">Field Conditions</Label>

      <div className="border rounded-lg p-3 space-y-2">
        {/* Logic toggle */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Show when</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLogic}
            className="h-6 text-[10px] px-2"
          >
            <ListChecks className="h-3 w-3 mr-1" />
            {logic === "and" ? "ALL conditions" : "ANY condition"}
          </Button>
        </div>

        {conditions.map((condition, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Field select */}
            <Select
              value={condition.field}
              onValueChange={(v) => updateCondition(index, { field: v })}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator select */}
            <Select
              value={condition.operator}
              onValueChange={(v) =>
                updateCondition(index, { operator: v as SingleConditionType["operator"] })
              }
            >
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input (hidden for empty/not_empty) */}
            {condition.operator !== "empty" && condition.operator !== "not_empty" && (
              <Input
                className="h-8 text-xs flex-1"
                value={String(condition.value ?? "")}
                onChange={(e) =>
                  updateCondition(index, { value: e.target.value })
                }
                placeholder="Value"
              />
            )}

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeCondition(index)}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addCondition}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Condition
        </Button>
      </div>
    </div>
  );
}
