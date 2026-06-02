# Cloudflare Pages + D1 Deployment Guide

This guide will help you deploy your newly optimized, Cloudflare-native website in under 5 minutes. Since everything runs on **Cloudflare Pages Functions** and **Cloudflare D1** (SQLite at the edge), it is 100% free, runs on one single service, requires no external databases or VPS, and is completely secure to keep open-source on GitHub!

---

## 1. Setup Your Discord Application (If not done)
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and give it a name (e.g., `adam.dev`).
3. Go to the **OAuth2** tab on the left menu:
   * Copy the **Client ID**.
   * Click **Reset Secret** and copy the **Client Secret**.
4. In the **Redirects** section, click **Add Redirect**:
   * Add: `https://YOUR-DOMAIN.pages.dev/api/auth/discord/callback` (or your custom domain: `https://adam.dev/api/auth/discord/callback`).
   * Click **Save Changes** at the bottom.

---

## 2. Create the Cloudflare D1 Database (2 Options)

### Option A: Via the Cloudflare Dashboard (Easiest)
1. Go to the **Cloudflare Dashboard** and log in.
2. In the sidebar, click **Workers & Pages** -> **D1 SQL Database**.
3. Click **Create database** -> **Dashboard**.
4. Set the database name to `guestbook-db` and click **Create**.
5. Once created, copy the **Database ID** (a UUID like `e8d2e8b2-3b1a-4d3f-a3f2-ef423f03b41d`).
6. Go to the **Console** tab of your D1 database, click **Upload SQL** or paste the content of `schema.sql` directly and execute it. Done!

### Option B: Via Wrangler CLI (Fastest for Developers)
If you have node installed locally, run these in your terminal inside the `site` folder:
```bash
# 1. Login to wrangler
npx wrangler login

# 2. Create the database
npx wrangler d1 create guestbook-db
# Copy the Database ID outputted in your console

# 3. Apply the database schema
# For local development:
npx wrangler d1 migrations apply guestbook-db --local --file=schema.sql

# For production Cloudflare:
npx wrangler d1 migrations apply guestbook-db --remote --file=schema.sql
```

---

## 3. Link D1 and Env Vars to Your Cloudflare Pages Project

In the Cloudflare Dashboard:
1. Go to **Workers & Pages** -> select your **Pages project**.
2. Click the **Settings** tab at the top.

### A. Bind the D1 Database
1. Go to **Functions** on the left menu.
2. Scroll down to **D1 database bindings**.
3. Click **Add binding**:
   * **Variable name (Binding)**: `DB` *(Must be exactly capital DB)*
   * **D1 database**: Select your created `guestbook-db`.
4. Click **Save**.

### B. Add Encrypted Environment Variables (Secrets)
1. Go to **Environment variables** on the left menu.
2. Click **Add variables** under **Production** (and optionally under **Preview** too):
   * `SITE_URL` = `https://YOUR-DOMAIN.pages.dev` (or your custom domain `https://adam.dev`)
   * `DISCORD_CLIENT_ID` = `YOUR_CLIENT_ID_FROM_PORTAL`
   * `DISCORD_CLIENT_SECRET` = `YOUR_CLIENT_SECRET_FROM_PORTAL` (Make sure to encrypt this!)
   * `DISCORD_REDIRECT_URI` = `https://YOUR-DOMAIN.pages.dev/api/auth/discord/callback`
   * `ADMIN_DISCORD_ID` = `853310319002517524` (This is your Discord ID; only this ID can delete posts!)
   * `NODE_ENV` = `production`
3. Click **Save**.

---

## 4. Run Locally and Verify (Optional but Recommended)

You can run your entire site locally using Cloudflare's official Wrangler emulator. It will simulate Pages, Functions, D1, cookies, and redirect flows perfectly:

1. Update your `wrangler.toml` with your database ID:
   ```toml
   database_id = "your-copied-database-id"
   ```
2. Create a local environment file `.dev.vars` inside the `site/` folder to store your development secrets (this file is ignored by `.gitignore` so it's safe):
   ```ini
   SITE_URL=http://localhost:8788
   DISCORD_CLIENT_ID=YOUR_CLIENT_ID
   DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET
   DISCORD_REDIRECT_URI=http://localhost:8788/api/auth/discord/callback
   ADMIN_DISCORD_ID=853310319002517524
   NODE_ENV=development
   ```
3. Run Wrangler development server:
   ```bash
   npx wrangler pages dev public --d1=DB
   ```
4. Open `http://localhost:8788` in your browser. Click **Login with Discord** and verify the entire guestbook!

---

## 5. Deploy to GitHub

Because we moved all secrets (`DISCORD_CLIENT_SECRET`, etc.) into Cloudflare Pages' Dashboard env vars, **your GitHub repository is 100% safe to remain public**. None of your secrets will ever be committed to git.

1. You can now safely delete the entire `site/server` directory since our Cloudflare Pages Functions replace it completely!
2. Commit and push the new files:
   * `functions/` (The new serverless API backend)
   * `schema.sql` and `migrations/` (The database setup)
   * `wrangler.toml` (The Cloudflare configuration)
3. Push to your repo:
   ```bash
   git rm -rf server/  # Delete the old server code
   git add functions/ wrangler.toml schema.sql migrations/
   git commit -m "feat: migrate backend to serverless Cloudflare Pages Functions and D1"
   git push
   ```
4. Cloudflare Pages will automatically detect the changes, build the frontend, compile the backend functions, and deploy everything seamlessly.

*Your site is now fully live, lightning-fast at the edge, and completely serverless!*
