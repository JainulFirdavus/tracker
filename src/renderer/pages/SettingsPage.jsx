import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Cloud, Music2, Plus, Trash2, Type, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clearAudioFile, isAudioFile, MAX_AUDIO_BYTES, saveAudioFile } from '../lib/musicLibrary';

const themes = ['forest', 'paper', 'ocean', 'rose', 'graphite'];
const dashboardFonts = [
  ['system', 'System UI', 'Native to this device'],
  ['dm-sans', 'DM Sans', 'Compact and clear at UI sizes'],
  ['manrope', 'Manrope', 'Crisp numerals and metrics'],
  ['plus-jakarta-sans', 'Plus Jakarta Sans', 'Friendly product interface'],
  ['space-grotesk', 'Space Grotesk', 'Distinctive technical character'],
  ['lexend', 'Lexend', 'Comfortable long-form reading']
];
const musicThemes = [['moss', 'Moss'], ['ocean', 'Ocean'], ['sunset', 'Sunset']];
const visualizers = [['bars', 'Bars'], ['wave', 'Wave'], ['orbit', 'Orbit']];
const defaultMusic = { trackName: '', trackType: '', trackSizeBytes: 0, theme: 'moss', visualizer: 'bars', volume: 55 };

function MusicSettings({ preferences }) {
  const savedMusic = preferences.draft.music ?? defaultMusic;
  const [music, setMusic] = useState(savedMusic);
  const [fileMessage, setFileMessage] = useState('');
  const fileInput = useRef(null);
  useEffect(() => setMusic(savedMusic), [savedMusic]);

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isAudioFile(file)) { setFileMessage('Choose an audio file such as MP3, M4A, WAV, or OGG.'); return; }
    if (file.size > MAX_AUDIO_BYTES) { setFileMessage('Choose an audio file smaller than 100 MB.'); return; }
    try {
      await saveAudioFile(file);
      setMusic(current => ({ ...current, trackName: file.name, trackType: file.type || 'audio/unknown', trackSizeBytes: file.size }));
      setFileMessage('Audio stored on this device. Save music settings to use it.');
    } catch (error) { setFileMessage(error.message); }
  }

  async function removeFile() {
    try {
      await clearAudioFile();
      setMusic(current => ({ ...current, trackName: '', trackType: '', trackSizeBytes: 0 }));
      setFileMessage('Audio removed from this device. Save music settings to confirm.');
    } catch (error) { setFileMessage(error.message); }
  }

  const changed = JSON.stringify(music) !== JSON.stringify(savedMusic);
  return <details className="music-settings">
    <summary><Music2 size={17} aria-hidden="true" /><span>Music player</span><small>{music.trackName || 'Choose a local track'}</small></summary>
    <div className="music-settings-content">
      <div className="music-setting-row music-file-row">
        <div><h3>Audio file</h3><p className="muted">Choose a local file up to 100 MB. Audio stays in this browser profile.</p></div>
        <div className="music-file-actions">
          <input ref={fileInput} className="sr-only" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.webm" aria-label="Choose an audio file" onChange={chooseFile} />
          <button className="planner-primary command-button" type="button" onClick={() => fileInput.current?.click()}><Upload size={15} aria-hidden="true" />Choose file</button>
          {music.trackName && <button className="icon-button" type="button" aria-label="Remove selected audio" onClick={removeFile}><Trash2 size={16} aria-hidden="true" /></button>}
        </div>
      </div>
      <div className="music-track-details"><strong>{music.trackName || 'No track selected'}</strong>{music.trackName && <small>{music.trackType} · {(music.trackSizeBytes / 1048576).toFixed(1)} MB</small>}</div>
      <p className="music-file-note">For privacy, browsers do not expose the full filesystem path. The track is saved locally and its filename is shown here.</p>
      <fieldset className="music-theme-choices" disabled={preferences.saving}><legend>Player theme</legend>{musicThemes.map(([value, name]) => <label key={value} className={`music-theme-option theme-${value}`}><input type="radio" name="music-theme" value={value} checked={music.theme === value} onChange={() => setMusic(current => ({ ...current, theme: value }))} /><span aria-hidden="true" /><strong>{name}</strong></label>)}</fieldset>
      <div className="music-setting-row music-visualizer-setting"><div><h3>Visualizer</h3><p className="muted">Animation shown while music plays.</p></div><div className="view-switch" role="group" aria-label="Music visualizer">{visualizers.map(([value, label]) => <button key={value} type="button" aria-pressed={music.visualizer === value} onClick={() => setMusic(current => ({ ...current, visualizer: value }))}>{label}</button>)}</div></div>
      <label className="music-volume">Volume <output>{music.volume}%</output><input type="range" min="0" max="100" step="1" value={music.volume} onChange={event => setMusic(current => ({ ...current, volume: Number(event.target.value) }))} /></label>
      <div className="music-settings-footer"><p role="status" aria-live="polite">{fileMessage || preferences.musicMessage}</p><button className="planner-primary" type="button" disabled={!changed || preferences.saving} onClick={() => preferences.setMusic(music)}>Save music settings</button></div>
    </div>
  </details>;
}

