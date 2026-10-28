

const allowedTags = new Set('h1 h2 h3 h4 h5 h6 p br strong b em i u s ul ol li pre code blockquote hr table thead tbody tfoot tr th td div span section article dl dt dd'.split(' '));

export function htmlPreviewDocument(content) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  for (const element of parsed.body.querySelectorAll('*')) {
    if (!allowedTags.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!['colspan', 'rowspan'].includes(attribute.name) || !/^\d{1,2}$/.test(attribute.value)) element.removeAttribute(attribute.name);
    }
  }
  return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:14px/1.7 Georgia,serif;color:#263c34;background:#fff;margin:20px;overflow-wrap:anywhere}pre{white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ced8d2;padding:8px}blockquote{border-left:3px solid #698b77;padding-left:12px}h1,h2,h3{line-height:1.3}</style></head><body>${parsed.body.innerHTML}</body></html>`;
}

export function createNote(kind = 'note') {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: kind === 'minutes' ? 'Meeting minutes' : 'Untitled note', kind,
    format: 'markdown', content: kind === 'minutes' ? '# Meeting minutes\n\n## Attendees\n\n- \n\n## Discussion\n\n## Decisions\n\n## Action items\n\n- [ ] ' : '',
    createdAt: now, updatedAt: now };
}

export function formatJson(content) {
  try { return JSON.stringify(JSON.parse(content), null, 2); }
  catch (error) { throw new Error(`Invalid JSON: ${error.message}`); }
}


