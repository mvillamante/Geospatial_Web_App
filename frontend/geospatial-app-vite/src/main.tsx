import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import "./styles/colors.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    console.log("New content available, refresh the page.");
  },
  onOfflineReady() {
    console.log("App ready to work offline.");
  },
});

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);