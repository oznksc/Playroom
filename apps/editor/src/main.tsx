import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { TooltipProvider } from "@/ui";
import "./styles/globals.css";
import "./styles/editor.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </React.StrictMode>
);
