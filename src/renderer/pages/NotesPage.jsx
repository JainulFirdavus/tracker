
import { useEffect, useRef, useState } from 'react';
import { Download, FileCode2, FileText, NotebookPen, Plus, Save, Search, Trash2, Upload, Eye, Pencil, Columns2, Braces, Bell, ExternalLink, RefreshCw } from 'lucide-react';
import { IconButton } from '../components/IconButton';
import { DocumentPreview } from '../components/DocumentPreview';
import { createNote, formatJson } from '../lib/documents';
import { request } from '../lib/api';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading notes...');
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('split');
  const [retry, setRetry] = useState(0);
  const [reminders, setReminders] = useState([]);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const fileInput = useRef(null);

  async function loadReminders(signal) {
    try {
      const next = await request('/api/events', { signal });
      setReminders(next); setRemindersLoaded(true); setReminderError('');
    } catch (error) {
      if (error.name !== 'AbortError') setReminderError(error.message);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    loadReminders(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    request('/api/notes', { signal: controller.signal }).then(next => {
      setNotes(next); setDraft(next[0] ?? null); setLoaded(true); setFailed(false); setMessage('');
    }).catch(error => { if (error.name !== 'AbortError') { setMessage(error.message); setFailed(true); } });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = changes => { setDraft(current => ({ ...current, ...changes })); setDirty(true); setMessage('Unsaved changes'); setFailed(false); };
  const mayDiscard = () => !dirty || window.confirm('Discard unsaved note changes?');
  function select(note) {
    if (busy || !mayDiscard()) return;
    setDraft(note); setDirty(false); setMessage(''); setFailed(false);
  }
  function newNote() {
    if (busy || !mayDiscard()) return;
    setDraft(createNote()); setDirty(true); setMessage('Unsaved changes'); setFailed(false);
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true); setFailed(false);
    try {
      if (!draft.title.trim()) throw new Error('Enter a note title.');
      if (draft.format === 'json') formatJson(draft.content);
      const note = { ...draft, updatedAt: new Date().toISOString() };
      const next = notes.some(item => item.id === note.id) ? notes.map(item => item.id === note.id ? note : item) : [...notes, note];
      const updated = await request('/api/notes', { method: 'PUT', body: JSON.stringify(next) });
      setNotes(updated); setDraft(updated.find(item => item.id === note.id)); setDirty(false); setMessage('Note saved locally.');
    } catch (error) { setMessage(error.message); setFailed(true); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (busy || !draft || !window.confirm('Delete this note?')) return;
    setBusy(true);
    try {
      const next = notes.filter(note => note.id !== draft.id);
      const updated = await request('/api/notes', { method: 'PUT', body: JSON.stringify(next) });
      setNotes(updated); setDraft(updated[0] ?? null); setDirty(false); setMessage('Note deleted.'); setFailed(false);
    } catch (error) { setMessage(error.message); setFailed(true); }
    finally { setBusy(false); }
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !mayDiscard()) return;
    try {
      if (file.size > 65536) throw new Error('Each document must be at most 64 KB.');
      const extension = file.name.split('.').pop().toLowerCase();
      const format = { md: 'markdown', txt: 'text', html: 'html', htm: 'html', json: 'json' }[extension];
      if (!format) throw new Error('Choose a Markdown, text, HTML, or JSON file.');
      const content = await file.text();
      if (format === 'json') formatJson(content);
      setDraft({ ...createNote('document'), title: file.name.slice(0, 100), format, content });
      setDirty(true); setMessage('Imported draft - save to keep it.'); setFailed(false);
    } catch (error) { setMessage(error.message); setFailed(true); }
  }
  function download() {
    const extension = { markdown: 'md', text: 'txt', html: 'html', json: 'json' }[draft.format];
    const url = URL.createObjectURL(new Blob([draft.content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${draft.title.replace(/[^a-zA-Z0-9 _-]/g, '_')}.${extension}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = notes.filter(note => (filter === 'all' || note.kind === filter) && `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <div className="planner-heading"><div><p className="kicker">YOUR WORKSPACE</p><h1 tabIndex={-1}>Notes &amp; documents</h1></div>
      <IconButton icon={Upload} label="Import document" disabled={!loaded || busy} onClick={() => fileInput.current.click()} />
      <button className="planner-primary" disabled={!loaded || busy} onClick={newNote}><Plus size={16} aria-hidden="true" />New note</button>
      <input className="sr-only" ref={fileInput} type="file" accept=".md,.txt,.html,.htm,.json" onChange={importFile} aria-label="Import a document" />
    </div>
    <p id="notes-status" className={failed ? 'planner-error' : ''} role="status" aria-live="polite">{message}</p>
    {!loaded && failed && <button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry</button>}
    <div className="notes-workspace">
      <aside className="notes-list" aria-label="Saved notes">
        <label className="notes-search"><Search size={15} aria-hidden="true" /><input aria-label="Search notes" placeholder="Search notes" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <select aria-label="Filter notes" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All documents</option><option value="note">Notes</option><option value="minutes">Meeting minutes</option><option value="document">Documents</option><option value="reminder">Reminders</option></select>
        <div className="note-entries">{visible.map(note => {
          const Icon = note.kind === 'reminder' ? Bell : note.format === 'json' ? Braces : note.format === 'html' ? FileCode2 : note.kind === 'minutes' ? NotebookPen : FileText;
          return <button key={note.id} className="note-entry" aria-current={draft?.id === note.id ? 'true' : undefined} onClick={() => select(note)}><Icon size={17} aria-hidden="true" /><span><strong>{note.title}</strong><small>{note.kind === 'reminder' ? 'Reminder' : note.kind === 'minutes' ? 'Meeting minutes' : note.format.toUpperCase()} · {new Date(note.updatedAt).toLocaleDateString()}</small></span></button>;
        })}</div>
        {loaded && !visible.length && <p className="muted">{query ? 'No matching notes' : 'No saved notes'}</p>}
      </aside>
      <section className="note-editor" aria-label="Document editor">
        {!draft ? <p className="muted">No document selected</p> : <>
          <fieldset className="form-reset" disabled={busy}>
            <div className="note-editor-heading"><label className="note-title-label">Title<input aria-label="Note title" maxLength={100} value={draft.title} onChange={event => patch({ title: event.target.value })} /></label><IconButton icon={Download} label="Export document" onClick={download} /><IconButton icon={Trash2} label="Delete note" className="danger" onClick={remove} /><button className="planner-primary" onClick={save}><Save size={16} aria-hidden="true" />Save</button></div>
            <div className="note-editor-options">
              <label>Category<select aria-label="Note category" value={draft.kind} onChange={event => {
                const kind = event.target.value;
                patch({ kind, ...(!draft.content && kind === 'minutes' ? { content: createNote('minutes').content } : {}) });
              }}><option value="note">Note</option><option value="minutes">Meeting minutes</option><option value="document">Document</option><option value="reminder">Reminder</option></select></label>
              <label>Format<select aria-label="Document format" value={draft.format} onChange={event => patch({ format: event.target.value, content: !draft.content && event.target.value === 'json' ? '{}' : draft.content })}><option value="markdown">Markdown</option><option value="text">Plain text</option><option value="html">HTML</option><option value="json">JSON</option></select></label>
              <div className="view-switch" role="group" aria-label="Document view">{[['edit', Pencil, 'Edit'], ['preview', Eye, 'Preview'], ['split', Columns2, 'Split']].map(([value, Icon, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}><Icon size={15} aria-hidden="true" />{label}</button>)}</div>
              {draft.format === 'json' && <IconButton icon={Braces} label="Format JSON" onClick={() => { try { patch({ content: formatJson(draft.content) }); } catch (error) { setMessage(error.message); setFailed(true); } }} />}
            </div>
            <div className="note-editor-options">
              <label>Linked reminder (optional)<select aria-label="Linked reminder" value={draft.reminderId ?? ''} disabled={!remindersLoaded} onFocus={() => loadReminders()} onChange={event => patch({ reminderId: event.target.value || null })}>
                <option value="">{remindersLoaded ? 'No linked reminder' : 'Loading reminders...'}</option>
                {draft.reminderId && !reminders.some(reminder => reminder.id === draft.reminderId) && <option value={draft.reminderId}>{remindersLoaded ? 'Linked reminder unavailable' : 'Loading linked reminder...'}</option>}
                {reminders.map(reminder => <option key={reminder.id} value={reminder.id}>{reminder.title}{reminder.completed ? ' (completed)' : ''}</option>)}
              </select></label>
              {reminders.some(reminder => reminder.id === draft.reminderId) && <a className="secondary-button command-button" href={`#planner?reminder=${encodeURIComponent(draft.reminderId)}`}><ExternalLink size={16} aria-hidden="true" />Open reminder</a>}
              {reminderError && <><span className="planner-error" role="status">{reminderError}</span><IconButton icon={RefreshCw} label="Reload linked reminders" onClick={() => loadReminders()} /></>}
            </div>
            <div className={`note-surfaces note-mode-${mode}`}>
              {mode !== 'preview' && <textarea className="note-content" aria-label="Document content" spellCheck={draft.format === 'markdown' || draft.format === 'text'} value={draft.content} onChange={event => patch({ content: event.target.value })} />}
              {mode !== 'edit' && <div className="note-preview-surface"><DocumentPreview note={draft} /></div>}
            </div>
          </fieldset>
        </>}
      </section>
    </div>
  </>;
}
