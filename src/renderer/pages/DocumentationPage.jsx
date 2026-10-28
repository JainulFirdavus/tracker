



import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export function DocumentationPage() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/documentation', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`Request failed (${response.status}).`);
      return response.text();
    }).then(setText).catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => controller.abort();
  }, [retry]);
  return <>
    <div className="intro"><p className="kicker">THE LITTLE RESET HANDBOOK</p><h1 tabIndex={-1}>A little <span>guidance.</span></h1></div>
    <section className="panel document-panel" aria-label="Application documentation">
      {error ? <><p id="document-status" role="status" className="error">{error}</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry loading documentation</button></> : !text ? <p role="status">Loading documentation...</p> : <article id="document-content"><ReactMarkdown components={{ h1: ({ children }) => <h2>{children}</h2> }}>{text}</ReactMarkdown></article>}
    </section>
  </>;
}
