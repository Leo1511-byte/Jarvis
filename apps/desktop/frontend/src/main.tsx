import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Milestone 32: a popped-out per-view window (see windowManager.ts /
// windows.rs) loads this exact same bundle with `?view=<slug>` in the
// URL -- read once at startup and pass down so App.tsx can render just
// that one view instead of the full sidebar shell. Absent (the normal
// main-window case), this is null and App behaves exactly as before.
const standaloneView = new URLSearchParams(window.location.search).get("view");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App standaloneView={standaloneView} />
  </React.StrictMode>
);
