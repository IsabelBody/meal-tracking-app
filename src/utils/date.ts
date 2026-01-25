/**
 * Date utility functions for the meal tracking app
 */

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date key
 */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

/**
 * Get yesterday's date key
 */
export function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(yesterday);
}

/**
 * Format date for display (e.g., "Monday, January 25")
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateKey(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date for short display (e.g., "Jan 25")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateKey(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateKey = typeof date === 'string' ? date : formatDateKey(date);
  return dateKey === getTodayKey();
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const dateKey = typeof date === 'string' ? date : formatDateKey(date);
  return dateKey === getYesterdayKey();
}

/**
 * Get relative date label (Today, Yesterday, or formatted date)
 */
export function getRelativeDateLabel(date: Date | string): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDisplayDate(date);
}

/**
 * Get array of date keys for a week
 */
export function getWeekDateKeys(startDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDateKey(date));
  }

  return dates;
}

/**
 * Get ISO timestamp
 */
export function getISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? parseDateKey(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseDateKey(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDateKey(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format ISO timestamp to time string (e.g., "10:30 AM")
 */
export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
