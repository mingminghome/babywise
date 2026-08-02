# Deploy: GitHub → Cloudflare Pages (Free)

Same pattern as **ff-calculator / ComboWise**.

```
git push → GitHub (your-user/babywise)
              │
              │  GitHub Actions (.github/workflows/deploy-cloudflare-pages.yml)
              ▼
         npm run build
              │
              ▼
    wrangler pages deploy dist
              │
              ▼
Cloudflare Pages Free  (babywise.pages.dev)
    ├── Static SPA     → dist/
    └── Pages Functions → functions/api/*  (Ask → Gemini / OpenAI / Grok / Claude)
```

**Default setup:** Direct Upload + **CI auto-deploy on push to `main`**.

---

## 0. Never commit secrets

Already gitignored (see also [SECURITY.md](../SECURITY.md)):

- `.env` / `.env.*` (except `.env.example`)
- `.dev.vars` / `.dev.vars.*` (except `.dev.vars.example`)

Put secrets only in:

- **Local:** `.dev.vars` (for `npm run pages:dev`)
- **Production:** Cloudflare Pages → Environment variables / secrets  

**Not** in the GitHub repo, PRs, screenshots, or Issues.  
If a key was ever committed or shared, **rotate it** before opening the repo publicly.

| Variable / secret | Where |
|-------------------|--------|
| `VITE_GTM_ID` | Cloudflare Pages **Build** env (optional GTM/GA; empty = off). Local: `.env` |
| `GEMINI_API_KEY` | Cloudflare Pages secret (**required for Ask**) — not a `VITE_*` var |
| `CLOUDFLARE_API_TOKEN` | **GitHub** Actions secrets (deploy only) |
| `CLOUDFLARE_ACCOUNT_ID` | **GitHub** Actions secrets (deploy only) |

GTM is **not hardcoded**. Set e.g. `VITE_GTM_ID=GTM-XXXXXXX` so the SPA injects the container at runtime (`src/core/analytics/gtm.ts`).

---

## 1. Create GitHub repo & first push

```bash
cd babywise
git init
git add .
git status   # confirm .env / .dev.vars are NOT listed
git commit -m "Initial commit: BabyWise local-first pregnancy app"
```

Create repo (CLI):

```bash
gh repo create babywise --private --source=. --remote=origin --push
```

Or create empty repo on GitHub, then:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USER/babywise.git
git push -u origin main
```

---

## 2. One-time: Cloudflare secrets for GitHub Actions

Same as ff-calculator:

1. https://dash.cloudflare.com/profile/api-tokens  
2. **Create Token** → **Edit Cloudflare Workers** (or Pages Edit)  
3. Account ID: `npx wrangler whoami` or dashboard sidebar  

GitHub repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | token |
| `CLOUDFLARE_ACCOUNT_ID` | account id |

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID -b "YOUR_ACCOUNT_ID"
```

---

## 3. Auto-deploy (every push to `main`)

Workflow: [`.github/workflows/deploy-cloudflare-pages.yml`](../.github/workflows/deploy-cloudflare-pages.yml)

| Trigger | Behaviour |
|---------|-----------|
| `push` to `main` | `npm ci` → `npm run build` → `wrangler pages deploy dist --project-name=babywise` |
| **Actions → Run workflow** | Manual redeploy |

First deploy creates project **`babywise`** → `https://babywise.pages.dev`  
(Change `--project-name` in the workflow if you want another name.)

---

## 4. Manual deploy (local)

```bash
npm run build
npx wrangler pages deploy dist --project-name=babywise
```

Requires `npx wrangler login` once.

---

## 5. Optional: dashboard “Connect to Git”

1. Cloudflare → **Workers & Pages** → **Create** → **Connect to Git**  
2. Select `babywise`  
3. Build: `npm run build`, output `dist`, Node `20`  

Disable the GitHub Action if you use this, to avoid double deploys.

---

## 6. AI provider env on Cloudflare (after first deploy)

Dashboard → **Pages project `babywise`** → **Settings → Environment variables**  
(Production + Preview if needed). Set **at least one** provider key:

| Name | Provider | Notes |
|------|----------|--------|
| `GEMINI_API_KEY` | Gemini | Free key from [AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `XAI_API_KEY` | Grok | [console.x.ai](https://console.x.ai/) (`GROK_API_KEY` also accepted) |
| `ANTHROPIC_API_KEY` | Claude | [console.anthropic.com](https://console.anthropic.com/) |

Optional model overrides: `GEMINI_MODEL`, `OPENAI_MODEL`, `XAI_MODEL`, `ANTHROPIC_MODEL`, `ASK_DEFAULT_PROVIDER`.

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name=babywise
npx wrangler pages secret put OPENAI_API_KEY --project-name=babywise
npx wrangler pages secret put XAI_API_KEY --project-name=babywise
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=babywise
```

Then **redeploy**. Full detail: [GEMINI.md](./GEMINI.md) (covers all providers).

---

## 7. Smoke tests after deploy

```bash
curl -sS "https://babywise.pages.dev/" -o /dev/null -w "%{http_code}\n"
curl -sS "https://babywise.pages.dev/api/ask"
curl -sS -X POST "https://babywise.pages.dev/api/ask" \
  -H 'Content-Type: application/json' \
  -d '{"locale":"en","text":"water","provider":"gemini"}'
```

Expect after a key is set: JSON with `"ok": true`.  
List configured providers: `GET /api/ask` → `available`.  
Missing key for chosen provider: `"code":"provider_not_configured"` (or `gemini_not_configured` for Gemini).

In the app: **Settings → Ask AI provider**, then **Ask → Get answer**.

---

## 8. Local Ask

```bash
# .dev.vars (gitignored) — at least one *\_API_KEY=...
npm run pages:dev
# http://localhost:8788
```

`npm run dev` alone stubs `/api/ask` without a real model call.

---

## 9. Free-tier notes

| Concern | Guidance |
|---------|----------|
| Cloudflare Pages Free | Fine for SPA + Functions |
| Gemini free tier | Counts against the **project** for `GEMINI_API_KEY` |
| Privacy | No pregnancy DB; Ask prompts are not stored as medical records |
