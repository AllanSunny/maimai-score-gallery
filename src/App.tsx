import { useEffect, useState } from "react";
import { SiteLayout } from "./components/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { ChartDetailPage } from "./pages/ChartDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ScoreListPage } from "./pages/ScoreListPage";
import { Top50Page } from "./pages/Top50Page";
import type { ChartType, Difficulty } from "./utils/types";

type Route = "/" | "/profile" | "/top-50" | "/scores" | `/songs/${string}`;

function currentRoute(): Route {
  const route = window.location.hash.slice(1) || "/";

  if (route === "/profile" || route === "/top-50" || route === "/scores") {
    return route;
  }

  if (route.startsWith("/songs/")) return route as `/songs/${string}`;

  return "/";
}

function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);

  const chartMatch = route.match(/^\/songs\/([^/]+)\/([^/]+)\/([^/]+)$/);
  const chartRoute = chartMatch ? {
    songName: decodeURIComponent(chartMatch[1]),
    chartType: decodeURIComponent(chartMatch[2]) as ChartType,
    difficulty: decodeURIComponent(chartMatch[3]) as Difficulty,
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
