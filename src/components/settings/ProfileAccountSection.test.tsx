/**
 * ProfileAccountSection — avatar upload flow (non-browser verification).
 *
 * Proves the full loop the user asked about: tapping the camera control
 * opens the file picker, selecting an image shows a live preview, saving
 * persists the avatar to BOTH the mock profiles store (profile page source)
 * and the mock session user_metadata (header/avatar source), and invalid
 * files are rejected before any state changes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { setMockModeOverride } from "@/lib/data-source";
import {
  DEMO_ACCOUNTS,
  getMockSession,
  mockGetProfile,
  mockSessionToSupabaseSession,
  signInAsDemo,
  signOutMock,
} from "@/lib/mock-session";
import { ProfileAccountSection } from "./ProfileAccountSection";

describe("ProfileAccountSection avatar upload", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    setMockModeOverride(true);
    signInAsDemo("user");
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    setMockModeOverride(null);
    signOutMock();
  });

  const renderSection = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ProfileAccountSection
            profile={{ display_name: "Demo Reader", avatar_url: null, bio: null }}
            onProfileSaved={() => {}}
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );

  const fileInputOf = (container: HTMLElement) =>
    container.querySelector('input[type="file"]') as HTMLInputElement;

  it("camera control opens the file picker; the badge never swallows clicks", () => {
    const { container } = renderSection();

    const changeButton = screen.getByRole("button", { name: /change avatar/i });
    expect(changeButton).toBeInTheDocument();

    // The camera button is wired to the hidden input's programmatic click.
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(changeButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();

    // The decorative badge sits ON TOP of the button — pointer-events-none is
    // what lets taps pass through to the button (regression guard).
    const badge = container.querySelector('span[aria-hidden="true"]');
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass("pointer-events-none");

    // The hidden input accepts images.
    expect(fileInputOf(container)).toHaveAttribute("accept", "image/*");
  });

  it("uploads an image: preview → save → persisted to profile + session stores", async () => {
    const { container } = renderSection();
    const file = new File(["fake-image-bytes"], "avatar.png", { type: "image/png" });

    // FileReader.onload fires asynchronously after the change — await inside
    // act() so the preview state update is flushed within the act boundary.
    await act(async () => {
      fireEvent.change(fileInputOf(container), { target: { files: [file] } });
    });

    // Preview phase — the avatar renders the data URL and Save avatar appears.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save avatar/i })).toBeInTheDocument();
    });
    const previewImg = container.querySelector('img[alt="Demo Reader"]');
    expect(previewImg).not.toBeNull();
    expect(previewImg?.getAttribute("src")).toMatch(/^data:image\//);

    // Save — persists to the profile store (profile page source)…
    fireEvent.click(screen.getByRole("button", { name: /save avatar/i }));
    await waitFor(() => {
      expect(mockGetProfile(DEMO_ACCOUNTS.user.id)?.avatar_url).toMatch(/^data:image\//);
    });

    // …and to the session user_metadata (header/avatar source).
    const meta = mockSessionToSupabaseSession(getMockSession())!.user
      .user_metadata as Record<string, unknown>;
    expect(meta.avatar_url).toMatch(/^data:image\//);
  });

  it("rejects a non-image file and oversized images without entering the preview state", async () => {
    const { container } = renderSection();

    await act(async () => {
      fireEvent.change(fileInputOf(container), {
        target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
      });
    });
    expect(screen.queryByRole("button", { name: /save avatar/i })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(fileInputOf(container), {
        target: { files: [new File([new ArrayBuffer(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })] },
      });
    });
    expect(screen.queryByRole("button", { name: /save avatar/i })).not.toBeInTheDocument();
  });
});
