import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";

export default function TaskDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [err, setErr] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setErr("");
      if (!user) {
        navigate("/auth");
        return;
      }
      try {
        const t = await api.getTask(id);
        setTask(t);
      } catch (e) {
        setErr(e.message);
      }
    }
    load();
  }, [id, user, navigate]);

  async function save(payload) {
    try {
      const updated = await api.updateTask(id, payload);
      setTask(updated);
      setEditOpen(false);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function del() {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(id);
      navigate("/");
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <div className="page"><div className="error">{err}</div></div>;
  if (!task) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page narrow">
      <div className="card">
        <h1>{task.title}</h1>
        <p className="subtle">{task.date}{task.time ? ` • ${task.time}` : ""}</p>

        <div className="rowTags">
          <span className={`tag ${task.priority}`}>priority: {task.priority}</span>
          <span className={`tag statusTag ${task.status}`}>status: {task.status}</span>
        </div>

        {task.description ? <p className="desc">{task.description}</p> : <p className="mutedText">No description.</p>}

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