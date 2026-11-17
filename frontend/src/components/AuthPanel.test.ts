import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AuthPanel from "./AuthPanel.vue";

vi.mock("@/services/api", () => ({
  getAuthConfig: vi.fn().mockResolvedValue({ githubEnabled: true })
}));

describe("AuthPanel", () => {
  it("renders the centered authentication card with branding and theme toggle", () => {
    const wrapper = mount(AuthPanel);

    expect(wrapper.text()).toContain("DevMate");
    expect(wrapper.text()).toContain("Sign in to your account");
    expect(wrapper.find(".theme-toggle-btn").exists()).toBe(true);
    expect(wrapper.text()).toContain("Quick Start");
  });

  it("switches between Sign In and Create Account tabs", async () => {
    const wrapper = mount(AuthPanel);

    // Initial mode is Sign In
    expect(wrapper.text()).toContain("Sign in to your account");
    expect(wrapper.find("#name").exists()).toBe(false);

    // Click "Create Account"
    const tabs = wrapper.findAll(".tab-btn");
    await tabs[1].trigger("click");

    expect(wrapper.text()).toContain("Create your account");
    expect(wrapper.find("#name").exists()).toBe(true);
  });

  it("toggles password visibility with the eye button", async () => {
    const wrapper = mount(AuthPanel);

    const passwordInput = wrapper.find("#password");
    expect(passwordInput.attributes("type")).toBe("password");

    const eyeBtn = wrapper.find(".btn-eye");
    await eyeBtn.trigger("click");

    expect(passwordInput.attributes("type")).toBe("text");
  });

  it("validates empty email or short password before submitting", async () => {
    const wrapper = mount(AuthPanel);

    await wrapper.find("form").trigger("submit.prevent");
    expect(wrapper.text()).toContain("Email and password are required");

    await wrapper.find("#email").setValue("test@example.com");
    await wrapper.find("#password").setValue("123");
    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain("Password must be at least 8 characters");
  });
});
