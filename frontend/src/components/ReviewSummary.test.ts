import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ReviewSummary from "./ReviewSummary.vue";
import type { ReviewSummary as ReviewSummaryType } from "@/types/analysis";

describe("ReviewSummary", () => {
  const mockSummary: ReviewSummaryType = {
    summary: "The code has 2 findings including errors and security issues.",
    keyRisks: ["Undefined variable will cause runtime errors", "XSS vulnerability detected"],
    priorities: ["Fix undefined variables", "Sanitize user input"],
    caveats: "Static analysis has limitations."
  };

  it("renders the overview summary", () => {
    const wrapper = mount(ReviewSummary, { props: { summary: mockSummary } });
    expect(wrapper.text()).toContain("The code has 2 findings");
  });

  it("renders all key risks when present", () => {
    const wrapper = mount(ReviewSummary, { props: { summary: mockSummary } });
    expect(wrapper.text()).toContain("Undefined variable will cause runtime errors");
    expect(wrapper.text()).toContain("XSS vulnerability detected");
  });

  it("does not render key risks section when empty", () => {
    const emptySummary = { ...mockSummary, keyRisks: [] };
    const wrapper = mount(ReviewSummary, { props: { summary: emptySummary } });
    expect(wrapper.text()).not.toContain("Key Risks");
  });

  it("renders priorities as an ordered list", () => {
    const wrapper = mount(ReviewSummary, { props: { summary: mockSummary } });
    const priorities = wrapper.findAll("ol li");
    expect(priorities).toHaveLength(2);
    expect(priorities[0].text()).toBe("Fix undefined variables");
    expect(priorities[1].text()).toBe("Sanitize user input");
  });

  it("renders caveats when present", () => {
    const wrapper = mount(ReviewSummary, { props: { summary: mockSummary } });
    expect(wrapper.text()).toContain("Static analysis has limitations");
  });

  it("handles summary with no key risks gracefully", () => {
    const cleanSummary: ReviewSummaryType = {
      summary: "No critical issues found.",
      keyRisks: [],
      priorities: ["Continue current practices"],
      caveats: "Limited context available."
    };
    const wrapper = mount(ReviewSummary, { props: { summary: cleanSummary } });
    expect(wrapper.text()).toContain("No critical issues found");
    expect(wrapper.text()).toContain("Continue current practices");
  });
});
