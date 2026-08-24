import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

let reloadingForUpdate = false;

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (reloadingForUpdate) return;

  reloadingForUpdate = true;
  window.location.reload();
});

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
