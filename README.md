# BabyWise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Local-first pregnancy companion: week tracker, medicine & appointment calendar, photo label **Ask**, and calendar **share/copy**.

**Live:** [babywise.pages.dev](https://babywise.pages.dev)  
**License:** [MIT](./LICENSE) · **Security:** [SECURITY.md](./SECURITY.md)

**Production path:** static SPA on **Cloudflare Pages** + stateless **Pages Function** AI proxy (`/api/ask`).  
User diary data (profile, calendar, Ask history) stays in the browser — **never stored on the server as a medical record**.

```
Browser  →  Pages (SPA)  →  localStorage
         →  POST /api/ask  →  Gemini / OpenAI / Grok / Claude (server keys)
```

---

## Features

- **Pregnancy calculator** — LMP or due date → week · day · trimester
- **Calendar** — schedule by calendar date and/or **baby week** (e.g. medicine until week 12)
- **Share / copy** — multi-select day items; OS share sheet (IM apps) or clipboard
- **Medicine autocomplete** — bilingual (EN / 繁中), common pregnancy-related names
- **Ask** — text and/or photo (labels); multi-ingredient breakdown; Western + TCM-style badges
- **Providers** — Gemini, OpenAI, Grok, Claude (server keys only; users never paste keys)
- **Readings** — weight, blood pressure, and other indicators
- **Notifications** — local browser reminders (no push server)
- **Clean local data** — selective or full wipe
- **i18n** — English + Traditional Chinese

---

## Quick start

```bash
npm install
cp .env.example .env          # optional local notes; keys go in .dev.vars for pages:dev
cp .dev.vars.example .dev.vars
# put at least one provider key in .dev.vars

npm run pages:dev             # full SPA + /api/ask (recommended)
# open http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — `/api/ask` is a **stub** (provider not configured) |
| `npm run pages:dev` | Build + Wrangler Pages with real Functions + secrets |
| `npm run build` | Typecheck + production `dist/` |
| `npm run lint` | Oxlint |

---

## Deploy (GitHub → Cloudflare Pages)

| Field | Value |
|-------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | `20` |

Functions under `functions/` deploy with the site.

**GitHub Actions secrets** (for `.github/workflows/deploy-cloudflare-pages.yml`):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Cloudflare Pages secrets** (Ask):

- `GEMINI_API_KEY` and/or `OPENAI_API_KEY` / `XAI_API_KEY` / `ANTHROPIC_API_KEY`
- Optional: `ASK_DEFAULT_PROVIDER`, `ASK_ALLOWED_ORIGINS`, model overrides

See [docs/DEPLOY.md](./docs/DEPLOY.md) and [docs/GEMINI.md](./docs/GEMINI.md).

---

## Privacy & security (summary)

- No accounts, no server diary database.
- Ask proxies one request to the AI provider; rate-limited and origin-checked.
- Photos are compressed client-side, size-capped server-side, not stored as records.
- **Never commit** `.env` or `.dev.vars` (gitignored). Rotate keys if they leak.
- Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html)

---

## Disclaimer

BabyWise is **not medical advice**. AI results can be wrong. Always confirm with a qualified clinician.

---

## License

[MIT](./LICENSE) © MingMingHomeWork
