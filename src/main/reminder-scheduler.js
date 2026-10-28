class ReminderScheduler {
  // Rules share an activity sample, never a timer balance. Missing resetAfterIdleSeconds
  // preserves accumulated time through breaks; successful delivery starts a new cycle.
  constructor(config, now) {
    if (!Number.isFinite(config.idleAfterSeconds) || config.idleAfterSeconds <= 0 ||
        !Array.isArray(config.reminders) || config.reminders.length === 0) {
      throw new Error('Configure idleAfterSeconds and at least one reminder.');
    }
    const ids = new Set();
    this.states = config.reminders.map((reminder) => {
      if (!reminder.id || ids.has(reminder.id) ||
          !Number.isFinite(reminder.intervalMinutes) || reminder.intervalMinutes <= 0 ||
          (reminder.resetAfterIdleSeconds !== undefined &&
            (!Number.isFinite(reminder.resetAfterIdleSeconds) || reminder.resetAfterIdleSeconds <= 0))) {
        throw new Error(`Invalid or duplicate reminder rule: ${reminder.id}`);
      }
      ids.add(reminder.id);
      if (reminder.schedule !== undefined && !['activity', 'daily'].includes(reminder.schedule) ||
          reminder.schedule === 'daily' && (!Array.isArray(reminder.times) || !reminder.times.length ||
            reminder.times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) {
        throw new Error(`Invalid daily schedule: ${reminder.id}`);
      }
      return { reminder, activeMs: 0, pending: false, retryAt: 0, firedSlots: new Set(), day: null };
    });
    this.idleAfterSeconds = config.idleAfterSeconds;
    this.lastTime = now;
    this.available = true;
    this.idleSeconds = 0;
    this.unavailableSince = null;
  }

  update(now, idleSeconds, available = true) {
    const elapsed = Math.max(0, now - this.lastTime);
    const wasAvailable = this.available;
    // Locked/suspended time is a break even when the OS resets its idle counter on wake.
    if (!available && this.unavailableSince === null) this.unavailableSince = now;
    const breakSeconds = Math.max(idleSeconds,
      this.unavailableSince === null ? 0 : (now - this.unavailableSince) / 1000);
    this.available = available;
    this.idleSeconds = idleSeconds;
    this.lastTime = now;

    for (const state of this.states) {
      if (state.reminder.enabled === false) continue;
      if (state.reminder.schedule === 'daily') {
        const date = new Date(now);
        const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        if (state.day !== day) {
          state.day = day;
          state.firedSlots.clear();
          state.pending = false;
          state.retryAt = 0;
        }
        if (!available) state.pending = false;
        if (available && elapsed > 0 && state.reminder.times.includes(time) && !state.firedSlots.has(time)) {
          state.firedSlots.add(time);
          state.pending = true;
          state.retryAt = 0;
        }
        continue;
      }
      const resetAfter = state.reminder.resetAfterIdleSeconds;
      if (resetAfter !== undefined && breakSeconds >= resetAfter) {
        state.activeMs = 0;
        state.pending = false;
        state.retryAt = 0;
        continue;
      }
      if (!available || !wasAvailable || state.pending) continue;

      // Count only the part of this sample before the idle threshold was crossed.
      const threshold = Math.min(this.idleAfterSeconds, resetAfter ?? Infinity);
      const idleMs = Math.min(elapsed, Math.max(0, idleSeconds - threshold) * 1000);
      state.activeMs += elapsed - idleMs;
      if (state.activeMs >= state.reminder.intervalMinutes * 60000) state.pending = true;
    }
    if (available) this.unavailableSince = null;
  }

  canNotify(reminder) {
    const threshold = Math.min(this.idleAfterSeconds, reminder.resetAfterIdleSeconds ?? Infinity);
    return reminder.enabled !== false && this.available &&
      (reminder.schedule === 'daily' || this.idleSeconds < threshold);
  }

  configure(config, now) {
    const next = new ReminderScheduler(config, now);
    for (const state of next.states) {
      const previous = this.states.find(item => item.reminder.id === state.reminder.id);
      if (previous) {
        state.firedSlots = previous.firedSlots;
        state.day = previous.day;
      }
      if (previous &&
          previous.reminder.schedule === state.reminder.schedule &&
          JSON.stringify(previous.reminder.times) === JSON.stringify(state.reminder.times) &&
          previous.reminder.enabled === state.reminder.enabled &&
          previous.reminder.intervalMinutes === state.reminder.intervalMinutes &&
          previous.reminder.resetAfterIdleSeconds === state.reminder.resetAfterIdleSeconds &&
          this.idleAfterSeconds === config.idleAfterSeconds) {
        state.activeMs = previous.activeMs;
        state.pending = previous.pending;
        state.retryAt = previous.retryAt;
      }
    }
    this.states = next.states;
    this.idleAfterSeconds = next.idleAfterSeconds;
    this.lastTime = now;
  }

  dueReminders() {
    return this.states
      .filter(state => state.pending && state.retryAt <= this.lastTime && this.canNotify(state.reminder))
      .map(state => state.reminder);
  }

  snapshot() {
    return {
      version: 1,
      config: { idleAfterSeconds: this.idleAfterSeconds, reminders: this.states.map(state => state.reminder) },
      states: this.states.map(state => ({
        id: state.reminder.id,
        activeMs: state.activeMs,
        pending: state.pending,
        retryAt: state.retryAt,
        firedSlots: [...state.firedSlots],
        day: state.day
      }))
    };
  }

  restore(snapshot) {
    if (snapshot?.version !== 1 || !Array.isArray(snapshot.states)) throw new Error('Invalid activity file.');
    const previous = new ReminderScheduler(snapshot.config, this.lastTime);
    if (snapshot.states.length !== previous.states.length ||
        new Set(snapshot.states.map(state => state.id)).size !== snapshot.states.length) {
      throw new Error('Invalid activity rules.');
    }
    for (const state of previous.states) {
      const saved = snapshot.states.find(item => item.id === state.reminder.id);
      if (!saved || !Number.isFinite(saved.activeMs) || saved.activeMs < 0 ||
          typeof saved.pending !== 'boolean' || !Number.isFinite(saved.retryAt) || saved.retryAt < 0 ||
          !Array.isArray(saved.firedSlots) || saved.firedSlots.some(time => typeof time !== 'string') ||
          (saved.day !== null && typeof saved.day !== 'string')) {
        throw new Error('Invalid activity progress.');
      }
      state.activeMs = saved.activeMs;
      state.pending = saved.pending;
      state.retryAt = saved.retryAt;
      state.firedSlots = new Set(saved.firedSlots);
      state.day = saved.day;
    }
    previous.configure({
      idleAfterSeconds: this.idleAfterSeconds,
      reminders: this.states.map(state => state.reminder)
    }, this.lastTime);
    this.states = previous.states;
  }

  shown(id) {
    const state = this.states.find(state => state.reminder.id === id);
    state.activeMs = 0;
    state.pending = false;
    state.retryAt = 0;
  }

  failed(id) {
    const state = this.states.find(state => state.reminder.id === id);
    state.pending = true;
    state.retryAt = this.lastTime + 60000;
  }
}

module.exports = { ReminderScheduler };
