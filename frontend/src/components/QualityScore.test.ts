import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import QualityScore from "./QualityScore.vue";

describe("QualityScore", () => {
  it("renders backend-provided quality values", () => {
    const wrapper = mount(QualityScore, { props: { quality: { overall: 82, categories: { correctness: 84, security: 70, performance: 94 } } } });

    expect(wrapper.text()).toContain("82");
    expect(wrapper.text()).toContain("Correctness");
    expect(wrapper.text()).toContain("84");
    expect(wrapper.text()).toContain("70");
    expect(wrapper.text()).toContain("94");
    expect(wrapper.text()).toContain("Audit Scope & Confidence");
  });

  it("renders clean status pills when security is 100", () => {
    const wrapper = mount(QualityScore, { props: { quality: { overall: 100, categories: { correctness: 100, security: 100, performance: 100 } } } });

    expect(wrapper.text()).toContain("Clean (0 detected)");
    expect(wrapper.text()).toContain("Passing");
    expect(wrapper.text()).toContain("Optimal");
    expect(wrapper.text()).toContain("zero detected pattern violations");
  });
});
