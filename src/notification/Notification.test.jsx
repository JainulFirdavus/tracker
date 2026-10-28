import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Notification } from './Notification';

afterEach(() => vi.useRealTimers());
it('renders the delivered event, its icon, and countdown, then dismisses through IPC', async () => {
  vi.useFakeTimers();
  let shown;
  const unsubscribe = vi.fn();
  const bridge = { onShow: callback => { shown = callback; return unsubscribe; }, dismiss: vi.fn() };
  const params = new URLSearchParams({ title: 'Team sync', name: 'Meeting reminder', message: 'Join now', symbol: 'calendar-clock', theme: 'daylight', opacity: '65' });
  const { unmount } = render(<Notification params={params} bridge={bridge} />);
  act(() => shown(10000));
  expect(screen.getByRole('heading', { name: 'Team sync' })).toBeInTheDocument();
  expect(document.body).toHaveClass('visible');
  expect(document.body.style.getPropertyValue('--surface-opacity')).toBe('0.65');
  expect(screen.getByRole('timer')).toHaveTextContent('10s');
  expect(document.querySelector('.artwork svg')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  act(() => vi.advanceTimersByTime(250));
  expect(bridge.dismiss).toHaveBeenCalledOnce();
  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});