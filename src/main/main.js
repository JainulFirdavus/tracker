const { app, BrowserWindow, ipcMain, powerMonitor, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { ReminderScheduler } = require('./reminder-scheduler');
const { validateSettings, saveSettings } = require('./settings');
const { startDashboard } = require('./dashboard-server');
const { Planner, eventReminder } = require('./planner');
const { validateNotes } = require('./notes');
const { createAuthentication } = require('./auth');

app.setAppUserModelId("com.health.reminder");
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) {
  console.log('Health reminders are already running. Dashboard: http://127.0.0.1:4387');
  app.quit();
}
app.on('second-instance', () => {
  console.log('Health reminders are already running. Dashboard: http://127.0.0.1:4387');
  if (dashboardServer && app.isPackaged) openDashboard();
});

const rootPath = path.resolve(__dirname, '../..');
const configPath = path.join(app.isPackaged ? app.getPath('userData') : path.join(rootPath, 'data'), 'config.json');
const eventsPath = path.join(path.dirname(configPath), 'reminder-events.json');
const notesPath = path.join(path.dirname(configPath), 'notes.json');
const activityPath = path.join(path.dirname(configPath), 'activity.json');
const devServerUrl = !app.isPackaged && process.env.VITE_DEV_SERVER_URL === 'http://127.0.0.1:5173'
  ? process.env.VITE_DEV_SERVER_URL : undefined;
let settings;
let planner;
let notes;
let dashboardServer;
let scheduler;
let trackingTimer;
let notificationWindow;
let currentReminder;
let currentIsTest = false;
let currentEventId;
let closeTimer;
let quitting = false;
let suspended = false;
let locked = false;
let lastActivitySave = 0;

function persistActivity(force = false) {
  if (!scheduler || (!force && Date.now() - lastActivitySave < 10000)) return;
  try {
    saveSettings(activityPath, scheduler.snapshot());
    lastActivitySave = Date.now();
  } catch (error) {
    console.error('Could not save activity progress:', error);
  }
}

function openDashboard() {
  shell.openExternal(devServerUrl ?? 'http://127.0.0.1:4387').catch(error => {
    console.error('Could not open the settings dashboard:', error);
  });
}

function trackActivity() {
  if (quitting) return;
  scheduler.update(Date.now(), powerMonitor.getSystemIdleTime(), !suspended && !locked);
  if (notificationWindow && (currentIsTest || currentEventId ? suspended || locked : !scheduler.canNotify(currentReminder))) {
    notificationWindow.close();
  }
  showNextReminder();
  persistActivity();
}

function showNextReminder(testReminder, previewSettings) {
  if (quitting || notificationWindow || !scheduler) return false;

  const event = !testReminder && planner?.due(Date.now(), !suspended && !locked)[0];
  const reminder = testReminder ?? (event ? eventReminder(event) : scheduler.dueReminders()[0]);
  if (!reminder) return false;
  let resolveDisplay;
  const displayResult = new Promise(resolve => { resolveDisplay = resolve; });
  let displayed = false;
  const isTest = Boolean(testReminder);
  const appearance = previewSettings ?? settings;
  const notificationDuration = appearance.notificationDurationSeconds * 1000;
  const theme = appearance.theme;
  const size = appearance.notificationSize ?? 'medium';
  const dimensions = { small: [388, 230], medium: [456, 270], large: [548, 324] }[size];
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const scale = Math.min(1, workArea.width / dimensions[0], workArea.height / dimensions[1]);
  const width = Math.floor(dimensions[0] * scale);
  const height = Math.floor(dimensions[1] * scale);
  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width,
    y: workArea.y,
    show: false,
    frame: false,
    roundedCorners: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  notificationWindow = win;
  currentReminder = reminder;
  currentIsTest = isTest;
  currentEventId = event?.id;
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.once('ready-to-show', () => {
    if (quitting || win.isDestroyed()) {
      resolveDisplay(false);
      return;
    }
    if (isTest || event ? suspended || locked : !scheduler.canNotify(reminder)) {
      win.close();
      resolveDisplay(false);
      return;
    }
    if (isTest) win.show();
    else win.showInactive();
    displayed = win.isVisible();
    resolveDisplay(displayed);
    if (event) {
      planner.shown(event.id, Date.now());
      try {
        saveSettings(eventsPath, planner.events);
      } catch (error) {
        console.error('Could not persist planner notification delivery:', error);
      }
    } else if (!isTest) {
      scheduler.shown(reminder.id);
      persistActivity(true);
    }
    win.webContents.send('reminder:shown', notificationDuration);
    closeTimer = setTimeout(() => win.close(), notificationDuration);
  });
  win.once('closed', () => {
    if (!displayed) resolveDisplay(false);
    clearTimeout(closeTimer);
    closeTimer = undefined;
    notificationWindow = undefined;
    currentReminder = undefined;
    currentIsTest = false;
    currentEventId = undefined;
    showNextReminder();
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`Reminder renderer stopped for "${reminder.name}":`, details.reason);
    if (!displayed) resolveDisplay(false);
    if (event) planner.failed(event.id, Date.now());
    else if (!isTest) scheduler.failed(reminder.id);
    if (!win.isDestroyed()) win.close();
  });

  console.log(`Firing reminder: "${reminder.name}"`);
  const query = {
      name: reminder.name,
      title: reminder.title,
      message: reminder.message,
      icon: reminder.icon ? devServerUrl ? `/${reminder.icon}` : pathToFileURL(path.join(rootPath, 'assets', 'img', path.basename(reminder.icon))).href : '',
      id: reminder.id,
      symbol: reminder.symbol ?? '',
      opacity: String(appearance.notificationOpacity ?? 100),
      theme
  };
  const loading = devServerUrl
    ? win.loadURL(`${devServerUrl}/notification.html?${new URLSearchParams(query)}`)
    : win.loadFile(path.join(rootPath, 'renderer-dist', 'notification.html'), { query });
  loading.catch((error) => {
    console.error(`Failed to show reminder "${reminder.name}":`, error);
    if (!displayed) resolveDisplay(false);
    if (event) planner.failed(event.id, Date.now());
    else if (!isTest) scheduler.failed(reminder.id);
    if (!win.isDestroyed()) win.close();
  });
  return displayResult;
}

