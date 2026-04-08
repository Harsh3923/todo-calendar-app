import React from "react";
import { useEffect, useState } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import TaskDetailPage from "./pages/TaskDetailPage.jsx";
import { api, setToken, getToken } from "./api/client.js";
import { disconnectSocket } from "./socket.js";
import CompletedTasksPage from "./pages/CompletedTasksPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import { ToastProvider } from "./components/Toast.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    async function boot() {
      try {
        if (getToken()) {
          const me = await api.me();
          setUser(me.user);
        }
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    }
    boot();
  }, []);

  function onAuthSuccess(token, userObj) {
    setToken(token);
    setUser(userObj);
    navigate("/");
  }

  function logout() {
    disconnectSocket();
    setToken(null);
    setUser(null);
    navigate("/");
  }

  if (booting) return (
    <div className="page">
      <div className="spinnerWrap"><div className="spinner" aria-label="Loading…" /></div>
    </div>
  );

  return (
    <ToastProvider>
    <div className="appShell">
      <Navbar
        user={user}
        onLogout={logout}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      <Routes>
        <Route path="/completed" element={<CompletedTasksPage user={user} />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/" element={<CalendarPage user={user} />} />
        <Route path="/auth" element={<AuthPage onSuccess={onAuthSuccess} />} />
        <Route path="/tasks/:id" element={<TaskDetailPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </ToastProvider>
  );
}