import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Music2,
  Pause,
  Play,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { loadAudioFile } from "../lib/musicLibrary";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

const getPanelPosition = (launcher) => {
  const header = launcher.current?.closest(".site-header");
  if (!header) return { top: "96px", right: "20px" };
  const bounds = header.getBoundingClientRect();
  return {
    top: `${Math.max(12, Math.round(bounds.bottom + 12))}px`,
    right: `${Math.max(12, Math.round(window.innerWidth - bounds.right))}px`,
  };
};

export function MusicPlayer({ music, onVolumeChange }) {
  const audio = useRef(null);
  const launcher = useRef(null);
  const [source, setSource] = useState("");
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(music?.volume ?? 55);
  const [panelPosition, setPanelPosition] = useState(null);
  const [message, setMessage] = useState("Choose a track in Music");
  const [themePreview, setThemePreview] = useState(null);

  useEffect(() => {
    const previewTheme = (event) => {
      setThemePreview(typeof event.detail === "string" ? event.detail : null);
    };
    window.addEventListener("music:theme-preview", previewTheme);
    return () =>
      window.removeEventListener("music:theme-preview", previewTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    setPlaying(false);
    setPosition(0);
    if (!music?.trackName) {
      setSource("");
      setMessage("Choose a track in Music");
      return () => {
        cancelled = true;
      };
    }
    loadAudioFile()
      .then((file) => {
        if (cancelled) return;
        if (!file) {
          setSource("");
          setMessage("Audio file unavailable. Choose it again in Music.");
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setSource(objectUrl);
        setMessage("Ready to play");
      })
      .catch((error) => {
        if (!cancelled) {
          setSource("");
          setMessage(error.message);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [music?.trackName, music?.trackSizeBytes]);

  useEffect(() => {
    const nextVolume = music?.volume ?? 55;
    setVolume(nextVolume);
    if (audio.current) audio.current.volume = nextVolume / 100;
  }, [music?.volume, source]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => setPanelPosition(getPanelPosition(launcher));
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, { passive: true });
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition);
    };
  }, [open]);

  useEffect(() => {
    const pauseForOtherPlayer = (event) => {
      if (event.detail !== "page") return;
      audio.current?.pause();
    };
    window.addEventListener("music:other-play", pauseForOtherPlayer);
    return () =>
      window.removeEventListener("music:other-play", pauseForOtherPlayer);
  }, []);

  async function togglePlayback() {
    if (!audio.current || !source) return;
    if (audio.current.paused) {
      try {
        await audio.current.play();
        window.dispatchEvent(
          new CustomEvent("music:other-play", { detail: "header" }),
        );
      } catch {
        setMessage("This audio format could not be played.");
      }
    } else audio.current.pause();
  }

  function changeVolume(amount) {
    const nextVolume = Math.max(0, Math.min(100, volume + amount));
    setVolume(nextVolume);
    if (audio.current) audio.current.volume = nextVolume / 100;
    onVolumeChange?.({ ...music, volume: nextVolume });
    window.dispatchEvent(
      new CustomEvent("music:volume-change", { detail: nextVolume }),
    );
  }

  function setVolumeFromSlider(value) {
    const nextVolume = Number(value);
    setVolume(nextVolume);
    if (audio.current) audio.current.volume = nextVolume / 100;
    onVolumeChange?.({ ...music, volume: nextVolume });
    window.dispatchEvent(
      new CustomEvent("music:volume-change", { detail: nextVolume }),
    );
  }

  return (
    <>
      <div className="music-dock" data-playing={playing}>
        <button
          ref={launcher}
          className="music-launcher"
          data-theme={themePreview ?? music?.theme ?? "moss"}
          data-glass={music?.glassEffect ?? true}
          data-playing={playing}
          style={{
            "--music-transparency": `${music?.transparency ?? 82}%`,
          }}
          type="button"
          aria-label="Open music player"
          aria-expanded={open}
          aria-controls="music-player-panel"
          onClick={() => {
            setPanelPosition(getPanelPosition(launcher));
            setOpen(true);
          }}
        >
          <Music2 size={17} aria-hidden="true" />
          <span>
            <strong>{music?.trackName || "Music player"}</strong>
            <small>
              {playing
                ? "Now playing"
                : music?.trackName
                  ? "Ready to play"
                  : "Choose a track"}
            </small>
          </span>
          <span className="music-launcher-indicator" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <ChevronDown
            className="music-launcher-chevron"
            size={15}
            aria-hidden="true"
          />
        </button>
      </div>
      {createPortal(
        <section
          id="music-player-panel"
          className="music-player"
          data-theme={themePreview ?? music?.theme ?? "moss"}
          data-glass={music?.glassEffect ?? true}
          data-visualizer={music?.visualizer ?? "bars"}
          data-playing={playing}
          style={{
            ...panelPosition,
            "--music-transparency": `${music?.transparency ?? 82}%`,
          }}
          aria-label="Music player"
          hidden={!open}
        >
          <audio
            ref={audio}
            src={source || undefined}
            preload="metadata"
            onLoadedMetadata={(event) =>
              setDuration(event.currentTarget.duration)
            }
            onTimeUpdate={(event) =>
              setPosition(event.currentTarget.currentTime)
            }
            onPlay={() => {
              setPlaying(true);
              setMessage("Now playing");
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setPosition(0);
            }}
          />
          <span className="music-player-icon">
            <Music2 size={17} aria-hidden="true" />
          </span>
          <div className="music-player-track">
            <strong title={music?.trackName || "No track selected"}>
              {music?.trackName || "No track selected"}
            </strong>
            <small>{message}</small>
          </div>
          <div className="music-visualizer" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => (
              <i key={bar} style={{ "--bar-index": bar }} />
            ))}
          </div>
          <button
            className="music-control"
            type="button"
            aria-label={playing ? "Pause music" : "Play music"}
            disabled={!source}
            onClick={togglePlayback}
          >
            {playing ? (
              <Pause size={17} aria-hidden="true" />
            ) : (
              <Play size={17} aria-hidden="true" />
            )}
          </button>
          <Link
            className="music-settings-link"
            to="/music"
            aria-label="Open music settings"
            title="Music settings"
            onClick={() => setOpen(false)}
          >
            <Settings2 size={16} aria-hidden="true" />
          </Link>
          <div className="music-player-progress">
            <span>{formatTime(position)}</span>
            <input
              aria-label="Seek music"
              type="range"
              min="0"
              max={duration || 0}
              step="1"
              value={Math.min(position, duration || 0)}
              disabled={!source || !duration}
              onChange={(event) => {
                audio.current.currentTime = Number(event.target.value);
                setPosition(Number(event.target.value));
              }}
            />
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="music-player-volume"
            role="group"
            aria-label="Music volume"
          >
            <button
              type="button"
              className="music-volume-rocker"
              aria-label="Decrease music volume"
              title="Volume down"
              disabled={volume === 0}
              onClick={() => changeVolume(-5)}
            >
              <Volume1 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="music-volume-icon"
              aria-label={volume === 0 ? "Music muted" : "Music volume"}
              title={`${volume}% volume`}
            >
              {volume === 0 ? (
                <VolumeX size={15} aria-hidden="true" />
              ) : (
                <Volume2 size={15} aria-hidden="true" />
              )}
            </button>
            <input
              aria-label="Set music volume"
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={(event) => setVolumeFromSlider(event.target.value)}
            />
            <output>{volume}%</output>
            <button
              type="button"
              className="music-volume-rocker"
              aria-label="Increase music volume"
              title="Volume up"
              disabled={volume === 100}
              onClick={() => changeVolume(5)}
            >
              <Volume2 size={15} aria-hidden="true" />
            </button>
          </div>
          <button
            className="music-player-close"
            type="button"
            aria-label="Close music player"
            onClick={() => {
              setOpen(false);
              launcher.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </section>,
        document.body,
      )}
    </>
  );
}
