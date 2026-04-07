import React, { useEffect, useState } from "react";

export default function TaskModal({ open, onClose, onSubmit, initial, dateLocked }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("med");
  const [status, setStatus] = useState("todo");

  // ✅ NEW: recurrence
  const [recurrence, setRecurrence] = useState("none");

  useEffect(() => {
    if (!open) return;

    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setDate(initial?.date || "");
    setTime(initial?.time || "");
    setPriority(initial?.priority || "med");
    setStatus(initial?.status || "todo");

    // ✅ load recurrence from initial
    setRecurrence(initial?.recurrence || "none");
  }, [open, initial]);

  if (!open) return null;

  const isEditing = Boolean(initial?._id); // ✅ better than "initial ? ..."

  function submit(e) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      date,
      time,
      priority,
      status,
      recurrence,
    });
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>{isEditing ? "Edit Task" : "Create Task"}</h3>
          <button className="iconBtn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Finish lab"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
            />
          </label>

          <div className="row2">
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={dateLocked}
              />
            </label>

            <label>
              Time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>

          <div className="row2">
            <label>
              Recurrence
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">To do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </select>
          </label>

          <button className="btn" type="submit">
            {isEditing ? "Save Changes" : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}