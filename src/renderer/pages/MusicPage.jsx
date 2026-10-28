import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  MAX_AUDIO_BYTES,
  deleteLibraryFile,
  isAudioFile,
  loadLibraryFile,
  loadLibraryFiles,
  saveAudioFile,
  saveLibraryFiles,
} from "../lib/musicLibrary";

const storageKey = "little-reset-music-library";
const themes = [
  ["moss", "Moss"],
  ["ocean", "Ocean"],
  ["sunset", "Sunset"],
  ["aurora", "Aurora"],
  ["berry", "Berry"],
  ["neon", "Neon"],
  ["lavender", "Lavender"],
];
const visualizers = [
  ["bars", "Bars"],
  ["wave", "Wave"],
  ["orbit", "Orbit"],
];
const defaultMusic = {
  trackName: "",
  trackType: "",
  trackSizeBytes: 0,
  theme: "moss",
  glassEffect: true,
  transparency: 82,
  visualizer: "bars",
  volume: 55,
};
const emptyLibrary = { soundcloud: [], favorites: [], playlists: [] };

function readLibraryState() {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return emptyLibrary;
  const value = JSON.parse(stored);
  if (!value || typeof value !== "object")
    throw new Error("Saved music library data is invalid.");
  return {
    soundcloud: Array.isArray(value.soundcloud)
      ? value.soundcloud.filter((track) => {
          if (
            !track ||
            typeof track.id !== "string" ||
            typeof track.name !== "string" ||
            typeof track.url !== "string"
          ) {
            return false;
          }
          try {
            return soundcloudUrl(track.url) === track.url;
          } catch {
            return false;
          }
        })
      : [],
    favorites: Array.isArray(value.favorites)
      ? value.favorites.filter((id) => typeof id === "string")
      : [],
    playlists: Array.isArray(value.playlists)
      ? value.playlists
          .filter(
            (list) =>
              list &&
              typeof list.id === "string" &&
              typeof list.name === "string" &&
              Array.isArray(list.trackIds),
          )
          .map((list) => ({
            ...list,
            trackIds: list.trackIds.filter((id) => typeof id === "string"),
          }))
      : [],
  };
}

function soundcloudUrl(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid SoundCloud track or playlist URL.");
  }
  if (
    url.protocol !== "https:" ||
    !["soundcloud.com", "www.soundcloud.com", "on.soundcloud.com"].includes(
      url.hostname,
    )
  ) {
    throw new Error(
      "Use an https://soundcloud.com or https://on.soundcloud.com link.",
    );
  }
  return url.href;
}

