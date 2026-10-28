




import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import defaults from '../../tests/fixtures/settings.json';

let settings;
let requests;
let events;
let notes;
beforeEach(() => {
  location.hash = '#/activity';
  settings = { ...structuredClone(defaults), loginEnabled: false, dashboardTheme: 'forest', dashboardFont: 'system', notificationSize: 'medium', notificationOpacity: 100, notificationDurationSeconds: 10, theme: 'glass', music: { trackName: '', trackType: '', trackSizeBytes: 0, theme: 'moss', visualizer: 'bars', volume: 55 } };
  requests = [];
  events = [{ id: 'walk', type: 'task', title: 'Walk break', start: '2026-10-28T12:00:00.000Z', completed: false }];
  notes = [{ id: 'weekly-reset', title: 'Weekly reset', kind: 'note', format: 'text', content: 'Private note content', updatedAt: '2026-10-27T09:00:00.000Z' }];
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    requests.push({ url, options });
    if (url === '/api/auth/status') return { ok: true, json: async () => ({ enabled: false, authenticated: false, provider: 'local' }) };
    if (url === '/api/dashboard-theme') settings = { ...settings, ...JSON.parse(options.body) };
    if (url === '/api/dashboard-font' && options.method === 'PUT') settings = { ...settings, ...JSON.parse(options.body) };
    if (url === '/api/music-settings' && options.method === 'PUT') settings = { ...settings, music: JSON.parse(options.body).music };
    if (url === '/api/settings' && options.method === 'PUT') settings = JSON.parse(options.body);
    const data = url === '/api/status' ? { available: true, idleSeconds: 0, reminders: settings.reminders.map(reminder => ({ id: reminder.id, enabled: true, activeSeconds: 1, targetSeconds: reminder.intervalMinutes * 60, remainingSeconds: reminder.intervalMinutes * 60 - 1, paused: false, pending: false })) } : url === '/api/notifications/test' ? { success: true } : url === '/api/events' ? events : url === '/api/notes' ? notes : settings;
    return { ok: true, json: async () => structuredClone(data) };
  }));
});
afterEach(() => vi.unstubAllGlobals());

it('routes the root to Overview and updates the hash through navigation', async () => {
  const user = userEvent.setup();
  location.hash = '#/';
  render(<App />);
  await screen.findByRole('heading', { name: 'Overview' });
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: /Settings/ }));
  await screen.findByRole('heading', { name: 'Dashboard theme' });
  expect(location.hash).toBe('#/settings');
});

it('opens and closes the mobile navigation drawer and shows the app footer', async () => {
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Overview' });
  expect(screen.getByText(`© ${new Date().getFullYear()}`)).toBeInTheDocument();
  const toggle = screen.getByRole('button', { name: 'Open navigation' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Settings' }));
  expect(location.hash).toBe('#/settings');
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});

it('collapses and expands the desktop sidebar', async () => {
  location.hash = '#/';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Overview' });
  await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  expect(document.getElementById('main-sidebar')).toHaveAttribute('data-collapsed', 'true');
  await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-expanded', 'true');
});

it('requires login before loading data, reports invalid credentials, and signs out', async () => {
  const user = userEvent.setup();
  const baseFetch = fetch;
  let authenticated = false;
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/auth/status') return { ok: true, json: async () => ({ enabled: true, authenticated, username: authenticated ? 'firdavus' : null, provider: 'local' }) };
    if (url === '/api/auth/login') {
      authenticated = JSON.parse(options.body).password === '12345';
      return { ok: authenticated, status: authenticated ? 200 : 401, json: async () => authenticated ? { username: 'firdavus' } : { error: 'Incorrect username or password.' } };
    }
    if (url === '/api/auth/logout') { authenticated = false; return { ok: true, json: async () => ({ success: true }) }; }
    return baseFetch(url, options);
  }));
  render(<App />);
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(requests.some(item => item.url === '/api/settings')).toBe(false);
  await user.type(screen.getByLabelText('Username'), 'firdavus');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert')).toHaveTextContent('Incorrect username or password.');
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), '12345');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Welcome back' });
});

it('enables login from Settings', async () => {
  const user = userEvent.setup();
  const baseFetch = fetch;
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/auth/status') return { ok: true, json: async () => ({ enabled: settings.loginEnabled, authenticated: false }) };
    if (url === '/api/auth/settings') {
      settings = { ...settings, ...JSON.parse(options.body) };
      return { ok: true, json: async () => structuredClone(settings) };
    }
    return baseFetch(url, options);
  }));
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: /Settings/ }));
  await user.click(screen.getByRole('checkbox', { name: 'Require login' }));
  await screen.findByRole('heading', { name: 'Welcome back' });
  expect(settings.loginEnabled).toBe(true);
});

