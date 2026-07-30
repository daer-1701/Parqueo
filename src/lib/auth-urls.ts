/**
 * URL pública fija del sitio. Nunca usar Origin/Host del request
 * (evita robo de tokens de recuperación por Origin poisoning).
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'NEXT_PUBLIC_SITE_URL debe estar definida en producción (ej. https://tu-app.vercel.app)'
  );
}

export function getPasswordResetRedirectUrl(): string {
  const siteUrl = getSiteUrl();
  return `${siteUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;
}

/** Solo rutas internas relativas seguras post-auth. */
export function sanitizeAuthNextPath(next: string | null | undefined): string {
  const fallback = '/auth/reset-password';
  if (!next || typeof next !== 'string') return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\') || trimmed.includes('://')) return fallback;

  const allowed = ['/auth/reset-password', '/login', '/admin', '/worker'];
  if (allowed.some((path) => trimmed === path || trimmed.startsWith(`${path}/`))) {
    return trimmed;
  }

  return fallback;
}
