import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Sidebar from "./Sidebar.vue";

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    user: { value: { name: "Alice Developer", email: "alice@example.com", provider: "github" } },
    isLoading: { value: false },
    signOut: vi.fn()
  })
}));

describe("Sidebar", () => {
  it("renders all sidebar items including Repositories and Support", () => {
    const wrapper = mount(Sidebar, {
      props: { active: "dashboard" }
    });

    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).toContain("Analyze");
    expect(wrapper.text()).toContain("History");
    expect(wrapper.text()).toContain("Repositories");
    expect(wrapper.text()).toContain("Settings");
    expect(wrapper.text()).toContain("Support");
  });

  it("renders the official GitHub SVG icon in the Repositories section", () => {
    const wrapper = mount(Sidebar, {
      props: { active: "repositories" }
    });

    // Check that Repositories button has active class
    const repoBtn = wrapper.findAll(".nav-item").find((btn) => btn.text().includes("Repositories"));
    expect(repoBtn).toBeDefined();
    expect(repoBtn!.classes()).toContain("active");

    // The GitHub SVG has viewBox 0 0 24 24 and path with standard Octocat coordinates
    const githubSvg = repoBtn!.find("svg");
    expect(githubSvg.exists()).toBe(true);
    const path = githubSvg.find("path");
    expect(path.exists()).toBe(true);
    expect(path.attributes("d")).toContain("M12 2C6.477 2 2 6.484 2 12.017");
  });

  it("emits navigate event with correct ViewId when item is clicked", async () => {
    const wrapper = mount(Sidebar, {
      props: { active: "dashboard" }
    });

    const analyzeBtn = wrapper.findAll(".nav-item").find((btn) => btn.text().includes("Analyze"));
    expect(analyzeBtn).toBeDefined();
    await analyzeBtn!.trigger("click");

    expect(wrapper.emitted("navigate")).toBeTruthy();
    expect(wrapper.emitted("navigate")![0][0]).toBe("analyze");

    const supportBtn = wrapper.findAll(".nav-item").find((btn) => btn.text().includes("Support"));
    expect(supportBtn).toBeDefined();
    await supportBtn!.trigger("click");
    expect(wrapper.emitted("navigate")![1][0]).toBe("contact");
  });

  it("highlights the active view correctly for dashboard, analyze, or repositories", () => {
    const wrapper = mount(Sidebar, {
      props: { active: "analyze" }
    });

    const activeItem = wrapper.find(".nav-item.active");
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("Analyze");
  });
});
