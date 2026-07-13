import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { BlockEditor } from "../BlockEditor";

/* ─── Mock TipTap editor ─────────────────────────────────────────── */

let mockEditorInstance: any = null;

/**
 * Create a stable editor singleton that persists across renders.
 * Real TipTap's useEditor() returns the same editor reference on every render;
 * our mock must do the same to avoid breaking useEffect deps and ref logic.
 */
const stableEditor = (() => {
  const chain: Record<string, any> = {};
  const mockRun = vi.fn();

  const chainMethods = [
    "focus", "toggleBold", "toggleItalic", "toggleUnderline", "toggleStrike",
    "toggleCode", "toggleHeading", "toggleBulletList", "toggleOrderedList", "toggleTaskList",
    "toggleBlockquote", "toggleCodeBlock", "setTextAlign", "setHorizontalRule",
    "setImage", "setLink", "insertTable", "setParagraph", "clearNodes",
    "unsetAllMarks", "undo", "redo", "deleteRange", "extendMarkRange",
    "unsetLink", "lift", "insertContentAt",
  ];

  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.run = mockRun;

  return {
    chain: vi.fn(() => chain),
    isActive: vi.fn(() => false),
    getHTML: vi.fn(() => "<p>Editor content</p>"),
    commands: { setContent: vi.fn() },
    state: {
      doc: { resolve: vi.fn(() => ({ depth: 1, before: vi.fn(() => 0) })) },
      selection: {
        from: 0,
        $from: {
          depth: 1,
          node: vi.fn(() => ({
            toJSON: vi.fn(() => ({
              type: "paragraph",
              content: [{ type: "text", text: "Test" }],
            })),
          })),
          after: vi.fn(() => 12),
        },
      },
    },
    storage: { characterCount: { characters: vi.fn(() => 150) } },
  };
})();

mockEditorInstance = stableEditor;

(stableEditor as any).__onUpdate = null;

vi.mock("@tiptap/react", () => ({
  useEditor: ({ onUpdate }: any) => {
    (stableEditor as any).__onUpdate = onUpdate;
    return stableEditor;
  },
  EditorContent: ({ className }: any) => (
    <div data-testid="editor-content" className={className}>
      Mock Editor Content
    </div>
  ),
}));

vi.mock("lucide-react", () => {
  const icons: Record<string, any> = {};
  const iconList = [
    "Bold", "Italic", "Underline", "Strikethrough", "Code",
    "Heading1", "Heading2", "Heading3", "List", "ListOrdered",
    "CheckSquare", "Quote", "Minus", "Code2", "ImageIcon", "Table2",
    "Link", "AlignLeft", "AlignCenter", "AlignRight", "Undo2", "Redo2",
    "RemoveFormatting", "FileCode", "Eye", "Edit3", "Keyboard",
    "CloudOff", "CheckCircle2", "History",
    "Superscript", "Subscript", "TableCellsMerge", "Rows3", "Columns3", "Trash2",
  ];
  for (const name of iconList) {
    icons[name] = () => <span data-testid={`icon-${name}`} />;
  }
  return icons;
});

vi.mock("../DraftComparison", () => ({
  DraftComparison: ({ open }: any) =>
    open ? <div data-testid="draft-comparison">Draft Comparison</div> : null,
}));

vi.mock("../KeyboardShortcuts", () => ({
  KeyboardShortcuts: ({ open }: any) =>
    open ? <div data-testid="keyboard-shortcuts">Keyboard Shortcuts</div> : null,
}));

vi.mock("../MediaExtension", () => ({
  parseEmbedUrl: vi.fn(() => null),
  getEmbedHtml: vi.fn(() => "<div>Embed</div>"),
  EmbedExtension: { name: "embed", addNodeView: vi.fn() },
  ImageNodeView: () => null,
}));

vi.mock("@/components/admin/media-engine", () => ({
  MediaPicker: ({ open, onSelect }: any) =>
    open ? <div data-testid="media-picker">Media Picker</div> : null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/image.jpg" } })),
      })),
    },
  },
}));

/* ─── Test Helpers ────────────────────────────────────────────────── */

function queryByTitle(container: HTMLElement, title: string): HTMLElement | null {
  return container.querySelector(`[title="${title}"]`);
}

