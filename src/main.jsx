import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// registra los Web Components
const s = document.createElement("script");
s.src = "https://unpkg.com/@regulaforensics/vp-frontend-face-components@latest/dist/main.iife.js";
s.onload = () => {
  // ahora los custom elements están registrados
  // React render se hace igual abajo
};
document.head.appendChild(s);

import './index.css';


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
