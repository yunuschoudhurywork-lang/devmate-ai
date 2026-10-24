import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import FindingsList from "./FindingsList.vue";

const apiMock = vi.hoisted(() => ({ explainFinding: vi.fn() }));
vi.mock("@/services/api", () => ({
  explainFinding: apiMock.explainFinding,
  ApiError: class ApiError extends Error {}
}));

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

  it("shows loading then a returned AI explanation for one finding", async () => {
    let resolveExplanation: (value: unknown) => void;
    apiMock.explainFinding.mockImplementationOnce(() => new Promise((resolve) => { resolveExplanation = resolve; }));
    const wrapper = mount(FindingsList, { props: { analyzed: true, language: "javascript", sourceContext: "console.log(missing);", findings: [{ type: "error", severity: "high", line: 1, message: "Missing", ruleId: "no-undef" }] } });

    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("Explaining…");
    resolveExplanation!({ explanation: { explanation: "The name has no declaration.", suggestedFix: "Declare it.", caveats: "Check scope." } });
    await flushPromises();

    expect(wrapper.text()).toContain("AI explanation");
    expect(wrapper.text()).toContain("Declare it.");
  });

  it("shows a clear error when the explanation request fails", async () => {
    apiMock.explainFinding.mockRejectedValueOnce(new Error("offline"));
    const wrapper = mount(FindingsList, { props: { analyzed: true, language: "javascript", sourceContext: "console.log(missing);", findings: [{ type: "error", severity: "high", line: 1, message: "Missing", ruleId: "no-undef" }] } });

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Unable to request an AI explanation.");
  });
});
