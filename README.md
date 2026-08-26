# Mindscope 🧠📱

> **Automated communication wellness tracking and selective digital distraction blocker for Android.**

Mindscope monitors text chats and native phone calls to analyze conversational health, detect toxic patterns or hate speech, and deliver empathetic AI coaching. It also provides granular, section-specific app blocking (e.g., blocking only Instagram Reels or WhatsApp Channels) without locking you out of full apps.

---

## 🚀 Key Features

* **Automated Voice & Chat Analysis:** Automatically parses call recordings and chat text using on-device/local NLP models (Whisper, DeHateBERT, and GoEmotions) to score toxicity and emotional tone.
* **Hybrid AI Triage Pipeline:** Cost-effective, privacy-focused architecture. Only conversations exceeding toxicity thresholds are escalated to Google Gemini to generate 2–3 actionable communication coaching tips.
* **Granular Section Blocker:** Leverages native Android `AccessibilityService` and `TYPE_APPLICATION_OVERLAY` to target and block addictive infinite-scroll feeds (Instagram Reels, WhatsApp Channels) while keeping messaging and utility tools intact.
* **Interactive Analytics Dashboard:** Real-time metrics, historical trend graphs, and dynamic date filtering to track emotional patterns over time.

---

## 🛠️ Tech Stack

* **Mobile App:** React Native / Expo (Development Build)
* **Native Android Layer:** Java (`AccessibilityService`, `WindowManager`)
* **Backend:** Node.js & Express
* **AI Microservice:** Python & FastAPI (Whisper, Hugging Face Transformers, Gemini Flash API)
* **Database:** MongoDB

---

## 📥 Installation & Setup Guide

Follow these steps to install and run the Mindscope APK on your Android device:

1. **Download the APK:**
   * Go to the **Releases** section of this repository and download the latest `.apk` build.

2. **Allow Unknown Sources:**
   * Open your device **Settings** > **Security** (or **Apps & Notifications** > **Special App Access**).
   * Enable **Install from Unknown Sources** for your browser or file manager.

3. **Disable Google Play Protect (Required for Native Accessibility builds):**
   * Open the **Google Play Store**.
   * Tap your **profile icon** in the top right corner.
   * Select **Play Protect**.
   * Tap the **Settings gear icon** in the top right.
   * Toggle off **"Scan apps with Play Protect"**.

4. **Install the App:**
   * Open your file manager, locate the downloaded `.apk`, and tap **Install**.

5. **Register Account:**
   * Open Mindscope and click **Register** to create a free account.

6. **Sign In:**
   * Log in using your registered credentials.

7. **Grant Necessary Permissions:**
   * **Accessibility Service:** Required for selective section blocking and UI element detection.
   * **Display Over Other Apps (Overlay):** Required to display mindful intervention overlays.
   * **Storage / Directory Access:** Required to read local call recordings for automated processing.

---

## 🔒 Permissions & Privacy

* **Accessibility Service:** Used solely to detect on-screen view elements in target apps (like Reels viewports) and display blocking overlays. No sensitive personal data or passwords are logged.
* **Local-First Triage:** Text and audio are processed locally/privately first. Only flagged conversations receive LLM coaching suggestions.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
