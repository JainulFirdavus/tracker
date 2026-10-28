




export function localDateTime(value) {
  const date = new Date(value);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function eventDraft(event, selectedDate) {
  if (event) return { ...event, start: localDateTime(event.start), end: localDateTime(event.end) };
  const start = selectedDate ? new Date(selectedDate) : new Date();
  if (selectedDate) start.setHours(9, 0, 0, 0);
  else start.setMinutes(start.getMinutes() + 30, 0, 0);
  return { id: crypto.randomUUID(), type: 'task', title: '', notes: '', start: localDateTime(start),
    end: localDateTime(start.getTime() + 1800000), remindMinutes: 10, completed: false, notifiedAt: null };
}

export function serializeEvent(draft) {
  const start = new Date(draft.start);
  const end = new Date(draft.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error('End time must be after start time.');
  }
  if (!draft.title.trim()) throw new Error('Enter a reminder title.');
  return { ...draft, title: draft.title.trim(), start: start.toISOString(), end: end.toISOString() };
}