export type ViewId = "dashboard" | "analyze" | "history" | "repositories" | "ai" | "settings" | "contact";

export const VIEW_TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your review activity, quality scores and recent AI insights"
  },
  analyze: {
    title: "Code Analysis",
    subtitle: "Analyze your code for quality, security, and performance issues"
  },
  history: {
    title: "Analysis History",
    subtitle: "View and manage your past analysis reports"
  },
  repositories: {
    title: "Repositories",
    subtitle: "Organise projects and track their quality over time"
  },
  ai: {
    title: "AI Review",
    subtitle: "Human-like reviews, PR comments, security fixes and refactoring plans"
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your profile, password and account"
  },
  contact: {
    title: "Contact & Support",
    subtitle: "Connect with us on X, reach out directly, report issues, or suggest new tools"
  }
};