ipcMain.on('reminder:dismiss', (event) => {
  if (notificationWindow && event.sender === notificationWindow.webContents) {
    notificationWindow.close();
  }
});

app.on('before-quit', () => {
  persistActivity(true);
  quitting = true;
  clearTimeout(closeTimer);
  clearInterval(trackingTimer);
  if (dashboardServer) dashboardServer.close();
});

async function startApplication() {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  if (!fs.existsSync(configPath)) {
    const defaults = validateSettings(JSON.parse(fs.readFileSync(path.join(rootPath, 'assets', 'config.json'), 'utf8')));
    saveSettings(configPath, defaults);
  }
  if (!app.isPackaged) {
    for (const file of ['reminder-events.json', 'notes.json', 'activity.json']) {
      const destination = path.join(path.dirname(configPath), file);
      if (fs.existsSync(destination)) continue;
      const source = [path.join(rootPath, file), path.join(rootPath, 'assets', file)].find(candidate => fs.existsSync(candidate));
      if (source) fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    }
  }
  settings = validateSettings(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  planner = new Planner(fs.existsSync(eventsPath) ? JSON.parse(fs.readFileSync(eventsPath, 'utf8')) : []);
  notes = validateNotes(fs.existsSync(notesPath) ? JSON.parse(fs.readFileSync(notesPath, 'utf8')) : []);
  scheduler = new ReminderScheduler(settings, Date.now());
  if (fs.existsSync(activityPath)) {
    try {
      scheduler.restore(JSON.parse(fs.readFileSync(activityPath, 'utf8')));
    } catch (error) {
      console.error('Could not restore activity progress; starting fresh:', error);
    }
  }
  persistActivity(true);
  locked = powerMonitor.getSystemIdleState(settings.idleAfterSeconds) === 'locked';
  for (const event of ['suspend', 'resume', 'lock-screen', 'unlock-screen']) {
    powerMonitor.on(event, () => {
      if (event === 'suspend') suspended = true;
      if (event === 'resume') suspended = false;
      if (event === 'lock-screen') locked = true;
      if (event === 'unlock-screen') locked = false;
      trackActivity();
    });
  }
  if (app.dock) app.dock.hide(); 
  dashboardServer = await startDashboard({
    authentication: createAuthentication({ file: path.join(path.dirname(configPath), 'auth.json') }),
    getSettings: () => settings,
    getNotes: () => notes,
    onSaveNotes: updated => {
      saveSettings(notesPath, updated);
      notes = updated;
    },
    onSaveDashboardTheme: (updated) => {
      saveSettings(configPath, updated);
      settings = updated;
    },
    getEvents: () => planner.events,
    onSaveEvents: (events) => {
      const updated = new Planner(planner.events);
      updated.configure(events);
      saveSettings(eventsPath, updated.events);
      planner = updated;
      if (currentEventId && notificationWindow) notificationWindow.close();
      trackActivity();
    },
    onTestEvent: (event) => {
      if (quitting || notificationWindow || suspended || locked) return false;
      showNextReminder(eventReminder(event), settings);
      return true;
    },
    onTestNotification: (draft, reminderId) => {
      if (quitting || notificationWindow || suspended || locked) return false;
      return showNextReminder(draft.reminders.find(reminder => reminder.id === reminderId), draft);
    },
    onSave: (updated) => {
      saveSettings(configPath, updated);
      scheduler.configure(updated, Date.now());
      settings = updated;
      if (notificationWindow) notificationWindow.close();
      trackActivity();
    },
    getStatus: () => ({
      available: !suspended && !locked,
      idleSeconds: powerMonitor.getSystemIdleTime(),
      reminders: scheduler.states.map(state => ({
        id: state.reminder.id,
        enabled: state.reminder.enabled !== false,
        activeSeconds: Math.floor(state.activeMs / 1000),
        targetSeconds: state.reminder.intervalMinutes * 60,
        remainingSeconds: Math.max(0, Math.ceil((state.reminder.intervalMinutes * 60000 - state.activeMs) / 1000)),
        paused: !scheduler.canNotify(state.reminder),
        pending: state.pending
      }))
    })
  });
  trackActivity();
  trackingTimer = setInterval(trackActivity, 1000);
  console.log('Settings dashboard: http://127.0.0.1:4387');
  if (app.isPackaged || devServerUrl) openDashboard();
}

if (isPrimaryInstance) {
  app.whenReady().then(startApplication).catch((error) => {
    if (error.code === 'EADDRINUSE') {
      console.error('Cannot start the dashboard: port 4387 is already in use. ' +
        'Stop the older health-tracker instance or the program using 127.0.0.1:4387, then run npm start again.');
    } else {
      console.error("Failed to start health reminders:", error);
    }
    app.exit(1);
  });
}

// Closing a reminder must not stop the background scheduler.
app.on('window-all-closed', (e) => {
  e.preventDefault();
});
