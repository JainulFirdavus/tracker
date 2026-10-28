import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { IconButton } from './IconButton';
import { eventDraft, serializeEvent } from '../lib/events';
import { request } from '../lib/api';

const leadTimes = [0, 5, 10, 15, 30, 60, 1440];

export function EventEditor({ entry, selectedDate, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(() => eventDraft(entry, selectedDate));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef(null);
  const form = useRef(null);
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  const patch = value => setDraft(current => ({ ...current, ...value }));
  async function action(callback) {
    if (busy) return;
    setBusy(true);
    setMessage('Working...');
    try { await callback(); }
    catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  }
  return <dialog id="event-dialog" ref={dialog} aria-labelledby="event-dialog-title" onCancel={event => { if (busy) event.preventDefault(); }} onClose={onClose}>
    <form id="event-form" ref={form} onSubmit={event => { event.preventDefault(); action(() => onSave(serializeEvent(draft))); }}>
      <fieldset className="form-reset" disabled={busy}>
        <div className="event-dialog-heading"><h2 id="event-dialog-title">{entry ? 'Edit reminder' : 'New reminder'}</h2><IconButton icon={X} label="Close reminder editor" onClick={onClose} /></div>
        <div className="fields two">
          <label className="wide">Title<input id="event-title" maxLength={80} required autoComplete="off" autoFocus value={draft.title} onChange={event => patch({ title: event.target.value })} /></label>
          <label className="wide">Type<select id="event-type" value={draft.type} onChange={event => patch({ type: event.target.value })}><option value="task">Task</option><option value="meeting">Meeting</option></select></label>
          <label>Start<input id="event-start" type="datetime-local" required value={draft.start} onChange={event => patch({ start: event.target.value })} /></label>
          <label>End<input id="event-end" type="datetime-local" required value={draft.end} onChange={event => patch({ end: event.target.value })} /></label>
          <label className="wide">Notify me<select id="event-lead" value={draft.remindMinutes} onChange={event => patch({ remindMinutes: Number(event.target.value) })}>{[...new Set([...leadTimes, draft.remindMinutes])].sort((first, second) => first - second).map(minutes => <option value={minutes} key={minutes}>{minutes === 0 ? 'At the start time' : `${minutes} minutes before`}</option>)}</select></label>
          <label className="wide">Notes<textarea id="event-notes" rows={3} maxLength={240} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></label>
          <label className="planner-check wide"><input id="event-completed" type="checkbox" checked={draft.completed} onChange={event => patch({ completed: event.target.checked })} />Completed</label>
        </div>
        <p id="event-status" role="status" aria-live="polite">{message}</p>
        <div className="event-dialog-actions">
          {entry && <IconButton icon={Trash2} label="Delete reminder" className="danger" onClick={() => { if (window.confirm('Delete this reminder?')) action(() => onDelete(entry.id)); }} />}
          <button id="event-test" className="secondary-button command-button" type="button" onClick={() => {
            if (!form.current.reportValidity()) return;
            action(async () => { await request('/api/events/test', { method: 'POST', body: JSON.stringify(serializeEvent(draft)) }); setMessage('Test notification requested.'); });
          }}><Bell size={16} aria-hidden="true" />Test notification</button>
          <button id="event-save" className="planner-primary" type="submit"><Check size={16} aria-hidden="true" />Save reminder</button>
        </div>
      </fieldset>
    </form>
  </dialog>;
}

