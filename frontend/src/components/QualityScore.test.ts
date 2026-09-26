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
  });
});
