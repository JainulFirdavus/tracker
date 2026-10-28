import { forwardRef } from "react";
import { Outlet } from "react-router-dom";

export const DashboardMain = forwardRef(function DashboardMain(
  { preferences, tracker },
  ref,
) {
  return (
    <main ref={ref}>
      {!preferences.draft ? (
        <section className="intro">
          <h1>MJ Pluse</h1>
          <p role="status">{preferences.error || "Loading settings..."}</p>
          {preferences.error && (
            <button className="secondary-button" onClick={preferences.retry}>
              Retry
            </button>
          )}
        </section>
      ) : (
        <div className="page-stack">
          <Outlet context={{ preferences, tracker }} />
        </div>
      )}
    </main>
  );
});
