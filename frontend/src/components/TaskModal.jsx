import React, { useEffect, useState } from "react";

export default function TaskModal({ open, onClose, onSubmit, initial, dateLocked }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("med");
  const [status, setStatus] = useState("todo");
  const [recurrence, setRecurrence] = useState("none");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setDate(initial?.date || "");
    setTime(initial?.time || "");
    setPriority(initial?.priority || "med");
    setStatus(initial?.status || "todo");
    setRecurrence(initial?.recurrence || "none");
    setErrors({});
  }, [open, initial]);

  // H3: Escape key closes modal
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const isEditing = Boolean(initial?._id);

  // H5: Inline validation on submit
  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!date) errs.date = "Date is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({ title, description, date, time, priority, status, recurrence });
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      {/* H10: ARIA dialog role */}
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="taskModalTitle"
      >
        <div className="modalHeader">
          <h3 id="taskModalTitle">{isEditing ? "Edit Task" : "Create Task"}</h3>
          <button className="iconBtn" onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="form">
          {/* H5: Required indicator + inline error */}
          <label>
            Title <span className="requiredStar">*</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setErrors((p) => ({ ...p, title: "" }));
              }}
              placeholder="e.g. Doctor's appointment"
              className={errors.title ? "inputError" : ""}
            />
            {errors.title && <span className="fieldError">{errors.title}</span>}
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, notes, or context…"
            />
          </label>

          <div className="row2">
            <label>
              Date <span className="requiredStar">*</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (e.target.value) setErrors((p) => ({ ...p, date: "" }));
                }}
                disabled={dateLocked}
                className={errors.date ? "inputError" : ""}
              />
              {errors.date && <span className="fieldError">{errors.date}</span>}
            </label>

            <label>
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="HH:MM"
              />
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
