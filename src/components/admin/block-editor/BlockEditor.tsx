import { useCallback, useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code2,
  ImageIcon,
  Table2,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  RemoveFormatting,
  FileCode,
  Eye,
  Edit3,
  Keyboard,
  CloudOff,
  CheckCircle2,
  History,
  Superscript,
  Subscript,
  TableCellsMerge,
  Rows3,
  Columns3,
  Trash2,
} from "lucide-react";
import { getExtensions } from "./editor-extensions";
import { DraftComparison } from "./DraftComparison";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { parseEmbedUrl } from "./MediaExtension";
import { MediaPicker } from "@/components/admin/media-engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Extensions } from "@tiptap/react";
import type { MediaPickerResult } from "@/components/admin/media-engine";

/* ─── Toolbar Button ─────────────────────────────────────────────── */

interface ToolbarBtnProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarBtn({ onClick, isActive, children, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Toolbar Group ──────────────────────────────────────────────── */

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 px-1.5 border-r border-border/40 last:border-r-0">
      {children}
    </div>
  );
}

/* ─── Separator ──────────────────────────────────────────────────── */

function ToolbarSep() {
  return <div className="w-px h-5 bg-border/40 mx-1" />;
}

/* ─── Props ──────────────────────────────────────────────────────── */

export interface BlockEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  extensions?: Extensions;
  minHeight?: string;
  maxHeight?: string;
  /** Show the toolbar */
  showToolbar?: boolean;
  /** Show character count */
  showCharCount?: boolean;
  /** Whether content is currently being saved (shows indicator) */
  isSaving?: boolean;
  /** Timestamp of last successful save */
  lastSavedAt?: Date | null;
  /** Called when ? is pressed to show shortcuts */
  onShowShortcuts?: () => void;
  /** Called when history/compare is pressed */
  onShowHistory?: () => void;
}

/* ─── Block Editor ───────────────────────────────────────────────── */

