import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";

export function RequireAuth({ authentication }) {
  const location = useLocation();
  if (authentication.enabled && !authentication.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function LoginRoute({ authentication }) {
  const location = useLocation();
  const destination = location.state?.from;
  if (!authentication.enabled || authentication.authenticated) {
    return (
      <Navigate
        to={
          destination
            ? `${destination.pathname}${destination.search ?? ""}`
            : "/"
        }
        replace
      />
    );
  }
  return (
    <LoginPage
      onLogin={() => window.dispatchEvent(new Event("auth:changed"))}
    />
  );
}
