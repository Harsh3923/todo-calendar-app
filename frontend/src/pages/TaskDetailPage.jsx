import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";
import { useToast } from "../components/Toast.jsx";

/* ── H2: Label maps ──────────────────────────────────────── */
const PRIORITY_LABEL = { low: "Low", med: "Medium", high: "High" };
const STATUS_ICON    = { todo: "○", doing: "◑", done: "✓" };

/* ── H9: Friendly error messages ─────────────────────────── */
function friendlyError(raw) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("not found"))
    return "This task could not be found. It may have been deleted.";
  if (msg.includes("network") || msg.includes("failed to fetch"))
    return "Cannot reach the server. Check your connection and try again.";
  if (msg.includes("unauthorized") || msg.includes("401"))
    return "Your session has expired. Please log in again.";
  return raw || "Something went wrong. Please try again.";
}

export default function TaskDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [task, setTask] = useState(null);
  const [err, setErr] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setErr("");
      if (!user) { navigate("/auth"); return; }
      try {
        const t = await api.getTask(id);
        setTask(t);
      } catch (e) {
        setErr(friendlyError(e.message));
      }
    }
    load();
  }, [id, user, navigate]);

  async function save(payload) {
    try {
      const updated = await api.updateTask(id, payload);
      setTask(updated);
      setEditOpen(false);
      // H1: success toast
      addToast("Changes saved", "success");
    } catch (e) {
      setErr(friendlyError(e.message));
    }
  }

  // H3: Undo-toast delete — replaces window.confirm()
  function del() {
    const snapshot = { ...task };
    let undone = false;

    navigate("/");

    addToast(
      `"${snapshot.title}" deleted`,
      "info",
      async () => {
        undone = true;
        try {
          await api.createTask({
            title: snapshot.title,
            description: snapshot.description,
            date: snapshot.date,
            time: snapshot.time,
            priority: snapshot.priority,
            status: snapshot.status,
            recurrence: snapshot.recurrence,
          });
          addToast("Task restored — find it on the calendar", "success");
        } catch {
          addToast("Could not restore task.", "error");
        }
      },
      4500
    );

    setTimeout(async () => {
      if (!undone) {
        try {
          await api.deleteTask(id);
        } catch {
          addToast("Delete failed.", "error");
        }
      }
    }, 4500);
  }

  if (err) return <div className="page"><div className="error">{err}</div></div>;

  // H1: spinner instead of "Loading…"
  if (!task) return (
    <div className="page">
      <div className="spinnerWrap"><div className="spinner" aria-label="Loading task…" /></div>
    </div>
  );

  return (
    <div className="page narrow">
      <div className="card">
        <h1>{task.title}</h1>
        <p className="subtle">{task.date}{task.time ? ` • ${task.time}` : ""}</p>

        {/* H2: "Medium" not "med", status icon */}
        <div className="rowTags">
          <span className={`tag ${task.priority}`}>
            Priority: {PRIORITY_LABEL[task.priority] || task.priority}
          </span>
          <span className={`tag statusTag ${task.status}`}>
            {STATUS_ICON[task.status]} Status: {task.status}
          </span>
        </div>

        {task.description
          ? <p className="desc">{task.description}</p>
          : <p className="mutedText">No description.</p>
        }

        <div className="actionsRow">
          <button className="btn" onClick={() => setEditOpen(true)}>Edit</button>
          <button className="btn danger" onClick={del}>Delete</button>
          <button className="btn secondary" onClick={() => navigate("/")}>Back</button>
        </div>
      </div>

      <TaskModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={save}
        initial={task}
        dateLocked={false}
      />
    </div>
  );
}