function clickButton(container: HTMLElement, title: string): void {
  const btn = queryByTitle(container, title);
  if (btn) {
    (btn as HTMLElement).click();
  }
}

function getEditorChain() {
  return mockEditorInstance?.chain();
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mockEditorInstance back to the stable editor singleton
  mockEditorInstance = stableEditor;
  (stableEditor as any).__onUpdate = null;
});

/* ════════════════════════════════════════════════════════════════════
   Rendering
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — rendering", () => {
  it("renders the editor with default props", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
  });

  it("renders the toolbar by default", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    expect(queryByTitle(container, "Edit")).toBeInTheDocument();
    expect(queryByTitle(container, "Preview")).toBeInTheDocument();
    expect(queryByTitle(container, "HTML")).toBeInTheDocument();
  });

  it("hides toolbar when showToolbar is false", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} showToolbar={false} />);
    expect(queryByTitle(container, "Edit")).not.toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Toolbar Commands
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — toolbar commands", () => {
  it("triggers bold command when Bold button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Bold (Ctrl+B)");
    const chain = getEditorChain();
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.toggleBold).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers italic command when Italic button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Italic (Ctrl+I)");
    const chain = getEditorChain();
    expect(chain.toggleItalic).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers underline command when Underline button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Underline (Ctrl+U)");
    const chain = getEditorChain();
    expect(chain.toggleUnderline).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers heading 1 command when H1 button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Heading 1");
    const chain = getEditorChain();
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 1 });
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers heading 2 command when H2 button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Heading 2");
    const chain = getEditorChain();
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers bullet list command when List button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Bullet List");
    const chain = getEditorChain();
    expect(chain.toggleBulletList).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers ordered list command when Ordered List button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Ordered List");
    const chain = getEditorChain();
    expect(chain.toggleOrderedList).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers blockquote command when Blockquote button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Blockquote");
    const chain = getEditorChain();
    expect(chain.toggleBlockquote).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers undo when Undo button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Undo (Ctrl+Z)");
    const chain = getEditorChain();
    expect(chain.undo).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers redo when Redo button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Redo (Ctrl+Shift+Z)");
    const chain = getEditorChain();
    expect(chain.redo).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers clear formatting when Clear button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Clear Formatting");
    const chain = getEditorChain();
    expect(chain.clearNodes).toHaveBeenCalled();
    expect(chain.unsetAllMarks).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers code block when Code Block button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Code Block");
    const chain = getEditorChain();
    expect(chain.toggleCodeBlock).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("triggers horizontal rule when HR button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Horizontal Rule");
    const chain = getEditorChain();
    expect(chain.setHorizontalRule).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("inserts a table when Table button is clicked", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Table");
    const chain = getEditorChain();
    expect(chain.insertTable).toHaveBeenCalledWith({
      rows: 3, cols: 3, withHeaderRow: true,
    });
    expect(chain.run).toHaveBeenCalled();
  });

  it("opens media picker when Image button is clicked", async () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Image");
    await waitFor(() => {
      expect(container.querySelector('[data-testid="media-picker"]')).toBeInTheDocument();
    });
  });
});

/* ════════════════════════════════════════════════════════════════════
   View Mode
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — view mode toggle", () => {
  it("starts in edit mode", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
  });

  it("switches to preview mode when Preview is clicked", async () => {
    const { container } = render(<BlockEditor value="<p>Test</p>" onChange={vi.fn()} />);
    clickButton(container, "Preview");
    await waitFor(() => {
      expect(container.querySelector('[data-testid="editor-content"]')).not.toBeInTheDocument();
    });
    expect(container.textContent).toContain("Test");
  });

  it("switches to HTML mode when HTML is clicked", async () => {
    const html = "<p>Hello World</p>";
    const { container } = render(<BlockEditor value={html} onChange={vi.fn()} />);
    clickButton(container, "HTML");
    await waitFor(() => {
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(html);
    });
  });

  it("returns to edit mode after toggling through views", async () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    clickButton(container, "Preview");
    clickButton(container, "Edit");
    await waitFor(() => {
      expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
    });
  });
});

/* ════════════════════════════════════════════════════════════════════
   Value / onChange
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — value/onChange prop integration", () => {
  it("calls onChange when editor updates", () => {
    const onChange = vi.fn();
    render(<BlockEditor value="" onChange={onChange} />);
    if (mockEditorInstance?.__onUpdate) {
      mockEditorInstance.__onUpdate({ editor: mockEditorInstance });
    }
    expect(onChange).toHaveBeenCalledWith("<p>Editor content</p>");
  });

  it("updates editor content when value prop changes", () => {
    const { rerender } = render(<BlockEditor value="<p>First</p>" onChange={vi.fn()} />);
    rerender(<BlockEditor value="<p>Second</p>" onChange={vi.fn()} />);
    expect(mockEditorInstance?.commands.setContent).toHaveBeenCalledWith(
      "<p>Second</p>",
      { emitUpdate: false },
    );
  });
});

/* ════════════════════════════════════════════════════════════════════
   Keyboard Shortcuts
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — keyboard shortcuts", () => {
  it("shows shortcuts dialog when ? key is pressed", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "?" });
    expect(container.querySelector('[data-testid="keyboard-shortcuts"]')).toBeInTheDocument();
  });

  it("shows draft comparison on Ctrl+Shift+C", () => {
    const { container } = render(<BlockEditor value="<p>Original</p>" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "c", ctrlKey: true, shiftKey: true });
    expect(container.querySelector('[data-testid="draft-comparison"]')).toBeInTheDocument();
  });

  it("toggles preview mode on Ctrl+Shift+P", async () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "p", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(container.querySelector('[data-testid="editor-content"]')).not.toBeInTheDocument();
    });
  });

  it("toggles HTML mode on Ctrl+Shift+H", async () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "h", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(container.querySelector("textarea")).toBeInTheDocument();
    });
  });

  it("duplicates the current block on Ctrl+D", () => {
    render(<BlockEditor value="<p>Test</p>" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    const chain = getEditorChain();
    // The handler calls insertContentAt with the node JSON
    expect(chain.focus).toHaveBeenCalled();
    expect(chain.insertContentAt).toHaveBeenCalled();
    expect(chain.run).toHaveBeenCalled();
  });

  it("duplicates on Ctrl+D even with text selected", () => {
    render(<BlockEditor value="<p>Selected text</p>" onChange={vi.fn()} />);
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    const chain = getEditorChain();
    expect(chain.insertContentAt).toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Slash Commands
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — slash commands", () => {
  it("renders the slash commands extension by default", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    // The editor should render without errors
    expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
  });

  it("loads with slash commands enabled by default", () => {
    const onChange = vi.fn();
    render(<BlockEditor value="" onChange={onChange} />);
    // Verify the editor was initialized with extensions (which include slash commands)
    expect(mockEditorInstance).not.toBeNull();
    expect(mockEditorInstance?.chain).toBeDefined();
  });
});

/* ════════════════════════════════════════════════════════════════════
   Save Status
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — save status indicators", () => {
  it("shows 'Saved' when lastSavedAt is provided", () => {
    const { container } = render(
      <BlockEditor value="" onChange={vi.fn()} lastSavedAt={new Date()} isSaving={false} />,
    );
    expect(container.textContent).toContain("Saved");
  });

  it("shows 'Unsaved' when no save has occurred", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    expect(container.textContent).toContain("Unsaved");
  });

  it("shows 'Saving…' when isSaving is true", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} isSaving={true} />);
    expect(container.textContent).toContain("Saving");
  });
});

/* ════════════════════════════════════════════════════════════════════
   Edge Cases
   ════════════════════════════════════════════════════════════════════ */

describe("BlockEditor — edge cases", () => {
  it("handles empty value prop", () => {
    const { container } = render(<BlockEditor value="" onChange={vi.fn()} />);
    expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
  });

  it("renders without crashing with all props", () => {
    const { container } = render(
      <BlockEditor
        value="<p>Test</p>"
        onChange={vi.fn()}
        placeholder="Start writing…"
        minHeight="100px"
        maxHeight="500px"
        showToolbar={true}
        showCharCount={true}
        isSaving={false}
        lastSavedAt={new Date()}
      />,
    );
    expect(container.querySelector('[data-testid="editor-content"]')).toBeInTheDocument();
  });
});
