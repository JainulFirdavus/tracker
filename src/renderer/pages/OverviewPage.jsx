
import { useEffect, useState } from 'react';
import { CalendarDays, CircleCheck, FileText, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { request } from '../lib/api';

const formatDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date);
};

export default function OverviewPage({ active, reminders, trackerStatus, trackerError }) {
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('Loading your overview...');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    async function load() {
      const results = await Promise.allSettled([
        request('/api/events', { signal: controller.signal }),
        request('/api/notes', { signal: controller.signal })
      ]);
      if (controller.signal.aborted) return;
      if (results[0].status === 'fulfilled') setEvents(results[0].value);
      if (results[1].status === 'fulfilled') setNotes(results[1].value);
      setLoaded(true);
      const failures = results.filter(result => result.status === 'rejected');
      setMessage(failures.length ? `Some items could not load: ${failures.map(result => result.reason.message).join(' ')}` : 'Your latest items are shown below.');
    }
    load();
    return () => controller.abort();
  }, [active, retry]);

  const enabledReminders = reminders.filter(reminder => reminder.enabled);
  const completedEvents = events.filter(event => event.completed).length;
  const openEvents = events.length - completedEvents;
  const completionRate = events.length ? Math.round(completedEvents / events.length * 100) : 0;
  const routineStates = trackerStatus?.reminders ?? [];
  const trackingLabel = trackerError ? 'Tracker unavailable' : !trackerStatus ? 'Connecting to tracker'
    : trackerStatus.available ? 'Tracking active' : 'Tracking paused';
  return <>
    <div className="planner-heading overview-heading">
      <div><p className="kicker">COMMAND CENTER</p><h1 tabIndex={-1}>Overview</h1><p className="overview-intro">Your reminders, schedule, and notes at a glance.</p></div>
      <div className="overview-shortcuts">
        <Link className="secondary-button command-button" to="/planner"><CalendarDays size={16} aria-hidden="true" />Reminders</Link>
        <Link className="secondary-button command-button" to="/notes"><FileText size={16} aria-hidden="true" />Notes</Link>
      </div>
    </div>
    <div className="overview-status-row"><p className="overview-status" role="status" aria-live="polite">{message}</p><span className={`tracker-indicator${trackerStatus?.available ? ' is-live' : ''}`}><i aria-hidden="true" />{trackingLabel}</span></div>
    {message.startsWith('Some items') && <button className="secondary-button command-button" type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Reload items</button>}
    <div className="overview-summary" aria-label="Key performance indicators">
      <div><span>Active routines</span><strong>{enabledReminders.length}</strong><small>of {reminders.length} configured</small></div>
      <div><span>Open planner items</span><strong>{loaded ? openEvents : '--'}</strong><small>{loaded ? `${completedEvents} completed` : 'Loading schedule'}</small></div>
      <div><span>Planner completion</span><strong>{loaded ? `${completionRate}%` : '--'}</strong><small>{loaded ? `${completedEvents} of ${events.length} complete` : 'Loading schedule'}</small></div>
      <div><span>Notes &amp; documents</span><strong>{loaded ? notes.length : '--'}</strong><small>Saved locally</small></div>
    </div>
    <div className="overview-grid">
      <section className="overview-section" aria-labelledby="overview-routines-heading">
        <div className="overview-section-heading"><h2 id="overview-routines-heading">Live routine progress</h2><Link to="/activity">Manage</Link></div>
        <div className="routine-progress-list">{reminders.map(reminder => {
          const state = routineStates.find(item => item.id === reminder.id);
          const targetSeconds = state?.targetSeconds || reminder.intervalMinutes * 60 || 0;
          const activeSeconds = state?.activeSeconds ?? 0;
          const percent = reminder.enabled && targetSeconds ? Math.min(100, Math.round(activeSeconds / targetSeconds * 100)) : 0;
          const progressLabel = !reminder.enabled ? 'Disabled' : trackerError ? 'Unavailable' : !state ? 'Waiting for tracker' : state.pending ? 'Due' : state.paused ? 'Paused' : `${percent}%`;
          return <div className="routine-progress" key={reminder.id}>
            <div className="routine-progress-heading"><div><strong>{reminder.name}</strong><small>{state ? `${Math.floor(activeSeconds / 60)} of ${Math.ceil(targetSeconds / 60)} active min` : `${reminder.intervalMinutes} min interval`}</small></div><span>{progressLabel}</span></div>
            <div className="routine-progress-track" role="progressbar" aria-label={`${reminder.name} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><div style={{ width: `${percent}%` }} /></div>
          </div>;
        })}</div>
        {!reminders.length && <p className="overview-empty">No reminder routines configured.</p>}
      </section>
      <section className="overview-section" aria-labelledby="overview-schedule-heading">
        <div className="overview-section-heading"><h2 id="overview-schedule-heading">Schedule health</h2><Link to="/planner">Open planner</Link></div>
        <div className="schedule-metric" aria-label={`${completedEvents} completed, ${openEvents} open planner items`}>
          <div className="schedule-meter" role="img" aria-label={`Planner completion ${completionRate} percent`}><span style={{ width: `${completionRate}%` }} /></div>
          <div className="schedule-legend"><span><i className="schedule-complete" />Completed <strong>{loaded ? completedEvents : '--'}</strong></span><span><i className="schedule-open" />Open <strong>{loaded ? openEvents : '--'}</strong></span></div>
        </div>
        <h3 className="overview-subheading">All scheduled items</h3>
        {events.length ? <ul className="overview-list">{events.map(event => <li key={event.id}>
          {event.completed ? <CircleCheck size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />}
          <div><strong>{event.title}</strong><small>{event.type === 'meeting' ? 'Meeting' : 'Task'} · {formatDate(event.start)}</small></div>
          <span className={`overview-state${event.completed ? '' : ' is-on'}`}>{event.completed ? 'Done' : 'Open'}</span>
        </li>)}</ul> : <p className="overview-empty">No scheduled items yet.</p>}
      </section>
      <section className="overview-section overview-notes" aria-labelledby="overview-notes-heading">
        <div className="overview-section-heading"><h2 id="overview-notes-heading">Notes &amp; documents</h2><Link to="/notes">Open notes</Link></div>
        {notes.length ? <ul className="overview-list">{notes.map(note => <li key={note.id}>
          <FileText size={17} aria-hidden="true" />
          <div><strong>{note.title}</strong><small>{note.kind === 'minutes' ? 'Meeting minutes' : note.kind === 'reminder' ? 'Reminder note' : note.kind === 'document' ? 'Document' : 'Note'} · Updated {formatDate(note.updatedAt)}</small></div>
        </li>)}</ul> : <p className="overview-empty">No notes or documents saved yet.</p>}
      </section>
    </div>
  </>;
}
 