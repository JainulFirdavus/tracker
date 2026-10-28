const params = new URLSearchParams(window.location.search);
document.getElementById('reminder-name').textContent = params.get('name');
document.getElementById('reminder-title').textContent = params.get('title');
document.getElementById('reminder-message').textContent = params.get('message');
document.body.dataset.kind = params.get('id');
document.body.dataset.theme = params.get('theme') || 'glass';
const opacity = Number(params.get('opacity') ?? 100);
document.body.style.setProperty('--surface-opacity', String(Number.isFinite(opacity) ? Math.max(40, Math.min(100, opacity)) / 100 : 1));
function fitNotification() {
  document.body.style.setProperty('--notification-scale', String(Math.min(window.innerWidth / 456, window.innerHeight / 270)));
}
window.addEventListener('resize', fitNotification);
fitNotification();

const preview = params.get('preview') === '1';
const reminderBridge = window.healthReminder || (preview ? {
  dismiss: () => document.body.classList.add('leaving'),
  onShow: (callback) => callback(Number(params.get('duration') || 20) * 1000)
} : null);

const icon = document.getElementById('reminder-icon');
if (params.get('icon')) {
  icon.src = params.get('icon');
} else {
  icon.hidden = true;
}

let dismissing = false;
function dismiss() {
  if (dismissing) return;
  dismissing = true;
  document.body.classList.add('leaving');
  setTimeout(() => reminderBridge.dismiss(), 250);
}

document.querySelector('.close').addEventListener('click', dismiss);
document.querySelector('.done').addEventListener('click', dismiss);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') dismiss();
});

reminderBridge.onShow((duration) => {
  document.getElementById('seconds').textContent = Math.ceil(duration / 1000);
  document.body.style.setProperty('--duration', `${duration}ms`);
  document.body.classList.add('visible');
  const deadline = performance.now() + duration;
  const countdown = setInterval(() => {
    document.getElementById('seconds').textContent =
      Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
  }, 100);
  setTimeout(() => {
    clearInterval(countdown);
    if (!preview) document.body.classList.add('leaving');
  }, duration - 250);
});
