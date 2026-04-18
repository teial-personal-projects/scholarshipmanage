/**
 * Date utilities that avoid timezone-related off-by-one issues.
 *
 * Many of our dates are stored as DATE (YYYY-MM-DD). Creating `new Date('YYYY-MM-DD')`
 * and then calling `toLocaleDateString()` can display the *previous* day in negative
 * timezones. These helpers treat date-only strings as local calendar dates.
 */

export function toDateOnlyString(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  return dateString.split('T')[0] || null;
}

export function parseDateOnlyToLocalDate(dateString: string | null | undefined): Date | null {
  const dateOnly = toDateOnlyString(dateString);
  if (!dateOnly) return null;

  const [y, m, d] = dateOnly.split('-').map((v) => Number(v));
  if (!y || !m || !d) return null;

  // Local midnight for that calendar day
  return new Date(y, m - 1, d);
}

export function formatDateNoTimezone(dateString: string | null | undefined): string {
  const dateOnly = toDateOnlyString(dateString);
  if (!dateOnly) return 'N/A';

  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day) return dateOnly;

  return `${month}/${day}/${year}`;
}

/**
 * Shared date formatter used across the web app.
 * This is intentionally timezone-safe for DATE (YYYY-MM-DD) strings.
 *
 * Prefer this over `new Date(dateString).toLocaleDateString()` to avoid off-by-one issues.
 */
export const formatDate = (dateString: string | null | undefined): string => {
  return formatDateNoTimezone(dateString);
};

/**
 * Formats a timestamp into a short relative string ("Just now", "5m ago", "2h ago", "3d ago"),
 * then falls back to a short US date for older timestamps.
 */
export function formatRelativeTimestamp(
  date: Date | string | null | undefined,
  emptyValue: string = '-'
): string {
  if (!date) return emptyValue;

  const updatedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(updatedDate.getTime())) return emptyValue;

  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return updatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: updatedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

