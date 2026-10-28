const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { validateSettings } = require('./settings');
const { validateEvents } = require('./planner');
const { validateNotes } = require('./notes');
const { createAuthentication } = require('./auth');

const staticFiles = {
  '/': ['renderer-dist/index.html', 'text/html'],
  '/index.html': ['renderer-dist/index.html', 'text/html'],
  '/documentation': ['README.md', 'text/plain'],
  '/notification.html': ['renderer-dist/notification.html', 'text/html'],
  '/assets/eye.gif': ['assets/img/eye.gif', 'image/gif'],
  '/assets/water.gif': ['assets/img/water.gif', 'image/gif'],
  '/assets/walk.gif': ['assets/img/walk.gif', 'image/gif']
};

function createDashboardServer({ getSettings, onSave, getStatus, onTestNotification, getEvents, onSaveEvents, onTestEvent, onSaveDashboardTheme, getNotes, onSaveNotes, authentication = createAuthentication() }) {
  return http.createServer(async (req, res) => {
    const port = req.socket.localPort;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self' data:; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
    function json(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    }
    if (!hosts.includes(req.headers.host)) return json(403, { error: 'Localhost access only.' });
    try {
      const route = new URL(req.url, `http://${req.headers.host}`).pathname;
      const loginEnabled = getSettings().loginEnabled === true;
      const identity = authentication.status(req.headers.cookie);
      const validWrite = hosts.some(host => req.headers.origin === `http://${host}`) &&
        req.headers['content-type']?.split(';')[0].trim() === 'application/json';
      if (req.method === 'GET' && route === '/api/auth/status') {
        return json(200, { enabled: loginEnabled, authenticated: Boolean(identity), username: identity?.username ?? null, provider: 'local' });
      }
      if (req.method === 'POST' && (route === '/api/auth/login' || route === '/api/auth/logout')) {
        if (!validWrite) return json(403, { error: 'Use the local dashboard to sign in or out.' });
        if (route === '/api/auth/logout') {
          res.setHeader('Set-Cookie', authentication.logout(req.headers.cookie));
          return json(200, { success: true });
        }
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 2048) return json(413, { error: 'Request is too large.' });
        }
        let input;
        try { input = JSON.parse(body); }
        catch { return json(400, { error: 'Enter valid login details.' }); }
        const result = await authentication.login(input);
        if (result.cookie) res.setHeader('Set-Cookie', result.cookie);
        return json(result.status, result.error ? { error: result.error } : { username: result.username });
      }
      if (loginEnabled && !identity && (route.startsWith('/api/') || route === '/documentation')) {
        return json(401, { error: 'Sign in to access your dashboard.' });
      }
      if (req.method === 'GET' && route === '/api/settings') {
        const settings = getSettings();
        return json(200, settings);
      }
      if (req.method === 'GET' && route === '/api/status') return json(200, getStatus());
      if (req.method === 'GET' && route === '/api/events') return json(200, getEvents ? getEvents() : []);
      if (req.method === 'GET' && route === '/api/notes') return json(200, getNotes ? getNotes() : []);
      const testing = req.method === 'POST' && route === '/api/notifications/test';
      const savingEvents = req.method === 'PUT' && route === '/api/events';
      const testingEvent = req.method === 'POST' && route === '/api/events/test';
      const savingDashboardTheme = req.method === 'PUT' && route === '/api/dashboard-theme';
      const savingDashboardFont = req.method === 'PUT' && route === '/api/dashboard-font';
      const savingMusicSettings = req.method === 'PUT' && route === '/api/music-settings';
      const savingNotes = req.method === 'PUT' && route === '/api/notes';
      const savingLogin = req.method === 'PUT' && route === '/api/auth/settings';
      if ((req.method === 'PUT' && route === '/api/settings') || testing || savingEvents || testingEvent || savingDashboardTheme || savingDashboardFont || savingMusicSettings || savingNotes || savingLogin) {
        if (!validWrite) {
          return json(403, { error: 'Settings must be saved from the local dashboard using JSON.' });
        }
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > (savingNotes ? 2097152 : savingEvents ? 262144 : 16384)) return json(413, { error: 'Request is too large.' });
        }
        if (savingNotes) {
          let notes;
          try { notes = validateNotes(JSON.parse(body)); }
          catch (error) { return json(400, { error: error.message }); }
          if (!getNotes || !onSaveNotes) return json(503, { error: 'Notes storage is unavailable.' });
          await onSaveNotes(notes);
          return json(200, getNotes());
        }
        if (savingEvents || testingEvent) {
          let events;
          try {
            const input = JSON.parse(body);
            events = validateEvents(testingEvent ? [input] : input);
          } catch (error) {
            return json(400, { error: error.message });
          }
          if (testingEvent) {
            if (!onTestEvent) return json(503, { error: 'Notification testing is unavailable.' });
            if (!await onTestEvent(events[0])) return json(409, { error: 'Close the current notification and keep your computer unlocked, then try again.' });
            return json(200, { success: true });
          }
          if (!onSaveEvents || !getEvents) return json(503, { error: 'Planner storage is unavailable.' });
          await onSaveEvents(events);
          return json(200, getEvents());
        }
        let settings;
        let reminderId;
        try {
          const input = JSON.parse(body);
          if (savingDashboardTheme && typeof input?.dashboardTheme !== 'string') throw new Error('Choose a dashboard theme.');
          if (savingDashboardFont && typeof input?.dashboardFont !== 'string') throw new Error('Choose a dashboard font.');
          if (savingMusicSettings && (!input?.music || typeof input.music !== 'object' || Array.isArray(input.music))) throw new Error('Choose valid music settings.');
          if (savingLogin && typeof input?.loginEnabled !== 'boolean') throw new Error('Login enabled must be true or false.');
          settings = validateSettings(savingLogin ? { ...getSettings(), loginEnabled: input.loginEnabled }
            : savingDashboardTheme ? { ...getSettings(), dashboardTheme: input.dashboardTheme }
            : savingDashboardFont ? { ...getSettings(), dashboardFont: input.dashboardFont }
            : savingMusicSettings ? { ...getSettings(), music: input.music }
            : testing ? input.settings : input);
          if (testing) {
            reminderId = input.reminderId;
            if (!settings.reminders.some(reminder => reminder.id === reminderId)) {
              throw new Error('Choose a reminder to test.');
            }
          }
        } catch (error) {
          return json(400, { error: error.message });
        }
        if (testing) {
          if (!onTestNotification) return json(503, { error: 'Notification testing is unavailable.' });
          if (!await onTestNotification(settings, reminderId)) {
            return json(409, { error: 'Close the current notification and keep your computer unlocked, then try again.' });
          }
          return json(200, { success: true });
        }
        await (savingDashboardTheme || savingDashboardFont || savingMusicSettings || savingLogin ? onSaveDashboardTheme ?? onSave : onSave)(settings);
        if (settings.loginEnabled !== loginEnabled) res.setHeader('Set-Cookie', authentication.reset());
        return json(200, settings);
      }
      const bundleAsset = /^\/assets\/[a-zA-Z0-9_-]+\.(js|css|woff2)$/.exec(route);
      if (req.method === 'GET' && (Object.hasOwn(staticFiles, route) || bundleAsset)) {
        const bundleTypes = { js: 'text/javascript', css: 'text/css', woff2: 'font/woff2' };
        const [file, type] = staticFiles[route] ?? [`renderer-dist${route}`, bundleTypes[bundleAsset[1]]];
        let content;
        try { content = await fs.promises.readFile(path.resolve(__dirname, '../..', file)); }
        catch (error) {
          if (error.code === 'ENOENT') return json(404, { error: 'UI file not found. Run npm run build, then restart the app.' });
          throw error;
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200, { 'Content-Type': type === 'font/woff2' ? type : `${type}; charset=utf-8` });
        return res.end(content);
      }
      json(404, { error: 'Not found.' });
    } catch (error) {
      console.error('Dashboard request failed:', error);
      if (!res.headersSent) json(500, { error: 'Could not load or save settings. Check the app console for details.' });
      else res.destroy(error);
    }
  });
}

function startDashboard(options, port = 4387) {
  const server = createDashboardServer(options);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      server.on('error', error => console.error('Dashboard server failed:', error));
      resolve(server);
    });
  });
}

module.exports = { createDashboardServer, startDashboard };
