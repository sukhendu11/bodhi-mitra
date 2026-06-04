export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Parse h1/h2/h3 headings from an HTML string.
 * Returns an array of { id, text, level } sorted by appearance order.
 * Returns empty array if no headings found or content is not HTML.
 */
export function parseHeadings(html: string): HeadingItem[] {
  const headingRegex = /<h([1-3])(?:\s[^>]*)?>(.+?)<\/h\1>/gi;
  const headings: HeadingItem[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (!text) continue;

    let id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Deduplicate IDs (e.g. two headings with same text)
    if (seen.has(id)) {
      let counter = 1;
      while (seen.has(`${id}-${counter}`)) counter++;
      id = `${id}-${counter}`;
    }
    seen.add(id);

    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Inject id attributes into h1/h2/h3 tags in an HTML string.
 * Also adds `scroll-mt-24` class for sticky-header offset.
 */
export function injectHeadingIds(html: string): string {
  const seen = new Set<string>();

  return html.replace(/<h([1-3])(\s[^>]*)?>(.+?)<\/h\1>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    if (!text) return match;

    let id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (seen.has(id)) {
      let counter = 1;
      while (seen.has(`${id}-${counter}`)) counter++;
      id = `${id}-${counter}`;
    }
    seen.add(id);

    // Preserve existing attributes, strip any existing id/class, then add ours
    let preserved = "";
    if (attrs) {
      preserved = attrs.replace(/\s+(?:id|class)\s*=\"[^"]*\"/gi, "");
    }
    return `<h${level}${preserved} id="${id}" class="scroll-mt-24">${content}</h${level}>`;
  });
}
