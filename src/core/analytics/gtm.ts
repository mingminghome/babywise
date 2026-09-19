/**
 * Google Tag Manager — container ID from env only (never hardcode).
 *
 * Set at build time (Vite inlines `VITE_*`):
 *   VITE_GTM_ID=GTM-XXXXXXX
 *
 * Production (this repo deploys via GitHub Actions Direct Upload):
 *   GitHub → Settings → Secrets and variables → Actions → Variables → VITE_GTM_ID
 * Local: .env or .env.local (gitignored)
 *
 * Cloudflare Pages runtime env is not visible to the SPA build.
 * Wire GA4 (`G-…`) inside the GTM container, not as VITE_GTM_ID.
 *
 * When unset / empty / not a GTM- id, GTM is not loaded.
 */

const GTM_ID_RE = /^GTM-[A-Z0-9]+$/i;

function resolveGtmId(): string | null {
  const raw = String(import.meta.env.VITE_GTM_ID ?? '')
    .trim()
    .toUpperCase();
  if (!raw || !GTM_ID_RE.test(raw)) return null;
  return raw;
}

function gtmAlreadyInstalled(id: string): boolean {
  if (document.documentElement.dataset.gtmId === id) return true;
  const needle = `googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  return Array.from(document.getElementsByTagName('script')).some((el) =>
    (el.src ?? '').includes(needle),
  );
}

/**
 * Install GTM script + noscript iframe when VITE_GTM_ID is configured.
 * Safe to call once at app bootstrap.
 */
export function installGtm(): string | null {
  const id = resolveGtmId();
  if (!id) return null;
  if (typeof document === 'undefined') return null;

  if (gtmAlreadyInstalled(id)) {
    document.documentElement.dataset.gtmId = id;
    return id;
  }
  document.documentElement.dataset.gtmId = id;

  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  if (document.head.firstChild) {
    document.head.insertBefore(script, document.head.firstChild);
  } else {
    document.head.appendChild(script);
  }

  if (!document.getElementById('gtm-noscript')) {
    const ns = document.createElement('noscript');
    ns.id = 'gtm-noscript';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.title = 'Google Tag Manager';
    ns.appendChild(iframe);
    document.body.insertBefore(ns, document.body.firstChild);
  }

  return id;
}

export function getGtmId(): string | null {
  return resolveGtmId();
}
