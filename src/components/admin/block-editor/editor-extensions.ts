import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Focus from "@tiptap/extension-focus";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import type { Extensions } from "@tiptap/react";
import { createSuggestionPlugin } from "./slash-commands";
import { EmbedExtension, ImageNodeView } from "./MediaExtension";

const lowlight = createLowlight(common);

/**
 * All TipTap extensions configured for the Block Editor.
 * This is the single source of truth for editor capabilities.
 * Includes slash commands by default.
 */
export function getExtensions(
  placeholder?: string,
  options?: { enableSlashCommands?: boolean },
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false, // Use CodeBlockLowlight instead
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-primary underline underline-offset-2" },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Highlight.configure({
      multicolor: true,
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "Start writing…",
    }),
    Image.extend({
      addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
      },
    }).configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: "flex items-start gap-2" },
    }),
    TextStyle,
    Color,
    Superscript,
    Subscript,
    Typography,
    CharacterCount.configure({ limit: null }),
    CodeBlockLowlight.configure({ lowlight }),
    Focus.configure({
      className: "has-focus",
      mode: "all",
    }),

    // Embed extension (YouTube, Vimeo, X)
    EmbedExtension,
    // Slash commands — uses Suggestion from @tiptap/suggestion
    ...(options?.enableSlashCommands !== false
      ? [
          {
            name: "slash-commands",
            addProseMirrorPlugins() {
              return [createSuggestionPlugin()];
            },
          } as any,
        ]
      : []),
  ];
}
