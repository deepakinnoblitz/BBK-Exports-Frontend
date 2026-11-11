import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

// ----------------------------------------------------------------------

/**
 * @Docs
 * https://day.js.org/docs/en/display/format
 */

/**
 * Default timezones
 * https://day.js.org/docs/en/timezone/set-default-timezone#docsNav
 *
 */

/**
 * UTC
 * https://day.js.org/docs/en/plugin/utc
 * @install
 * import utc from 'dayjs/plugin/utc';
 * dayjs.extend(utc);
 * @usage
 * dayjs().utc().format()
 *
 */

dayjs.extend(duration);
dayjs.extend(relativeTime);

// ----------------------------------------------------------------------

export type DatePickerFormat = Dayjs | Date | string | number | null | undefined;

export const formatPatterns = {
  dateTime: 'DD MMM YYYY h:mm a', // 17 Apr 2022 12:00 am
  date: 'DD MMM YYYY', // 17 Apr 2022
  time: 'h:mm a', // 12:00 am
  split: {
    dateTime: 'DD/MM/YYYY h:mm a', // 17/04/2022 12:00 am
    date: 'DD/MM/YYYY', // 17/04/2022
  },
  paramCase: {
    dateTime: 'DD-MM-YYYY h:mm a', // 17-04-2022 12:00 am
    date: 'DD-MM-YYYY', // 17-04-2022
  },
};

const isValidDate = (date: DatePickerFormat) =>
  date !== null && date !== undefined && dayjs(date).isValid();

// ----------------------------------------------------------------------

/**
 * @output 17 Apr 2022 12:00 am
 */
export function fDateTime(date: DatePickerFormat, template?: string): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  return dayjs(date).format(template ?? formatPatterns.dateTime);
}

// ----------------------------------------------------------------------

/**
 * @output 17 Apr 2022
 */
export function fDate(date: DatePickerFormat, template?: string): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  return dayjs(date).format(template ?? formatPatterns.date);
}

// ----------------------------------------------------------------------

/**
 * @output 12:00 am
 */
export function fTime(date: DatePickerFormat, template?: string): string {
  if (!isValidDate(date)) {
    // Attempt to parse if it's a raw time string like "HH:mm:ss"
    if (typeof date === 'string' && date.includes(':')) {
      const d = dayjs(`2000-01-01 ${date}`);
      if (d.isValid()) {
        return d.format(template ?? formatPatterns.time);
      }
    }
    return 'Invalid time';
  }

  return dayjs(date).format(template ?? formatPatterns.time);
}

// ----------------------------------------------------------------------

/**
 * @output a few seconds, 2 years
 */
export function fToNow(date: DatePickerFormat): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  return dayjs(date).toNow(true);
}

// ----------------------------------------------------------------------

/**
 * @output 3 m, 2 h, 1 w, 1 M, 1 y
 */
export function fTimeDist(date: DatePickerFormat): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  const now = dayjs();
  const d = dayjs(date);

  const diffInSeconds = now.diff(d, 'second');
  if (diffInSeconds < 60) return `now`;

  const diffInMinutes = now.diff(d, 'minute');
  if (diffInMinutes < 60) return `${diffInMinutes} m`;

  const diffInHours = now.diff(d, 'hour');
  if (diffInHours < 24) return `${diffInHours} h`;

  const diffInDays = now.diff(d, 'day');
  if (diffInDays < 7) return `${diffInDays} d`;

  const diffInWeeks = now.diff(d, 'week');
  if (diffInWeeks < 4) return `${diffInWeeks} w`;

  const diffInMonths = now.diff(d, 'month');
  if (diffInMonths < 1) return `${diffInWeeks} w`;
  if (diffInMonths < 12) return `${diffInMonths} M`;

  const diffInYears = now.diff(d, 'year');
  return `${diffInYears} y`;
}
// ----------------------------------------------------------------------

/**
 * @output Today, Yesterday, 17 Apr 2022
 */
export function fDateSeparator(date: DatePickerFormat): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  const d = dayjs(date);
  const now = dayjs();

  if (d.isSame(now, 'day')) {
    return 'Today';
  }
  if (d.isSame(now.subtract(1, 'day'), 'day')) {
    return 'Yesterday';
  }

  return fDate(date);
}

// ----------------------------------------------------------------------

/**
 * @output 12:00 am (if today), 17/04/2022 (otherwise)
 */
export function fToChatTime(date: DatePickerFormat): string {
  if (!isValidDate(date)) {
    return 'Invalid date';
  }

  const d = dayjs(date);
  const now = dayjs();

  if (d.isSame(now, 'day')) {
    return d.format('h:mm A');
  }

  return d.format(formatPatterns.split.date);
}

// ----------------------------------------------------------------------

/**
 * @output 1 hr 20 mins 30 secs
 */
export function fDecimalHours(decimalHours: number): string {
  if (!decimalHours) return '0 secs';

  const totalSeconds = Math.round(decimalHours * 3600);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs !== 1 ? 's' : ''}`);

  return parts.join(' ');
}

// ----------------------------------------------------------------------

/**
 * @output 02:30 -> 2.5
 */
export function hhmmToFloat(hhmm: string): number {
  if (!hhmm) return 0;
  const parts = hhmm.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
}

/**
 * @output 2.5 -> 02:30
 */
export function floatToHHMM(decimal: number): string {
  if (!decimal) return '00:00';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
/**
 * @output 2.5 -> 2 hrs 30 Mins
 */
export function formatDurationDescriptive(decimal: number): string {
  if (!decimal) return '0 hrs 0 Mins';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  const hLabel = hours === 1 ? 'hr' : 'hrs';
  return `${hours} ${hLabel} ${minutes} Mins`;
}

/**
 * Parse a Frappe Time/duration string ("01:00:00", "1:30") into whole minutes.
 */
export function parseShiftDurationMinutes(timeStr?: string | null): number {
  if (!timeStr || timeStr === '00:00' || timeStr === '00:00:00') return 0;
  const parts = String(timeStr).trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Format total whole minutes into "H:MM" (e.g. 60 -> "1:00").
 */
export function formatMinutesAsHHMM(totalMinutes: number): string {
  const safeMins = Math.max(0, Math.floor(totalMinutes || 0));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Compute elapsed whole minutes between inTime and outTime (supporting overnight shifts).
 */
export function computeAttendanceElapsedMinutes(inTime?: string | null, outTime?: string | null): number {
  if (!inTime || !outTime || inTime === '00:00:00' || outTime === '00:00:00') return 0;
  const start = dayjs(`2000-01-01 ${inTime}`);
  let end = dayjs(`2000-01-01 ${outTime}`);
  if (!start.isValid() || !end.isValid()) return 0;
  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }
  return Math.max(0, end.diff(start, 'minute'));
}
