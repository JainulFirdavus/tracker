function validateEvents(input) {
  if (!Array.isArray(input) || input.length > 200) throw new Error('Keep at most 200 tasks and meetings.');
  const ids = new Set();
  return input.map(event => {
    if (!event || typeof event.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(event.id) || ids.has(event.id)) {
      throw new Error('Tasks and meetings need unique IDs.');
    }
    ids.add(event.id);
    if (!['task', 'meeting'].includes(event.type)) throw new Error('Choose task or meeting.');
    if (typeof event.title !== 'string' || !event.title.trim() || event.title.length > 80) {
      throw new Error('Enter a title of at most 80 characters.');
    }
    if (typeof event.notes !== 'string' || event.notes.length > 240) throw new Error('Notes must be at most 240 characters.');
    const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
    if (!date(event.start) || !date(event.end) || Date.parse(event.end) <= Date.parse(event.start)) {
      throw new Error('Choose valid start and end times, with the end after the start.');
    }
    if (!Number.isInteger(event.remindMinutes) || event.remindMinutes < 0 || event.remindMinutes > 10080) {
      throw new Error('Notification lead time must be between 0 and 10080 minutes.');
    }
    if (typeof event.completed !== 'boolean') throw new Error('Completed must be true or false.');
    if (event.notifiedAt !== null && !date(event.notifiedAt)) throw new Error('Invalid notification timestamp.');
    return {
      id: event.id, type: event.type, title: event.title.trim(), notes: event.notes.trim(),
      start: new Date(event.start).toISOString(), end: new Date(event.end).toISOString(),
      remindMinutes: event.remindMinutes, completed: event.completed, notifiedAt: event.notifiedAt
    };
  });
}

class Planner {
  constructor(events = []) {
    this.events = validateEvents(events);
    this.retryAt = new Map();
  }

  configure(events) {
    const next = validateEvents(events);
    for (const event of next) {
      const previous = this.events.find(item => item.id === event.id);
      event.notifiedAt = previous && previous.start === event.start && previous.end === event.end &&
        previous.remindMinutes === event.remindMinutes ? previous.notifiedAt : null;
    }
    this.events = next;
    this.retryAt.clear();
  }

  due(now, available = true) {
    if (!available) return [];
    return this.events.filter(event => !event.completed && !event.notifiedAt &&
      Date.parse(event.start) - event.remindMinutes * 60000 <= now && Date.parse(event.end) + 86400000 > now &&
      (this.retryAt.get(event.id) ?? 0) <= now)
      .sort((first, second) => Date.parse(first.start) - Date.parse(second.start));
  }

  shown(id, now) {
    const event = this.events.find(item => item.id === id);
    if (event) event.notifiedAt = new Date(now).toISOString();
    this.retryAt.delete(id);
  }

  failed(id, now) {
    const event = this.events.find(item => item.id === id);
    if (event) event.notifiedAt = null;
    this.retryAt.set(id, now + 60000);
  }
}

function eventReminder(event) {
  return {
    id: `event-${event.id}`, name: event.type === 'meeting' ? 'Meeting reminder' : 'Task reminder',
    title: event.title,
    message: event.notes || new Date(event.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
    icon: './assets/img/task.png',
    symbol: event.type === 'meeting' ? 'calendar-clock' : 'clipboard-check'
  };
}

module.exports = { Planner, validateEvents, eventReminder };