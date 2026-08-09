import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandCtaButton } from "@/components/BrandCtaButton";

describe("BrandCtaButton", () => {
  it("renders as a <button> by default with the shimmer sweep", () => {
    render(<BrandCtaButton>Donate</BrandCtaButton>);
    const btn = screen.getByRole("button", { name: "Donate" });
    expect(btn.tagName).toBe("BUTTON");
    // The shimmer sweep span is present and aria-hidden
    const shimmer = btn.querySelector('[aria-hidden="true"]');
    expect(shimmer).not.toBeNull();
    expect(shimmer!.className).toContain("translate-x-[-100%]");
  });

  it("asChild slots onto a single element child without throwing (SSR Slot regression)", () => {
    render(
      <BrandCtaButton asChild className="px-4 py-2">
        <a href="/login" data-testid="link">
          Sign in
        </a>
      </BrandCtaButton>,
    );
    const link = screen.getByTestId("link");
    expect(link.tagName).toBe("A");
    expect(link.textContent).toBe("Sign in");
    // Slot merges the CTA's className onto the child
    expect(link.className).toContain("px-4");
    expect(link.className).toContain("rounded-xl");
    // The shimmer span merges INTO the slotted element (not a sibling) —
    // this was the SSR crash: Slot throws with 2 sibling children.
    const shimmer = link.querySelector('[aria-hidden="true"]');
    expect(shimmer).not.toBeNull();
    expect(shimmer!.className).toContain("translate-x-[-100%]");
  });

  it("asChild keeps the consumer's own className (twMerge not required here)", () => {
    render(
      <BrandCtaButton asChild>
        <a href="/donate" className="w-full">
          Donate
        </a>
      </BrandCtaButton>,
    );
    const link = screen.getByRole("link", { name: "Donate" });
    expect(link.className).toContain("w-full");
    expect(link.className).toContain("group/cta");
  });
});
