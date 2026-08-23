import { useEffect, useState } from "react";
import { SiteLayout } from "./components/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { ChartDetailPage } from "./pages/ChartDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ScoreListPage } from "./pages/ScoreListPage";
import { Top50Page } from "./pages/Top50Page";
type Route = "/" | "/profile" | "/top-50" | "/scores" | `/charts/${string}`;

function currentRoute(): Route {
  const route = window.location.hash.slice(1) || "/";

  if (route === "/profile" || route === "/top-50" || route === "/scores") {
    return route;
  }

  if (route.startsWith("/charts/")) return route as `/charts/${string}`;

  return "/";
}

function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);

  const chartMatch = route.match(/^\/charts\/([^/]+)$/);
  const chartRoute = chartMatch ? {
    chartId: decodeURIComponent(chartMatch[1]),
  } : null;

  return (
    <SiteLayout route={route}>
      {route === "/" && <HomePage />}
      {route === "/profile" && <ProfilePage />}
      {route === "/top-50" && <Top50Page />}
      {route === "/scores" && <ScoreListPage />}
      {chartRoute && <ChartDetailPage {...chartRoute} />}
    </SiteLayout>
  );
}

export default App;
