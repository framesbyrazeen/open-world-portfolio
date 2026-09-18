import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/home";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("GitHub Pages root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
