import { useCallback, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import {
  X,
  Expand,
  Shrink,
  Trash2,
  ImageIcon,
} from "lucide-react";

// ============================================================================
// Embed Support — YouTube, Vimeo, X (Twitter)
// ============================================================================

export interface EmbedData {
  url: string;
  type: "youtube" | "vimeo" | "twitter" | "generic";
  id?: string;
}

/**
 * Parse an embed URL and return the embed type and provider ID.
 */
export function parseEmbedUrl(url: string): EmbedData | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  if (ytMatch) {
    return { url, type: "youtube", id: ytMatch[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/,
  );
  if (vimeoMatch) {
    return { url, type: "vimeo", id: vimeoMatch[1] };
  }

  // X (Twitter)
  const xMatch = url.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  );
  if (xMatch) {
    return { url, type: "twitter", id: xMatch[1] };
  }

  return { url, type: "generic" };
}

/**
 * Get the embed iframe HTML for a given URL.
 */
export function getEmbedHtml(data: EmbedData): string {
  switch (data.type) {
    case "youtube":
      return `<div class="embed-container aspect-video rounded-lg overflow-hidden bg-black/5 my-4">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${data.id}"
          title="YouTube video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="w-full h-full"
        ></iframe>
      </div>`;
    case "vimeo":
      return `<div class="embed-container aspect-video rounded-lg overflow-hidden bg-black/5 my-4">
        <iframe
          src="https://player.vimeo.com/video/${data.id}"
          title="Vimeo video"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
          class="w-full h-full"
        ></iframe>
      </div>`;
    case "twitter":
      return `<div class="embed-container my-4 p-4 border border-border/60 rounded-lg bg-secondary/10">
        <blockquote class="twitter-tweet" data-dnt="true">
          <a href="${data.url}">View on X</a>
        </blockquote>
        <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
      </div>`;
    default:
      return `<div class="embed-generic my-4 p-4 border border-border/60 rounded-lg bg-secondary/10">
        <p class="text-xs text-muted-foreground">Embedded content</p>
        <a href="${data.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary underline">
          ${data.url}
        </a>
      </div>`;
  }
}

/**
 * TipTap extension for embed nodes (YouTube, Vimeo, X).
 */
export const EmbedExtension = Node.create({
  name: "embed",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
      type: { default: "generic" as const },
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-embed-url]",
        getAttrs: (el) => ({
          url: (el as HTMLElement).getAttribute("data-embed-url"),
          type: (el as HTMLElement).getAttribute("data-embed-type"),
          id: (el as HTMLElement).getAttribute("data-embed-id"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const data = HTMLAttributes as unknown as EmbedData;
    return [
      "div",
      {
        "data-embed-url": data.url,
        "data-embed-type": data.type,
        "data-embed-id": data.id,
        class: "embed-node my-4",
      },
      ...(data.url ? [getEmbedHtml(data)] : []),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },
});

/**
 * React node view for embed nodes (displays controls on hover).
 */
function EmbedNodeView({ node, deleteNode, editor }: any) {
  const data = node.attrs as EmbedData;
  const embedHtml = getEmbedHtml(data);
  const [showControls, setShowControls] = useState(false);

  return (
    <div
      className="relative group my-4"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      contentEditable={false}
    >
      {showControls && (
        <div className="absolute -top-8 right-0 flex items-center gap-1 z-10 bg-foreground text-background rounded-lg px-2 py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              const newUrl = window.prompt("Change embed URL:", data.url);
              if (newUrl) {
                const parsed = parseEmbedUrl(newUrl);
                if (parsed) {
                  editor
                    ?.chain()
                    .focus()
                    .updateAttributes("embed", {
                      url: parsed.url,
                      type: parsed.type,
                      id: parsed.id,
                    })
                    .run();
                }
              }
            }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title="Edit embed URL"
          >
            <ImageIcon className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => deleteNode()}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title="Remove embed"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <div
        className="embed-container cursor-pointer"
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
    </div>
  );
}

// ============================================================================
// Image Editing — Click image to edit properties
// ============================================================================

/**
 * React node view for TipTap images with inline editing capabilities.
 */
export function ImageNodeView({ node, updateAttributes, deleteNode, selected }: any) {
  const [editing, setEditing] = useState(false);
  const [altText, setAltText] = useState(node.attrs.alt ?? "");
  const [imageWidth, setImageWidth] = useState(node.attrs.width ?? "100%");

  const handleSave = useCallback(() => {
    updateAttributes({ alt: altText, width: imageWidth });
    setEditing(false);
  }, [altText, imageWidth, updateAttributes]);

  if (editing) {
    return (
      <div
        className="relative border-2 border-primary/40 rounded-lg p-3 my-4 bg-secondary/10"
        contentEditable={false}
      >
        <div className="flex items-start gap-4">
          <img
            src={node.attrs.src}
            alt={altText}
            className="w-24 h-24 object-cover rounded-lg border border-border/60"
          />
          <div className="flex-1 space-y-2">
            <div>
              <label className="block text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                Alt Text
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
                placeholder="Descriptive alt text for accessibility"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[0.5rem] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                Width
              </label>
              <select
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-border/60 rounded-lg bg-background focus:outline-none"
              >
                <option value="100%">Full width</option>
                <option value="75%">Three-quarters</option>
                <option value="50%">Half width</option>
                <option value="25%">Quarter width</option>
                <option value="auto">Auto (original)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 text-[0.5rem] font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1 text-[0.5rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteNode();
                  setEditing(false);
                }}
                className="px-3 py-1 text-[0.5rem] font-medium text-destructive hover:text-destructive/80 transition-colors ml-auto"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group my-4 ${selected ? "ring-2 ring-primary/30 rounded-lg" : ""}`}
      contentEditable={false}
    >
      {/* Hover controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg bg-foreground/80 text-background hover:bg-foreground transition-colors shadow-lg"
          title="Edit image"
        >
          <ImageIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => deleteNode()}
          className="p-1.5 rounded-lg bg-destructive/80 text-destructive-foreground hover:bg-destructive transition-colors shadow-lg"
          title="Remove image"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Size toggle */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => {
            const sizes = ["100%", "75%", "50%", "25%", "auto", "100%"];
            const idx = sizes.indexOf(node.attrs.width ?? "100%");
            const next = sizes[(idx + 1) % sizes.length];
            updateAttributes({ width: next });
          }}
          className="p-1 rounded-lg bg-background/80 text-muted-foreground hover:text-foreground transition-colors shadow-lg"
          title="Toggle size"
        >
          {node.attrs.width === "100%" ? (
            <Expand className="h-3 w-3" />
          ) : (
            <Shrink className="h-3 w-3" />
          )}
        </button>
      </div>

      <img
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        style={{ width: node.attrs.width ?? "100%" }}
        className="rounded-lg border border-border/30 mx-auto"
        draggable={true}
      />
    </div>
  );
}
