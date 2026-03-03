import React from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Calendar, { toISODate } from "../components/Calendar.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";

/* ---------------- Drag helpers ---------------- */

function DraggableTaskChip({ task, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip chipDraggable ${isDragging ? "dragging" : ""}`}
      {...listeners}
      {...attributes}
      title="Drag to another date"
    >
      {children}
    </div>
  );
}

function DroppableDayCell({ dayIso, children, className = "", onClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayIso,
    data: { dayIso },
  });

  return (
    <button
      ref={setNodeRef}
      className={`calCell ${className} ${isOver ? "dropOver" : ""}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ---------------- Recurrence helpers ---------------- */

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function weekdayOf(iso) {
  return parseISO(iso).getDay(); // 0=Sun
}

function dayOfMonth(iso) {
  return parseISO(iso).getDate();
}

function occursOn(task, targetISO) {
  const r = task.recurrence || "none";
  if (r === "none") return task.date === targetISO;

  // recurrence only happens on/after start date
  if (targetISO < task.date) return false;

  if (r === "daily") {
    const diff = daysBetween(task.date, targetISO);
    return diff % (task.recurrenceInterval || 1) === 0;
  }

  if (r === "weekly") {
    if (weekdayOf(task.date) !== weekdayOf(targetISO)) return false;
    const diff = daysBetween(task.date, targetISO);
    const weeks = Math.floor(diff / 7);
    return weeks % (task.recurrenceInterval || 1) === 0;
  }

  if (r === "monthly") {
    return dayOfMonth(task.date) === dayOfMonth(targetISO);
  }

  return false;
}

function isRecurring(task) {
  return task.recurrence && task.recurrence !== "none";
}

// ✅ status on a specific date (works for both recurring + non-recurring)
function statusOnDate(task, iso) {
  if (!isRecurring(task)) return task.status;

  if (Array.isArray(task.completedDates) && task.completedDates.includes(iso)) return "done";
  if (Array.isArray(task.doingDates) && task.doingDates.includes(iso)) return "doing";
  return "todo";
}

export default function CalendarPage({ user }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()));
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (location.state?.openCreate) {
      navigate("/", { replace: true, state: {} });
      handleCreateClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function loadTasks() {
    setError("");
    if (!user) {
      setTasks([]);
      return;
    }
    try {
      const list = await api.listTasks();
      setTasks(list);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Build tasksByDate (expands recurring tasks into visible month)
  const tasksByDate = useMemo(() => {
    const map = {};

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const last = new Date(year, month + 1, 0);

    for (let d = 1; d <= last.getDate(); d++) {
      const iso = toISODate(new Date(year, month, d));
      map[iso] = [];
    }

    for (const t of tasks) {
      for (const iso of Object.keys(map)) {
        if (occursOn(t, iso)) map[iso].push(t);
      }
    }

    return map;
  }, [tasks, monthDate]);

  const selectedTasks = useMemo(() => {
    return (tasksByDate[selectedISO] || [])
      .slice()
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [tasksByDate, selectedISO]);

  function prevMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function handleCreateClick() {
    if (!user) {
      navigate("/auth");
      return;
    }
    setModalOpen(true);
  }

  async function createTask(payload) {
    try {
      await api.createTask(payload);
      setModalOpen(false);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  // ✅ Set status using the new unified route (recurring=per-date, non-recurring=normal)
  async function setStatusForSelectedDate(task, nextStatus) {
    if (!user) return;
    try {
      await api.setOccurrenceStatus(task._id, selectedISO, nextStatus);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  async function quickDelete(id) {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  // ✅ drag drop handler (move base date of task)
  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (!user) return;

    const task = active.data.current?.task;
    const newDate = over.id;
    if (!task || !newDate) return;

    const oldDate = task.date;
    if (oldDate === newDate) return;

    try {
      await api.updateTask(task._id, { date: newDate });
      await loadTasks();
      setSelectedISO(newDate);
    } catch (e) {
      console.error("Drag update failed:", e);
      setError("Could not move task. Try again.");
    }
  }

  return (
    <div className="page">
      <div className="topRow">
        <div>
          <h1>Calendar</h1>
          <p className="subtle">
            Click a date to view tasks. Drag a task chip onto another date to move it.
          </p>
        </div>

        <button className="btn" onClick={handleCreateClick}>
          + Create Task
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Calendar
          monthDate={monthDate}
          selectedISO={selectedISO}
          tasksByDate={tasksByDate}
          onSelectDate={setSelectedISO}
          onPrev={prevMonth}
          onNext={nextMonth}
          DraggableTaskChip={DraggableTaskChip}
          DroppableDayCell={DroppableDayCell}
          getStatusOnDate={(task, iso) => statusOnDate(task, iso)}
        />
      </DndContext>

      <div className="listCard">
        <div className="listHeader">
          <h2>Tasks for {selectedISO}</h2>
          <button className="btn secondary" onClick={() => setSelectedISO(toISODate(new Date()))}>
            Today
          </button>
        </div>

        {!user ? (
          <div className="empty">
            <p>You’re not logged in. Log in to see and create tasks.</p>
            <button className="btn" onClick={() => navigate("/auth")}>
              Login / Sign up
            </button>
          </div>
        ) : selectedTasks.length === 0 ? (
          <div className="empty">
            <p>No tasks yet for this date.</p>
            <button className="btn" onClick={() => setModalOpen(true)}>
              Create one
            </button>
          </div>
        ) : (
          <ul className="taskList">
            {selectedTasks.map((t) => {
              const curStatus = statusOnDate(t, selectedISO);
              const isDoing = curStatus === "doing";
              const isDone = curStatus === "done";

              return (
                <li key={t._id} className="taskRow">
                  <div className="taskMain" onClick={() => navigate(`/tasks/${t._id}`)}>
                    <div className="taskTitle">
                      {/* ✅ Yellow doing circle */}
                      <button
                        className={`stateDot ${isDoing ? "doing" : ""}`}
                        type="button"
                        title={isDoing ? "Unmark doing" : "Mark as Doing"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusForSelectedDate(t, isDoing ? "todo" : "doing");
                        }}
                      />

                      {/* ✅ Green done check */}
                      <button
                        className={`stateCheck ${isDone ? "done" : ""}`}
                        type="button"
                        title={isDone ? "Unmark done" : "Mark as Done"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusForSelectedDate(t, isDone ? "todo" : "done");
                        }}
                      >
                        {isDone ? "✓" : ""}
                      </button>

                      <span className={`${isDone ? "strike" : ""} ${isDoing ? "lightTitle" : ""}`}>
                        {t.title}
                      </span>
                    </div>

                    <div className="taskMeta">
                      {t.time ? <span>{t.time}</span> : <span className="mutedText">No time</span>}
                      <span className="sep">•</span>
                      <span className={`tag ${t.priority}`}>{t.priority}</span>
                      {isRecurring(t) && <span className="sep">•</span>}
                      {isRecurring(t) && <span className="mutedText">⟳</span>}
                    </div>
                  </div>

                  <div className="taskActions">
                    <button className="btn small" onClick={() => navigate(`/tasks/${t._id}`)}>
                      Open
                    </button>
                    <button className="btn small danger" onClick={() => quickDelete(t._id)}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => createTask({ ...payload, date: selectedISO })}
        initial={{ date: selectedISO }}
        dateLocked={true}
      />
    </div>
  );
}