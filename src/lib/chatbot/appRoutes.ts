//Alexander Tu

export const APP_ROUTES = [
  { label: "Account Details", path: "/account/details", description: "View and edit account profile fields" },
  { label: "Privacy", path: "/account/privacy", description: "Privacy preferences and controls" },
  { label: "Account Settings", path: "/account/settings", description: "Theme (dark mode), language, privacy" },
  { label: "Session History", path: "/account/history", description: "View previous interview sessions and results" },
  { label: "Login", path: "/login", description: "Sign in to your account" },
] as const;
  