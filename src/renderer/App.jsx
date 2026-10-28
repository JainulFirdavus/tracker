import { HashRouter } from "react-router-dom";
import { AppRoutes } from "./app/AppRoutes";

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
