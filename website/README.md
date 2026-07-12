# MindScope Website

Marketing / landing site for the **MindScope** Android app, built with
[Astro](https://astro.build) + Tailwind CSS v4. Static output — no server needed.

## Pages

- `/` — Home / landing (hero, features overview, mindful moments, download CTA)
- `/features` — Detailed feature breakdown (Section Blocker, Chat Analysis, Screen-time, Analytics)
- `/about` — About the project and author
- `/privacy` — Privacy policy

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build

```bash
npm run build      # static output -> dist/
npm run preview    # preview the production build locally
```

## APK download

The **Download** buttons point to a GitHub Releases asset defined in `src/consts.ts`
(`APK_URL`). Publish the APK so the link resolves:

1. Go to `https://github.com/YashMengji/MindScope/releases` → **Draft a new release**.
2. Tag it (e.g. `v1.0.0`).
3. Upload the APK as an asset named **exactly** `MindScope-v1.0.0-release.apk`
   (the file already on your Desktop).
4. Publish. The button URL `…/releases/latest/download/MindScope-v1.0.0-release.apk`
   will then serve the newest release's APK.

To change the app version or asset name, edit `APP_VERSION` / `APK_ASSET` in
`src/consts.ts`.

## Deploy to Vercel

This site lives in the `website/` subfolder of the MindScope repo.

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `website`.
3. Framework preset **Astro** is auto-detected (build `npm run build`, output `dist`).
4. Deploy. After you get the domain, update `SITE_URL` in `src/consts.ts`
   (and the `Sitemap:` line in `public/robots.txt`) so canonical URLs, the sitemap,
   and Open Graph tags are correct, then redeploy.

## Editing content & branding

- Site text, links, version, and the mindful-message list live in `src/consts.ts`.
- Brand colors are Tailwind theme tokens in `src/styles/global.css` (`@theme`).
- Logo/icon are in `public/` (copied from the app's assets).
