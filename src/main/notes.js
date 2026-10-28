function validateNotes(input) {
  if (!Array.isArray(input) || input.length > 100) throw new Error('Keep at most 100 notes and documents.');
  const ids = new Set();
  let total = 0;
  return input.map(note => {
    if (!note || typeof note.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(note.id) || ids.has(note.id)) {
      throw new Error('Notes need unique IDs.');
    }
    ids.add(note.id);
    if (typeof note.title !== 'string' || !note.title.trim() || note.title.length > 100) throw new Error('Enter a title of at most 100 characters.');
    if (!['note', 'minutes', 'document', 'reminder'].includes(note.kind)) throw new Error('Choose note, meeting minutes, document, or reminder.');
    if (note.reminderId !== undefined && note.reminderId !== null &&
        (typeof note.reminderId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(note.reminderId))) {
      throw new Error('Choose a valid linked reminder.');
    }
    if (!['markdown', 'html', 'json', 'text'].includes(note.format)) throw new Error('Choose Markdown, HTML, JSON, or plain text.');
    if (typeof note.content !== 'string' || Buffer.byteLength(note.content, 'utf8') > 65536) throw new Error('Each document must be at most 64 KB.');
    total += Buffer.byteLength(note.content, 'utf8');
    if (total > 1048576) throw new Error('Notes may contain at most 1 MB of content in total.');
    if (note.format === 'json') {
      try { JSON.parse(note.content); }
      catch { throw new Error(`Invalid JSON in "${note.title}". Fix it before saving.`); }
    }
    for (const key of ['createdAt', 'updatedAt']) {
      if (typeof note[key] !== 'string' || !Number.isFinite(Date.parse(note[key]))) throw new Error('Invalid note timestamp.');
    }
    return { id: note.id, title: note.title.trim(), kind: note.kind, format: note.format, content: note.content,
      ...(note.reminderId !== undefined ? { reminderId: note.reminderId } : {}),
      createdAt: new Date(note.createdAt).toISOString(), updatedAt: new Date(note.updatedAt).toISOString() };
  });
}

module.exports = { validateNotes };