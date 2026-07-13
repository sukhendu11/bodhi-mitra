import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Heading,
  Text,
  ImageIcon,
  Quote,
  Video,
  Minus,
  Pointer,
  Images,
  Layout,
} from "lucide-react";
import {
  getAllBlocks,
  type BlockDef,
  type ComponentFieldDef,
} from "@/lib/content-components";

const BLOCK_ICONS: Record<string, React.ReactNode> = {
  heading: <Heading className="h-4 w-4" />,
  text: <Text className="h-4 w-4" />,
  image: <ImageIcon className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  divider: <Minus className="h-4 w-4" />,
  button: <Pointer className="h-4 w-4" />,
  gallery: <Images className="h-4 w-4" />,
};

// ============================================================================
// Block Builder Component
// ============================================================================

export interface BlockItem {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface BlockBuilderProps {
  value: BlockItem[];
  onChange: (blocks: BlockItem[]) => void;
  availableBlocks?: BlockDef[];
}

export function BlockBuilder({
  value,
  onChange,
  availableBlocks,
}: BlockBuilderProps) {
  const blocks = availableBlocks || getAllBlocks();
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = value.findIndex((b) => b.id === active.id);
        const newIndex = value.findIndex((b) => b.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          onChange(arrayMove(value, oldIndex, newIndex));
        }
      }
    },
    [value, onChange],
  );

  const addBlock = useCallback(
    (blockType: string) => {
      const blockDef = blocks.find((b) => b.name === blockType);
      if (!blockDef) return;

      const data: Record<string, unknown> = {};
      for (const field of blockDef.fields) {
        data[field.name] = field.default_value ?? "";
      }

      const newBlock: BlockItem = {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: blockType,
        data,
      };
      onChange([...value, newBlock]);
      setExpandedBlocks((prev) => new Set(prev).add(newBlock.id));
    },
    [value, onChange, blocks],
  );

  const updateBlock = useCallback(
    (blockId: string, fieldName: string, fieldValue: unknown) => {
      onChange(
        value.map((b) =>
          b.id === blockId
            ? { ...b, data: { ...b.data, [fieldName]: fieldValue } }
            : b,
        ),
      );
    },
    [value, onChange],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      onChange(value.filter((b) => b.id !== blockId));
    },
    [value, onChange],
  );

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const block = value.find((b) => b.id === blockId);
      if (!block) return;
      const newBlock: BlockItem = {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: block.type,
        data: { ...block.data },
      };
      const idx = value.findIndex((b) => b.id === blockId);
      const newValue = [...value];
      newValue.splice(idx + 1, 0, newBlock);
      onChange(newValue);
    },
    [value, onChange],
  );

  const toggleExpand = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      {/* Add Block Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {blocks.map((block) => (
            <DropdownMenuItem
              key={block.id}
              onClick={() => addBlock(block.name)}
            >
              <span className="mr-2">{BLOCK_ICONS[block.name] || <Layout className="h-4 w-4" />}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{block.label}</p>
                {block.description && (
                  <p className="text-xs text-muted-foreground">{block.description}</p>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block List */}
      {value.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          Click "Add Block" to start building your content
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {value.map((block) => {
              const blockDef = blocks.find((b) => b.name === block.type);
              const isExpanded = expandedBlocks.has(block.id);
              const displayTitle = (block.data?.title || block.data?.text || block.data?.heading || blockDef?.label || block.type) as string;

              return (
                <SortableBlock
                  key={block.id}
                  id={block.id}
                  block={block}
                  blockDef={blockDef}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(block.id)}
                  onUpdate={(field, value) => updateBlock(block.id, field, value)}
                  onRemove={() => removeBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ============================================================================
// Sortable Block Item
// ============================================================================

function SortableBlock({
  id,
  block,
  blockDef,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  id: string;
  block: BlockItem;
  blockDef?: BlockDef;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={isDragging ? "shadow-lg" : ""}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-foreground text-muted-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="mr-1">
            {blockDef && BLOCK_ICONS[blockDef.name]}
          </span>
          <span className="text-sm font-medium flex-1 truncate">
            {blockDef?.label || block.type}
          </span>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onDuplicate}
            className="text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      {isExpanded && blockDef && blockDef.fields.length > 0 && (
        <CardContent className="pb-4 px-4 pt-0 space-y-3">
          {blockDef.fields.map((field) => (
            <BlockFieldEditor
              key={field.name}
              field={field}
              value={block.data[field.name]}
              onChange={(v) => onUpdate(field.name, v)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Block Field Editor
// ============================================================================

function BlockFieldEditor({
  field,
  value,
  onChange,
}: {
  field: ComponentFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strValue = String(value ?? "");

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Textarea
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows || 3}
            placeholder={field.placeholder}
          />
        </div>
      );

    case "select":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Select value={strValue} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "media":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Input
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "Enter media URL..."}
          />
          {strValue && (
            <img
              src={strValue}
              alt={field.label}
              className="mt-1 h-20 w-full object-cover rounded border"
            />
          )}
        </div>
      );

    case "richtext":
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Textarea
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            rows={field.rows || 4}
            placeholder={field.placeholder || "Enter rich text..."}
          />
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs">{field.label}</Label>
          <Input
            type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
            value={strValue}
            onChange={(e) =>
              onChange(
                field.type === "number" ? Number(e.target.value) : e.target.value,
              )
            }
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}
