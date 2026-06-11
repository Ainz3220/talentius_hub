import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const TZ = 'Indian/Mauritius';

function tzParts(d) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d)
      .filter(x => x.type !== 'literal')
      .map(x => [x.type, x.value])
  );
}

export function cn(...inputs) { return twMerge(clsx(inputs)); }

export function formatDate(date, fmt = 'DD MMM YYYY') {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d)) return '—';
  const { year, month, day } = tzParts(d);
  const mon = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'short' }).format(d);
  switch (fmt) {
    case 'DD MMM YYYY': return `${day} ${mon} ${year}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    default: return `${day} ${mon} ${year}`;
  }
}

export function daysUntil(date) {
  if (!date) return null;
  const target = new Date(date);
  const { year, month, day } = tzParts(new Date());
  // Midnight at the start of today in Mauritius (UTC+4)
  const todayMidnight = new Date(`${year}-${month}-${day}T00:00:00+04:00`);
  return Math.ceil((target - todayMidnight) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(date) {
  const days = daysUntil(date);
  if (days === null) return 'unknown';
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function paginate(data, page, limit) {
  const start = (page - 1) * limit;
  return data.slice(start, start + limit);
}