function soundcloudEmbedUrl(url) {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&visual=true&auto_play=false&show_artwork=true`;
}

function displayTrackName(track) {
  return track.name.split("/").pop()?.trim() || track.name;
}

export default function MusicPage({ preferences }) {
  const picker = useRef(null);
  const audio = useRef(null);
  const savedMusic = preferences.draft?.music ?? defaultMusic;
  const [music, setMusic] = useState(savedMusic);
  const [localTracks, setLocalTracks] = useState([]);
  const [library, setLibrary] = useState(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading your local music library...");
  const [filter, setFilter] = useState("all");
  const [activeTrack, setActiveTrack] = useState(null);
  const [audioSource, setAudioSource] = useState("");
  const [playing, setPlaying] = useState(false);
  const [soundcloudInput, setSoundcloudInput] = useState("");
  const [playlistInput, setPlaylistInput] = useState("");
  const [playlistSelection, setPlaylistSelection] = useState("");

  useEffect(() => setMusic(savedMusic), [savedMusic]);
  useEffect(
    () => () =>
      window.dispatchEvent(
        new CustomEvent("music:theme-preview", { detail: null }),
      ),
    [],
  );
  const tracks = useMemo(
    () => [...localTracks, ...library.soundcloud],
    [localTracks, library.soundcloud],
  );
  const visibleTracks =
    filter === "favorites"
      ? tracks.filter((track) => library.favorites.includes(track.id))
      : filter.startsWith("playlist:")
        ? tracks.filter((track) =>
            library.playlists
              .find((list) => list.id === filter.slice(9))
              ?.trackIds.includes(track.id),
          )
        : tracks;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadLibraryFiles(), Promise.resolve().then(readLibraryState)])
      .then(([files, saved]) => {
        if (cancelled) return;
        setLocalTracks(
          files.map(({ id, file }) => ({
            id,
            type: "local",
            name: file.webkitRelativePath || file.name,
            size: file.size,
            mimeType: file.type,
          })),
        );
        setLibrary(saved);
        setReady(true);
        setMessage("");
      })
      .catch((error) => {
        if (!cancelled) {
          setReady(true);
          setMessage(`Could not load music library: ${error.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(library));
    } catch (error) {
      setMessage(`Could not save your music library: ${error.message}`);
    }
  }, [library, ready]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    setPlaying(false);
    setAudioSource("");
    if (!activeTrack || activeTrack.type !== "local") return () => {};
    loadLibraryFile(activeTrack.id)
      .then((file) => {
        if (cancelled) return;
        if (!file) {
          setMessage(
            "This local track is no longer available. Import its folder again.",
          );
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setAudioSource(objectUrl);
        setMessage(`Ready to play ${activeTrack.name}`);
      })
      .catch((error) => {
        if (!cancelled) setMessage(`Could not load track: ${error.message}`);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeTrack]);

  useEffect(() => {
    if (audio.current) audio.current.volume = (music.volume ?? 55) / 100;
  }, [music.volume, audioSource]);

  useEffect(() => {
    const pauseForHeaderPlayer = (event) => {
      if (event.detail !== "header") return;
      audio.current?.pause();
      setPlaying(false);
    };
    const syncHeaderVolume = (event) => {
      if (!Number.isInteger(event.detail)) return;
      setMusic((current) => ({ ...current, volume: event.detail }));
    };
    window.addEventListener("music:other-play", pauseForHeaderPlayer);
    window.addEventListener("music:volume-change", syncHeaderVolume);
    return () => {
      window.removeEventListener("music:other-play", pauseForHeaderPlayer);
      window.removeEventListener("music:volume-change", syncHeaderVolume);
    };
  }, []);

  async function importFolder(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const audioFiles = files.filter(isAudioFile);
    const oversized = audioFiles.filter((file) => file.size > MAX_AUDIO_BYTES);
    const accepted = audioFiles.filter((file) => file.size <= MAX_AUDIO_BYTES);
    if (!accepted.length) {
      setMessage(
        oversized.length
          ? "Audio files must be smaller than 100 MB each."
          : "No supported audio files found in that folder.",
      );
      return;
    }
    try {
      const entries = accepted.map((file) => ({
        id: `local-${file.webkitRelativePath || file.name}-${file.size}-${file.lastModified}`,
        file,
      }));
      await saveLibraryFiles(entries);
      setLocalTracks((current) => {
        const byId = new Map(current.map((track) => [track.id, track]));
        entries.forEach(({ id, file }) =>
          byId.set(id, {
            id,
            type: "local",
            name: file.webkitRelativePath || file.name,
            size: file.size,
            mimeType: file.type,
          }),
        );
        return [...byId.values()].sort((first, second) =>
          first.name.localeCompare(second.name),
        );
      });
      setMessage(
        `${accepted.length} audio ${accepted.length === 1 ? "file" : "files"} added to your local library.${oversized.length ? ` ${oversized.length} oversized file(s) skipped.` : ""}`,
      );
    } catch (error) {
      setMessage(`Could not import folder: ${error.message}`);
    }
  }

  function addSoundCloud(event) {
    event.preventDefault();
    try {
      const url = soundcloudUrl(soundcloudInput);
      const track = {
        id: `soundcloud-${encodeURIComponent(url)}`,
        type: "soundcloud",
        name:
          new URL(url).pathname.split("/").filter(Boolean).join(" / ") ||
          "SoundCloud playlist",
        url,
      };
      setLibrary((current) => ({
        ...current,
        soundcloud: current.soundcloud.some((item) => item.id === track.id)
          ? current.soundcloud
          : [...current.soundcloud, track],
      }));
      setActiveTrack(track);
      audio.current?.pause();
      window.dispatchEvent(
        new CustomEvent("music:other-play", { detail: "page" }),
      );
      setSoundcloudInput("");
      setMessage("SoundCloud link added. Playback is provided by SoundCloud.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function selectTrack(track) {
    setActiveTrack(track);
    if (track.type === "soundcloud") {
      audio.current?.pause();
      window.dispatchEvent(
        new CustomEvent("music:other-play", { detail: "page" }),
      );
      setMessage("SoundCloud player ready.");
      return;
    }

    try {
      const file = await loadLibraryFile(track.id);
      if (!file) {
        setMessage(
          "This local track is no longer available. Import its folder again.",
        );
        return;
      }
      await saveAudioFile(file);
      preferences.setMusic({
        ...music,
        trackName: file.name,
        trackType: file.type || "audio/unknown",
        trackSizeBytes: file.size,
      });
    } catch (error) {
      setMessage(`Could not select track: ${error.message}`);
    }
  }

  async function removeTrack(track) {
    if (track.type === "local") {
      try {
        await deleteLibraryFile(track.id);
        setLocalTracks((current) =>
          current.filter((item) => item.id !== track.id),
        );
      } catch (error) {
        setMessage(`Could not remove track: ${error.message}`);
        return;
      }
    } else {
      setLibrary((current) => ({
        ...current,
        soundcloud: current.soundcloud.filter((item) => item.id !== track.id),
      }));
    }
    setLibrary((current) => ({
      ...current,
      favorites: current.favorites.filter((id) => id !== track.id),
      playlists: current.playlists.map((list) => ({
        ...list,
        trackIds: list.trackIds.filter((id) => id !== track.id),
      })),
    }));
    if (activeTrack?.id === track.id) {
      setActiveTrack(null);
      setAudioSource("");
    }
    setMessage("Track removed from your library.");
  }

  function toggleFavorite(track) {
    setLibrary((current) => ({
      ...current,
      favorites: current.favorites.includes(track.id)
        ? current.favorites.filter((id) => id !== track.id)
        : [...current.favorites, track.id],
    }));
  }

  function createPlaylist(event) {
    event.preventDefault();
    const name = playlistInput.trim();
    if (!name) return;
    const playlist = {
      id: `playlist-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      name,
      trackIds: [],
    };
    setLibrary((current) => ({
      ...current,
      playlists: [...current.playlists, playlist],
    }));
    setPlaylistSelection(playlist.id);
    setPlaylistInput("");
    setMessage(`Playlist “${name}” created.`);
  }

  function addToPlaylist() {
    if (!activeTrack || !playlistSelection) return;
    setLibrary((current) => ({
      ...current,
      playlists: current.playlists.map((list) =>
        list.id === playlistSelection && !list.trackIds.includes(activeTrack.id)
          ? { ...list, trackIds: [...list.trackIds, activeTrack.id] }
          : list,
      ),
    }));
    setMessage("Track added to playlist.");
  }

  async function togglePlayback() {
    if (!audio.current || !audioSource) return;
    if (audio.current.paused) {
      try {
        await audio.current.play();
        window.dispatchEvent(
          new CustomEvent("music:other-play", { detail: "page" }),
        );
      } catch {
        setMessage("This audio format could not be played by the browser.");
      }
    } else {
      audio.current.pause();
    }
  }

  function updateMusic(patch) {
    if (patch.theme) {
      window.dispatchEvent(
        new CustomEvent("music:theme-preview", { detail: patch.theme }),
      );
    }
    setMusic((current) => ({ ...current, ...patch }));
  }

  const changed = JSON.stringify(music) !== JSON.stringify(savedMusic);
  return (
    <>
      <div className="intro music-page-heading">
        <p className="kicker">YOUR LISTENING SPACE</p>
        <h1 tabIndex={-1}>Music</h1>
        <p className="muted">
          Listen to music from your device or SoundCloud. Your local library
          stays on this device.
        </p>
      </div>
      <div className="music-workspace">
        <section
          className="music-library"
          aria-labelledby="music-library-title"
        >
          <header className="music-section-heading">
            <div>
              <p className="kicker">YOUR COLLECTION</p>
              <h2 id="music-library-title">Library</h2>
            </div>
            <button
              className="planner-primary command-button"
              type="button"
              onClick={() => picker.current?.click()}
            >
              <Upload size={15} aria-hidden="true" />
              Import folder
            </button>
            <input
              ref={picker}
              className="sr-only"
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.webm"
              multiple
              webkitdirectory=""
              aria-label="Choose a music folder"
              onChange={importFolder}
            />
          </header>
          <p className="music-privacy-note">
            Supported audio under 100 MB per file is copied into local browser
            storage; your files are not uploaded.
          </p>
          <nav className="music-filters" aria-label="Music library filters">
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All tracks <span>{tracks.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={filter === "favorites"}
              onClick={() => setFilter("favorites")}
            >
              Favorites <span>{library.favorites.length}</span>
            </button>
            {library.playlists.map((list) => (
              <button
                key={list.id}
                type="button"
                aria-pressed={filter === `playlist:${list.id}`}
                onClick={() => setFilter(`playlist:${list.id}`)}
              >
                {list.name} <span>{list.trackIds.length}</span>
              </button>
            ))}
          </nav>
          <ul className="music-track-list">
            {visibleTracks.map((track) => {
              const favorite = library.favorites.includes(track.id);
              return (
                <li
                  key={track.id}
                  className="music-track"
                  aria-current={
                    activeTrack?.id === track.id ? "true" : undefined
                  }
                >
                  <button
                    className="music-track-select"
                    type="button"
                    onClick={() => selectTrack(track)}
                  >
                    <Music2 size={17} aria-hidden="true" />
                    <span>
                      <strong>{displayTrackName(track)}</strong>
                      <small>
                        {track.type === "local" ? track.name : "SoundCloud"}
                      </small>
                    </span>
                  </button>
                  <button
                    className="music-icon-button"
                    type="button"
                    aria-label={`${favorite ? "Remove from" : "Add to"} favorites: ${track.name}`}
                    aria-pressed={favorite}
                    onClick={() => toggleFavorite(track)}
                  >
                    <Heart
                      size={16}
                      aria-hidden="true"
                      fill={favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="music-icon-button"
                    type="button"
                    aria-label={`Remove ${track.name} from library`}
                    onClick={() => removeTrack(track)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
            {!visibleTracks.length && (
              <li className="music-empty">
                {filter === "favorites"
                  ? "Favorite tracks will appear here."
                  : filter.startsWith("playlist:")
                    ? "This playlist is empty."
                    : "Import a music folder or add a SoundCloud link to get started."}
              </li>
            )}
          </ul>
          <p className="music-status" role="status" aria-live="polite">
            {message}
          </p>
        </section>
        <div className="music-right-column">
          <section
            className="music-player-card"
            data-theme={music.theme}
            data-glass={music.glassEffect ?? true}
            style={{
              "--music-transparency": `${music.transparency ?? 82}%`,
            }}
            aria-labelledby="music-player-title"
          >
            <p className="kicker">NOW PLAYING</p>
            <h2 id="music-player-title">
              {activeTrack ? displayTrackName(activeTrack) : "Select a track"}
            </h2>
            <div
              className="music-page-visualizer"
              data-playing={playing}
              data-visualizer={music.visualizer}
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4].map((bar) => (
                <i key={bar} style={{ "--bar-index": bar }} />
              ))}
            </div>
            {activeTrack?.type === "soundcloud" ? (
              <iframe
                className="soundcloud-embed"
                title={`SoundCloud player: ${activeTrack.name}`}
                src={soundcloudEmbedUrl(activeTrack.url)}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <>
                <audio
                  ref={audio}
                  src={audioSource || undefined}
                  preload="metadata"
                  onPlay={() => {
                    setPlaying(true);
                    setMessage("Now playing.");
                  }}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
                <div className="music-player-controls">
                  <button
                    className="planner-primary music-play-button"
                    type="button"
                    aria-label={playing ? "Pause track" : "Play track"}
                    disabled={!audioSource}
                    onClick={togglePlayback}
                  >
                    {playing ? (
                      <Pause size={18} aria-hidden="true" />
                    ) : (
                      <Play size={18} aria-hidden="true" />
                    )}
                    {playing ? "Pause" : "Play"}
                  </button>
                  <label className="music-volume">
                    Volume <output>{music.volume}%</output>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={music.volume}
                      onChange={(event) =>
                        updateMusic({ volume: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>
              </>
            )}
            {activeTrack && (
              <div className="music-playlist-add">
                <label htmlFor="playlist-selection">
                  Add current track to playlist
                </label>
                <div>
                  <select
                    id="playlist-selection"
                    value={playlistSelection}
                    onChange={(event) =>
                      setPlaylistSelection(event.target.value)
                    }
                  >
                    <option value="">Choose playlist</option>
                    {library.playlists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!playlistSelection}
                    onClick={addToPlaylist}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>
            )}
          </section>
          <div className="music-secondary-grid">
            <section
              className="music-feature-card"
              aria-labelledby="soundcloud-title"
            >
              <p className="kicker">STREAMING</p>
              <h2 id="soundcloud-title">SoundCloud</h2>
              <p className="muted">
                Add a public track or playlist link. SoundCloud provides the
                embedded player and its playback controls.
              </p>
              <form className="music-add-form" onSubmit={addSoundCloud}>
                <label htmlFor="soundcloud-url">SoundCloud URL</label>
                <div>
                  <input
                    id="soundcloud-url"
                    type="url"
                    value={soundcloudInput}
                    onChange={(event) => setSoundcloudInput(event.target.value)}
                    placeholder="https://soundcloud.com/artist/track"
                  />
                  <button
                    className="planner-primary command-button"
                    type="submit"
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add link
                  </button>
                </div>
              </form>
            </section>
            <section
              className="music-feature-card"
              aria-labelledby="playlists-title"
            >
              <p className="kicker">ORGANIZE</p>
              <h2 id="playlists-title">
                <ListMusic size={19} aria-hidden="true" /> Playlists
              </h2>
              <form className="music-add-form" onSubmit={createPlaylist}>
                <label htmlFor="playlist-name">New playlist</label>
                <div>
                  <input
                    id="playlist-name"
                    value={playlistInput}
                    onChange={(event) => setPlaylistInput(event.target.value)}
                    maxLength={60}
                    placeholder="Focus mix"
                  />
                  <button
                    className="planner-primary command-button"
                    type="submit"
                  >
                    <Plus size={15} aria-hidden="true" />
                    Create
                  </button>
                </div>
              </form>
              <ul className="music-playlist-list">
                {library.playlists.map((list) => (
                  <li key={list.id}>
                    <button
                      type="button"
                      onClick={() => setFilter(`playlist:${list.id}`)}
                    >
                      {list.name}
                      <small>{list.trackIds.length} tracks</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section
            className="music-preferences"
            aria-labelledby="music-preferences-title"
          >
            <header className="music-section-heading">
              <div>
                <p className="kicker">PLAYER APPEARANCE</p>
                <h2 id="music-preferences-title">Music settings</h2>
              </div>
              <p className="muted">Customize your player.</p>
            </header>
            <fieldset
              className="music-theme-choices"
              disabled={preferences.saving}
            >
              <legend>Player theme</legend>
              {themes.map(([value, name]) => (
                <label
                  key={value}
                  className={`music-theme-option theme-${value}`}
                >
                  <input
                    type="radio"
                    name="music-theme"
                    value={value}
                    checked={music.theme === value}
                    onChange={() => updateMusic({ theme: value })}
                  />
                  <span aria-hidden="true" />
                  <strong>{name}</strong>
                </label>
              ))}
            </fieldset>
            <label className="music-glass-toggle">
              <input
                type="checkbox"
                aria-label="Glass player effect"
                checked={music.glassEffect ?? true}
                disabled={preferences.saving}
                onChange={(event) =>
                  updateMusic({ glassEffect: event.target.checked })
                }
              />
              <span>
                <strong>Glass player effect</strong>
                <small>Use a translucent, blurred glass surface.</small>
              </span>
            </label>
            <label className="music-transparency">
              Transparency <output>{music.transparency ?? 82}%</output>
              <input
                aria-label="Player transparency"
                type="range"
                min="20"
                max="100"
                step="1"
                value={music.transparency ?? 82}
                disabled={preferences.saving || !(music.glassEffect ?? true)}
                onChange={(event) =>
                  updateMusic({ transparency: Number(event.target.value) })
                }
              />
            </label>
            <div className="music-setting-row">
              <div>
                <h3>Visualizer</h3>
                <p className="muted">Animation shown while music plays.</p>
              </div>
              <div
                className="view-switch"
                role="group"
                aria-label="Music visualizer"
              >
                {visualizers.map(([value, name]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={music.visualizer === value}
                    onClick={() => updateMusic({ visualizer: value })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="music-settings-footer">
              <p role="status" aria-live="polite">
                {preferences.musicMessage}
              </p>
              <button
                className="planner-primary"
                type="button"
                disabled={!changed || preferences.saving}
                onClick={() => preferences.setMusic(music)}
              >
                Save music settings
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
