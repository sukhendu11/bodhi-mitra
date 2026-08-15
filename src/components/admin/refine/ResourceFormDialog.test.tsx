/**
 * P2 admin — ResourceFormDialog field rendering tests (AD-029).
 *
 * The dialog is schema-driven: one generic form renders whatever the
 * resource registry declares. These tests pin the rendering contract:
 *   - every declared field renders with its bilingual label
 *   - required fields show the asterisk marker
 *   - field controls match their declared type (text/number/url/textarea/
 *     select/switch/tags)
 *   - the label's htmlFor wires to the control's id (a11y + automation)
 *   - the form is noValidate (relative content paths must not block submit)
 *   - read-only resources disable the form controls
 *
 * The dialog only needs a Refine provider (routing is optional in v5 — useGo
 * no-ops without a router) plus the LanguageProvider.
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Refine } from "@refinedev/core";
import { LanguageProvider } from "@/lib/i18n";
import { ResourceFormDialog } from "./ResourceFormDialog";
import { getResourceDef } from "@/lib/admin/resources";
import { mockDataProvider } from "@/lib/admin/data-provider";
import { setMockModeOverride } from "@/lib/data-source";

// Radix Dialog measures its content with ResizeObserver, which jsdom lacks.
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  }
});

function renderDialog(resource: string, initial?: Record<string, unknown> & { id: string | number }) {
  return render(
    <Refine dataProvider={{ default: mockDataProvider }}>
      <LanguageProvider>
        <ResourceFormDialog resource={resource} initial={initial} onClose={() => {}} />
      </LanguageProvider>
    </Refine>,
  );
}

beforeEach(() => {
  setMockModeOverride(true);
  localStorage.clear();
});

describe("ResourceFormDialog schema-driven rendering", () => {
  it("renders every declared field with its bilingual label", () => {
    renderDialog("books");
    const def = getResourceDef("books")!;
    for (const field of def.fields) {
      // Anchored (with optional required-asterisk suffix): labels like
      // "SEO Description (EN)" must not substring-match "Description (EN)".
      const escaped = field.labelEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(screen.getByLabelText(new RegExp(`^${escaped}(\\s*\\*)?$`))).toBeInTheDocument();
    }
  });

  it("marks required fields with the asterisk", () => {
    renderDialog("books");
    const def = getResourceDef("books")!;
    for (const field of def.fields) {
      const label = screen.getByText(field.labelEn, { selector: "label" });
      if (field.required) {
        expect(label.textContent).toContain("*");
      } else {
        expect(label.textContent).not.toContain("*");
      }
    }
  });

  it("wires each label's htmlFor to the control's id (a11y + automation)", () => {
    renderDialog("books");
    const def = getResourceDef("books")!;
    for (const field of def.fields) {
      const label = screen.getByText(field.labelEn, { selector: "label" });
      const forId = label.getAttribute("for");
      expect(forId).toBe(`field-${field.key}`);
      expect(document.getElementById(forId!)).not.toBeNull();
    }
  });

  it("renders field controls matching their declared type", () => {
    renderDialog("books");
    const def = getResourceDef("books")!;
    for (const field of def.fields) {
      const el = document.getElementById(`field-${field.key}`)!;
      switch (field.type) {
        case "textarea":
          expect(el.tagName).toBe("TEXTAREA");
          break;
        case "number":
          expect(el.tagName).toBe("INPUT");
          expect(el).toHaveAttribute("type", "number");
          break;
        case "url":
          expect(el.tagName).toBe("INPUT");
          expect(el).toHaveAttribute("type", "url");
          break;
        case "boolean":
          expect(el.getAttribute("role")).toBe("switch");
          break;
        case "select":
          expect(el.tagName).toBe("SELECT");
          break;
        case "tags":
          // The tags control renders a text input + Add button inside.
          expect(el.tagName).toBe("INPUT");
          break;
        default:
          expect(el.tagName).toBe("INPUT");
          expect(el.getAttribute("type")).toBe("text");
      }
    }
  });

  it("select fields render their declared options", () => {
    renderDialog("books");
    const def = getResourceDef("books")!;
    const category = def.fields.find((f) => f.key === "category")!;
    const select = document.getElementById("field-category") as HTMLSelectElement;
    const optionValues = [...select.options].map((o) => o.value);
    for (const opt of category.options ?? []) {
      expect(optionValues).toContain(opt);
    }
  });

  it("renders the form as noValidate so relative content paths can submit", () => {
    renderDialog("books");
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("novalidate")).not.toBeNull();
  });

  it("titles the dialog for create mode", () => {
    renderDialog("books");
    expect(screen.getByRole("heading", { name: /New Books/ })).toBeInTheDocument();
  });

  it("prefills declared values in edit mode", () => {
    const { unmount } = renderDialog("books", {
      id: "book-1",
      title_en: "The Heart of Meditation",
      price: 299,
    });
    const title = document.getElementById("field-title_en") as HTMLInputElement;
    const price = document.getElementById("field-price") as HTMLInputElement;
    expect(title.value).toBe("The Heart of Meditation");
    expect(price.value).toBe("299");
    expect(screen.getByRole("heading", { name: /Edit Books/ })).toBeInTheDocument();
    unmount();
  });

  it("disables the form controls for read-only resources in mock mode", () => {
    // orders is read-only in mock mode — controls are disabled.
    renderDialog("orders");
    const def = getResourceDef("orders")!;
    const total = document.getElementById("field-total") as HTMLInputElement;
    expect(total.disabled).toBe(true);
    // The read-only hint appears in the dialog description.
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(def.fields.length).toBeGreaterThan(0);
  });
});