export function SettingsPage({ preferences }) {
  const selectedFont = dashboardFonts.find(([value]) => value === (preferences.draft.dashboardFont ?? 'system')) ?? dashboardFonts[0];
  return <>
    <div className="intro"><p className="kicker">YOUR PREFERENCES</p><h1 tabIndex={-1}>Settings</h1></div>
    <section className="settings-group" aria-labelledby="appearance-group-title">
      <header className="settings-group-heading"><div><p className="kicker">DISPLAY</p><h2 id="appearance-group-title">Appearance</h2></div><p className="muted">Make the dashboard comfortable to read.</p></header>
      <section className="dashboard-appearance typography-appearance" aria-labelledby="typography-title">
        <div className="typography-heading"><div><h3 id="typography-title">Typography</h3><p className="muted">Choose one readable typeface for the whole interface.</p></div><Type size={19} aria-hidden="true" /></div>
        <label className="font-family-select">Interface font<select aria-label="Interface font" value={selectedFont[0]} disabled={preferences.saving} onChange={event => preferences.setFont(event.target.value)}>{dashboardFonts.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
        <div className="font-specimen" aria-live="polite"><span aria-hidden="true">Aa</span><div><strong>{selectedFont[1]}</strong><p>The quick reset makes room for a clearer day.</p><small>{selectedFont[2]}</small></div></div>
        <p className="typography-status" role="status" aria-live="polite">{preferences.fontMessage}</p>
      </section>
      <section className="dashboard-appearance" aria-labelledby="dashboard-appearance-title"><h3 id="dashboard-appearance-title">Dashboard theme</h3>
        <fieldset id="dashboard-theme-options" className="dashboard-theme-options" disabled={preferences.saving}><legend className="sr-only">Dashboard theme</legend>{themes.map(theme =>
          <label className="dashboard-theme-option" data-palette={theme} key={theme}><input type="radio" name="dashboard-theme" value={theme} checked={preferences.draft.dashboardTheme === theme} onChange={() => preferences.setTheme(theme)} /><span className="dashboard-palette" aria-hidden="true"><span /><span /><span /></span><strong>{theme[0].toUpperCase() + theme.slice(1)}</strong></label>
        )}</fieldset>
        <p id="dashboard-theme-status" role="status" aria-live="polite">{preferences.themeMessage}</p>
      </section>
    </section>
    <section className="settings-group" aria-labelledby="access-group-title">
      <header className="settings-group-heading"><div><p className="kicker">PRIVACY</p><h2 id="access-group-title">Access</h2></div><p className="muted">Control who can open your dashboard.</p></header>
      <section className="dashboard-appearance" aria-labelledby="dashboard-login-title">
        <h3 id="dashboard-login-title">Dashboard access</h3>
        <label className="login-toggle"><input type="checkbox" checked={preferences.draft.loginEnabled === true} disabled={preferences.saving || preferences.dirty} onChange={event => preferences.setLogin(event.target.checked)} />Require login</label>
        <p className="muted">Authentication provider: Local</p>
        <p role="status" aria-live="polite">{preferences.loginMessage}</p>
      </section>
    </section>
    <section className="settings-group" aria-labelledby="audio-group-title">
      <header className="settings-group-heading"><div><p className="kicker">LISTENING</p><h2 id="audio-group-title">Audio</h2></div><p className="muted">Choose a local track and playback style.</p></header>
      <MusicSettings preferences={preferences} />
    </section>
    <section className="settings-group" aria-labelledby="integrations-group-title">
      <header className="settings-group-heading"><div><p className="kicker">CONNECTED SERVICES</p><h2 id="integrations-group-title">Integrations</h2></div><p className="muted">Optional services and future connections.</p></header>
      <div className="integration-grid">
        <section className="panel integration-card"><div className="integration-heading"><span className="integration-symbol"><Cloud aria-hidden="true" /></span><span className="pill">NOT CONNECTED</span></div><h3>Weather</h3><p className="muted">A quick glance at the day outside.</p><p className="privacy-tag">No location access. No weather requests.</p></section>
        <section className="panel integration-card"><div className="integration-heading"><span className="integration-symbol"><Plus aria-hidden="true" /></span><span className="pill">PLANNED</span></div><h3>More real-time trackers</h3><p className="muted">Room for the signals that matter to your day.</p></section>
      </div>
    </section>
    <section className="settings-group reminder-settings-group"><header className="settings-group-heading"><div><p className="kicker">ROUTINES</p><h2>Reminder settings</h2></div><Link className="section-link command-button" to="/activity">Go to Activity<ArrowRight size={14} aria-hidden="true" /></Link></header></section>
  </>;
}