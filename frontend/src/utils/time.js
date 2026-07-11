export function formatLastSeen(date) {
  if (!date) return 'Offline';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Last seen just now';
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Last seen yesterday';
  if (diffDay < 7) return `Last seen ${diffDay}d ago`;

  return `Last seen ${new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// ⚠️ Always force 12-hour AM/PM here - toLocaleTimeString's default hour12
// behavior depends on the device's locale/regional settings, so on a device
// set to 24-hour time this would silently show "14:30" instead of "2:30 PM".
// hour12: true makes it consistent everywhere regardless of device settings.
export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

// WhatsApp-style date divider shown between messages sent on different days:
// "Today", "Yesterday", the weekday name if within the last week, otherwise
// a full date (with year only if it's not the current year).
export function formatDateSeparator(date) {
  const d = new Date(date);
  const now = new Date();
  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });

  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// True if two dates fall on different calendar days - used to decide when
// to insert a new date separator while walking through a message list.
export function isDifferentDay(dateA, dateB) {
  if (!dateA || !dateB) return true;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate();
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
