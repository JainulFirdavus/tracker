import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useOutletContext } from "react-router-dom";
import { ActivityPage } from "../pages/ActivityPage";
import { DocumentationPage } from "../pages/DocumentationPage";
import { SettingsPage } from "../pages/SettingsPage";
import { pageForPath } from "./pageForPath";
import { PageLoading } from "../components/PageLoading";

const PlannerPage = lazy(() => import("../pages/PlannerPage"));
const NotesPage = lazy(() => import("../pages/NotesPage"));
const OverviewPage = lazy(() => import("../pages/OverviewPage"));
const MusicPage = lazy(() => import("../pages/MusicPage"));

export function PageStack() {
  const location = useLocation();
  const { preferences, tracker } = useOutletContext();
  const page = pageForPath(location.pathname);
  const [visitedPages, setVisitedPages] = useState(
    () => new Set(page ? [page] : []),
  );
  const activeSection = useRef(null);

  useEffect(() => {
    if (page) setVisitedPages((current) => new Set(current).add(page));
  }, [page]);

  useEffect(() => {
    if (!activeSection.current) return;
    activeSection.current.classList.remove("route-arrive");
    void activeSection.current.offsetWidth;
    activeSection.current.classList.add("route-arrive");
  }, [page, location.search]);

  if (!page) return <Navigate to="/overview" replace />;
  return (
    <>
      <section
        ref={page === "overview" ? activeSection : null}
        id="page-overview"
        className="page planner-page route-view"
        aria-label="Overview"
        hidden={page !== "overview"}
      >
        {(visitedPages.has("overview") || page === "overview") && (
          <Suspense fallback={<PageLoading label="Loading overview" />}>
            <OverviewPage
              active={page === "overview"}
              reminders={preferences.saved?.reminders ?? []}
              trackerStatus={tracker.status}
              trackerError={tracker.error}
            />
          </Suspense>
        )}
      </section>
      <section
        ref={page === "activity" ? activeSection : null}
        id="page-activity"
        className="page route-view"
        aria-label="Activity"
        hidden={page !== "activity"}
      >
        <ActivityPage preferences={preferences} tracker={tracker} />
      </section>
      <section
        ref={page === "planner" ? activeSection : null}
        id="page-planner"
        className="page planner-page route-view"
        hidden={page !== "planner"}
      >
        {(visitedPages.has("planner") || page === "planner") && (
          <Suspense fallback={<PageLoading label="Loading reminders" />}>
            <PlannerPage active={page === "planner"} />
          </Suspense>
        )}
      </section>
      <section
        ref={page === "notes" ? activeSection : null}
        id="page-notes"
        className="page planner-page route-view"
        hidden={page !== "notes"}
      >
        {(visitedPages.has("notes") || page === "notes") && (
          <Suspense fallback={<PageLoading label="Loading notes" />}>
            <NotesPage />
          </Suspense>
        )}
      </section>
      <section
        ref={page === "documentation" ? activeSection : null}
        id="page-documentation"
        className="page route-view"
        hidden={page !== "documentation"}
      >
        {(visitedPages.has("documentation") || page === "documentation") && (
          <DocumentationPage />
        )}
      </section>
      <section
        ref={page === "music" ? activeSection : null}
        id="page-music"
        className="page route-view"
        aria-label="Music"
        hidden={page !== "music"}
      >
        {(visitedPages.has("music") || page === "music") && (
          <Suspense fallback={<PageLoading label="Loading music" />}>
            <MusicPage preferences={preferences} />
          </Suspense>
        )}
      </section>
      <section
        ref={page === "settings" ? activeSection : null}
        id="page-settings"
        className="page route-view"
        hidden={page !== "settings"}
      >
        {(visitedPages.has("settings") || page === "settings") && (
          <SettingsPage
            preferences={preferences}
            activityReminders={tracker.status?.reminders}
          />
        )}
      </section>
    </>
  );
}
