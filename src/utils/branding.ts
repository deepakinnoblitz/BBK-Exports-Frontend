import type { SyntheticEvent } from 'react';

import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

export const DEFAULT_FULL_LOGO = `${CONFIG.assetsDir}/logo/Innoblitz%20Logo%20Full.png`;
export const DEFAULT_COLLAPSED_LOGO = `${CONFIG.assetsDir}/logo/Innoblitz_logo.png`;
export const DEFAULT_COMPANY_NAME = 'BBK EXPORTS';

export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'] as const;

const UNSAFE_LOCAL_EXTENSIONS = ['.html', '.htm', '.js', '.mjs', '.xhtml'];

/**
 * Validates that a logo URL uses a safe relative upload/asset path or http(s) origin.
 */
export function isSafeLogoUrl(url?: string | null): boolean {
  if (!url) return false;

  const trimmed = String(url).trim();
  if (!trimmed) return false;

  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed.charCodeAt(i) < 32) return false;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  if (trimmed.startsWith('//') || trimmed.includes('..')) {
    return false;
  }

  const isLocalPath =
    trimmed.startsWith('/files/') ||
    trimmed.startsWith('/private/files/') ||
    trimmed.startsWith('/assets/');

  if (!isLocalPath) {
    return false;
  }

  const cleanPath = trimmed.split('?')[0].split('#')[0].toLowerCase();
  return !UNSAFE_LOCAL_EXTENSIONS.some((ext) => cleanPath.endsWith(ext));
}

/**
 * Resolves a validated logo URL or falls back to the provided default asset path.
 */
export function getSafeLogoUrl(
  url?: string | null,
  fallback: string = DEFAULT_FULL_LOGO
): string {
  if (isSafeLogoUrl(url)) {
    return String(url).trim();
  }
  return fallback;
}

/**
 * Returns configured Company Name. Unset (null/undefined) falls back to DEFAULT_COMPANY_NAME;
 * an explicitly cleared empty string ('') hides the company name text cleanly.
 */
export function getCompanyDisplayName(
  settings?: { company_name?: string | null } | null,
  fallback: string = DEFAULT_COMPANY_NAME
): string {
  if (!settings || settings.company_name === undefined || settings.company_name === null) {
    return fallback;
  }
  return String(settings.company_name).trim();
}

/**
 * Applies fallback asset once if a custom logo fails to load over HTTP.
 */
export function handleLogoImgError(
  event: SyntheticEvent<HTMLImageElement>,
  fallback: string = DEFAULT_FULL_LOGO
): void {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = fallback;
}

