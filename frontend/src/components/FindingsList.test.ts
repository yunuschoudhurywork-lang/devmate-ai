import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FindingsList from "./FindingsList.vue";

describe("FindingsList", () => {
  it("renders findings grouped by analyzer category", () => {
    const wrapper = mount(FindingsList, { props: { analyzed: true, findings: [
      { type: "error", severity: "high", line: 2, message: "Undefined variable", ruleId: "no-undef" },
      { type: "security", severity: "high", line: 4, message: "Unsafe eval", ruleId: "security-eval", suggestion: "Avoid eval." },
      { type: "performance", severity: "medium", line: 6, message: "Nested loop", ruleId: "performance-nested-loop" }
    ] } });

    expect(wrapper.text()).toContain("🐞 Errors");
    expect(wrapper.text()).toContain("🛡 Security");
    expect(wrapper.text()).toContain("⚡ Performance");
    expect(wrapper.text()).toContain("Suggestion: Avoid eval.");
  });

  it("renders the pre-analysis and no-findings states", async () => {
    const wrapper = mount(FindingsList, { props: { analyzed: false, findings: [] } });
    expect(wrapper.text()).toContain("Run an analysis");
    await wrapper.setProps({ analyzed: true });
    expect(wrapper.text()).toContain("No issues detected");
  });
});
