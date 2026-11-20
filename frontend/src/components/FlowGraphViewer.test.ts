import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FlowGraphViewer from "./FlowGraphViewer.vue";
import type { Finding } from "@/types/analysis";

describe("FlowGraphViewer", () => {
  const sampleCode = `
function processPayment(user, amount) {
  if (amount <= 0) {
    throw new Error("Invalid amount");
  }
  return db.charge(user.id, amount);
}
  `.trim();

  const sampleFindings: Finding[] = [
    {
      line: 5,
      type: "security",
      severity: "high",
      ruleId: "security/no-direct-db-access",
      message: "Direct unauthenticated DB call detected",
      suggestion: "Wrap in a transactional service layer"
    }
  ];

  it("renders header metrics and SVG flow nodes", () => {
    const wrapper = mount(FlowGraphViewer, {
      props: {
        code: sampleCode,
        language: "javascript",
        findings: sampleFindings
      }
    });

    expect(wrapper.text()).toContain("Nodes");
    expect(wrapper.text()).toContain("Hotspots");
    expect(wrapper.find(".flow-svg").exists()).toBe(true);
    expect(wrapper.findAll(".node-group").length).toBeGreaterThanOrEqual(3);
  });

  it("identifies vulnerable node and marks it with warning/danger classes", () => {
    const wrapper = mount(FlowGraphViewer, {
      props: {
        code: sampleCode,
        language: "javascript",
        findings: sampleFindings
      }
    });

    const vulnerableNodes = wrapper.findAll(".node-group.is-vulnerable");
    expect(vulnerableNodes.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.find(".node-pulse-border").exists()).toBe(true);
  });

  it("emits select-line when a node is clicked", async () => {
    const wrapper = mount(FlowGraphViewer, {
      props: {
        code: sampleCode,
        language: "javascript",
        findings: sampleFindings
      }
    });

    const firstNode = wrapper.findAll(".node-group")[0];
    await firstNode.trigger("click");

    expect(wrapper.emitted("select-line")).toBeTruthy();
    expect(typeof wrapper.emitted("select-line")![0][0]).toBe("number");
  });

  it("filters to only vulnerable paths when filter button is clicked", async () => {
    const wrapper = mount(FlowGraphViewer, {
      props: {
        code: sampleCode,
        language: "javascript",
        findings: sampleFindings
      }
    });

    const totalBefore = wrapper.findAll(".node-group").length;
    const filterBtn = wrapper.find(".btn-filter");
    await filterBtn.trigger("click");

    const totalAfter = wrapper.findAll(".node-group").length;
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });
});
