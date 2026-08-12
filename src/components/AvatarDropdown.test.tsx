/**
 * AvatarDropdown — regrouped dropdown verification (non-browser).
 *
 * Proves the Financial / Stats / Settings grouping renders correctly in both
 * languages: labeled section headers, boundary separators (6 for admins, 5
 * for non-admins — the Sign-out separator is included in both counts),
 * localized item labels, correct route links, and the Admin entry hidden for
 * non-admins / external-linked for admins.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import { AvatarDropdown } from "./AvatarDropdown";

// AvatarDropdown's only router import is <Link> — render it as a plain anchor
// so the test needs no RouterProvider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to?: string;
    children?: React.ReactNode;
    className?: string;
  }) => (
    <a href={typeof to === "string" ? to : "/"} className={className}>
      {children}
    </a>
  ),
}));

// Radix Popper measures with ResizeObserver (absent in jsdom).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const LANG_KEY = "sabbe-satta-lang";

describe("AvatarDropdown — regrouped sections", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // testing-library auto-cleanup unmounts the tree (Radix portals included).
  });

  const renderMenu = ({
    isAdmin = false,
    strapiUrl = "https://cms.example.com",
  }: { isAdmin?: boolean; strapiUrl?: string } = {}) =>
    render(
      <LanguageProvider>
        <AvatarDropdown isAdmin={isAdmin} strapiUrl={strapiUrl} onSignOut={() => {}} />
      </LanguageProvider>,
    );

  const open = () => {
    const trigger = screen.getByRole("button");
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
  };

  const separators = () =>
    document.body.querySelectorAll('[role="separator"]').length;

  it("renders EN labels with Financial / Stats / Settings section headers", async () => {
    renderMenu({ isAdmin: true });
    open();

    await waitFor(() =>
      expect(screen.getByText("Orders & Receipts")).toBeInTheDocument(),
    );

    // standalone entries
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("My Books")).toBeInTheDocument();
    // Financial group
    expect(screen.getByText("Financial")).toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();
    expect(screen.getByText("Wishlist")).toBeInTheDocument();
    expect(screen.getByText("Bookmarks")).toBeInTheDocument();
    // Stats group
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText("Reading Stats")).toBeInTheDocument();
    // Settings group — header + item share the label
    expect(screen.getAllByText("Settings")).toHaveLength(2);
    // admin + sign out
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("renders BN labels with Bengali section headers", async () => {
    localStorage.setItem(LANG_KEY, "bn");
    renderMenu({ isAdmin: true });
    open();

    await waitFor(() =>
      expect(screen.getByText("অর্ডার ও রসিদ")).toBeInTheDocument(),
    );

    expect(screen.getByText("প্রোফাইল")).toBeInTheDocument();
    expect(screen.getByText("আমার বই")).toBeInTheDocument();
    expect(screen.getByText("আর্থিক")).toBeInTheDocument();
    expect(screen.getByText("কার্ট")).toBeInTheDocument();
    expect(screen.getByText("ইচ্ছাতালিকা")).toBeInTheDocument();
    expect(screen.getByText("বুকমার্ক")).toBeInTheDocument();
    expect(screen.getByText("পরিসংখ্যান")).toBeInTheDocument();
    expect(screen.getByText("পড়ার পরিসংখ্যান")).toBeInTheDocument();
    expect(screen.getAllByText("সেটিংস")).toHaveLength(2);
    expect(screen.getByText("অ্যাডমিন")).toBeInTheDocument();
    expect(screen.getByText("সাইন আউট")).toBeInTheDocument();
  });

  it("links every entry to its route", async () => {
    renderMenu({ isAdmin: true, strapiUrl: "https://cms.example.com" });
    open();

    await waitFor(() =>
      expect(screen.getByText("Orders & Receipts")).toBeInTheDocument(),
    );

    // Query anchors directly — Radix asChild may re-role the element, so
    // role-based queries are unreliable here.
    const hrefOf = (label: string) =>
      [...document.querySelectorAll<HTMLAnchorElement>("a")].find((a) =>
        a.textContent?.trim().includes(label),
      )?.getAttribute("href") ?? null;

    expect(hrefOf("Profile")).toBe("/profile");
    expect(hrefOf("My Books")).toBe("/purchases");
    expect(hrefOf("Orders & Receipts")).toBe("/orders");
    expect(hrefOf("Cart")).toBe("/cart");
    expect(hrefOf("Wishlist")).toBe("/wishlist");
    expect(hrefOf("Bookmarks")).toBe("/bookmarks");
    expect(hrefOf("Reading Stats")).toBe("/stats");
    expect(hrefOf("Settings")).toBe("/settings");
    const adminLink = [...document.querySelectorAll<HTMLAnchorElement>("a")].find(
      (a) => a.getAttribute("href") === "https://cms.example.com",
    );
    expect(adminLink?.textContent?.trim()).toBe("Admin");
    expect(adminLink?.getAttribute("target")).toBe("_blank");
  });

  it("renders exactly the group-boundary separators (6 with Admin + Sign out)", async () => {
    renderMenu({ isAdmin: true });
    open();

    await waitFor(() =>
      expect(screen.getByText("Orders & Receipts")).toBeInTheDocument(),
    );
    expect(separators()).toBe(6);
  });

  it("hides Admin for non-admins and drops its separator (5 separators)", async () => {
    renderMenu({ isAdmin: false });
    open();

    await waitFor(() =>
      expect(screen.getByText("Orders & Receipts")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("অ্যাডমিন")).not.toBeInTheDocument();
    expect(separators()).toBe(5);
  });
});
