import { ArrowRight, Cloud, Plus, Type } from "lucide-react";
import { Link } from "react-router-dom";

const themes = [
  ["forest", "Forest"],
  ["paper", "Paper"],
  ["ocean", "Ocean"],
  ["rose", "Rose"],
  ["graphite", "Graphite"],
  ["gradient", "Gradient"],
  ["glass", "Glass"],
];
const dashboardFonts = [
  ["system", "System UI", "Native to this device"],
  ["dm-sans", "DM Sans", "Compact and clear at UI sizes"],
  ["manrope", "Manrope", "Crisp numerals and metrics"],
  ["plus-jakarta-sans", "Plus Jakarta Sans", "Friendly product interface"],
  ["space-grotesk", "Space Grotesk", "Distinctive technical character"],
  ["lexend", "Lexend", "Comfortable long-form reading"],
];
export function SettingsPage({ preferences }) {
  const selectedFont =
    dashboardFonts.find(
      ([value]) => value === (preferences.draft.dashboardFont ?? "system"),
    ) ?? dashboardFonts[0];
  return (
    <>
      <div className="intro">
        <p className="kicker">YOUR PREFERENCES</p>
        <h1 tabIndex={-1}>Settings</h1>
      </div>
      <section
        className="settings-group"
        aria-labelledby="appearance-group-title"
      >
        <header className="settings-group-heading">
          <div>
            <p className="kicker">DISPLAY</p>
            <h2 id="appearance-group-title">Appearance</h2>
          </div>
          <p className="muted">Make the dashboard comfortable to read.</p>
        </header>
        <section
          className="dashboard-appearance typography-appearance"
          aria-labelledby="typography-title"
        >
          <div className="typography-heading">
            <div>
              <h3 id="typography-title">Typography</h3>
              <p className="muted">
                Choose one readable typeface for the whole interface.
              </p>
            </div>
            <Type size={19} aria-hidden="true" />
          </div>
          <label className="font-family-select">
            Interface font
            <select
              aria-label="Interface font"
              value={selectedFont[0]}
              disabled={preferences.saving}
              onChange={(event) => preferences.setFont(event.target.value)}
            >
              {dashboardFonts.map(([value, name]) => (
                <option value={value} key={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="font-specimen" aria-live="polite">
            <span aria-hidden="true">Aa</span>
            <div>
              <strong>{selectedFont[1]}</strong>
              <p>The quick reset makes room for a clearer day.</p>
              <small>{selectedFont[2]}</small>
            </div>
          </div>
          <p className="typography-status" role="status" aria-live="polite">
            {preferences.fontMessage}
          </p>
        </section>
        <section
          className="dashboard-appearance"
          aria-labelledby="dashboard-appearance-title"
        >
          <h3 id="dashboard-appearance-title">Dashboard theme</h3>
          <fieldset
            id="dashboard-theme-options"
            className="dashboard-theme-options"
            disabled={preferences.saving}
          >
            <legend className="sr-only">Dashboard theme</legend>
            {themes.map(([theme, name]) => (
              <label
                className="dashboard-theme-option"
                data-palette={theme}
                key={theme}
              >
                <input
                  type="radio"
                  name="dashboard-theme"
                  value={theme}
                  checked={preferences.draft.dashboardTheme === theme}
                  onChange={() => preferences.setTheme(theme)}
                />
                <span className="dashboard-palette" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <strong>{name}</strong>
              </label>
            ))}
          </fieldset>
          <div className="dashboard-theme-intensities">
            <label className="dashboard-theme-intensity">
              <span>
                <strong>Gradient intensity</strong>
                <output>
                  {preferences.draft.dashboardGradientIntensity ?? 72}%
                </output>
              </span>
              <input
                type="range"
                aria-label="Gradient intensity"
                min="20"
                max="100"
                step="1"
                value={preferences.draft.dashboardGradientIntensity ?? 72}
                disabled={preferences.saving}
                onChange={(event) =>
                  preferences.setThemeIntensity(
                    "dashboardGradientIntensity",
                    event.target.value,
                  )
                }
              />
            </label>
            <label className="dashboard-theme-intensity">
              <span>
                <strong>Glass opacity</strong>
                <output>
                  {preferences.draft.dashboardGlassIntensity ?? 72}%
                </output>
              </span>
              <input
                type="range"
                aria-label="Glass opacity"
                min="20"
                max="100"
                step="1"
                value={preferences.draft.dashboardGlassIntensity ?? 72}
                disabled={preferences.saving}
                onChange={(event) =>
                  preferences.setThemeIntensity(
                    "dashboardGlassIntensity",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
          <p id="dashboard-theme-status" role="status" aria-live="polite">
            {preferences.themeMessage}
          </p>
        </section>
      </section>
      <section className="settings-group" aria-labelledby="access-group-title">
        <header className="settings-group-heading">
          <div>
            <p className="kicker">PRIVACY</p>
            <h2 id="access-group-title">Access</h2>
          </div>
          <p className="muted">Control who can open your dashboard.</p>
        </header>
        <section
          className="dashboard-appearance"
          aria-labelledby="dashboard-login-title"
        >
          <h3 id="dashboard-login-title">Dashboard access</h3>
          <label className="login-toggle">
            <input
              type="checkbox"
              checked={preferences.draft.loginEnabled === true}
              disabled={preferences.saving || preferences.dirty}
              onChange={(event) => preferences.setLogin(event.target.checked)}
            />
            Require login
          </label>
          <p className="muted">Authentication provider: Local</p>
          <p role="status" aria-live="polite">
            {preferences.loginMessage}
          </p>
        </section>
      </section>
      <section
        className="settings-group"
        aria-labelledby="integrations-group-title"
      >
        <header className="settings-group-heading">
          <div>
            <p className="kicker">CONNECTED SERVICES</p>
            <h2 id="integrations-group-title">Integrations</h2>
          </div>
          <p className="muted">Optional services and future connections.</p>
        </header>
        <div className="integration-grid">
          <section className="panel integration-card">
            <div className="integration-heading">
              <span className="integration-symbol">
                <Cloud aria-hidden="true" />
              </span>
              <span className="pill">NOT CONNECTED</span>
            </div>
            <h3>Weather</h3>
            <p className="muted">A quick glance at the day outside.</p>
            <p className="privacy-tag">
              No location access. No weather requests.
            </p>
          </section>
          <section className="panel integration-card">
            <div className="integration-heading">
              <span className="integration-symbol">
                <Plus aria-hidden="true" />
              </span>
              <span className="pill">PLANNED</span>
            </div>
            <h3>More real-time trackers</h3>
            <p className="muted">
              Room for the signals that matter to your day.
            </p>
          </section>
        </div>
      </section>
      <section className="settings-group reminder-settings-group">
        <header className="settings-group-heading">
          <div>
            <p className="kicker">ROUTINES</p>
            <h2>Reminder settings</h2>
          </div>
          <Link className="section-link command-button" to="/activity">
            Go to Activity
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>
      </section>
    </>
  );
}
