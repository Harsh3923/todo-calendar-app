import React from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import TaskDetailPage from "./pages/TaskDetailPage.jsx";
import { api, setToken, getToken } from "./api/client.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

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
    setToken(null);
    setUser(null);
    navigate("/");
  }

  if (booting) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="appShell">
      <Navbar user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<CalendarPage user={user} />} />
        <Route path="/auth" element={<AuthPage onSuccess={onAuthSuccess} />} />
        <Route path="/tasks/:id" element={<TaskDetailPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}