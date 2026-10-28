import { ArrowRight } from 'lucide-react';
import { ReminderCard } from '../components/ReminderCard';
import { NotificationPreview } from '../components/NotificationPreview';

export function ActivityPage({ preferences, tracker }) {
  const { draft, update, save, saving, message, error } = preferences;
  function updateReminder(id, patch) {
    update(current => ({ ...current, reminders: current.reminders.map(item => item.id === id ? { ...item, ...patch } : item) }));
  }
  return <>
    <section className="intro"><p className="kicker">YOUR WORKDAY, A LITTLE LIGHTER</p><h1 tabIndex={-1}>Make room for <span>feeling good.</span></h1><p>Small reminders. Better rhythms. Your personal space to tune both.</p></section>
    <form id="settings-form" onSubmit={event => { event.preventDefault(); save(); }}>
      <fieldset className="form-reset" disabled={saving}>
        <div className="layout"><div className="settings-column">
          <section className="panel"><div className="section-heading"><div><p className="kicker">01 / YOUR RHYTHM</p><h2>Independent reminders</h2></div><span className="pill">Active time, not clock time</span></div>
            <div id="reminders">{draft.reminders.map(reminder => <ReminderCard key={reminder.id} reminder={reminder} state={tracker.status?.reminders.find(state => state.id === reminder.id)} status={tracker.status} unavailable={Boolean(tracker.error)} onChange={patch => updateReminder(reminder.id, patch)} />)}</div>
          </section>
          <section className="panel general"><p className="kicker">02 / THE DETAILS</p><h2>A pace that works for you</h2><div className="fields two">
            <label>Pause after idle seconds<input id="idle" type="number" min={1} max={3600} required value={draft.idleAfterSeconds} onChange={event => update({ idleAfterSeconds: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
            <label>Popup duration in seconds<input id="duration" type="number" min={3} max={120} required value={draft.notificationDurationSeconds} onChange={event => update({ notificationDurationSeconds: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
          </div></section>
        </div>
        <aside>
          <NotificationPreview draft={draft} update={update} saving={saving} />
        <section className="privacy-note"><strong>Just you and your device.</strong>
        <p>No account, no cloud. Inactivity estimates breaks; it cannot detect sitting or drinking.</p>
        </section>
        </aside>
        </div>
      </fieldset>
      <footer className="save-bar"><div id="save-status" className={error ? 'error' : ''} role="status" aria-live="polite">{error || message}</div><button id="save" type="submit" disabled={saving}>Save changes<ArrowRight size={16} aria-hidden="true" /></button></footer>
    </form>
  </>;
}

