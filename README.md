# MJ Pluse

Background health reminders with an editable local dashboard.

## Run locally

```sh
npm install
npm start
```

Open <http://127.0.0.1:4387> to configure reminders and notification themes.
Only one app instance runs at a time. Quit the existing instance before switching
between development and the installed app; both use port 4387.

## Dashboard navigation

- **Activity** contains the live reminder progress, timing rules, notification
  content, and animations. Save reminder and timing changes here to update the
  running app and persist settings to the local JSON settings file.
- **Documentation** displays this README inside the dashboard, including
  instructions for stopping the app.
- **Reminders** contains dated tasks and meetings. Switch between Calendar and
  List at the top, filter by type, and click an entry to edit, complete, or delete
  it. New reminders have a local start/end time and a notification lead time.
  Test notification opens a real desktop popup without saving the draft.
- **Music** has a separate navigation section for your audio library. Import a
  folder of supported audio files, create playlists, mark favorites, or add
  public SoundCloud track and playlist links. Local audio stays in this browser
  profile; SoundCloud playback uses its embedded player and requires an internet
  connection. Music settings include gradient themes, an optional glass effect,
  and a transparency control. The header player also provides volume buttons
  and a slider.
- **Documentation** displays this README inside the dashboard, including
  instructions for stopping the app.
- **Settings** controls dashboard appearance—including the colorful Gradient
  and translucent Glass themes, each with its own intensity slider—notification
  style and live preview (save notification appearance here independently from
  reminder edits), and login. Other optional real-time integrations are not
  implemented or enabled.

Select the weather widget in the top bar to request location access and load
current temperature, humidity, and wind from Open-Meteo. Coordinates are used
only for that weather request and are not saved by the app.

Switching between navigation pages keeps unsaved Activity edits. The save bar
appears only on Activity. Navigation also supports browser back/forward and
direct links such as <http://127.0.0.1:4387/#documentation>.

Tasks and meetings are stored separately in `reminder-events.json` beside the
settings file. They use the saved notification theme, size, opacity, and duration.
Their alerts do not depend on keyboard or mouse activity. The app must be running
and the computer awake and unlocked to display them. On wake or restart, an
undelivered alert is eligible until the event's end time; expired events are not
replayed. Delivered alerts are recorded locally to avoid repeats after restart.
Changing the start, end, or notification lead time rearms an event's alert.

## Stop reminders

Closing the dashboard browser tab or dismissing a notification does not stop the
background app.

### Installed macOS app

1. Open Spotlight with Command + Space, search for **Activity Monitor**, and open it.
2. Search for **MJ Pluse**.
3. Select the main **MJ Pluse** process, not a Helper process.
4. Click the **Stop (x)** button and choose **Quit**.

Launch MJ Pluse again from Applications whenever you want to resume reminders.

### Running with npm

Press **Control + C** in the terminal where you ran `npm start`.
Run `npm start` again to resume reminders.

## Build a macOS installer

```sh
npm run dist:mac
```

The Apple Silicon installer is written to `dist/MJ Pluse-1.0.0-arm64.dmg`.
Open the DMG and drag MJ Pluse into Applications, then launch it.
The installed app opens the dashboard in your default browser.

## Local data storage

Application settings and dashboard data use local JSON files, not browser
cookies or browser storage. The Music library is separate:

- `config.json`: Activity rules, notification appearance, and dashboard preferences.
- `reminder-events.json`: Planner tasks, meetings, and notification delivery records.
- `notes.json`: Saved notes and documents.
- `activity.json`: Accumulated reminder time, pending alerts, and retry state.
- `auth.json`: Local username, random salt, and scrypt password hash. Never a plaintext password.

Music files are stored in the browser's IndexedDB. Playlist names, favorites,
and SoundCloud links are stored in browser local storage for this dashboard
profile. Clearing browser data removes the music library, playlists, favorites,
and SoundCloud links, but does not delete the JSON settings or reminder data.

Installed builds store these files in Electron's writable user-data directory:

- macOS: `~/Library/Application Support/health-tracker/`
- Windows: `%APPDATA%/health-tracker/`

Development uses the project's `data/` directory, initialized from `assets/config.json`.
Existing development notes, planner entries, and activity files are copied into
`data/` only when missing; originals are not removed or overwritten.
Installed data stays outside the DMG,
EXE, and application bundle, so browser cache clearing and app updates do not
erase it. Development and installed copies have separate data directories.
Back up the JSON files while the app is stopped to preserve or transfer data.

Activity progress saves every 10 seconds, after a health notification is shown,
and on normal quit. On restart, saved progress resumes without counting the time
the app was closed. A crash can lose up to 10 seconds of progress. Invalid
activity data is logged and replaced with fresh progress without preventing
the app from starting. Planner and notes edits save immediately when submitted.
Existing settings already live in JSON; no cookie import is needed.

## Dashboard login

New installations enable local demo login. Existing installations retain their
previous behavior until **Settings > Dashboard access > Require login** is enabled.
The preference saves immediately to `config.json`. Enabling login signs out
existing sessions. Disabling it allows anyone with access to the local dashboard
to read and edit data; it does not stop background reminders.

Demo access:

- Username: `firdavus`
- Password: `12345`

This is a development/demo account, not a production credential. Passwords are
stored as salted scrypt hashes in `auth.json`, not reversible encrypted values.
Only an opaque random session token is stored in an HttpOnly, SameSite=Strict
cookie. Credentials and application data are never stored in cookies. Sessions
expire after eight hours, on sign-out, when login is toggled, or on app restart.
Clearing cookies signs you out but does not delete JSON data. Failed login
attempts are rate limited. The server binds to loopback HTTP only; the cookie
does not use Secure on this local HTTP endpoint. Do not expose it to a network.

Authentication is isolated in `src/main/auth.js`, with public session/login/logout
endpoints and a shared API authorization check in `src/main/dashboard-server.js`.
This is the replacement point for a future server-side Okta OIDC integration.
Okta is not configured or contacted yet. Before production use, replace the demo
account with a proper identity provider and HTTPS. Login protects dashboard
access; it does not encrypt JSON files or prevent access by the same OS account.

This local build is not Developer ID signed or notarized. macOS may require
approval under System Settings > Privacy & Security before first launch.
Public distribution requires Apple signing credentials and notarization.

## Tests

```sh
npm test
```
