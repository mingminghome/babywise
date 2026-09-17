# BabyWise

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Local-first pregnancy and baby companion: week tracker, shared calendar, born-baby diary, contraction timer, photo label **Ask**, calendar **share/copy**, and **export/import** backup.

**Live demo:** [https://babywise.pages.dev](https://babywise.pages.dev)  
**License:** [MIT](./LICENSE) · **Security:** [SECURITY.md](./SECURITY.md)

**Production path:** static SPA on **Cloudflare Pages** + stateless **Pages Function** AI proxy (`/api/ask`).  
User diary data (profile, babies, calendar, labor sessions, Ask history) stays in the browser — **never stored on the server as a medical record**.

```
Browser  →  Pages (SPA)  →  localStorage (+ optional JSON backup file)
         →  POST /api/ask  →  Gemini / OpenAI / Grok / Claude (server keys)
         →  service worker  →  local reminder notifications (no push server)
```

---

## Live demo

**Try it:** [https://babywise.pages.dev](https://babywise.pages.dev)

Useful for:

| Area | What you get |
|------|----------------|
| **Week tracker** | LMP or due date → week · day · trimester |
| **Baby diary** | Multiple babies: feeds, diapers, sleep, pumping, tummy time, spit-up, growth |
| **Labor timer** | Contraction stopwatch with 5-1-1 / 4-1-1 / custom helper (in **Tools**) |
| **Calendar** | One diary for pregnancy and baby logs (date and/or pregnancy week) |
| **Share / copy** | Multi-select day items → OS share or clipboard |
| **Export / import** | Full JSON backup (profile, babies, calendar, labor, settings, Ask history) |
| **Ask** | Text and/or photo → food, medicine, symptom, or newborn-care questions |
| **Readings** | Weight, blood pressure, growth, and other notes (daily average + mean line) |
| **Privacy** | No account; diary stays on-device |

AI answers can be wrong — always confirm with a clinician. Details: [SECURITY.md](./SECURITY.md) · [privacy.html](./public/privacy.html).

---

## Features

- **Pregnancy calculator** — LMP or due date → week · day · trimester
- **Born-baby care** — multiple baby profiles (twins/siblings); feed, diaper, sleep, pump, tummy time, spit-up, growth/temp
- **Labor timer** — Tools tab; start/stop stopwatch, rest vs contraction labels, 5-1-1 / 4-1-1 / custom “when to go” helper
- **Calendar** — one diary for pregnancy and baby; filter All / Pregnancy / each baby; schedule by date and/or pregnancy week
- **Postpartum Home** — Settings can hide pregnancy week UI after birth
- **Share / copy** — multi-select day items; OS share sheet (IM apps) or clipboard
- **Export / import** — download or share a JSON backup; import with **replace all** or **merge**
- **Medicine autocomplete** — bilingual (EN / 繁中), common pregnancy-related names
- **Ask** — text and/or photo; food, medicine, symptoms/worries, newborn logs; Western + TCM-style badges
- **Providers** — Gemini, OpenAI, Grok, Claude (server keys only; users never paste keys)
- **Readings** — weight, blood pressure, length, head circumference, and other indicators; same-day **mean** + chart mean line
- **Notifications** — local reminders via service worker + Notification API (no push server); test button in Settings
- **Navigation** — bottom: Home · Calendar · Tools · Ask (+ **Baby** when baby care is on); top-right: About · Settings
- **Clean local data** — selective or full wipe (including babies and labor sessions)
- **i18n** — English, Traditional Chinese, plus EU shells (DE, FR, ES, IT, PT, NL, PL, SV; missing strings fall back to English)

### Navigation (UX)

Same family pattern as OriginWise:

| Control | Tabs / actions |
|---------|----------------|
| **Bottom nav** | Home · Calendar · Tools · Ask (primary); **Baby** appears after a born-baby profile + Settings switch |
| **Top-right icons** | About · Settings (+ pint chip when `VITE_BUY_ME_A_PINT_URL` is set) |
| **About / Settings** | Top-level screens (no intermediate Info hub) |

### Local reminders (phone tips)

- Grant notification permission in **Settings** (or welcome flow).
- Use **Send test notification** to verify the device path.
- On **iPhone/iPad**: Share → **Add to Home Screen**, open from the icon, then allow notifications (normal Safari tabs often never show alerts).
- Reminders are **same-device / best-effort**: timers for remaining times today; they reschedule when you reopen the app. Not a background push service.

### Backup JSON

Settings → **Export & import**:

- **Download backup** / **Share backup** — `babywise-backup-YYYYMMDD.json`
- **Import** — replace all local stores, or merge calendar + Ask history by id

Format marker: `"format": "babywise-backup"`, `"version": 1`. Includes profile, events, settings, Ask history, **babies**, and **labor sessions**. See `src/core/storage/backup.ts`.

---

## Quick start

```bash
npm install
cp .env.example .env          # optional: VITE_GTM_ID, VITE_BUY_ME_A_PINT_URL
cp .dev.vars.example .dev.vars
# put at least one provider key in .dev.vars

npm run pages:dev             # full SPA + /api/ask (recommended)
# open http://localhost:8788
```

| Command | Behavior |
|---------|----------|
| `npm run dev` | Vite only — `/api/ask` is a **stub** (provider not configured) |
| `npm run pages:dev` | Build + Wrangler Pages with real Functions + secrets |
| `npm run build` | Typecheck + production `dist/` (includes `public/sw.js`) |
| `npm run deploy` | Build + `wrangler pages deploy dist --project-name=babywise` |
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
