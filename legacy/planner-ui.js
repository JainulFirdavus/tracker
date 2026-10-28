(() => {
  const dialog = document.getElementById('event-dialog');
  const editor = document.getElementById('event-form');
  const status = document.getElementById('planner-status');
  const editorStatus = document.getElementById('event-status');
  let events = [];
  let calendar;
  let editingId;
  let busy = false;
  let loaded = false;

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function localInput(value) {
    const date = new Date(value);
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function notify(text, error = false) {
    status.textContent = text;
    status.classList.toggle('planner-error', error);
  }

  function renderEvents() {
    if (!calendar) return;
    const filter = document.getElementById('planner-filter').value;
    const completed = document.getElementById('planner-completed').checked;
    const visible = events.filter(event => (filter === 'all' || event.type === filter) && (completed || !event.completed));
    for (const source of calendar.getEventSources()) source.remove();
    calendar.addEventSource(visible.map(event => ({
      id: event.id, title: event.title, start: event.start, end: event.end,
      classNames: [event.type === 'meeting' ? 'planner-meeting' : 'planner-task', ...(event.completed ? ['planner-done'] : [])],
      backgroundColor: event.type === 'meeting' ? '#316d94' : '#36765c',
      borderColor: event.type === 'meeting' ? '#316d94' : '#36765c',
      extendedProps: { type: event.type, notes: event.notes, completed: event.completed }
    })));
    document.getElementById('planner-count').textContent = `${visible.length} ${visible.length === 1 ? 'reminder' : 'reminders'}`;
  }

  function ensureCalendar() {
    if (calendar || document.getElementById('page-planner').hidden) return;
    if (!window.FullCalendar) throw new Error('Calendar could not load. Refresh this page.');
    calendar = new window.FullCalendar.Calendar(document.getElementById('planner-calendar'), {
      initialView: 'dayGridMonth', headerToolbar: false, height: 'auto', fixedWeekCount: false,
      dayMaxEvents: 3, firstDay: 1, nowIndicator: true, navLinks: false,
      eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
      noEventsContent: 'No reminders this month',
      datesSet: info => { document.getElementById('planner-period-title').textContent = info.view.title; },
      dateClick: info => openEditor(null, info.date),
      eventClick: info => {
        info.jsEvent.preventDefault();
        openEditor(events.find(event => event.id === info.event.id));
      },
      eventDidMount: info => {
        info.el.title = `${info.event.extendedProps.type === 'meeting' ? 'Meeting' : 'Task'}: ${info.event.title}`;
        info.el.setAttribute('tabindex', '0');
        info.el.setAttribute('role', 'button');
        info.el.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openEditor(events.find(item => item.id === info.event.id));
          }
        });
      }
    });
    calendar.render();
    renderEvents();
  }

  async function loadEvents() {
    if (busy || dialog.open) return;
    try {
      events = await request('/api/events');
      loaded = true;
      document.getElementById('new-event').disabled = false;
      document.getElementById('planner-retry').hidden = true;
      ensureCalendar();
      renderEvents();
      notify('');
    } catch (error) {
      notify(`Could not load reminders: ${error.message}`, true);
      document.getElementById('planner-retry').hidden = false;
    }
  }

  function openEditor(event, selectedDate) {
    if (!loaded || busy) return;
    editor.reset();
    editingId = event?.id ?? null;
    const start = event ? new Date(event.start) : selectedDate ? new Date(selectedDate) : new Date();
    if (!event) {
      if (selectedDate) start.setHours(9, 0, 0, 0);
      else start.setMinutes(start.getMinutes() + 30, 0, 0);
    }
    document.getElementById('event-dialog-title').textContent = event ? 'Edit reminder' : 'New reminder';
    document.getElementById('event-title').value = event?.title ?? '';
    document.getElementById('event-type').value = event?.type ?? 'task';
    document.getElementById('event-start').value = localInput(start);
    document.getElementById('event-end').value = localInput(event?.end ?? start.getTime() + 1800000);
    document.getElementById('event-lead').value = String(event?.remindMinutes ?? 10);
    document.getElementById('event-notes').value = event?.notes ?? '';
    document.getElementById('event-completed').checked = event?.completed ?? false;
    document.getElementById('event-delete').hidden = !event;
    editorStatus.textContent = '';
    dialog.showModal();
    document.getElementById('event-title').focus();
  }

  function readEvent() {
    const start = new Date(document.getElementById('event-start').value);
    const end = new Date(document.getElementById('event-end').value);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      throw new Error('End time must be after start time.');
    }
    if (!document.getElementById('event-title').value.trim()) throw new Error('Enter a reminder title.');
    return {
      id: editingId ?? crypto.randomUUID(), type: document.getElementById('event-type').value,
      title: document.getElementById('event-title').value.trim(), notes: document.getElementById('event-notes').value,
      start: start.toISOString(), end: end.toISOString(), remindMinutes: Number(document.getElementById('event-lead').value),
      completed: document.getElementById('event-completed').checked,
      notifiedAt: events.find(event => event.id === editingId)?.notifiedAt ?? null
    };
  }

  async function editorAction(action) {
    if (busy) return;
    busy = true;
    const controls = Array.from(editor.querySelectorAll('button, input, select, textarea'));
    controls.forEach(control => { control.disabled = true; });
    editorStatus.textContent = 'Working...';
    try {
      await action();
    } catch (error) {
      editorStatus.textContent = error.message;
    } finally {
      busy = false;
      controls.forEach(control => { control.disabled = false; });
    }
  }

  async function saveEvents(next) {
    events = await request('/api/events', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next)
    });
    renderEvents();
    dialog.close();
    notify('Reminder changes saved.');
  }

  editor.addEventListener('submit', event => {
    event.preventDefault();
    if (!editor.reportValidity()) return;
    editorAction(async () => {
      const item = readEvent();
      await saveEvents(editingId ? events.map(event => event.id === editingId ? item : event) : [...events, item]);
    });
  });
  document.getElementById('event-delete').addEventListener('click', () => {
    if (!editingId || !window.confirm('Delete this reminder?')) return;
    editorAction(() => saveEvents(events.filter(event => event.id !== editingId)));
  });
  document.getElementById('event-test').addEventListener('click', () => {
    if (!editor.reportValidity()) return;
    editorAction(async () => {
      await request('/api/events/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(readEvent())
      });
      editorStatus.textContent = 'Test notification requested.';
    });
  });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  document.getElementById('event-close').addEventListener('click', () => dialog.close());
  document.getElementById('new-event').addEventListener('click', () => openEditor());
  document.getElementById('planner-retry').addEventListener('click', loadEvents);
  document.getElementById('planner-filter').addEventListener('change', renderEvents);
  document.getElementById('planner-completed').addEventListener('change', renderEvents);
  document.getElementById('planner-prev').addEventListener('click', () => calendar?.prev());
  document.getElementById('planner-next').addEventListener('click', () => calendar?.next());
  document.getElementById('planner-today').addEventListener('click', () => calendar?.today());
  for (const button of document.querySelectorAll('[data-planner-view]')) {
    button.addEventListener('click', () => {
      if (!calendar) return;
      calendar.changeView(button.dataset.plannerView);
      for (const item of document.querySelectorAll('[data-planner-view]')) {
        item.setAttribute('aria-pressed', String(item === button));
      }
    });
  }
  window.addEventListener('pagechange', event => {
    if (event.detail === 'planner') {
      loadEvents();
      if (calendar) requestAnimationFrame(() => calendar.updateSize());
    }
  });
  icons();
  loadEvents();
  setInterval(() => {
    if (!document.getElementById('page-planner').hidden) loadEvents();
  }, 30000);
})();