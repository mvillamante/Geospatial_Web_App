import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import "./styles/colors.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

const queryClient = new QueryClient();

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



if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registered:", reg))
      .catch((err) =>
        console.log("Service Worker registration failed:", err)
      );
  });
}