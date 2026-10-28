export async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers
  });
  const result = await response.json();
  if (response.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('auth:required'));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

export function formatCountdown(seconds) {
  const remaining = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(remaining / 3600);
  const minutes = String(Math.floor(remaining / 60) % 60).padStart(2, '0');
  const rest = String(remaining % 60).padStart(2, '0');
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}