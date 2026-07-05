import { createRoot } from "react-dom/client";
import "./index.css";



import { BrowserRouter } from "react-router-dom";

import { registerSW } from "virtual:pwa-register";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
// Register Service Worker for PWA
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);