it('disables login from Settings without changing reminder settings', async () => {
  const user = userEvent.setup();
  settings.loginEnabled = true;
  const reminders = structuredClone(settings.reminders);
  const baseFetch = fetch;
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/auth/status') return { ok: true, json: async () => ({ enabled: settings.loginEnabled, authenticated: settings.loginEnabled, username: 'firdavus' }) };
    if (url === '/api/auth/settings') {
      settings = { ...settings, ...JSON.parse(options.body) };
      return { ok: true, json: async () => structuredClone(settings) };
    }
    return baseFetch(url, options);
  }));
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: /Settings/ }));
  await user.click(screen.getByRole('checkbox', { name: 'Require login' }));
  await screen.findByText('Login preference saved.');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument());
  expect(settings.loginEnabled).toBe(false);
  expect(settings.reminders).toEqual(reminders);
});

it('returns to login when a protected API reports an expired session', async () => {
  const baseFetch = fetch;
  let expired = false;
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url === '/api/auth/status') return { ok: true, json: async () => ({ enabled: true, authenticated: true, username: 'firdavus' }) };
    if (expired && url === '/api/settings') return { ok: false, status: 401, json: async () => ({ error: 'Sign in to access your dashboard.' }) };
    return baseFetch(url, options);
  }));
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  expired = true;
  const { request } = await import('./lib/api');
  await act(async () => {
    await expect(request('/api/settings')).rejects.toThrow('Sign in');
  });
  await screen.findByRole('heading', { name: 'Welcome back' });
});

it('preserves unsaved activity edits across Settings and saves dashboard themes independently', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(screen.getAllByText('Edit reminder rules & content')[0]);
  const title = screen.getAllByLabelText('Notification title')[0];
  fireEvent.change(title, { target: { value: 'Unsaved eye break' } });
  await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: /Settings/ }));
  await screen.findByRole('heading', { name: 'Dashboard theme' });
  await user.click(within(screen.getByRole('group', { name: 'Dashboard theme' })).getByRole('radio', { name: 'Ocean' }));
  await screen.findByText('Theme saved.');
  expect(document.documentElement.dataset.dashboardTheme).toBe('ocean');
  expect(settings.reminders[0].title).not.toBe('Unsaved eye break');
  await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: /Activity/ }));
  expect(screen.getAllByLabelText('Notification title')[0]).toHaveValue('Unsaved eye break');
  await user.click(screen.getByRole('button', { name: 'Show notification' }));
  await screen.findByText('Test notification requested.');
  const sent = JSON.parse(requests.find(item => item.url === '/api/notifications/test').options.body);
  expect(sent.settings.reminders[0].title).toBe('Unsaved eye break');
  expect(sent.settings.dashboardTheme).toBe('ocean');
});

it('shows the live countdown on the right and saves activity edits', async () => {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getAllByRole('timer')[0]).toHaveTextContent('19:59'));
  expect(screen.getAllByRole('timer')[0].closest('.reminder-actions')).not.toBeNull();
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByText('Saved to your local JSON file. Changes are now active.');
  expect(requests.some(item => item.url === '/api/settings' && item.options.method === 'PUT')).toBe(true);
});

it('lists current routines, scheduled items, and notes in Overview and opens the quick menu', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: /Overview/ }));
  const overview = screen.getByRole('region', { name: 'Overview' });
  await within(overview).findByRole('heading', { name: 'Overview' });
  expect(await within(overview).findByText('Drink Water')).toBeInTheDocument();
  expect(within(overview).getByText('Walk break')).toBeInTheDocument();
  expect(within(overview).getByText('Weekly reset')).toBeInTheDocument();
  expect(within(overview).queryByText('Private note content')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Open quick navigation' }));
  expect(screen.getByRole('link', { name: 'Go to Reminders' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('link', { name: 'Go to Reminders' })).not.toBeInTheDocument();
});

it('saves music theme and visualizer settings independently', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: /Settings/ }));
  const musicSettings = screen.getAllByText('Music player').find(element => element.closest('details')).closest('details');
  await user.click(within(musicSettings).getByText('Music player'));
  await user.click(within(musicSettings).getByRole('radio', { name: 'Ocean' }));
  await user.click(within(musicSettings).getByRole('button', { name: 'Wave' }));
  await user.click(within(musicSettings).getByRole('button', { name: 'Save music settings' }));
  await screen.findByText('Music settings saved locally.');
  expect(settings.music.theme).toBe('ocean');
  expect(settings.music.visualizer).toBe('wave');
  expect(requests.some(item => item.url === '/api/music-settings')).toBe(true);
});

it('applies and saves a dashboard font selection immediately', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: /Settings/ }));
  await screen.findByRole('heading', { name: 'Typography' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Interface font' }), 'manrope');
  await screen.findByText('Typeface saved.');
  expect(document.documentElement.dataset.dashboardFont).toBe('manrope');
  expect(settings.dashboardFont).toBe('manrope');
  expect(requests.some(item => item.url === '/api/dashboard-font')).toBe(true);
});

it('opens the music player as a floating panel and keeps its audio mounted when closed', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: '20-20-20 Eye Break' });
  const launcher = screen.getByRole('button', { name: 'Open music player' });
  await user.click(launcher);
  const player = screen.getByRole('region', { name: 'Music player' });
  const audio = player.querySelector('audio');
  expect(player).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Close music player' }));
  expect(player).not.toBeVisible();
  expect(player.querySelector('audio')).toBe(audio);
  expect(launcher).toBeVisible();

  await user.click(launcher);
  expect(player).toBeVisible();
});




