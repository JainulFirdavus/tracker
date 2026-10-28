const fs = require('node:fs');
const { randomBytes, scryptSync, scrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { saveSettings } = require('./settings');

const deriveKey = promisify(scrypt);
const sessionDuration = 8 * 60 * 60 * 1000;
const cookieName = 'little-reset-session';

function createAuthentication({ file, now = Date.now } = {}) {
  let account;
  if (file && fs.existsSync(file)) {
    account = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (account.version !== 1 || typeof account.username !== 'string' || !account.username ||
        !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{128}$/.test(account.passwordHash)) {
      throw new Error('Invalid local authentication file.');
    }
  } else {
    const salt = randomBytes(16).toString('hex');
    account = { version: 1, username: 'firdavus', salt, passwordHash: scryptSync('12345', salt, 64).toString('hex') };
    if (file) saveSettings(file, account);
  }
  const sessions = new Map();
  let attempts = 0;
  let attemptWindow = 0;
  const digest = token => createHash('sha256').update(token).digest('hex');
  const tokenFrom = header => /(?:^|;\s*)little-reset-session=([a-f0-9]{64})(?:;|$)/.exec(header ?? '')?.[1];
  const cookie = (token = '', maxAge = 0) => `${cookieName}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict`;

  return {
    status(header) {
      const token = tokenFrom(header);
      const session = token && sessions.get(digest(token));
      if (!session) return null;
      if (session.expiresAt <= now()) {
        sessions.delete(digest(token));
        return null;
      }
      return { username: account.username };
    },
    async login(input) {
      if (now() - attemptWindow >= 60000) { attempts = 0; attemptWindow = now(); }
      if (attempts >= 5) return { status: 429, error: 'Too many attempts. Try again in one minute.' };
      attempts += 1;
      if (typeof input?.username !== 'string' || typeof input?.password !== 'string' ||
          input.username.length > 100 || input.password.length > 256) {
        return { status: 400, error: 'Enter a username and password.' };
      }
      const passwordHash = await deriveKey(input.password, account.salt, 64);
      if (!timingSafeEqual(passwordHash, Buffer.from(account.passwordHash, 'hex')) || input.username !== account.username) {
        return { status: 401, error: 'Incorrect username or password.' };
      }
      attempts = 0;
      const token = randomBytes(32).toString('hex');
      if (sessions.size >= 10) sessions.delete(sessions.keys().next().value);
      sessions.set(digest(token), { expiresAt: now() + sessionDuration });
      return { status: 200, username: account.username, cookie: cookie(token, sessionDuration / 1000) };
    },
    logout(header) {
      const token = tokenFrom(header);
      if (token) sessions.delete(digest(token));
      return cookie();
    },
    reset() {
      sessions.clear();
      return cookie();
    }
  };
}

module.exports = { createAuthentication };