/**
 * Universal safe HTML sanitizer that prevents XSS attacks in both
 * Server-Side Rendering (SSR) and Client-Side environments.
 *
 * Strips script tags, iframes, inline event listeners (onerror, onload, onclick, etc.),
 * and dangerous URI schemes (javascript:).
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  return dirtyHtml
    // Remove <script> tags and everything between them
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove <iframe> tags and content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove <object>, <embed>, <applet>
    .replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove dangerous inline event handlers (e.g. onerror=..., onload=..., onclick=...)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: pseudo-protocol in href or src
    .replace(/(href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');
}
