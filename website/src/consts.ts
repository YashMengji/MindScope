// Central site configuration and shared constants.
// Update SITE_URL to your deployed Vercel domain before/after first deploy.

export const SITE_URL = "https://website-seven-alpha-84.vercel.app";

export const SITE_NAME = "MindScope";
export const TAGLINE = "Your AI-powered companion for mental health monitoring.";
export const DESCRIPTION =
  "MindScope is an Android digital-wellbeing app that blocks distracting sections of Instagram, YouTube and WhatsApp, monitors chats for harmful language, and helps you take back control of your screen time.";

// App metadata (mirrors the release APK: com.mobileapp, versionName 1.0.0).
export const APP_VERSION = "1.0.0";
export const APK_SIZE = "~76 MB";

// GitHub
export const GITHUB_URL = "https://github.com/YashMengji/MindScope";

// APK download — served from GitHub Releases.
// Requires a release tagged so this asset name resolves. `/releases/latest/download/<asset>`
// always points at the newest release's asset of that exact name.
export const APK_ASSET = "MindScope-v1.0.0-release.apk";
export const APK_URL = `${GITHUB_URL}/releases/latest/download/${APK_ASSET}`;

// Author / contact
export const AUTHOR_NAME = "Yash Mengji";
export const AUTHOR_EMAIL = "yashmengji2172005@gmail.com";
export const AUTHOR_LOCATION = "Mumbai, India";

// Primary navigation
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

// The five rotating "mindful moment" messages shown by the in-app blocker overlay.
// Verbatim from Mobile_app/src/components/BlockerOverlay.js
export const MINDFUL_MESSAGES = [
  {
    headline: "Your attention is precious.",
    body: "This section was designed to keep you scrolling. You chose differently — that takes strength.",
  },
  {
    headline: "A mindful pause.",
    body: "Every distraction you skip is a moment returned to the life you actually want to live.",
  },
  {
    headline: "You're in control.",
    body: "Breaking the scroll habit is hard. The fact that you set this up means you're already winning.",
  },
  {
    headline: "Protect your focus.",
    body: "Your goals, relationships, and creativity need the time you'd spend here. They're worth it.",
  },
  {
    headline: "This was intentional.",
    body: "You set this boundary for a reason. Trust your past self — they were looking out for you.",
  },
];
