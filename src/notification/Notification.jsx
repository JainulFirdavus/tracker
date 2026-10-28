

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, X, CalendarClock, ClipboardCheck } from 'lucide-react';

export function Notification({ params, bridge }) {
  const [delivery, setDelivery] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const dismissed = useRef(false);
  const dismissTimer = useRef(null);
  const preview = params.get('preview') === '1';
  const Symbol = params.get('symbol') === 'calendar-clock' ? CalendarClock : ClipboardCheck;

  useLayoutEffect(() => {
    const opacity = Number(params.get('opacity') ?? 100);
    document.body.dataset.kind = params.get('id') || '';
    document.body.dataset.theme = params.get('theme') || 'glass';
    document.body.style.setProperty('--surface-opacity', String(Number.isFinite(opacity) ? Math.max(40, Math.min(100, opacity)) / 100 : 1));
    const fit = () => document.body.style.setProperty('--notification-scale', String(Math.min(innerWidth / 456, innerHeight / 270)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [params]);
  useEffect(() => {
    const shown = duration => setDelivery({ duration, started: performance.now() });
    if (bridge) return bridge.onShow(shown);
    shown(Math.max(3, Number(params.get('duration')) || 10) * 1000);
  }, [bridge, params]);
  useEffect(() => {
    if (!delivery) return;
    document.body.style.setProperty('--duration', `${delivery.duration}ms`);
    document.body.classList.add('visible');
    const refresh = () => setSeconds(Math.max(0, Math.ceil((delivery.started + delivery.duration - performance.now()) / 1000)));
    refresh();
    const timer = setInterval(refresh, 100);
    const leave = setTimeout(() => { if (!preview) setLeaving(true); }, Math.max(0, delivery.duration - 250));
    return () => { clearInterval(timer); clearTimeout(leave); document.body.classList.remove('visible'); };
  }, [delivery, preview]);
  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;
    setLeaving(true);
    dismissTimer.current = setTimeout(() => bridge?.dismiss(), 250);
  }
  useEffect(() => {
    const key = event => {
      if (event.key !== 'Escape' || dismissed.current) return;
      dismissed.current = true;
      setLeaving(true);
      dismissTimer.current = setTimeout(() => bridge?.dismiss(), 250);
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); clearTimeout(dismissTimer.current); };
  }, [bridge]);
  useEffect(() => { document.body.classList.toggle('leaving', leaving); return () => document.body.classList.remove('leaving'); }, [leaving]);
  return <section className="reminder" aria-labelledby="reminder-title" aria-describedby="reminder-message">
    <div className="topline"><span className="brand"><span className="status-dot" />A MJ Pluse</span><button className="close" type="button" aria-label="Dismiss reminder" onClick={dismiss}><X size={15} aria-hidden="true" /></button></div>
    <div className="content"><div className="artwork"><span className="artwork-halo" />{params.get('symbol') ? <Symbol size={48} color="var(--accent)" strokeWidth={1.5} aria-hidden="true" /> : params.get('icon') && <img id="reminder-icon" src={params.get('icon')} alt="" />}</div><div className="copy"><p className="eyebrow" id="reminder-name">{params.get('name')}</p><h1 id="reminder-title">{params.get('title')}</h1><p className="message" id="reminder-message">{params.get('message')}</p></div></div>
    <footer><span className="countdown" role="timer">Closing in <span id="seconds">{seconds}</span>s</span><button className="done" type="button" onClick={dismiss}>Got it<ArrowRight size={13} aria-hidden="true" /></button></footer>
    <div className="progress-track" aria-hidden="true"><div className="progress" /></div>
  </section>;
}




