import type { MuiTelInputInfo } from 'mui-tel-input';
import type { CountryCode } from 'libphonenumber-js';

import {
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
} from 'libphonenumber-js/max';

const VALID_CALLING_CODES = new Set<string>(
    getCountries().map((country) => getCountryCallingCode(country))
);

export const UNIQUE_EMPLOYEE_FIELDS = [
    'phone',
    'aadhar_number',
    'pan_number',
    'uan_number',
    'esi_no',
    'pf_number',
] as const;

export const VALIDATED_EMPLOYEE_PHONE_FIELDS = ['phone', 'office_phone_number'] as const;

export const EMPLOYEE_IDENTITY_FIELD_LABELS: Record<string, string> = {
    phone: 'Personal Phone Number',
    office_phone_number: 'Office Phone',
    aadhar_number: 'Aadhar Number',
    pan_number: 'PAN Number',
    uan_number: 'UAN Number',
    esi_no: 'ESI No',
    pf_number: 'PF Number',
};

function cleanSpreadsheetNumericString(rawVal: unknown): string {
    if (rawVal === undefined || rawVal === null) return '';
    let s = String(rawVal).trim();
    if (!s) return '';
    if (/^[0-9]+(?:\.[0-9]+)?[eE]\+[0-9]+$/.test(s)) {
        try {
            s = BigInt(Math.round(Number(s))).toString();
        } catch {
            // Keep original string if BigInt conversion fails
        }
    } else if (/^\d+\.0$/.test(s)) {
        s = s.slice(0, -2);
    }
    return s.trim();
}

export function isDialCodeOnlyPhone(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    const raw = String(value).trim();
    if (!raw) return true;
    const compact = raw.replace(/[\s-]+/g, '');
    if (!compact) return true;
    if (!compact.startsWith('+')) return false;
    const remainder = compact.slice(1);
    if (!remainder) return true;
    if (!/^\d+$/.test(remainder)) return false;
    return VALID_CALLING_CODES.has(remainder);
}

export function cleanPhoneForDisplay(val: unknown): string {
    const raw = cleanSpreadsheetNumericString(val);
    if (!raw) return '';
    if (isDialCodeOnlyPhone(raw)) return raw;

    const spaceFixed = raw.replace(/^(\+\d{1,4})-/, '$1 ');
    const parsed = parsePhoneNumberFromString(spaceFixed);
    if (parsed?.countryCallingCode && parsed.nationalNumber) {
        return `+${parsed.countryCallingCode} ${parsed.nationalNumber}`;
    }
    return spaceFixed;
}

export function normalizePhoneForStorage(
    val: unknown,
    defaultCountry: CountryCode = 'IN'
): string {
    const raw = cleanSpreadsheetNumericString(val);
    if (!raw || isDialCodeOnlyPhone(raw)) return '';

    const parseInput = raw.startsWith('+') ? raw.replace(/^(\+\d{1,4})-/, '$1 ') : raw;
    const parsed = parsePhoneNumberFromString(
        parseInput,
        parseInput.startsWith('+') ? undefined : defaultCountry
    );
    if (parsed?.countryCallingCode && parsed.nationalNumber) {
        return `+${parsed.countryCallingCode}-${parsed.nationalNumber}`;
    }

    const parts = raw.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].startsWith('+')) {
        return `${parts[0]}-${parts.slice(1).join('')}`;
    }
    return raw.replace(/\s+/g, '');
}

export function normalizePhoneComparisonKey(
    val: unknown,
    defaultCountry: CountryCode = 'IN'
): string {
    const stored = normalizePhoneForStorage(val, defaultCountry);
    if (!stored) return '';
    return stored.replace(/\D/g, '');
}

export function validatePhoneNumber(
    val: unknown,
    label: string = 'Phone Number',
    options?: {
        defaultCountry?: CountryCode;
        required?: boolean;
        info?: MuiTelInputInfo | null;
    }
): string | null {
    const raw = cleanSpreadsheetNumericString(val);
    if (!raw || isDialCodeOnlyPhone(raw)) {
        return options?.required ? `${label} is required` : null;
    }

    const defaultCountry = options?.defaultCountry || 'IN';
    const parseInput = raw.startsWith('+') ? raw.replace(/^(\+\d{1,4})-/, '$1 ') : raw;
    let parsed = parsePhoneNumberFromString(
        parseInput,
        parseInput.startsWith('+') ? undefined : defaultCountry
    );

    if (!parsed && !raw.startsWith('+')) {
        const digitsOnly = raw.replace(/\D/g, '');
        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
            parsed = parsePhoneNumberFromString(`+${digitsOnly}`);
        } else if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
            parsed = parsePhoneNumberFromString(digitsOnly, defaultCountry);
        }
    }

    let isValid = Boolean(parsed && parsed.isValid());
    if (parsed?.countryCallingCode === '91' && parsed.nationalNumber.length !== 10) {
        isValid = false;
    }

    if (isValid) return null;

    const ccMatch = raw.match(/^\+(\d{1,3})/);
    const callingCode = options?.info?.countryCallingCode || parsed?.countryCallingCode || ccMatch?.[1];
    const region = options?.info?.countryCode || parsed?.country;

    if (callingCode === '91' || (!callingCode && region === 'IN')) {
        return `Invalid ${label} for India (+91): please enter a valid 10-digit number.`;
    }
    if (callingCode) {
        const regionSuffix = region ? ` (${region})` : '';
        return `Invalid ${label} for +${callingCode}${regionSuffix}: please enter a valid phone number for that country.`;
    }
    return `Invalid ${label}: please enter a valid phone number with country code.`;
}

export function normalizeIdentityField(fieldname: string, val: unknown): string {
    if (val === undefined || val === null) return '';
    let s = String(val).trim();
    if (!s) return '';

    if (fieldname === 'aadhar_number' || fieldname === 'uan_number' || fieldname === 'esi_no') {
        s = cleanSpreadsheetNumericString(s);
        return s.replace(/[\s-]+/g, '').toUpperCase();
    }
    if (fieldname === 'pan_number' || fieldname === 'pf_number') {
        return s.replace(/\s+/g, '').toUpperCase();
    }
    return s;
}

export function validateIdentityFieldFormat(fieldname: string, val: unknown): string | null {
    const normalized = normalizeIdentityField(fieldname, val);
    if (!normalized) return null;

    switch (fieldname) {
        case 'aadhar_number':
            return /^\d{12}$/.test(normalized)
                ? null
                : 'Aadhar Number must be a valid 12-digit number.';
        case 'pan_number':
            return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalized)
                ? null
                : 'PAN Number must follow the valid 10-character format (e.g., ABCDE1234F).';
        case 'uan_number':
            return /^\d{12}$/.test(normalized)
                ? null
                : 'UAN Number must be a valid 12-digit number.';
        case 'esi_no':
            return /^\d{10,17}$/.test(normalized)
                ? null
                : 'ESI No must be a valid 10 to 17-digit number.';
        default:
            return null;
    }
}
