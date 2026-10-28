import { formatCountdown } from '../lib/api';

export function ReminderCard({ reminder, state, status, unavailable, onChange }) {
  const paused = state?.paused ?? (!status?.available || status.idleSeconds >= 60);
  const remaining = state ? state.remainingSeconds ?? state.targetSeconds - state.activeSeconds : null;
  const countdown = unavailable ? 'Timer unavailable' : !state ? '--:--' : !state.enabled ? 'Disabled'
    : state.pending ? '00:00 - due now' : `${formatCountdown(remaining)}${paused ? ' - paused' : ''}`;
  const progress = state ? Math.min(100, state.activeSeconds / state.targetSeconds * 100) : 0;
  const reset = reminder.resetAfterIdleSeconds !== undefined;
  return <article className="reminder-card" data-id={reminder.id}>
    <div className="reminder-header">
      <div className="reminder-identity"><img className="card-icon" src={`/${reminder.icon}`} alt="" /><div><h3>{reminder.name}</h3><p className="timer-status">{!state ? 'Waiting for tracker...' : !state.enabled ? 'Disabled' : state.pending ? 'Due - waiting for active use / popup slot' : `${Math.floor(state.activeSeconds / 60)} / ${Math.ceil(state.targetSeconds / 60)} active minutes${paused ? ' - paused' : ''}`}</p></div></div>
      <div className="reminder-actions">
        <label className="toggle"><input className="enabled" type="checkbox" checked={reminder.enabled !== false} onChange={event => onChange({ enabled: event.target.checked })} /><span>Enabled</span></label>
        <div className="reminder-timing"><span className="timer-label">Next reminder</span><p className="timer-remaining" role="timer" aria-label={`${reminder.name}: time until next reminder`}>{countdown}</p></div>
      </div>
    </div>
    <div className="activity-track"><div style={{ width: `${progress}%` }} /></div>
    <details><summary>Edit reminder rules &amp; content</summary><div className="fields two">
      <label>Name<input className="name" maxLength={60} required value={reminder.name} onChange={event => onChange({ name: event.target.value })} /></label>
      <label>Active minutes between reminders<input className="interval" type="number" min={1} max={1440} required value={reminder.intervalMinutes} onChange={event => onChange({ intervalMinutes: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
      <label>Reset after an idle break<select className="reset-mode" value={reset ? 'reset' : 'pause'} onChange={event => onChange({ resetAfterIdleSeconds: event.target.value === 'reset' ? 300 : undefined })}><option value="reset">Reset progress after a break</option><option value="pause">Pause only, keep progress</option></select></label>
      <label>Idle seconds to reset<input className="reset" type="number" min={1} max={86400} disabled={!reset} required={reset} value={reminder.resetAfterIdleSeconds ?? 300} onChange={event => onChange({ resetAfterIdleSeconds: event.target.value === '' ? '' : Number(event.target.value) })} /></label>
      <label>Notification title<input className="title" maxLength={80} required value={reminder.title} onChange={event => onChange({ title: event.target.value })} /></label>
      <label>Animated illustration<select className="icon" value={reminder.icon} onChange={event => onChange({ icon: event.target.value })}><option value="assets/eye.gif">Eye break</option><option value="assets/water.gif">Water</option><option value="assets/walk.gif">Movement</option></select></label>
      <label className="wide">Notification message<textarea className="message" maxLength={240} rows={2} required value={reminder.message} onChange={event => onChange({ message: event.target.value })} /></label>
    </div></details>
  </article>;
}