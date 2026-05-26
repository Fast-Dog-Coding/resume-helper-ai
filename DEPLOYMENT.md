# Deploying Candidate Concierge to Vercel

This app is configured for [Vercel Express](https://vercel.com/docs/frameworks/backend/express) deployment. Static assets in `public/` are served from the CDN; the Express app runs as a serverless function via [`app.js`](app.js).

For Fast Dog Coding’s broader hosting strategy, see [HOSTING.md](HOSTING.md).

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (GitHub login recommended)
- This repository pushed to GitHub
- [OpenRouter](https://openrouter.ai/) API key
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (Network Access must allow Vercel — use `0.0.0.0/0` or Atlas’s Vercel integration)
- **Pro plan ($20/mo)** recommended for production chat (300s max function duration vs Hobby’s 60s max)
- **Node.js 24.x** (Active LTS) — pinned in [`package.json`](package.json) `engines`; matches Vercel’s default runtime

## 1. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import this Git repository.
3. Framework preset should auto-detect **Express**. No custom build command is required.
4. Do **not** deploy yet — add environment variables first (step 2).

### CLI alternative

```bash
npm install
npx vercel login
npx vercel link
npx vercel env pull .env.vercel   # optional: pull env vars locally
npx vercel deploy                 # preview
npx vercel deploy --prod          # production
```

Local serverless simulation:

```bash
npm run dev:vercel
```

Requires Vercel CLI ≥ 47.0.5 (included as a dev dependency).

## 2. Configure environment variables

In Vercel → Project → **Settings → Environment Variables**, add every required variable from [`.env.sample`](.env.sample). Apply to **Production** and **Preview** as needed.

| Variable | Production value notes |
|----------|------------------------|
| `APP_TITLE` | e.g. `Candidate Concierge` |
| `APP_HTTP_REFERER` | Production URL, e.g. `https://candidate-concierge.fastdogcoding.com` |
| `OPENROUTER_API_KEY` | From OpenRouter dashboard |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODELS` | JSON array, e.g. `["google/gemini-2.5-flash","openai/gpt-4.1-mini"]` |
| `MONGODB_CONNECTION` | Atlas connection string |
| `MONGODB_DB_NAME` | Database name |
| `COOKIE_ENCRYPTION_KEY` | 32-byte hex string (generate once; keep stable across deploys) |
| `RATE_LIMIT_WINDOW_MS` | `300000` |
| `RATE_LIMIT_AMOUNT` | `20` |
| `RATE_LIMIT_PROXY` | `1` (Vercel is one proxy hop) |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` (optional) |

Vercel sets `VERCEL=1` automatically — the app uses this to skip file-based logging.

### Node.js version

This project targets **Node.js 24.x** (Active LTS) via `engines` in [`package.json`](package.json). Vercel uses this on deploy; you can also confirm under **Settings → Build and Deployment → Node.js Version** (select **24.x**).

For local development, use Node 24 (e.g. `nvm install 24 && nvm use 24`), then run `node -v` before `npm start` or `npm run dev:vercel`.

### Function timeout

[`vercel.json`](vercel.json) sets `maxDuration: 60` seconds. After upgrading to **Pro**, raise this to `300` if LLM responses occasionally exceed 60 seconds:

```json
{
  "functions": {
    "app.js": {
      "maxDuration": 300
    }
  }
}
```

## 3. Pilot deploy and smoke test

Deploy from the Vercel dashboard or run `npx vercel deploy --prod`.

### Smoke test checklist

Use the Vercel preview URL first, then production after domain cutover.

- [ ] **Home page** loads at `/` with chat UI and styles
- [ ] **Static assets** load (`/css/style.css`, `/js/script.js`)
- [ ] **Send a message** — assistant responds with markdown content
- [ ] **Thread persistence** — refresh page; prior messages reload via `/api/thread/messages`
- [ ] **Cookie set** — `threadId` cookie is `httpOnly`, `secure`, `sameSite=strict`
- [ ] **Clear thread** — delete/clear action clears cookie and history
- [ ] **Rate limit** — rapid requests eventually return 429 on `/api/*`
- [ ] **Error handling** — invalid API requests return JSON errors, not hung requests
- [ ] **Vercel logs** — Project → Logs shows console output (no file-write errors)

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| 504 / timeout on chat | Increase `maxDuration`; upgrade to Pro |
| MongoDB connection error | Atlas Network Access blocking Vercel IPs |
| Missing env at startup | Check all variables in Vercel settings |
| Styles/scripts 404 | Ensure files are under `public/` (Vercel ignores `express.static()`) |
| Rate limit too aggressive per user | In-memory limiter is per-instance; consider Upstash or Vercel WAF later |

## 4. Custom domain

Production URL today: `candidate-concierge.fastdogcoding.com`.

1. Vercel → Project → **Domains** → add `candidate-concierge.fastdogcoding.com`.
2. At your DNS provider, add the CNAME record Vercel provides.
3. Wait for SSL provisioning (usually minutes).
4. Update `APP_HTTP_REFERER` to the production URL if not already set.
5. Redeploy if you changed env vars.

## 5. Cutover from AWS App Runner

Run both hosts in parallel before switching DNS.

### Parallel-run period (recommended: a few days)

1. Deploy to Vercel with a preview URL; complete the smoke test checklist.
2. Add the custom domain in Vercel but **do not** change DNS yet — note the Vercel target hostname.
3. Optionally test via `/etc/hosts` or a temporary subdomain pointing to Vercel.
4. Monitor Vercel logs and Atlas connection counts during test traffic.

### DNS cutover

1. Lower DNS TTL ahead of time if your provider allows (optional, speeds rollback).
2. Update the CNAME for `candidate-concierge.fastdogcoding.com` to Vercel’s target.
3. Verify production smoke tests pass on the custom domain.
4. Keep App Runner running for 24–48 hours as rollback option.

### Decommission App Runner

After the soak period:

1. Confirm no traffic to App Runner (AWS console / access logs).
2. Delete the App Runner service.
3. Remove any App Runner–specific IAM roles, secrets, or CI/CD hooks no longer needed.
4. Update [ROADMAP.md](ROADMAP.md) — platform migration complete.

## Local development

| Command | Use case |
|---------|----------|
| `npm start` | Local Express server on port 3100 (`bin/www`) |
| `npm run dev:vercel` | Simulate Vercel serverless locally |

Local dev uses file logging in `logs/`; Vercel uses console + MongoDB transport only.
