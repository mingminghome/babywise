# Security policy

## Supported versions

Security fixes target the latest `main` branch (production deploy).

## What BabyWise does **not** do

- No user accounts or passwords
- No server-side database of pregnancy diaries
- No client-supplied AI API keys
- No accepting a full system prompt from the browser (`fullPrompt` is ignored)

## Trust boundaries

| Data | Where it lives |
|------|----------------|
| Profile, calendar, Ask history, settings | Browser `localStorage` only |
| Ask text / optional photo | Sent once to the selected AI provider via `/api/ask`; not stored as a medical record |
| AI provider keys | Cloudflare Pages secrets / `.dev.vars` (never in the SPA bundle) |
| Calendar share / copy | Device clipboard or OS share sheet only |

## Built-in Ask protections (`functions/api/ask.ts`)

- Per-IP rate limits (minute + day; Cache API, best-effort across colos)
- Same-origin / allow-listed `Origin` / `Referer` checks
- Input caps: short text, short context notes, image size + MIME allow-list
- Server-built safety prompt; user content fenced as untrusted data
- Generic error codes only (no upstream secret leakage to the client)

## Reporting a vulnerability

Please **do not** open a public GitHub issue for sensitive reports.

1. Prefer a **private** channel to the maintainer (e.g. GitHub Security Advisories on this repo, or contact via the GitHub profile).
2. Include: impact, steps to reproduce, and whether any keys or personal data may be involved.
3. Allow reasonable time for a fix before public disclosure.

## Deploying your own instance

1. **Never** commit `.env`, `.dev.vars`, or real API keys.
2. Put keys only in Cloudflare Pages secrets (or local gitignored files).
3. Rotate any key that was ever pasted into chat, screenshots, or a public fork.
4. Set `ASK_ALLOWED_ORIGINS` if you use a custom domain.
5. Expect free-tier AI quotas to be exhausted by photo / multi-item Ask faster than short text.

## Known limitations

- Rate limits are **best-effort** (Cache API), not a global hard quota.
- Shared public instances can burn the operator’s AI free tier; self-host with your own keys for private use.
- Ask results are **not** medical advice and can be wrong.
