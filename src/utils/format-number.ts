/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

export type InputNumberValue = string | number | null | undefined;

type Options = Intl.NumberFormatOptions;

const DEFAULT_LOCALE = { code: 'en-IN', currency: 'INR' };

function processInput(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------

export function fNumber(inputValue: InputNumberValue, options?: Options & { locale?: string }) {
  const code = options?.locale || DEFAULT_LOCALE.code;

  const number = processInput(inputValue);
  if (number === null) return '';

  const isInt = Number.isInteger(number);
  const defaultMinFraction = isInt ? 0 : 2;

  const fm = new Intl.NumberFormat(code, {
    minimumFractionDigits: defaultMinFraction,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

export function fCurrency(inputValue: InputNumberValue, options?: Options & { locale?: string; currency?: string }) {
  const code = options?.locale || DEFAULT_LOCALE.code;
  const currency = options?.currency || DEFAULT_LOCALE.currency;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(code, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

export function fPercent(inputValue: InputNumberValue, options?: Options & { locale?: string }) {
  const code = options?.locale || DEFAULT_LOCALE.code;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);

  return fm;
}

// ----------------------------------------------------------------------

export function fShortenNumber(inputValue: InputNumberValue, options?: Options & { locale?: string }) {
  const code = options?.locale || DEFAULT_LOCALE.code;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(code, {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm.replace(/[A-Z]/g, (match) => match.toLowerCase());
}
