import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { PluginKey } from "@tiptap/pm/state";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon?: string;
  command: (props: { editor: any; range: any }) => void;
}

const slashCommands: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Just plain text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bold",
    description: "Bold text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run();
    },
  },
  {
    title: "Italic",
    description: "Italic text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run();
    },
  },
  {
    title: "Underline",
    description: "Underline text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleUnderline().run();
    },
  },
  {
    title: "Code",
    description: "Inline code",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCode().run();
    },
  },
  {
    title: "Blockquote",
    description: "Blockquote for citations",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered bullet list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Ordered List",
    description: "Numbered ordered list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Todo list with checkboxes",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Code Block",
    description: "Code block with syntax highlighting",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Horizontal Rule",
    description: "Divider line",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Insert an image",
    command: ({ editor, range }) => {
      // Delete the slash command text, then dispatch event for BlockEditor to open MediaPicker
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("open-media-picker", { detail: { bucket: "blog-images" } }));
    },
  },
  {
    title: "Link",
    description: "Add a link",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("open-link-editor", { detail: {} }));
    },
  },
  {
    title: "Heading 4",
    description: "Small heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 4 }).run();
    },
  },
  {
    title: "Superscript",
    description: "Superscript text formatting",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleSuperscript().run();
    },
  },
  {
    title: "Subscript",
    description: "Subscript text formatting",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleSubscript().run();
    },
  },
  {
    title: "Table",
    description: "Insert a table with 3x3 grid",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Embed",
    description: "Embed YouTube, Vimeo, or X content",
    command: ({ editor, range }) => {
      const url = window.prompt("Enter embed URL (YouTube, Vimeo, or X):");
      if (url) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "embed",
            attrs: { url },
          })
          .run();
      }
    },
  },
  {
    title: "Clear Formatting",
    description: "Remove all formatting",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).clearNodes().unsetAllMarks().run();
    },
  },
];

/**
 * TipTap Suggestion extension configuration for slash commands.
 */
export const SlashCommandsExtension = Extension.create({
  name: "slash-commands",
});

// Export the suggestion plugin configuration separately
export function createSuggestionPlugin() {
  return (Suggestion as any)({
    char: "/",
    command: ({ editor, range, props }: any) => {
      props.command({ editor, range });
    },
    items: ({ query }: any) => {
      return slashCommands
        .filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 10);
    },
    render: () => ({
      onStart: (props: any) => {
        const { items, command, editor, range } = props;
        const rect = editor?.view?.coordsAtPos(range?.from ?? 0);
        createDropdown(items, command, rect);
      },
      onUpdate: (props: any) => {
        const { items, command, range } = props;
        removeDropdown();
        const rect = props.editor?.view?.coordsAtPos(range?.from ?? 0);
        createDropdown(items, command, rect);
      },
      onExit: () => {
        removeDropdown();
      },
      onKeyDown: (props: any) => {
        if (["ArrowDown", "ArrowUp", "Enter"].includes(props.event.key)) {
          const container = document.querySelector(".slash-commands-list");
          if (!container) return false;

          const items = container.querySelectorAll("[data-index]");
          let activeIdx = -1;
          items.forEach((el, i) => {
            if (el.getAttribute("data-selected") === "true") activeIdx = i;
          });

          if (props.event.key === "ArrowDown") {
            const next = (activeIdx + 1) % items.length;
            items.forEach((el) => el.removeAttribute("data-selected"));
            items[next]?.setAttribute("data-selected", "true");
            items[next]?.scrollIntoView({ block: "nearest" });
            return true;
          }

          if (props.event.key === "ArrowUp") {
            const prev = activeIdx <= 0 ? items.length - 1 : activeIdx - 1;
            items.forEach((el) => el.removeAttribute("data-selected"));
            items[prev]?.setAttribute("data-selected", "true");
            items[prev]?.scrollIntoView({ block: "nearest" });
            return true;
          }

          if (props.event.key === "Enter") {
            const selected = container.querySelector("[data-selected]");
            if (selected && selected.getAttribute("data-index")) {
              const index = parseInt(selected.getAttribute("data-index")!);
              if (!isNaN(index)) {
                props.command({ index });
                return true;
              }
            }
          }
        }
        return false;
      },
    }),
  });
}

function createDropdown(
  items: SlashCommandItem[],
  command: (props: { index: number }) => void,
  rect?: { top: number; bottom: number; left: number; right: number },
) {
  removeDropdown();

  const backdrop = document.createElement("div");
  backdrop.className = "slash-backdrop fixed inset-0 z-40";
  backdrop.onclick = removeDropdown;
  document.body.appendChild(backdrop);

  const container = document.createElement("div");
  container.className =
    "slash-commands-container fixed z-50 w-64 bg-white dark:bg-zinc-900 rounded-xl border border-border/60 shadow-xl overflow-hidden max-h-80";

  const top = rect ? rect.bottom + 4 : 200;
  const left = rect ? Math.max(8, rect.left - 120) : 200;
  container.style.top = `${top}px`;
  container.style.left = `${Math.min(left, window.innerWidth - 280)}px`;

  // Search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Filter commands…";
  searchInput.className =
    "w-full px-3 py-2 text-xs border-b border-border/40 bg-transparent focus:outline-none";
  container.appendChild(searchInput);

  // Items list
  const list = document.createElement("div");
  list.className = "slash-commands-list overflow-y-auto max-h-64";
  container.appendChild(list);

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.className =
      "w-full flex flex-col px-3 py-2 text-left hover:bg-secondary/40 transition-colors";
    if (index === 0) button.setAttribute("data-selected", "true");
    button.setAttribute("data-index", String(index));

    const title = document.createElement("span");
    title.className = "block text-xs font-medium";
    title.textContent = item.title;
    button.appendChild(title);

    const desc = document.createElement("span");
    desc.className = "block text-[0.6rem] text-muted-foreground mt-0.5";
    desc.textContent = item.description;
    button.appendChild(desc);

    button.onclick = () => command({ index });
    button.onmouseenter = () => {
      list.querySelectorAll("[data-selected]").forEach((el) => el.removeAttribute("data-selected"));
      button.setAttribute("data-selected", "true");
    };

    list.appendChild(button);
  });

  container.appendChild(list);
  document.body.appendChild(container);

  // Filter on input
  searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase();
    list.querySelectorAll("button").forEach((btn, i) => {
      const title = items[i]?.title.toLowerCase() ?? "";
      (btn as HTMLElement).style.display = title.includes(q) ? "" : "none";
    });
  };

  setTimeout(() => searchInput.focus(), 50);
}

function removeDropdown() {
  document.querySelectorAll(".slash-commands-container, .slash-backdrop").forEach((el) => el.remove());
}
