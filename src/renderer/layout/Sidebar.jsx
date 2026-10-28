import { Link, NavLink, useLocation } from "react-router-dom";
import { menuSections } from "../app/menu";
import { pageForPath } from "../routes/pageForPath";

export function Sidebar({ collapsed, drawerOpen, onNavigate }) {
  const { pathname } = useLocation();
  const page = pageForPath(pathname);
  return (
    <>
      <aside
        id="main-sidebar"
        className="sidebar"
        aria-label="Application sidebar"
        data-collapsed={collapsed}
      >
        <Link className="logo" to="/overview" onClick={onNavigate}>
          <span className="logo-mark">MJ</span>
          <span className="logo-name">MJ Pluse</span>
        </Link>
        {menuSections.map(({ label, ariaLabel, items }) => (
          <section className="sidebar-nav-section" key={label}>
            <p className="nav-caption">{label}</p>
            <nav aria-label={ariaLabel}>
              {items.map(({ id, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={id}
                  to={`/${id}`}
                  data-page={id}
                  aria-current={page === id ? "page" : undefined}
                  title={collapsed ? itemLabel : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="nav-label">{itemLabel}</span>
                </NavLink>
              ))}
            </nav>
          </section>
        ))}
        <footer className="sidebar-footer">
          <span className="local-badge">Firdavus</span>
          <strong>
            MJ Pluse <small>© {new Date().getFullYear()}</small>
          </strong>
        </footer>
      </aside>
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Dismiss navigation drawer"
        hidden={!drawerOpen}
        onClick={onNavigate}
      />
    </>
  );
}
