import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppProvider } from "./state/AppContext.jsx";
import "./styles.css";

// index.html paints the background inline until the stylesheet arrives; from here
// the theme tokens own it, so a theme switch can repaint it.
document.body.style.removeProperty("background");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
