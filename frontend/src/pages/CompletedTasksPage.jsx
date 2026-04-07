import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

function isoDay(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toISOString().slice(0, 10);
}

function friendlyError(raw) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("network") || msg.includes("failed to fetch"))
    return "Cannot reach the server. Check your connection and try again.";
  return raw || "Something went wrong. Please try again.";
}

export default function CompletedTasksPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setError("");
      if (!user) return;
      setLoading(true);
      try {
        const list = await api.listTasks();
        const done = list.filter((t) => t.status === "done");
        done.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
        setTasks(done);
      } catch (e) {
        setError(friendlyError(e.message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <h1>Completed Tasks</h1>
        <p className="subtle">Log in to view completed tasks.</p>
        <button className="btn" onClick={() => navigate("/auth")}>Login / Sign up</button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topRow">
        <div>
          <h1>Completed Tasks</h1>
          <p className="subtle">See when tasks were created and when you finished them.</p>
        </div>
        <button className="btn secondary" onClick={() => navigate("/")}>Back to Calendar</button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* H1: spinner */}
      {loading && <div className="spinnerWrap"><div className="spinner" aria-label="Loading…" /></div>}

      <div className="listCard">
        {tasks.length === 0 ? (
          <div className="empty">
            <p>No completed tasks yet.</p>
          </div>
        ) : (
          <ul className="taskList">
            {tasks.map((t) => (
              <li key={t._id} className="taskRow">
                <div className="taskMain" onClick={() => navigate(`/tasks/${t._id}`)}>
                  <div className="taskTitle">
                    <span className="strike">{t.title}</span>
                  </div>
                  <div className="taskMeta">
                    <span>Created: {isoDay(t.createdAt)}</span>
                    <span className="sep">•</span>
                    <span>Finished: {isoDay(t.completedAt)}</span>
                  </div>
                </div>

                <div className="taskActions">
                  <button className="btn small" onClick={() => navigate(`/tasks/${t._id}`)}>Open</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}