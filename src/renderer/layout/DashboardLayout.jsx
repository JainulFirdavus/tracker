import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { pages } from "../app/menu";
import { useSettings } from "../hooks/useSettings";
import { useTrackerStatus } from "../hooks/useTrackerStatus";
import { pageForPath } from "../routes/pageForPath";
import { DashboardMain } from "./DashboardMain";
import { QuickNavigation } from "./QuickNavigation";
import { Sidebar } from "./Sidebar";
import { SiteHeader } from "./SiteHeader";

export function DashboardLayout({ authentication }) {
  const location = useLocation();
  const page = pageForPath(location.pathname);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(
    () => window.innerWidth <= 760,
  );
  const preferences = useSettings();
  const tracker = useTrackerStatus(Boolean(preferences.saved));
  const main = useRef(null);
  const label = pages.find(([id]) => id === page)?.[1] ?? "Overview";

  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth <= 760;
      setMobileLayout(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (!quickMenuOpen && !mobileDrawerOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setQuickMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [quickMenuOpen, mobileDrawerOpen]);

  useEffect(() => {
    document.title = `${label} - MJ Pluse`;
    main.current
      ?.querySelector("section:not([hidden]) h1")
      ?.focus({ preventScroll: true });
    setQuickMenuOpen(false);
  }, [label, location.pathname]);

  const toggleLabel = mobileLayout
    ? mobileDrawerOpen
      ? "Close navigation"
      : "Open navigation"
    : sidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar";

  function toggleSidebar() {
    if (window.innerWidth <= 760) setMobileDrawerOpen((open) => !open);
    else setSidebarCollapsed((collapsed) => !collapsed);
  }

  return (
    <div
      className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
      data-drawer-open={mobileDrawerOpen}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        drawerOpen={mobileDrawerOpen}
        onNavigate={() => setMobileDrawerOpen(false)}
      />
      <SiteHeader
        authentication={authentication}
        label={label}
        tracker={tracker}
        music={preferences.saved?.music}
        onMusicVolumeChange={preferences.setMusic}
        onToggleSidebar={toggleSidebar}
        toggleLabel={toggleLabel}
        mobileLayout={mobileLayout}
        mobileDrawerOpen={mobileDrawerOpen}
        sidebarCollapsed={sidebarCollapsed}
      />
      <DashboardMain ref={main} preferences={preferences} tracker={tracker} />
      <QuickNavigation
        page={page}
        open={quickMenuOpen}
        onToggle={() => setQuickMenuOpen((open) => !open)}
        onClose={() => setQuickMenuOpen(false)}
      />
    </div>
  );
}
