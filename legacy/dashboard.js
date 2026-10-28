const form = document.getElementById('settings-form');
const save = document.getElementById('save');
const message = document.getElementById('save-status');
const connection = document.getElementById('connection');
const reminderList = document.getElementById('reminders');
const previewSelect = document.getElementById('preview-reminder');
let settings;
let dirty = false;
let saving = false;
let previewTimer;
let documentationLoaded = false;
let documentationLoading = false;
let statusRefreshing = false;

function renderDocumentation(text) {
  const content = document.getElementById('document-content');
  content.replaceChildren();
  let paragraph = [];
  let code = null;
  let list = null;
  function appendInline(element, value) {
    for (const part of value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
      if (part.startsWith('**') && part.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        element.append(strong);
      } else if (part.startsWith('`') && part.endsWith('`')) {
        const inlineCode = document.createElement('code');
        inlineCode.textContent = part.slice(1, -1);
        element.append(inlineCode);
      } else element.append(document.createTextNode(part));
    }
  }
  function flushParagraph() {
    if (!paragraph.length) return;
    const element = document.createElement('p');
    appendInline(element, paragraph.join(' '));
    content.append(element);
    paragraph = [];
  }
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      flushParagraph();
      list = null;
      if (code === null) code = [];
      else {
        const pre = document.createElement('pre');
        const element = document.createElement('code');
        element.textContent = code.join('\n');
        pre.append(element);
        content.append(pre);
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,3}) (.+)$/);
    const item = line.match(/^(- |\d+\. )(.+)$/);
    if (!line.trim() || heading || item) flushParagraph();
    if (heading) {
      const element = document.createElement(`h${Math.max(2, heading[1].length)}`);
      element.textContent = heading[2];
      content.append(element);
      list = null;
    } else if (item) {
      const type = item[1] === '- ' ? 'UL' : 'OL';
      if (!list || list.tagName !== type) {
        list = document.createElement(type.toLowerCase());
        content.append(list);
      }
      const element = document.createElement('li');
      appendInline(element, item[2]);
      list.append(element);
    } else if (line.trim()) {
      if (list) {
        appendInline(list.lastElementChild, ` ${line.trim()}`);
      } else paragraph.push(line.trim());
    } else list = null;
  }
  flushParagraph();
}

async function loadDocumentation() {
  if (documentationLoaded || documentationLoading) return;
  documentationLoading = true;
  const status = document.getElementById('document-status');
  const retry = document.getElementById('document-retry');
  status.hidden = false;
  status.classList.remove('error');
  status.textContent = 'Loading documentation...';
  retry.hidden = true;
  try {
    const response = await fetch('/documentation');
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    renderDocumentation(await response.text());
    documentationLoaded = true;
    status.hidden = true;
  } catch (error) {
    status.classList.add('error');
    status.textContent = `Could not load documentation: ${error.message}`;
    retry.hidden = false;
  } finally {
    documentationLoading = false;
  }
}

