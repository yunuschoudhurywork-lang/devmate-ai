import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AnalyzeView from "./AnalyzeView.vue";
import * as api from "@/services/api";

vi.mock("@/services/api", () => ({
  getProjects: vi.fn(),
  analyzeCode: vi.fn(),
  generateReviewSummary: vi.fn(),
  ApiError: class ApiError extends Error {}
}));

// Mock CodeEditor so monaco doesn't attempt DOM canvas measurement in test
vi.mock("@/components/CodeEditor.vue", () => ({
  default: {
    name: "CodeEditor",
    props: ["modelValue", "language", "findings"],
    template: "<div class='mock-editor'>{{ modelValue }}</div>",
    methods: {
      goToLine: vi.fn()
    }
  }
}));

describe("AnalyzeView - Live Scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.getProjects).mockResolvedValue([]);
    vi.mocked(api.analyzeCode).mockResolvedValue({
      success: true,
      reportId: "rep-123",
      analysis: {
        language: "javascript",
        findings: [],
        summary: { total: 0, errors: 0, warnings: 0, security: 0, performance: 0 },
        quality: { overall: 100, categories: { correctness: 100, security: 100, performance: 100 } }
      }
    });
  });

  it("renders Live Scan toggle ON by default with status chip", async () => {
    const wrapper = mount(AnalyzeView);
    await flushPromises();

    const liveBtn = wrapper.find(".btn-live-toggle");
    expect(liveBtn.exists()).toBe(true);
    expect(liveBtn.text()).toContain("Live Scan");
    expect(liveBtn.text()).toContain("ON");
    expect(liveBtn.classes()).toContain("active");
  });

  it("toggles Live Scan state when toggle button is clicked", async () => {
    const wrapper = mount(AnalyzeView);
    await flushPromises();

    const liveBtn = wrapper.find(".btn-live-toggle");
    await liveBtn.trigger("click");
    await flushPromises();

    expect(liveBtn.text()).toContain("OFF");
    expect(liveBtn.classes()).not.toContain("active");
  });

  it("runs server analysis when Analyze code button is clicked", async () => {
    const wrapper = mount(AnalyzeView);
    await flushPromises();

    const analyzeBtn = wrapper.find(".btn-analyze");
    await analyzeBtn.trigger("click");
    await flushPromises();

    expect(api.analyzeCode).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Analysis saved to your history.");
  });
});
