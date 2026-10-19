import React from "react";
import ReactDOM from "react-dom/client";
import { initTheme } from "../lib/theme";
import "../styles/app.css";
import { StyleguideApp } from "./StyleguideApp";
import "./styleguide.css";

// Dev-only living styleguide entry. Mounts its own root against the real
// app.css + tokens.css so specimens resolve to the shipping design system.
// Theme is safe to apply in a plain browser; Bonzai colors are compiled tokens.
initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyleguideApp />
  </React.StrictMode>,
);
