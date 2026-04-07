import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout, onToggleTheme, theme }) {
  const navigate = useNavigate();
  const location = useLocation();

  function navClass(path) {
    return location.pathname === path
      ? "btn secondary navActive"
      : "btn secondary";
  }

  return (
    <nav className="nav">
      <div className="navLeft">
        <Link className="brand" to="/">Calendar To-Do</Link>
      </div>

      <div className="navRight">
        <button
          className="navIconBtn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {user ? (
          <>
            <button className={navClass("/dashboard")} onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>

            <button className={navClass("/completed")} onClick={() => navigate("/completed")}>
              Completed
            </button>

            <button
              className="btn"
              onClick={() => navigate("/", { state: { openCreate: true } })}
              title="Create a new task (or press N on the calendar page)"
              aria-label="Create new task"
            >
              + Create Task
            </button>

            <button className="btn secondary" onClick={onLogout}>Logout</button>
            <span className="pill">{user.email}</span>
          </>
        ) : (
          <button className="btn" onClick={() => navigate("/auth")}>
            Login / Sign up
          </button>
        )}
      </div>
    </nav>
  );
}