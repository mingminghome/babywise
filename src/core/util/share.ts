import { copyText } from './clipboard';

export type ShareResult =
  | { ok: true; via: 'share' | 'copy' }
  | { ok: false; reason: 'cancelled' | 'failed' | 'empty' };

/**
 * Share plain text via the OS share sheet (WhatsApp, Messages, …)
 * when available; otherwise copy to clipboard.
 */
export async function shareOrCopyText(opts: {
  title?: string;
  text: string;
}): Promise<ShareResult> {
  const text = opts.text.trim();
  if (!text) return { ok: false, reason: 'empty' };

  // Prefer native share on mobile / installed PWA (IM apps appear there)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const can =
        typeof navigator.canShare !== 'function' ||
        navigator.canShare({ text, title: opts.title });
      if (can) {
        await navigator.share({
          title: opts.title || 'BabyWise',
          text,
        });
        return { ok: true, via: 'share' };
      }
    } catch (e) {
      // User dismissed the sheet — not an error for UX
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, reason: 'cancelled' };
      }
      // Fall through to clipboard
    }
  }

  const copied = await copyText(text);
  return copied
    ? { ok: true, via: 'copy' }
    : { ok: false, reason: 'failed' };
}

export function canNativeShare(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );
}
