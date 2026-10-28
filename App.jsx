import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, BookOpen, CalendarDays, Cloud, LayoutDashboard, LogOut, Menu, NotebookPen, Plus, Settings2 } from 'lucide-react';
import { HashRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useOutletContext, Outlet } from 'react-router-dom';
import { request } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { IconButton } from './components/IconButton';
import { MusicPlayer } from './components/MusicPlayer';
import { useSettings } from './hooks/useSettings';
import { useTrackerStatus } from './hooks/useTrackerStatus';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocumentationPage } from './pages/DocumentationPage';

const pages = [['overview', 'Overview'], ['activity', 'Activity'], ['planner', 'Reminders'], ['notes', 'Notes'], ['documentation', 'Documentation'], ['settings', 'Settings']];
const quickLinks = [['overview', 'Overview', LayoutDashboard], ['activity', 'Activity', Activity], ['planner', 'Reminders', CalendarDays], ['notes', 'Notes', NotebookPen], ['settings', 'Settings', Settings2]];
const pageIcons = { overview: LayoutDashboard, activity: Activity, planner: CalendarDays, notes: NotebookPen, documentation: BookOpen, settings: Settings2 };
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
export function App() {
  return <HashRouter><AppRoutes /></HashRouter>;
}

function AppRoutes() {
  const [authentication, setAuthentication] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      request('/api/auth/status', { signal: controller.signal }).then(status => {
        setAuthentication(status);
        setError('');
      }).catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); });
    };
    const required = () => setAuthentication({ enabled: true, authenticated: false });
    refresh();
    window.addEventListener('auth:required', required);
    window.addEventListener('auth:changed', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('auth:required', required);
      window.removeEventListener('auth:changed', refresh);
    };
  }, [reload]);
  const retryAuth = () => { setError(''); setReload(current => current + 1); };
  if (!authentication || error) {
    return <main className="login-page"><section className="login-content"><h1>Little Reset</h1><p role={error ? 'alert' : 'status'}>{error || 'Connecting...'}</p>{error && <button className="secondary-button" onClick={retryAuth}>Retry</button>}</section></main>;
  }
  return <Routes>
    <Route path="/login" element={<LoginRoute authentication={authentication} />} />
    <Route element={<RequireAuth authentication={authentication} />}>
      <Route path="/" element={<Dashboard authentication={authentication} />}>
        <Route index element={<PageStack />} />
        <Route path=":page" element={<PageStack />} />
        <Route path=":page/*" element={<PageStack />} />
      </Route>
    </Route>
  </Routes>;
}

