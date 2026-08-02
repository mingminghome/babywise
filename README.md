# BabyWise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Local-first pregnancy companion: week tracker, medicine & appointment calendar, photo label **Ask**, and calendar **share/copy**.

**Live demo:** [https://babywise.pages.dev](https://babywise.pages.dev)  
**License:** [MIT](./LICENSE) · **Security:** [SECURITY.md](./SECURITY.md)

**Production path:** static SPA on **Cloudflare Pages** + stateless **Pages Function** AI proxy (`/api/ask`).  
User diary data (profile, calendar, Ask history) stays in the browser — **never stored on the server as a medical record**.

```
Browser  →  Pages (SPA)  →  localStorage
         →  POST /api/ask  →  Gemini / OpenAI / Grok / Claude (server keys)
```

---

## Live demo

**Try it:** [https://babywise.pages.dev](https://babywise.pages.dev)

Useful for:

| Area | What you get |
|------|----------------|
| **Week tracker** | LMP or due date → week · day · trimester |
| **Calendar** | Medicines & appointments by date and/or **baby week** |
| **Share / copy** | Multi-select day items → OS share or clipboard |
| **Ask** | Text and/or photo of a label → ingredient-style breakdown (AI proxy) |
| **Readings** | Weight, blood pressure, and other notes |
| **Privacy** | No account; diary stays on-device |

AI answers can be wrong — always confirm with a clinician. Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html).

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

For self-hosting (Cloudflare Pages, env keys, CI), see [docs/DEPLOY.md](./docs/DEPLOY.md) and [docs/GEMINI.md](./docs/GEMINI.md).

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
