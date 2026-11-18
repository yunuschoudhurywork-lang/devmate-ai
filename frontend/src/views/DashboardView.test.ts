import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DashboardView from "./DashboardView.vue";
import * as api from "@/services/api";

vi.mock("@/services/api", () => ({
  getDashboard: vi.fn(),
  ApiError: class ApiError extends Error {}
}));

describe("DashboardView", () => {
  const mockDashboardData = {
    success: true,
    stats: {
      reports: 42,
      projects: 3,
      artifacts: 5,
      findings: 12,
      securityFindings: 2,
      performanceFindings: 4,
      errorFindings: 6,
      averageScore: 88,
      categoryAverages: {
        correctness: 85,
        security: 90,
        performance: 82
      }
    },
    recentReports: [],
    recentArtifacts: [],
    scoreTrend: [{ date: "2026-11-18", reports: 2, averageScore: 88 }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDashboard).mockResolvedValue(mockDashboardData as any);
  });

  it("renders hero section and yellow drop card with Choose file and Paste buttons", async () => {
    const wrapper = mount(DashboardView);
    await flushPromises();

    expect(wrapper.text()).toContain("DROP ANYTHING");
    expect(wrapper.text()).toContain("Choose file");
    expect(wrapper.text()).toContain("Paste");
    expect(wrapper.find(".yellow-drop-card").exists()).toBe(true);
    expect(wrapper.find("input[type='file']").exists()).toBe(true);
  });

  it("triggers file picker when Choose file is clicked", async () => {
    const wrapper = mount(DashboardView);
    await flushPromises();

    const fileInput = wrapper.find("input[type='file']");
    const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, "click");

    const chooseBtn = wrapper.find(".btn-drop-dark");
    expect(chooseBtn.text()).toContain("Choose file");
    await chooseBtn.trigger("click");

    expect(clickSpy).toHaveBeenCalled();
  });

  it("processes selected file and emits analyze-code event", async () => {
    const wrapper = mount(DashboardView);
    await flushPromises();

    const pythonCode = "def hello():\n    print('Hello world')\n";
    const file = new File([pythonCode], "test_script.py", { type: "text/plain" });

    // Mock FileReader
    const mockFileReader = {
      onload: null as any,
      onerror: null as any,
      readAsText: vi.fn(function (this: any) {
        this.onload({ target: { result: pythonCode } });
      })
    };
    vi.stubGlobal("FileReader", vi.fn(() => mockFileReader));

    const fileInput = wrapper.find("input[type='file']");
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      writable: true
    });

    await fileInput.trigger("change");

    expect(wrapper.emitted("analyze-code")).toBeTruthy();
    const payload = wrapper.emitted("analyze-code")![0][0] as any;
    expect(payload.filename).toBe("test_script.py");
    expect(payload.language).toBe("python");
    expect(payload.code).toBe(pythonCode);

    vi.unstubAllGlobals();
  });

  it("reads clipboard and emits analyze-code when Paste button is clicked", async () => {
    const wrapper = mount(DashboardView);
    await flushPromises();

    const sampleJavaCode = `public class App {\n    public static void main(String[] args) {\n        System.out.println("DevMate");\n    }\n}`;

    const readTextMock = vi.fn().mockResolvedValue(sampleJavaCode);
    vi.stubGlobal("navigator", {
      clipboard: {
        readText: readTextMock
      }
    });

    const pasteBtn = wrapper.find(".btn-drop-white");
    await pasteBtn.trigger("click");
    await flushPromises();

    expect(readTextMock).toHaveBeenCalled();
    expect(wrapper.emitted("analyze-code")).toBeTruthy();
    const payload = wrapper.emitted("analyze-code")![0][0] as any;
    expect(payload.code).toBe(sampleJavaCode);
    expect(payload.language).toBe("java");
    expect(payload.filename).toBe("pasted.java");

    vi.unstubAllGlobals();
  });

  it("navigates to analyze if clipboard is empty and prompt is dismissed", async () => {
    const wrapper = mount(DashboardView);
    await flushPromises();

    vi.stubGlobal("navigator", {
      clipboard: {
        readText: vi.fn().mockResolvedValue("")
      }
    });
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));

    const pasteBtn = wrapper.find(".btn-drop-white");
    await pasteBtn.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("navigate")).toBeTruthy();
    expect(wrapper.emitted("navigate")![0][0]).toBe("analyze");

    vi.unstubAllGlobals();
  });
});