function navigate(focusHeading = false) {
  const pages = ['activity', 'planner', 'documentation', 'settings'];
  const requested = window.location.hash.slice(1);
  const active = pages.includes(requested) ? requested : 'activity';
  for (const page of pages) {
    document.getElementById(`page-${page}`).hidden = page !== active;
    const link = document.querySelector(`nav [data-page="${page}"]`);
    if (page === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const label = document.querySelector(`nav [data-page="${active}"]`).textContent.replace(/^\s*\d+\s*/, '').trim();
  document.getElementById('page-label').textContent = label;
  document.title = `${label} - Little Reset`;
  if (active === 'documentation') loadDocumentation();
  window.dispatchEvent(new CustomEvent('pagechange', { detail: active }));
  if (focusHeading) {
    document.querySelector(`#page-${active} h1`).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => navigate(true));
document.getElementById('document-retry').addEventListener('click', loadDocumentation);
navigate();

function notice(text, error = false) {
  message.textContent = text;
  message.classList.toggle('error', error);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function readForm() {
  return {
    dashboardTheme: settings.dashboardTheme ?? 'forest',
    idleAfterSeconds: Number(document.getElementById('idle').value),
    notificationDurationSeconds: Number(document.getElementById('duration').value),
    notificationSize: document.getElementById('notification-size').value,
    notificationOpacity: Number(document.getElementById('notification-opacity').value),
    theme: form.elements.theme.value,
    reminders: Array.from(reminderList.children, card => {
      const item = {
        id: card.dataset.id,
        enabled: card.querySelector('.enabled').checked,
        name: card.querySelector('.name').value,
        intervalMinutes: Number(card.querySelector('.interval').value),
        title: card.querySelector('.title').value,
        message: card.querySelector('.message').value,
        icon: card.querySelector('.icon').value
      };
      if (card.querySelector('.reset-mode').value === 'reset') {
        item.resetAfterIdleSeconds = Number(card.querySelector('.reset').value);
      }
      return item;
    })
  };
}

function render() {
  applyDashboardTheme(settings.dashboardTheme ?? 'forest');
  document.getElementById('idle').value = settings.idleAfterSeconds;
  document.getElementById('duration').value = settings.notificationDurationSeconds;
  document.getElementById('notification-size').value = settings.notificationSize ?? 'medium';
  document.getElementById('notification-opacity').value = settings.notificationOpacity ?? 100;
  document.getElementById('opacity-value').value = `${settings.notificationOpacity ?? 100}%`;
  form.elements.theme.value = settings.theme;
  reminderList.replaceChildren();
  previewSelect.replaceChildren();
  for (const reminder of settings.reminders) {
    const card = document.getElementById('reminder-template').content.firstElementChild.cloneNode(true);
    card.dataset.id = reminder.id;
    card.querySelector('h3').textContent = reminder.name;
    card.querySelector('.enabled').checked = reminder.enabled;
    for (const key of ['name', 'title', 'message', 'icon']) card.querySelector(`.${key}`).value = reminder[key];
    card.querySelector('.interval').value = reminder.intervalMinutes;
    const resets = reminder.resetAfterIdleSeconds !== undefined;
    card.querySelector('.reset-mode').value = resets ? 'reset' : 'pause';
    card.querySelector('.reset').value = reminder.resetAfterIdleSeconds ?? 300;
    card.querySelector('.reset').disabled = !resets;
    card.querySelector('.reset').required = resets;
    card.querySelector('.card-icon').src = `/${reminder.icon}`;
    reminderList.append(card);
    const option = document.createElement('option');
    option.value = reminder.id;
    option.textContent = reminder.name;
    previewSelect.append(option);
  }
  updatePreview();
}

function applyDashboardTheme(theme) {
  document.documentElement.dataset.dashboardTheme = theme;
  for (const radio of document.querySelectorAll('input[name="dashboard-theme"]')) radio.checked = radio.value === theme;
}

document.getElementById('dashboard-theme-options').addEventListener('change', async event => {
  if (!settings || event.target.name !== 'dashboard-theme') return;
  if (saving) {
    applyDashboardTheme(settings.dashboardTheme ?? 'forest');
    return;
  }
  const previous = settings.dashboardTheme ?? 'forest';
  const theme = event.target.value;
  const status = document.getElementById('dashboard-theme-status');
  const radios = Array.from(document.querySelectorAll('input[name="dashboard-theme"]'));
  saving = true;
  save.disabled = true;
  radios.forEach(radio => { radio.disabled = true; });
  applyDashboardTheme(theme);
  status.classList.remove('error');
  status.textContent = 'Saving theme...';
  try {
    const updated = await request('/api/dashboard-theme', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboardTheme: theme })
    });
    settings = { ...settings, dashboardTheme: updated.dashboardTheme };
    applyDashboardTheme(settings.dashboardTheme);
    status.textContent = 'Theme saved.';
  } catch (error) {
    applyDashboardTheme(previous);
    status.classList.add('error');
    status.textContent = error.message;
  } finally {
    saving = false;
    save.disabled = false;
    radios.forEach(radio => { radio.disabled = false; });
  }
});

function updatePreview() {
  if (!settings) return;
  const draft = readForm();
  const reminder = draft.reminders.find(item => item.id === previewSelect.value);
  const params = new URLSearchParams({
    ...reminder, icon: `/${reminder.icon}`, theme: draft.theme,
    opacity: String(draft.notificationOpacity),
    preview: '1', duration: String(draft.notificationDurationSeconds || 10)
  });
  const preview = document.getElementById('preview');
  preview.style.width = `${{ small: 388, medium: 456, large: 548 }[draft.notificationSize]}px`;
  preview.src = `/notification.html?${params}`;
}

form.addEventListener('input', event => {
  if (!settings || event.target === previewSelect) return;
  dirty = true;
  notice('Unsaved changes');
  document.getElementById('opacity-value').value = `${document.getElementById('notification-opacity').value}%`;
  const card = event.target.closest('.reminder-card');
  if (card) {
    const reset = card.querySelector('.reset');
    reset.disabled = card.querySelector('.reset-mode').value === 'pause';
    reset.required = !reset.disabled;
    card.querySelector('h3').textContent = card.querySelector('.name').value;
    card.querySelector('.card-icon').src = `/${card.querySelector('.icon').value}`;
    const option = Array.from(previewSelect.options).find(item => item.value === card.dataset.id);
    option.textContent = card.querySelector('.name').value;
  }
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 200);
});
previewSelect.addEventListener('change', updatePreview);
document.getElementById('test-notification').addEventListener('click', async () => {
  if (!settings || saving || !form.reportValidity()) return;
  const button = document.getElementById('test-notification');
  const status = document.getElementById('test-notification-status');
  button.disabled = true;
  status.textContent = 'Requesting test notification...';
  try {
    await request('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: readForm(), reminderId: previewSelect.value })
    });
    status.textContent = 'Test notification requested.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = saving;
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  saving = true;
  save.disabled = true;
  // Freeze the form so edits cannot be lost while the saved response is in flight.
  const controls = [...form.querySelectorAll('input, select, textarea, button'),
    ...document.querySelectorAll('input[name="dashboard-theme"]')];
  const disabled = controls.map(control => control.disabled);
  const draft = readForm();
  controls.forEach(control => { control.disabled = true; });
  notice('Saving to your local JSON file...');
  try {
    settings = await request('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    dirty = false;
    notice('Saved to your local JSON file. Changes are now active.');
  } catch (error) {
    notice(error.message, true);
  } finally {
    controls.forEach((control, index) => { control.disabled = disabled[index]; });
    save.disabled = false;
    saving = false;
  }
});

async function refreshStatus() {
  if (statusRefreshing) return;
  statusRefreshing = true;
  try {
    const status = await request('/api/status');
    connection.textContent = !status.available ? 'Tracking paused - locked or asleep'
      : status.idleSeconds >= settings.idleAfterSeconds ? 'Idle - active timers paused' : 'Tracker connected - working with you';
    for (const state of status.reminders) {
      const card = Array.from(reminderList.children).find(item => item.dataset.id === state.id);
      if (!card) continue;
      const rule = settings.reminders.find(reminder => reminder.id === state.id);
      const paused = state.paused ?? (!status.available ||
        status.idleSeconds >= Math.min(settings.idleAfterSeconds, rule?.resetAfterIdleSeconds ?? Infinity));
      const remaining = Math.max(0, Math.ceil(state.remainingSeconds ?? state.targetSeconds - state.activeSeconds));
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor(remaining / 60) % 60;
      const seconds = String(remaining % 60).padStart(2, '0');
      const countdown = hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
        : `${String(minutes).padStart(2, '0')}:${seconds}`;
      card.querySelector('.timer-remaining').textContent = !state.enabled ? 'Disabled'
        : state.pending ? '00:00 - due now'
        : `${countdown}${paused ? ' - paused' : ''}`;
      card.querySelector('.timer-status').textContent = !state.enabled ? 'Disabled'
        : state.pending ? 'Due - waiting for active use / popup slot'
        : `${Math.floor(state.activeSeconds / 60)} / ${Math.ceil(state.targetSeconds / 60)} active minutes${paused ? ' - paused' : ''}`;
      card.querySelector('.activity-track > div').style.width =
        `${Math.min(100, state.activeSeconds / state.targetSeconds * 100)}%`;
    }
  } catch (error) {
    connection.textContent = `Tracker unavailable: ${error.message}`;
    for (const timer of reminderList.querySelectorAll('.timer-remaining')) timer.textContent = 'Timer unavailable';
  } finally {
    statusRefreshing = false;
  }
}

window.addEventListener('beforeunload', event => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function initialize() {
  try {
    settings = await request('/api/settings');
    render();
    save.disabled = false;
    document.getElementById('test-notification').disabled = false;
    for (const radio of document.querySelectorAll('input[name="dashboard-theme"]')) radio.disabled = false;
    notice('Settings loaded from your local JSON file.');
    await refreshStatus();
    setInterval(refreshStatus, 1000);
  } catch (error) {
    notice(`Could not load dashboard: ${error.message}. Reload to retry.`, true);
    connection.textContent = 'Tracker unavailable';
  }
}

initialize();