export function BlockEditor({
  value,
  onChange,
  placeholder,
  extensions,
  minHeight = "300px",
  maxHeight = "800px",
  showToolbar = true,
  showCharCount = false,
  isSaving = false,
  lastSavedAt = null,
  onShowShortcuts,
  onShowHistory,
}: BlockEditorProps) {
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "html">("edit");
  const [htmlContent, setHtmlContent] = useState(value);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDraftCompare, setShowDraftCompare] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: extensions ?? getExtensions(placeholder),
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose-mitra focus:outline-none px-4 py-6 min-h-[300px] max-w-none",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter((f) => f.type.startsWith("image/"));

          if (imageFiles.length > 0) {
            event.preventDefault();

            imageFiles.forEach(async (file) => {
              const url = await uploadFile(file);
              if (url && editor) {
                const { from } = view.state.selection;
                editor
                  .chain()
                  .focus()
                  .setImage({ src: url, alt: file.name })
                  .run();
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html);
      setHtmlContent(html);
    },
  });

  // Sync external value changes
  const prevValueRef = useRef(value);
  if (editor && value !== prevValueRef.current && editor.getHTML() !== value) {
    prevValueRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
    setHtmlContent(value);
  }

  /* ── Link handling ─────────────────────────────────────────────── */

  const openLinkEditor = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkEditor(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setShowLinkEditor(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkEditor(false);
  }, [editor]);

  /* ── Image handling ────────────────────────────────────────────── */

  const addImage = useCallback(() => {
    if (!editor) return;
    setShowMediaPicker(true);
  }, [editor]);

  // Handle media picker selection
  const handleMediaSelect = useCallback(
    (result: MediaPickerResult) => {
      if (!editor) return;
      setShowMediaPicker(false);

      // Check if the URL is an embed (YouTube, Vimeo, X)
      const embedData = parseEmbedUrl(result.url);
      if (embedData && embedData.type !== "generic") {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "embed",
            attrs: {
              url: embedData.url,
              type: embedData.type,
              id: embedData.id,
            },
          })
          .run();
        return;
      }

      // Otherwise insert as image
      editor
        .chain()
        .focus()
        .setImage({ src: result.url, alt: result.name })
        .run();
    },
    [editor],
  );

  // Upload a file to Supabase and return the URL
  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `editor-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      try {
        const { error } = await supabase.storage
          .from("blog-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });
        if (error) throw error;
        const { data: pubData } = supabase.storage.from("blog-images").getPublicUrl(path);
        return pubData.publicUrl;
      } catch (err: any) {
        toast.error(`Upload failed: ${err.message}`);
        return null;
      }
    },
    [],
  );

  /* ── Table handling ────────────────────────────────────────────── */

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  // Listen for slash-command events (MediaPicker + Link editor)
  useEffect(() => {
    const mediaHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.bucket) {
        setShowMediaPicker(true);
      }
    };
    const linkHandler = () => {
      openLinkEditor();
    };
    window.addEventListener("open-media-picker", mediaHandler);
    window.addEventListener("open-link-editor", linkHandler);
    return () => {
      window.removeEventListener("open-media-picker", mediaHandler);
      window.removeEventListener("open-link-editor", linkHandler);
    };
  }, [openLinkEditor]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // ? key — toggle shortcuts dialog
      if (e.key === "?" && !isCtrl && !isShift) {
        e.preventDefault();
        onShowShortcuts?.();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Ctrl+Shift+C — toggle draft comparison
      if (e.key === "c" && isCtrl && isShift) {
        e.preventDefault();
        onShowHistory?.();
        setShowDraftCompare((prev) => !prev);
        return;
      }

      // Ctrl+Shift+P — toggle preview
      if (e.key === "p" && isCtrl && isShift) {
        e.preventDefault();
        setViewMode((prev) => (prev === "preview" ? "edit" : "preview"));
        return;
      }

      // Ctrl+Shift+H — toggle HTML view
      if (e.key === "h" && isCtrl && isShift) {
        e.preventDefault();
        setViewMode((prev) => (prev === "html" ? "edit" : "html"));
        return;
      }

      // Ctrl+Shift+X — cut block (placeholder, uses native cut)
      if (e.key === "x" && isCtrl && isShift) {
        // Native cut works via the browser's built-in cut command
        document.execCommand("cut");
        return;
      }

      // Ctrl+D — duplicate current block
      if (e.key === "d" && isCtrl && !isShift) {
        e.preventDefault();
        if (!editor) return;
        const { $from } = editor.state.selection;
        const node = $from.node($from.depth);
        if (!node) return;
        const pos = $from.after($from.depth);
        editor.chain().focus().insertContentAt(pos, node.toJSON()).run();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, onShowShortcuts, onShowHistory]);

  if (!editor) return null;

  return (
    <div
      className="border border-border/60 rounded-xl overflow-hidden bg-background"
      ref={editorRef}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-secondary/20 sticky top-0 z-10">
          {/* View Mode Toggle */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => setViewMode("edit")}
              isActive={viewMode === "edit"}
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => setViewMode("preview")}
              isActive={viewMode === "preview"}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => setViewMode("html")}
              isActive={viewMode === "html"}
              title="HTML"
            >
              <FileCode className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Undo/Redo */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Headings */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Inline formatting */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              title="Inline Code"
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive("superscript")}
              title="Superscript"
            >
              <Superscript className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive("subscript")}
              title="Subscript"
            >
              <Subscript className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Text alignment */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              isActive={editor.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Ordered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive("taskList")}
              title="Task List"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Blocks */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title="Blockquote"
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              title="Code Block"
            >
              <Code2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarSep />

          {/* Media */}
          <ToolbarGroup>
            <ToolbarBtn onClick={openLinkEditor} isActive={editor.isActive("link")} title="Link">
              <Link className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={addImage} title="Image">
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={addTable} title="Table">
              <Table2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          {/* Table editing (only visible when inside a table) */}
          {editor.isActive("table") && (
            <>
              <ToolbarSep />
              <ToolbarGroup>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  title="Insert row before"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  title="Insert row after"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  title="Delete row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ToolbarBtn>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  title="Insert column before"
                >
                  <Columns3 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Insert column after"
                >
                  <Columns3 className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  title="Delete column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ToolbarBtn>
              </ToolbarGroup>
              <ToolbarGroup>
                <ToolbarBtn
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                  title="Toggle header row"
                >
                  <TableCellsMerge className="h-3.5 w-3.5" />
                </ToolbarBtn>
              </ToolbarGroup>
            </>
          )}

          <ToolbarSep />

          {/* Clear */}
          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              title="Clear Formatting"
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </ToolbarGroup>

          {/* Right side indicators */}
          <div className="ml-auto flex items-center gap-2 px-2">
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 text-[0.5rem] text-muted-foreground whitespace-nowrap">
              {isSaving ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <span className="italic">Saving…</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-muted-foreground/50">Unsaved</span>
                </>
              )}
            </div>

            {/* History / Compare button */}
            {onShowHistory && (
              <ToolbarBtn onClick={onShowHistory} title="Compare versions">
                <History className="h-3.5 w-3.5" />
              </ToolbarBtn>
            )}

            {/* Keyboard shortcuts button */}
            {onShowShortcuts && (
              <ToolbarBtn onClick={onShowShortcuts} title="Keyboard shortcuts (?)">
                <Keyboard className="h-3.5 w-3.5" />
              </ToolbarBtn>
            )}

            {/* Character count */}
            {showCharCount && (
              <span className="text-[0.5rem] text-muted-foreground ml-1">
                {editor.storage.characterCount?.characters?.() ?? 0} chars
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editor / Preview / HTML Content */}
      <div
        className="relative"
        style={{ minHeight, maxHeight, overflow: "auto" }}
      >
        {/* Edit mode */}
        {viewMode === "edit" && (
          <>
            <EditorContent editor={editor} className="editor-content" />
          </>
        )}

        {/* Preview mode */}
        {viewMode === "preview" && (
          <div
            className="prose-mitra px-4 py-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}

        {/* HTML mode */}
        {viewMode === "html" && (
          <textarea
            value={htmlContent}
            onChange={(e) => {
              setHtmlContent(e.target.value);
              onChange(e.target.value);
              editor.commands.setContent(e.target.value, { emitUpdate: false });
            }}
            className="w-full h-full min-h-[300px] p-4 text-xs font-mono bg-zinc-900 text-zinc-100 focus:outline-none resize-none"
            spellCheck={false}
          />
        )}
      </div>

      {/* Draft Comparison Dialog */}
      <DraftComparison
        open={showDraftCompare}
        onClose={() => {
          setShowDraftCompare(false);
          onShowHistory?.();
        }}
        originalHtml={value}
        currentHtml={htmlContent}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcuts
        open={showShortcuts}
        onClose={() => {
          setShowShortcuts(false);
          onShowShortcuts?.();
        }}
      />

      {/* Link Editor Popover */}
      {showLinkEditor && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowLinkEditor(false)}
          />
          <div
            className="fixed z-50 w-72 bg-background rounded-xl border border-border/60 shadow-xl p-3"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="space-y-2">
              <label className="block text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider">
                Link URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyLink();
                  if (e.key === "Escape") setShowLinkEditor(false);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
                placeholder="https://example.com"
                autoFocus
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyLink}
                  className="px-3 py-1 text-[0.5rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                  {editor.getAttributes("link").href ? "Update" : "Apply"}
                </button>
                {editor.getAttributes("link").href && (
                  <button
                    type="button"
                    onClick={removeLink}
                    className="px-3 py-1 text-[0.5rem] font-medium text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLinkEditor(false)}
                  className="px-3 py-1 text-[0.5rem] font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Media Picker Dialog */}
      <MediaPicker
        open={showMediaPicker}
        options={{
          title: "Select or Upload Image",
          bucket: "blog-images",
          allowedFileTypes: ["image/*"],
        }}
        onSelect={handleMediaSelect}
        onClose={() => setShowMediaPicker(false)}
      />
    </div>
  );
}
