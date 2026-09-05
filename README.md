# AI Code Reviewer

An automated pipeline that reviews GitHub pull requests with static analysis (Semgrep) and
Gemini AI, posts the findings back as a PR comment, and gives you a live dashboard to browse
every review — plus a "Quick Check" page to review pasted code without opening GitHub at all.

This guide starts from a completely empty machine — install Node, get the project running,
set up the database, and wire up GitHub. Follow it top to bottom the first time.

---

## 1. Prerequisites

You need four things before you touch the project itself:

### 1.1 Node.js

The project needs Node.js (v18 or newer).

- Go to [nodejs.org](https://nodejs.org) and download the **LTS** version for your OS.
- Run the installer (defaults are fine).
- Confirm it worked — open a terminal (Command Prompt / PowerShell on Windows, Terminal on
  Mac/Linux) and run:
  ```bash
  node -v
  npm -v
  ```
  Both should print a version number. If they don't, restart your terminal (or your computer)
  and try again.

### 1.2 A PostgreSQL database (Neon)

This project uses [Neon](https://neon.tech) (free tier is enough) for its Postgres database.

1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project.
3. On the project dashboard, copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. Keep this handy — it goes into `.env` as `DATABASE_URL` in step 3.

### 1.3 A Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with a Google account and create an API key.
3. Copy it — it goes into `.env` as `GEMINI_API_KEY`.

### 1.4 A GitHub personal access token

The app needs a token to read PR diffs and post review comments.

1. Go to GitHub → click your profile photo → **Settings** → **Developer settings** →
   **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. Give it a name, and check the **`repo`** scope (this covers reading PRs and posting
   comments; use `public_repo` only if you're exclusively working with public repos).
3. Generate it and **copy the token immediately** — GitHub only shows it once.
4. Keep this handy — it goes into `.env` as `GITHUB_TOKEN`.

### 1.5 (Optional but recommended) Semgrep

The review pipeline runs a static-analysis pass with [Semgrep](https://semgrep.dev) before
sending the diff to Gemini. If Semgrep isn't installed, that step is silently skipped — the
app still works, you just lose the static-analysis findings.

Semgrep is a Python tool, not an npm package:
```bash
pip install semgrep
```
Confirm it worked:
```bash
semgrep --version
```

---

## 2. Get the project running

### 2.1 Open the project folder

Unzip/download the project, then open a terminal **in the project's root folder** (the one
containing `package.json` and `server.js`).

### 2.2 Install dependencies

This installs both the backend's packages and the dashboard's packages in one step:
```bash
npm run install:all
```

### 2.3 Configure your `.env` file

In the project root, there's a `.env` file. Open it in any text editor and fill in the values
you collected in Section 1:

```env
PORT=3000
GITHUB_TOKEN=your_github_token_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_neon_connection_string_here
SMEE_URL=
WEBHOOK_PATH=/webhook/github
DASHBOARD_URL=http://localhost:5173
```

Leave `SMEE_URL` blank for now — you'll get that value in Section 3.

### 2.4 Set up the database schema

This creates all the tables the app needs:
```bash
npm run migrate
```
You should see each migration file print `ok` (or `skipped (already applied)` if you run it
again later).

---

## 3. Set up the webhook relay (smee.io)

GitHub needs a public URL to send webhook events (like "a PR was opened") to. Since your
server runs on `localhost`, GitHub can't reach it directly — [smee.io](https://smee.io) solves
this by giving you a public URL that forwards events straight into your local server.

1. Go to [smee.io](https://smee.io) and click **Start a new channel**.
2. Copy the URL it gives you (something like `https://smee.io/AbCdEfGhIjKl`).
3. Paste it into your `.env` file as `SMEE_URL`:
   ```env
   SMEE_URL=https://smee.io/AbCdEfGhIjKl
   ```

You only need to do this once — the same smee channel can relay events for as many repos as
you want (see Section 5).

---

## 4. Run the project

From the project root, one command starts everything — the API server (with the smee relay
built in) and the dashboard together:
```bash
npm run dev
```

You should see output like:
```
[SERVER] [smee] forwarding https://smee.io/... -> http://localhost:3000/webhook/github
[SERVER] Server is running on http://localhost:3000
[CLIENT] ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser — that's the dashboard.

Leave this terminal running the whole time you're working with the project. Press `Ctrl+C` to
stop everything when you're done.

---

## 5. Connect a GitHub repo for automatic reviews

For any repo you want the bot to automatically review PRs on:

1. Go to that repo on GitHub → **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL**: paste your `SMEE_URL` from `.env` (the same URL for every repo).
3. **Content type**: `application/json`.
4. **Secret**: leave blank.
5. Under "Which events would you like to trigger this webhook?", choose **"Let me select
   individual events"** and check only **Pull requests**.
6. Make sure **Active** is checked, then click **Add webhook**.

Repeat this for every repo you want reviewed — it's about 30 seconds per repo. Once it's set
up, opening or updating a pull request on that repo will automatically trigger a review, and
the results will show up both as a comment on the PR and in your dashboard.

---

## 6. Using the dashboard

- **Dashboard** — every review that's happened so far: source (PR or Quick Check), repo/file,
  date, a 0–100 score, and how many findings it had. Click a row to see the full findings and
  the diff that was reviewed.
- **Quick Check** — paste or write code directly and get a review without creating a PR at
  all. If you like the result, you can push it straight to a GitHub repo as a new branch + PR
  from the same screen.
- **Tables** — a raw browser for the underlying `reviews` and `findings` database tables.
- **Sidebar** — shows your GitHub repos, and a live findings-by-severity chart (click the
  "Findings by severity" label to jump straight to the full chart).
- **Theme toggle** (top right) — switch between dark and light mode.
- **Live indicator** (top right) — shows "Live" when the dashboard is receiving real-time
  updates; it'll flip to a new review automatically as soon as one finishes, no refresh needed.

---

## 7. Troubleshooting

**Nothing happens when I open a PR.**
Check your terminal for a line under `[SERVER]` starting with `[smee] POST ...`. If you don't
see one at all, the webhook isn't reaching your server — double check the Payload URL in your
repo's webhook settings matches `SMEE_URL` in `.env` exactly, and that "Pull requests" is
checked as an event.

**It hangs for a long time on "Sending diff to Gemini for review...".**
This is usually a temporary rate limit or high demand on Gemini's free tier. The app will
retry automatically a few times — check back in a minute. If it keeps happening, wait a bit
longer between test PRs.

**`column "..." of relation "reviews" does not exist`.**
Your database is missing a migration. Run:
```bash
npm run migrate
```

**The "Live" indicator in the top bar is stuck on "Connecting...".**
Restart `npm run dev`. If it's still stuck, make sure nothing else is running on port 3000 or
5173, and that your `.env`'s `DASHBOARD_URL` matches whatever URL Vite actually printed.

**A `SECURITY WARNING` about SSL modes prints when the server starts.**
This is just a notice from the `pg` library about your `DATABASE_URL`'s SSL settings — it's
not an error and doesn't affect anything. Safe to ignore.

**Static analysis always finds 0 issues.**
Semgrep may not be installed. Run `semgrep --version` to check; if it's missing, revisit
Section 1.5.

---

## 8. Project structure (for reference)

```
server.js                  — Express app entrypoint, starts the embedded smee relay
trigger/webhook-handler.js — receives GitHub PR events, runs the review pipeline
review-engine/             — static analysis (Semgrep) + Gemini analysis + score/merge logic
fetch-prepare/              — fetches PR diffs from GitHub
delivery/                  — posts the review as a PR comment
findings/                  — database access layer for reviews & findings
database/migrations/       — SQL migration files, run in order by `npm run migrate`
dashboard/api/             — Express routes the dashboard calls (reviews, tables, quick-check…)
dashboard/client/          — the React + Vite dashboard itself
```
