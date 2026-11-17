import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ContactView from "./ContactView.vue";

describe("ContactView", () => {
  it("renders the top section with X account and direct email", () => {
    const wrapper = mount(ContactView);

    // X Card
    expect(wrapper.text()).toContain("Connect on 𝕏");
    const whiteLink = wrapper.find(".white-link-btn");
    expect(whiteLink.exists()).toBe(true);
    expect(whiteLink.attributes("href")).toContain("x.com");

    // Email Card
    expect(wrapper.text()).toContain("Direct Email");
    expect(wrapper.text()).toContain("yacvibes65@gmail.com");
  });

  it("renders the three rectangular boxes with Email Me links targeting yacvibes65@gmail.com", () => {
    const wrapper = mount(ContactView);

    // Three rectangular boxes
    expect(wrapper.text()).toContain("Report a Bug");
    expect(wrapper.text()).toContain("Request a Tool");
    expect(wrapper.text()).toContain("Suggest / Message Me");

    // "Email Me" buttons
    const emailMeButtons = wrapper.findAll(".btn-email-me");
    expect(emailMeButtons).toHaveLength(3);

    for (const btn of emailMeButtons) {
      expect(btn.text()).toContain("Email Me");
      expect(btn.attributes("href")).toContain("mailto:yacvibes65@gmail.com");
    }
  });
});
