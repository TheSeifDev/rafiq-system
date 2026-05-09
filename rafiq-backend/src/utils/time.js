/**
 * utils/time.js - Time utilities for RAFIQ backend
 */

export function getCairoTime() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' })
    .replace(' ', 'T') + '+02:00';
}

export function toISOWithTZ(date = new Date()) {
  return date.toISOString();
}

export function parseISOTime(isoString) {
  return new Date(isoString);
}

export function isToday(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}