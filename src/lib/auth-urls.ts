export function getSiteUrl(request?: Request): string {
  // Priorizar la URL real de la petición (localhost vs producción)
  const origin = request?.headers.get('origin')?.trim();
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  const host = request?.headers.get('host')?.trim();
  if (host) {
    const forwarded = request?.headers.get('x-forwarded-proto')?.trim();
    const proto =
      forwarded || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

export function getPasswordResetRedirectUrl(request?: Request): string {
  const siteUrl = getSiteUrl(request);
  return `${siteUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;
}
