import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return '—';
  return format(d, fmt);
}

export function daysUntil(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

export function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function getAvatarColor(name) {
  const colors = ['av-g', 'av-b', 'av-o', 'av-r'];
  let sum = 0;
  for (let i = 0; i < (name?.length || 0); i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getExpiryClass(daysLeft) {
  if (daysLeft === null) return '';
  if (daysLeft <= 0) return 'text-[var(--red)] font-semibold';
  if (daysLeft <= 7) return 'text-[var(--red)] font-semibold';
  if (daysLeft <= 30) return 'text-[var(--accent2)] font-medium';
  return 'text-[var(--text2)]';
}

export function getExpiryLabel(daysLeft) {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft <= 7) return `⚠ ${daysLeft}d left`;
  if (daysLeft <= 30) return `${daysLeft}d left`;
  return '';
}

export function truncate(str, len = 40) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