function RequireAuth({ authentication }) {
  const location = useLocation();
  if (authentication.enabled && !authentication.authenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function LoginRoute({ authentication }) {
  const location = useLocation();
  const destination = location.state?.from;
  if (!authentication.enabled || authentication.authenticated) return <Navigate to={destination ? `${destination.pathname}${destination.search ?? ''}` : '/'} replace />;
  return <LoginPage onLogin={() => window.dispatchEvent(new Event('auth:changed'))} />;
}

function Dashboard({ authentication }) {
  const location = useLocation();
  const requested = location.pathname.split('/').filter(Boolean)[0] ?? 'overview';
  const page = pages.some(([id]) => id === requested) ? requested : null;
  const [visitedPages, setVisitedPages] = useState(() => new Set(page ? [page] : []));
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() => window.innerWidth <= 760);
  const preferences = useSettings();
  const tracker = useTrackerStatus(Boolean(preferences.saved));
  const main = useRef(null);
  const activeSection = useRef(null);
  const label = pages.find(([id]) => id === page)?.[1] ?? 'Overview';
  const [logoutError, setLogoutError] = useState('');
  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST', body: '{}' });
      window.dispatchEvent(new Event('auth:changed'));
    } catch (failure) { setLogoutError(failure.message); }
  }
  useEffect(() => { if (page) setVisitedPages(current => new Set(current).add(page)); }, [page]);
  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth <= 760;
      setMobileLayout(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);
  useEffect(() => {
    if (!quickMenuOpen && !mobileDrawerOpen) return;
    const closeOnEscape = event => {
      if (event.key === 'Escape') { setQuickMenuOpen(false); setMobileDrawerOpen(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [quickMenuOpen, mobileDrawerOpen]);
  useEffect(() => {
    document.title = `${label} - Little Reset`;
    main.current?.querySelector('section:not([hidden]) h1')?.focus({ preventScroll: true });
    setQuickMenuOpen(false);
  }, [label, location.pathname]);
  useEffect(() => {
    if (!activeSection.current) return;
    activeSection.current.classList.remove('route-arrive');
    void activeSection.current.offsetWidth;
    activeSection.current.classList.add('route-arrive');
  }, [page, location.search]);
  const connection = tracker.error ? `Tracker unavailable: ${tracker.error}` : !tracker.status ? 'Connecting to your tracker...'
    : !tracker.status.available ? 'Tracking paused - locked or asleep'
      : tracker.status.idleSeconds >= preferences.saved.idleAfterSeconds ? 'Idle - active timers paused' : 'Tracker connected - working with you';
  const toggleLabel = mobileLayout ? mobileDrawerOpen ? 'Close navigation' : 'Open navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  function toggleSidebar() {
    if (window.innerWidth <= 760) setMobileDrawerOpen(open => !open);
    else setSidebarCollapsed(collapsed => !collapsed);
  }
  return <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`} data-drawer-open={mobileDrawerOpen}>
    <aside id="main-sidebar" className="sidebar" aria-label="Application sidebar" data-collapsed={sidebarCollapsed}>
      <Link className="logo" to="/overview" onClick={() => setMobileDrawerOpen(false)}><span className="logo-mark">lr</span><span className="logo-name">little reset</span></Link>
      <p className="nav-caption">YOUR SPACE</p>
      <nav aria-label="Main navigation">{pages.map(([id, name], index) => {
      const Icon = pageIcons[id];
      return <NavLink key={id} to={`/${id}`} data-page={id} aria-current={page === id ? 'page' : undefined} title={sidebarCollapsed ? name : undefined} onClick={() => setMobileDrawerOpen(false)}><Icon size={19} aria-hidden="true" /><span className="nav-label">{name}</span></NavLink>;
    })}</nav>
      <footer className="sidebar-footer"><span className="local-badge">Firdavus</span><strong>MJ Pluse</strong><small>© {new Date().getFullYear()}</small></footer>
    </aside>
    <button className="sidebar-backdrop" type="button" aria-label="Dismiss navigation drawer" hidden={!mobileDrawerOpen} onClick={() => setMobileDrawerOpen(false)} />
    <header className="site-header"><button className="sidebar-toggle" type="button" aria-label={toggleLabel} aria-expanded={mobileLayout ? mobileDrawerOpen : !sidebarCollapsed} aria-controls="main-sidebar" onClick={toggleSidebar}><Menu size={19} aria-hidden="true" /></button><div className="page-location"><span className="kicker">YOUR WORKDAY COMPANION</span><strong id="page-label">{label}</strong></div><MusicPlayer music={preferences.saved?.music} /><NavLink className="weather-widget" to="/settings" aria-label="Weather not connected. View future integrations in Settings."><Cloud className="weather-symbol" size={28} aria-hidden="true" /><span><strong>Weather <span className="weather-value">--</span></strong><small>Not connected</small></span></NavLink><span className="connection" id="connection">{connection}</span>{authentication.enabled && <div className="account-controls"><span>{authentication.username}</span><IconButton icon={LogOut} label="Sign out" onClick={logout} />{logoutError && <span role="alert">{logoutError}</span>}</div>}</header>
    <main ref={main}>{!preferences.draft ? <section className="intro"><h1>Little Reset</h1><p role="status">{preferences.error || 'Loading settings...'}</p>{preferences.error && <button className="secondary-button" onClick={preferences.retry}>Retry</button>}</section> : <div className="page-stack"><Outlet context={{ preferences, tracker }} /></div>}</main>
    <div className="quick-nav" data-open={quickMenuOpen}>
      <div className="quick-actions" id="quick-actions" role="group" aria-label="Quick navigation" aria-hidden={!quickMenuOpen} inert={!quickMenuOpen}>
        {quickLinks.map(([id, name, Icon]) => <Link key={id} className="quick-action" to={`/${id}`} aria-label={`Go to ${name}`} aria-current={page === id ? 'page' : undefined} title={name} onClick={() => setQuickMenuOpen(false)}><Icon size={19} aria-hidden="true" /></Link>)}
      </div>
      <button className="quick-trigger" type="button" aria-label={quickMenuOpen ? 'Close quick navigation' : 'Open quick navigation'} aria-expanded={quickMenuOpen} aria-controls="quick-actions" onClick={() => setQuickMenuOpen(open => !open)}><Plus size={23} aria-hidden="true" /></button>
    </div>
  </div>;
}

function PageStack() {
  const location = useLocation();
  const { preferences, tracker } = useOutletContext();
  const requested = location.pathname.split('/').filter(Boolean)[0] ?? 'overview';
  const page = pages.some(([id]) => id === requested) ? requested : null;
  const [visitedPages, setVisitedPages] = useState(() => new Set(page ? [page] : []));
  const activeSection = useRef(null);

  useEffect(() => { if (page) setVisitedPages(current => new Set(current).add(page)); }, [page]);
  useEffect(() => {
    if (!activeSection.current) return;
    activeSection.current.classList.remove('route-arrive');
    void activeSection.current.offsetWidth;
    activeSection.current.classList.add('route-arrive');
  }, [page, location.search]);

  if (!page) return <Navigate to="/overview" replace />;
  return <>
    <section ref={page === 'overview' ? activeSection : null} id="page-overview" className="page planner-page route-view" aria-label="Overview" hidden={page !== 'overview'}>{(visitedPages.has('overview') || page === 'overview') && <Suspense fallback={<PageLoading label="Loading overview" />}><OverviewPage active={page === 'overview'} reminders={preferences.saved?.reminders ?? []} trackerStatus={tracker.status} trackerError={tracker.error} /></Suspense>}</section>
    <section ref={page === 'activity' ? activeSection : null} id="page-activity" className="page route-view" aria-label="Activity" hidden={page !== 'activity'}><ActivityPage preferences={preferences} tracker={tracker} /></section>
    <section ref={page === 'planner' ? activeSection : null} id="page-planner" className="page planner-page route-view" hidden={page !== 'planner'}>{(visitedPages.has('planner') || page === 'planner') && <Suspense fallback={<PageLoading label="Loading reminders" />}><PlannerPage active={page === 'planner'} /></Suspense>}</section>
    <section ref={page === 'notes' ? activeSection : null} id="page-notes" className="page planner-page route-view" hidden={page !== 'notes'}>{(visitedPages.has('notes') || page === 'notes') && <Suspense fallback={<PageLoading label="Loading notes" />}><NotesPage /></Suspense>}</section>
    <section ref={page === 'documentation' ? activeSection : null} id="page-documentation" className="page route-view" hidden={page !== 'documentation'}>{(visitedPages.has('documentation') || page === 'documentation') && <DocumentationPage />}</section>
    <section ref={page === 'settings' ? activeSection : null} id="page-settings" className="page route-view" hidden={page !== 'settings'}>{(visitedPages.has('settings') || page === 'settings') && <SettingsPage preferences={preferences} />}</section>
  </>;
}

function PageLoading({ label }) {
  return <div className="page-loading" role="status" aria-label={label}><span className="loading-wave" aria-hidden="true">{[0, 1, 2, 3, 4].map(bar => <i key={bar} style={{ '--bar-index': bar }} />)}</span><span>{label}</span></div>;
}