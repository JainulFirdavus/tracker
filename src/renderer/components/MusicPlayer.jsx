
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Music2, Pause, Play, Settings2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadAudioFile } from '../lib/musicLibrary';

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const getPanelPosition = launcher => {
  const header = launcher.current?.closest('.site-header');
  if (!header) return { top: '96px', right: '20px' };
  const bounds = header.getBoundingClientRect();
  return {
    top: `${Math.max(12, Math.round(bounds.bottom + 12))}px`,
    right: `${Math.max(12, Math.round(window.innerWidth - bounds.right))}px`
  };
};


export function MusicPlayer({ music }) {
  const audio = useRef(null);
  const launcher = useRef(null);
  const [source, setSource] = useState('');
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [panelPosition, setPanelPosition] = useState(null);
  const [message, setMessage] = useState('Choose a track in Settings');

  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    setPlaying(false);
    setPosition(0);
    if (!music?.trackName) {
      setSource('');
      setMessage('Choose a track in Settings');
      return () => { cancelled = true; };
    }
    loadAudioFile().then(file => {
      if (cancelled) return;
      if (!file) {
        setSource('');
        setMessage('Audio file unavailable. Choose it again in Settings.');
        return;
      }
      objectUrl = URL.createObjectURL(file);
      setSource(objectUrl);
      setMessage('Ready to play');
    }).catch(error => {
      if (!cancelled) { setSource(''); setMessage(error.message); }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [music?.trackName, music?.trackSizeBytes]);

  useEffect(() => {
    if (audio.current) audio.current.volume = (music?.volume ?? 55) / 100;
  }, [music?.volume, source]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => setPanelPosition(getPanelPosition(launcher));
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition);
    };
  }, [open]);

  async function togglePlayback() {
    if (!audio.current || !source) return;
    if (audio.current.paused) {
      try { await audio.current.play(); }
      catch { setMessage('This audio format could not be played.'); }
    } else audio.current.pause();
  }

  return <>
    <div className="music-dock" data-playing={playing}>
    <button ref={launcher} className="music-launcher" data-theme={music?.theme ?? 'moss'} data-playing={playing} type="button" aria-label="Open music player" aria-expanded={open} aria-controls="music-player-panel" onClick={() => { setPanelPosition(getPanelPosition(launcher)); setOpen(true); }}>
      <Music2 size={17} aria-hidden="true" />
      <span><strong>{music?.trackName || 'Music player'}</strong><small>{playing ? 'Now playing' : music?.trackName ? 'Ready to play' : 'Choose a track'}</small></span>
      <span className="music-launcher-indicator" aria-hidden="true"><i /><i /><i /></span>
      <ChevronDown className="music-launcher-chevron" size={15} aria-hidden="true" />
    </button>
    </div>
    {createPortal(<section id="music-player-panel" className="music-player" style={panelPosition ?? undefined} data-theme={music?.theme ?? 'moss'} data-visualizer={music?.visualizer ?? 'bars'} data-playing={playing} aria-label="Music player" hidden={!open}>
      <audio ref={audio} src={source || undefined} preload="metadata" onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onPlay={() => { setPlaying(true); setMessage('Now playing'); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0); }} />
      <span className="music-player-icon"><Music2 size={17} aria-hidden="true" /></span>
      <div className="music-player-track">
        <strong title={music?.trackName || 'No track selected'}>{music?.trackName || 'No track selected'}</strong>
        <small>{message}</small>
      </div>
      <div className="music-visualizer" aria-hidden="true">{[0, 1, 2, 3, 4].map(bar => <i key={bar} style={{ '--bar-index': bar }} />)}</div>
      <button className="music-control" type="button" aria-label={playing ? 'Pause music' : 'Play music'} disabled={!source} onClick={togglePlayback}>{playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}</button>
      <Link className="music-settings-link" to="/settings" aria-label="Open music settings" title="Music settings" onClick={() => setOpen(false)}><Settings2 size={16} aria-hidden="true" /></Link>
      <div className="music-player-progress"><span>{formatTime(position)}</span><input aria-label="Seek music" type="range" min="0" max={duration || 0} step="1" value={Math.min(position, duration || 0)} disabled={!source || !duration} onChange={event => { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} /><span>{formatTime(duration)}</span></div>
      <button className="music-player-close" type="button" aria-label="Close music player" onClick={() => { setOpen(false); launcher.current?.focus(); }}><X size={16} aria-hidden="true" /></button>
    </section>, document.body)}
  </>;
}