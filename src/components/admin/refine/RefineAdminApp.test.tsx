/**
 * P2 admin — RefineAdminApp shell tests (AD-029).
 *
 * The admin shell renders three surfaces from the same RBAC-filtered tab
 * list: the desktop sidebar (`aside > nav`), the mobile resource selector
 * (the `md:hidden` chip strip), and the dashboard card grid. These tests
 * pin the shell contract:
 *   - sidebar + mobile selector list Dashboard + every resource the role may view
 *   - the dashboard grid shows one card per visible resource
 *   - RBAC filtering (super_admin sees all; editor loses orders/profiles/
 *     site_settings/notifications)
 *   - clicking a sidebar tab switches to that resource's list
 *   - BN mode localizes tab + dashboard labels
 *
 * Mock mode: `useAdminRole()` reads the mock session from localStorage, so
 * each test seeds the demo account for the role under test. The `tanstackStart`
 * Vite plugin ships no production runtime and Refine v5 routing is optional —
 * the only router import is <Link>, mocked as a plain anchor.
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import { RefineAdminApp } from "./RefineAdminApp";
import { setMockModeOverride } from "@/lib/data-source";
import { MOCK_SESSION_KEY } from "@/lib/mock-session";
import { ADMIN_RESOURCE_DEFS } from "@/lib/admin/resources";
import { canViewResource } from "@/lib/admin/rbac";

// The shell's only router import is <Link> (sidebar "Back to site" footer).
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

const LANG_KEY = "sabbe-satta-lang";

/** Seed the mock session as the given role (mirrors signInAsDemo's shape). */
function seedSession(role: string) {
  localStorage.setItem(
    MOCK_SESSION_KEY,
    JSON.stringify({
      access_token: `t-${role}`,
      refresh_token: "r",
      expires_at: Date.now() + 3600000,
      user: {
        id: `demo-${role}`,
        email: `${role}@sabbe-satta.test`,
        role,
        display_name: `Demo ${role}`,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    }),
  );
}

function renderApp() {
  return render(
    <LanguageProvider>
      <RefineAdminApp />
    </LanguageProvider>,
  );
}

const visibleLabels = (role: string) =>
  ADMIN_RESOURCE_DEFS.filter((d) => canViewResource(role, d.name)).map((d) => d.labelEn);

const visibleNames = (role: string) =>
  ADMIN_RESOURCE_DEFS.filter((d) => canViewResource(role, d.name)).map((d) => d.name);

beforeEach(() => {
  setMockModeOverride(true);
  localStorage.clear();
});

describe("RefineAdminApp shell — sidebar", () => {
  it("lists Dashboard + every visible resource for super_admin", () => {
    seedSession("super_admin");
    renderApp();
    const nav = document.querySelector("aside nav") as HTMLElement;
    expect(nav).not.toBeNull();
    expect(within(nav).getByText("Dashboard")).toBeInTheDocument();
    for (const label of visibleLabels("super_admin")) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    // Dashboard + one tab per visible resource (11 resources for super_admin).
    expect(nav.querySelectorAll("button").length).toBe(1 + visibleLabels("super_admin").length);
  });

  it("filters sidebar tabs by role (editor loses orders/profiles/settings/notifications)", () => {
    seedSession("editor");
    renderApp();
    const nav = document.querySelector("aside nav") as HTMLElement;
    for (const label of visibleLabels("editor")) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).queryByText("Orders")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Users")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Site Settings")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("renders the back-to-site link", () => {
    seedSession("super_admin");
    renderApp();
    const back = [...document.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Back to site"),
    );
    expect(back?.getAttribute("href")).toBe("/");
  });
});

describe("RefineAdminApp shell — mobile selector", () => {
  it("mirrors the sidebar tabs in the md:hidden chip strip", () => {
    seedSession("super_admin");
    renderApp();
    const strip = document.querySelector(".md\\:hidden") as HTMLElement;
    expect(strip).not.toBeNull();
    // Dashboard + every visible resource, same count as the sidebar nav.
    expect(strip.querySelectorAll("button").length).toBe(1 + visibleLabels("super_admin").length);
    for (const label of visibleLabels("super_admin")) {
      expect(within(strip).getByText(label)).toBeInTheDocument();
    }
  });

  it("filters the mobile selector by role too", () => {
    seedSession("editor");
    renderApp();
    const strip = document.querySelector(".md\\:hidden") as HTMLElement;
    expect(within(strip).queryByText("Users")).not.toBeInTheDocument();
    expect(within(strip).queryByText("Orders")).not.toBeInTheDocument();
    expect(within(strip).getByText("Books")).toBeInTheDocument();
  });
});

describe("RefineAdminApp shell — dashboard grid", () => {
  it("shows one card per visible resource (super_admin: all)", () => {
    seedSession("super_admin");
    renderApp();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    for (const name of visibleNames("super_admin")) {
      // Each card renders the resource's machine name (e.g. "site_settings").
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("excludes hidden resources from the grid (editor)", () => {
    seedSession("editor");
    renderApp();
    for (const name of visibleNames("editor")) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText("orders")).not.toBeInTheDocument();
    expect(screen.queryByText("profiles")).not.toBeInTheDocument();
    expect(screen.queryByText("site_settings")).not.toBeInTheDocument();
    expect(screen.queryByText("notifications")).not.toBeInTheDocument();
  });
});

describe("RefineAdminApp shell — tab switching", () => {
  it("clicking a sidebar tab renders that resource's list", async () => {
    seedSession("super_admin");
    renderApp();
    const nav = document.querySelector("aside nav") as HTMLElement;
    fireEvent.click(within(nav).getByText("Books"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Books" })).toBeInTheDocument(),
    );
    // The generic list's subtitle confirms the resource list mounted.
    expect(screen.getByText("Manage content")).toBeInTheDocument();
  });

  it("clicking a mobile chip switches the view too", async () => {
    seedSession("super_admin");
    renderApp();
    const strip = document.querySelector(".md\\:hidden") as HTMLElement;
    fireEvent.click(within(strip).getByText("Videos"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Videos" })).toBeInTheDocument(),
    );
  });
});

describe("RefineAdminApp shell — bilingual", () => {
  it("localizes tabs and dashboard in BN mode", () => {
    localStorage.setItem(LANG_KEY, "bn");
    seedSession("super_admin");
    renderApp();
    const nav = document.querySelector("aside nav") as HTMLElement;
    expect(within(nav).getByText("ড্যাশবোর্ড")).toBeInTheDocument();
    expect(within(nav).getByText("বই")).toBeInTheDocument();
    expect(within(nav).getByText("ব্যবহারকারী")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ড্যাশবোর্ড" })).toBeInTheDocument();
  });
});
