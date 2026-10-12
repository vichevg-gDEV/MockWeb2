# VIP Beauty House — Luxury Hair Extensions & Salon Experience

[![Deploy to GitHub Pages](https://github.com/ge6a-2222/vip-beauty-house/actions/workflows/deploy.yml/badge.svg)](https://github.com/ge6a-2222/vip-beauty-house/actions/workflows/deploy.yml)
[![Built with React 19 & Vite](https://img.shields.io/badge/Stack-React%2019%20%2B%20Vite%208-D4AF37.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/CSS-Tailwind%20v4-38bdf8.svg)](https://tailwindcss.com/)

A modern, high-conversion web platform and boutique for **VIP Beauty House** (Varna, Bulgaria) — specialized in premium Slavic hair extensions, AirTouch & balayage coloring, luxury hair care, and client aesthetics.

---

## 🌟 Highlights for Client Presentation

- **Luxury Brand Aesthetics**: Custom Dark & Gold styling (`#D4AF37`), Cinzel serif typography, smooth animations, and mobile-optimized luxury layout.
- **Online Boutique & Shop**:
  - 100% natural Slavic hair extensions (wefts, tape-in, keratin bonds), salon cosmetics, and styling tools.
  - Interactive shopping cart slide-over with real-time stock deduction and validation.
  - Fast checkout modal with delivery selection (Econt / Speedy) and cash-on-delivery or card payment.
- **Interactive Salon Services & Price Table**:
  - Categorized service cards with starting prices and detailed consultation info.
  - Searchable salon price list with instant filtering and direct booking links.
- **Online Appointment Booking**:
  - Direct date & time picker, stylist selection, and automated reservation confirmation code generator.
- **Transformations Gallery & Hair Models**:
  - Before/After transformations, hair texture showcases, and client reviews.
- **Hidden Admin Panel (Owner's Portal)**:
  - Accessible discreetly via `Ctrl + Shift + A` (or `Cmd + Shift + A`) or `#admin` URL hash.
  - Protected with a PIN passcode (`1234` or `vip2026`).
  - **Stock Management**: Real-time counters (total, in-stock, low stock, out of stock) with `[-]` and `[+]` quick stock stepper.
  - **Add Products with Photos**: File upload from computer with automatic client-side photo compression, salon photo presets, or custom image URLs.
  - **Services Editor**: Add and edit salon service names, prices, durations, and spotlight highlights.
  - **Data Backup & Restore**: Export/Import full catalog state as JSON.

---

## 🚀 How to Publish & View via GitHub Pages

This repository is already pre-configured with a zero-setup **GitHub Actions deployment workflow** (`.github/workflows/deploy.yml`) specifically built for GitHub Pages.

### Step 1: Create a Repository on GitHub
If you haven't already created a repository:
1. Go to [GitHub](https://github.com/) and click **New repository** (e.g. `vip-beauty-house`).
2. Keep it Public (or Private with GitHub Pro).

### Step 2: Push the Code
In your project directory:
```bash
git init
git add .
git commit -m "Initial commit: VIP Beauty House luxury salon & boutique"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages (One-Click)
1. On GitHub, navigate to your repository's **Settings** tab.
2. In the left sidebar, click on **Pages** (under the "Code and automation" section).
3. Under **Build and deployment** > **Source**, change the dropdown from *Deploy from a branch* to:
   👉 **GitHub Actions**
4. That's it! GitHub Actions will immediately pick up `.github/workflows/deploy.yml`.

### Step 4: View the Published Site
1. Click the **Actions** tab in your repository to watch the deployment run (typically takes ~35 seconds).
2. Once complete, your live site URL will be:
   ```
   https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```
3. Send this link directly to your client! The site loads with all images, stylesheets, shopping cart, booking form, and hidden admin panel functioning seamlessly.

---

## 💻 Local Development

To run the project locally on your machine:

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server (port 3000)
npm run dev

# 3. Build production bundle (tests the build)
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 🔐 How to Open the Hidden Admin Panel

To show the client the administrative capabilities:
1. Press `Ctrl + Shift + A` (or `Cmd + Shift + A` on Mac) anywhere on the live page, or visit `https://<YOUR-PAGES-URL>/#admin`.
2. Alternatively, click the subtle **Администрация** lock link in the footer copyright line.
3. Enter PIN: `1234` or `vip2026`.
4. Demonstrate adding products, attaching photos, updating stock counters, and editing salon prices live!

---

## 🛠️ Tech Stack & Architecture

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8 with ESM configuration
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Font Awesome 6.5 + Lucide React
- **Animations**: Motion (Framer Motion v12)
- **Deployment**: GitHub Pages via GitHub Actions (`actions/deploy-pages@v4`)
- **SPA Routing Support**: Fallback redirect via `404.html` and `sessionStorage` recovery

---

© 2026 VIP Beauty House. All rights reserved.
