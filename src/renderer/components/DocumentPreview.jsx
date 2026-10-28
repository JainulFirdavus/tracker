import ReactMarkdown from 'react-markdown';
import { htmlPreviewDocument, formatJson } from '../lib/documents';

export function DocumentPreview({ note }) {
  if (note.format === 'html') return <iframe className="html-document-preview" title="HTML document preview" sandbox="" srcDoc={htmlPreviewDocument(note.content)} />;
  if (note.format === 'markdown') return <article className="document-preview markdown-preview"><ReactMarkdown>{note.content}</ReactMarkdown></article>;
  if (note.format === 'json') {
    try { return <pre className="document-preview"><code>{formatJson(note.content)}</code></pre>; }
    catch (error) { return <p className="planner-error" role="status">{error.message}</p>; }
  }
  return <pre className="document-preview">{note.content}</pre>;
}

