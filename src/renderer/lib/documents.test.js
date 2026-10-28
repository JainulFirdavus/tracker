import { describe, expect, it } from 'vitest';
import { htmlPreviewDocument, createNote, formatJson } from './documents';
import { formatCountdown } from './api';
import { eventDraft, serializeEvent } from './events';

describe('document and reminder helpers', () => {
  it('preserves safe HTML tags while removing scripts, remote resources, and event handlers', () => {
    const output = htmlPreviewDocument('<h1 onclick="alert(1)">Minutes</h1><script>alert(1)</script><iframe src="https://example.com"></iframe><img src="https://example.com/track"><table><tr><td colspan="2">Decision</td></tr></table>');
    const parsed = new DOMParser().parseFromString(output, 'text/html');
    expect(parsed.querySelector('h1').textContent).toBe('Minutes');
    expect(parsed.querySelector('h1').hasAttribute('onclick')).toBe(false);
    expect(parsed.querySelector('script, iframe, img')).toBeNull();
    expect(parsed.querySelector('td').getAttribute('colspan')).toBe('2');
    expect(parsed.querySelector('meta[http-equiv]').content).toContain("default-src 'none'");
  });
  it('creates meeting minutes and validates and pretty-prints JSON', () => {
    expect(createNote('minutes').content).toContain('## Action items');
    expect(formatJson('{"items":[1]}')).toBe('{\n  "items": [\n    1\n  ]\n}');
    expect(() => formatJson('{bad')).toThrow('Invalid JSON');
  });
  it('formats countdowns without negative values and serializes local event times', () => {
    expect(formatCountdown(61)).toBe('01:01');
    expect(formatCountdown(3600)).toBe('1:00:00');
    expect(formatCountdown(-1)).toBe('00:00');
    const draft = eventDraft(null, new Date(2026, 9, 22));
    expect(draft.start.endsWith('T09:00')).toBe(true);
    const event = serializeEvent({ ...draft, title: ' Task ' });
    expect(event.title).toBe('Task');
    expect(Date.parse(event.end)).toBeGreaterThan(Date.parse(event.start));
    expect(() => serializeEvent({ ...draft, end: draft.start })).toThrow('End time');
  });
});