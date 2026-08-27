import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { TooltipProvider } from "@/ui";
import { UiGallery } from "./components/UiGallery.js";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      {new URLSearchParams(window.location.search).get("view") === "ui-gallery" ? <UiGallery /> : <App />}
    </TooltipProvider>
  </React.StrictMode>
);
