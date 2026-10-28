import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { request } from "../lib/api";
import { AuthLoadingScreen } from "../auth/AuthLoadingScreen";
import { LoginRoute, RequireAuth } from "../auth/RequireAuth";
import { DashboardLayout } from "../layout/DashboardLayout";
import { PageStack } from "../routes/PageStack";

export function AppRoutes() {
  const [authentication, setAuthentication] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      request("/api/auth/status", { signal: controller.signal })
        .then((status) => {
          setAuthentication(status);
          setError("");
        })
        .catch((failure) => {
          if (failure.name !== "AbortError") setError(failure.message);
        });
    };
    const required = () =>
      setAuthentication({ enabled: true, authenticated: false });
    refresh();
    window.addEventListener("auth:required", required);
    window.addEventListener("auth:changed", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("auth:required", required);
      window.removeEventListener("auth:changed", refresh);
    };
  }, [reload]);

  function retryAuth() {
    setError("");
    setReload((current) => current + 1);
  }

  if (!authentication || error) {
    return <AuthLoadingScreen error={error} onRetry={retryAuth} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginRoute authentication={authentication} />}
      />
      <Route element={<RequireAuth authentication={authentication} />}>
        <Route
          path="/"
          element={<DashboardLayout authentication={authentication} />}
        >
          <Route index element={<PageStack />} />
          <Route path=":page" element={<PageStack />} />
          <Route path=":page/*" element={<PageStack />} />
        </Route>
      </Route>
    </Routes>
  );
}
