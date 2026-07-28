# Ask (multi-provider) setup

BabyWise **Ask** calls an AI with a **server API key**.  
Users pick a provider in Settings; they never paste a key.

```
Ask → POST /api/ask { provider, text?, image?, … }
   → Worker uses GEMINI_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY
   → Gemini | OpenAI | Grok (xAI) | Claude (Anthropic)
   → optional photo: client-resized JPEG/PNG/WebP as multimodal input
```

Calendar, week tracking, and settings stay local-first (browser only).

## Supported providers

| Settings id | Secret(s) | Default model | Optional model env |
|-------------|-----------|---------------|--------------------|
| `gemini` | `GEMINI_API_KEY` | free-tier flash-lite chain | `GEMINI_MODEL` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | `OPENAI_MODEL` |
| `grok` | `XAI_API_KEY` or `GROK_API_KEY` | `grok-3-mini` | `XAI_MODEL` |
| `claude` | `ANTHROPIC_API_KEY` | `claude-3-5-haiku-latest` | `ANTHROPIC_MODEL` |

Optional: `ASK_DEFAULT_PROVIDER=gemini` when the client omits `provider`.

## 1. Create keys

- **Gemini** — [Google AI Studio → API keys](https://aistudio.google.com/apikey)
- **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Grok** — [console.x.ai](https://console.x.ai/)
- **Claude** — [console.anthropic.com](https://console.anthropic.com/)

## 2. Cloudflare Pages secrets

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name=babywise
npx wrangler pages secret put OPENAI_API_KEY --project-name=babywise
npx wrangler pages secret put XAI_API_KEY --project-name=babywise
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=babywise
```

Redeploy after adding secrets (or wait for the next push deploy).

### “This AI provider is not configured”

The chosen provider’s secret is missing. Switch provider in **Settings**, or add the secret and redeploy.

### “The answer service is busy”

Usually **429 / quota** on that provider. Wait for reset, change model env, or pick another provider.

## 3. Local development

```bash
cp .dev.vars.example .dev.vars
# set at least one *\_API_KEY=...

npm run pages:dev
# open http://localhost:8788
```

Plain `npm run dev` (Vite only) stubs `/api/ask` with “not configured” — that is expected.

## Privacy notes

- Pregnancy calendar / meds stay in **localStorage** on the device  
- Ask sends only the prompt you build (question + optional context flags)  
- The Worker does not store chat history as a medical record  
- Usage counts against **your** project quota for each configured key  

## Abuse protection (built into `/api/ask`)

| Control | Detail |
|---------|--------|
| **Rate limit** | ~8 requests / IP / minute and ~40 / IP / day (Cache API; best-effort) |
| **Origin check** | Browser `Origin` / `Referer` must match the Pages host (or localhost) |
| **No client prompts** | Server **ignores** `fullPrompt`; builds the system prompt itself |
| **No client keys** | Only server secrets; `provider` is an allow-listed id |
| **Input caps** | Question ≤ 400 chars; context notes ≤ 600 chars; optional image ≤ ~1 MB (JPEG/PNG/WebP base64) |
| **Photo** | Client compresses; not stored on server; sent only for that model call |
| **Injection fencing** | User text wrapped in `<user_item>`; instructions say treat as data only |
| **Output cap** | `maxOutputTokens` limited |
| **No raw dump** | Success responses do not echo full model text |
| **Safe errors** | Clients only get generic `code` + fixed `error` strings |

Optional env:

| Secret / var | Purpose |
|--------------|---------|
| `ASK_ALLOWED_ORIGINS` | Extra comma-separated origins (e.g. custom domain) |
| `ASK_DEFAULT_PROVIDER` | Default when client omits `provider` |

### List configured providers

```bash
curl -sS "https://babywise.pages.dev/api/ask"
# { "ok": true, "providers": [...], "available": ["gemini", ...], "default": "gemini" }
```
