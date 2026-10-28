import { useState } from "react";
import {
  AlertTriangle,
  Cloud,
  Droplets,
  LogOut,
  Menu,
  Wind,
} from "lucide-react";
import { request } from "../lib/api";
import { getCurrentWeather, getLocationError } from "../lib/weather";
import { IconButton } from "../components/IconButton";
import { MusicPlayer } from "../components/MusicPlayer";

export function SiteHeader({
  authentication,
  label,
  tracker,
  music,
  onMusicVolumeChange,
  onToggleSidebar,
  toggleLabel,
  mobileLayout,
  mobileDrawerOpen,
  sidebarCollapsed,
}) {
  const [logoutError, setLogoutError] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);

  async function loadWeather() {
    if (weatherLoading) return;
    setWeatherLoading(true);
    setWeatherError("");
    try {
      setWeather(await getCurrentWeather());
    } catch (failure) {
      setWeatherError(getLocationError(failure));
    } finally {
      setWeatherLoading(false);
    }
  }

  async function logout() {
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
      window.dispatchEvent(new Event("auth:changed"));
    } catch (failure) {
      setLogoutError(failure.message);
    }
  }

  return (
    <header className="site-header">
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={toggleLabel}
        aria-expanded={mobileLayout ? mobileDrawerOpen : !sidebarCollapsed}
        aria-controls="main-sidebar"
        onClick={onToggleSidebar}
      >
        <Menu size={19} aria-hidden="true" />
      </button>
      <div className="page-location">
        <span className="kicker">YOUR WORKDAY COMPANION</span>
        <strong id="page-label">{label}</strong>
      </div>
      <MusicPlayer music={music} onVolumeChange={onMusicVolumeChange} />
      <button
        className="weather-widget"
        type="button"
        onClick={loadWeather}
        disabled={weatherLoading}
        aria-label={
          weatherError ||
          (weather
            ? `Refresh local weather. ${weather.temperature}${weather.temperatureUnit}, humidity ${weather.humidity} percent, wind ${weather.windSpeed} ${weather.windSpeedUnit}.`
            : "Get local weather. Your location is only used to request current conditions.")
        }
        title={
          weatherError || "Select to get current weather for your location."
        }
      >
        <Cloud className="weather-symbol" size={24} aria-hidden="true" />
        <span>
          <strong>
            {weather
              ? `${weather.temperature}${weather.temperatureUnit}`
              : "Weather"}
          </strong>
          <small>
            {weatherLoading ? (
              "Getting local weather..."
            ) : weather ? (
              <>
                <span>
                  <Droplets size={11} aria-hidden="true" /> {weather.humidity}%
                </span>
                {" · "}
                <span>
                  <Wind size={11} aria-hidden="true" /> {weather.windSpeed}{" "}
                  {weather.windSpeedUnit}
                </span>
              </>
            ) : (
              weatherError || "Select for local weather"
            )}
          </small>
        </span>
      </button>
      <span className="connection" id="connection">
        {tracker.error && (
          <AlertTriangle
            size={17}
            className="connection-warning"
            role="img"
            aria-label={`Tracker unavailable: ${tracker.error}`}
            title={`Tracker unavailable: ${tracker.error}`}
          />
        )}
      </span>
      {authentication.enabled && (
        <div className="account-controls">
          <span>{authentication.username}</span>
          <IconButton icon={LogOut} label="Sign out" onClick={logout} />
          {logoutError && <span role="alert">{logoutError}</span>}
        </div>
      )}
    </header>
  );
}
