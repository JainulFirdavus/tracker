import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { request } from '../lib/api';

const themes = [
  ['glass', 'Forest glass', 'Soft & translucent'], ['daylight', 'Daylight', 'Fresh & minimal'],
  ['midnight', 'Midnight', 'Quiet & focused'], ['sunset', 'Sunset', 'Warm & mellow']
];

export function NotificationPreview({ draft, reminders = draft.reminders, update, saving }) {
  const [selected, setSelected] = useState(reminders[0]?.id ?? '');
  useEffect(() => {
    if (!reminders.some(item => item.id === selected)) {
      setSelected(reminders[0]?.id ?? '');
    }
  }, [reminders, selected]);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const reminder = reminders.find(item => item.id === selected) ?? reminders[0];
  if (!reminder) {
    return <section className="panel appearance notification-appearance">
      <p className="kicker">NOTIFICATION STYLE</p>
      <h2>A little personality</h2>
      <p className="muted" role="status">No activity reminders are available to preview.</p>
    </section>;
  }
  const params = new URLSearchParams({ ...reminder, icon: `/${reminder.icon}`, theme: draft.theme,
    opacity: String(draft.notificationOpacity), preview: '1', duration: String(draft.notificationDurationSeconds) });

  async function test() {
    const form = document.getElementById('settings-form');
    if (testing || saving || (form && !form.reportValidity())) return;
    setTesting(true);
    setMessage('Requesting test notification...');
    try {
      await request('/api/notifications/test', { method: 'POST', body: JSON.stringify({ settings: draft, reminderId: reminder.id }) });
      setMessage('Test notification requested.');
    } catch (failure) { setMessage(failure.message); }
    finally { setTesting(false); }
  }

  return <section className="panel appearance notification-appearance">
    <p className="kicker">NOTIFICATION STYLE</p><h2>A little personality</h2><p className="muted">Four looks. The same gentle nudge.</p>
    <fieldset className="themes"><legend className="sr-only">Notification theme</legend>{themes.map(([value, label, description]) =>
      <label className="theme-option" key={value}><input type="radio" name="theme" value={value} checked={draft.theme === value} onChange={() => update({ theme: value })} /><span className={`swatch ${value}`} /><strong>{label}</strong><small>{description}</small></label>
    )}</fieldset>
    <div className="fields two">
      <label>Notification size<select id="notification-size" value={draft.notificationSize} onChange={event => update({ notificationSize: event.target.value })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
      <label>Background opacity <output id="opacity-value" htmlFor="notification-opacity">{draft.notificationOpacity}%</output><input id="notification-opacity" type="range" min={40} max={100} step={1} value={draft.notificationOpacity} onChange={event => update({ notificationOpacity: Number(event.target.value) })} /></label>
    </div>
    <div className="preview-heading"><label htmlFor="preview-reminder">LIVE PREVIEW</label><button id="test-notification" type="button" className="secondary-button command-button" disabled={testing || saving} onClick={test}><Bell size={14} aria-hidden="true" />Show notification</button></div>
    <p id="test-notification-status" role="status" aria-live="polite">{message}</p>
    <select id="preview-reminder" aria-label="Preview reminder" value={selected} onChange={event => setSelected(event.target.value)}>
      {reminders.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select>
    <div className="preview-stage">
      <iframe id="preview" title="Notification live preview" sandbox="allow-scripts" src={`/notification.html?${params}`} style={{ width: { small: 388, medium: 456, large: 548 }[draft.notificationSize] }} /></div>
  </section>;
}
