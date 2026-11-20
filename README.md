# UtsavGrid — Local Event Management Aggregator (India)

A full-stack, offline-capable Progressive Web App (PWA) & Capacitor-ready event management aggregator built for India with:
- **Real-Time Slot Availability & 10-Minute Checkout Holds** (WebSocket-synced across connected clients)
- **Integrated Razorpay / UPI Checkout Flow** (Full Payment & 25% Booking Token Advance, GST breakdown, and live Razorpay Orders API support)
- **Three-Sided Platform**: Customer Discovery & Booking, Vendor Availability & Package Portal, and a **Live Frontend Customizer**
- **100% Portable & Offline-First**: Runs locally out of the box with zero external dependencies, with a production-ready **PostgreSQL + PostGIS** schema (`db/postgres_schema.sql`) for external free-tier Supabase or self-hosted Postgres.

---

## 1. Save to GitHub & Work Offline

1. Export or download this project folder from your workspace.
2. Initialize a Git repository and push to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: UtsavGrid event aggregator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/utsavgrid.git
   git push -u origin main
   ```
3. Run locally & offline anytime:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:3000`. All bookings, vendor availability changes, and UI customizations persist locally in `data/utsavgrid-db.json` (gitignored).

4. Run unit tests & production build:
   ```bash
   npm test
   npm run lint
   npm run build
   npm start
   ```

---

## 2. Connect an External Free-Tier PostgreSQL Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in Supabase and run `db/postgres_schema.sql` (creates PostGIS geospatial indexes, double-booking unique constraints, `JSONB` packages, bookings, Razorpay webhook idempotency log, and `theme_configs`).
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your Supabase connection string. You can inspect/export your tables externally anytime via Supabase Studio, DBeaver, TablePlus, or `psql`.

---

## 3. Enable Live Razorpay / UPI Payments

1. Create an account at [razorpay.com](https://razorpay.com) and generate Test/Live API keys.
2. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to `.env`.
3. When unset, the app automatically runs an **Offline UPI / Razorpay Sandbox** so you can develop and test full end-to-end bookings without internet access.

---

## 4. Package as Native Android & iOS Apps (Capacitor)

`capacitor.config.ts` is pre-configured for Android and iOS:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Opens in Android Studio
npx cap open ios       # Opens in Xcode
```
