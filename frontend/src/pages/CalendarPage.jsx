import React from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
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

/* ---------------- Date + recurrence helpers ---------------- */

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
function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// returns true if task "occurs" on targetISO
function occursOn(task, targetISO) {
  const r = task.recurrence || "none";
  if (r === "none") return task.date === targetISO;

  // recurrence only happens on/after the start date
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

// occurrence-aware status
function statusOnDate(task, iso) {
  if (!isRecurring(task)) return task.status;

  if (Array.isArray(task.completedDates) && task.completedDates.includes(iso)) return "done";
  if (Array.isArray(task.doingDates) && task.doingDates.includes(iso)) return "doing";
  return "todo";
}

// pick a “best date” to jump to when selecting a search result
function bestDateForTask(task, todayISO) {
  if (!isRecurring(task)) return task.date;

  // try today..today+45 for the next occurrence
  let cur = todayISO;
  for (let i = 0; i < 45; i++) {
    if (occursOn(task, cur)) return cur;
    cur = addDaysISO(cur, 1);
  }
  // fallback
  return task.date;
}

/* ---------------- Main page ---------------- */

export default function CalendarPage({ user }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()));
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ top search bar (global)
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);

  // ✅ optional filters ONLY for selected-day list (keeps your bottom list strict)
  const [priorityFilter, setPriorityFilter] = useState("all"); // all|low|med|high
  const [statusFilter, setStatusFilter] = useState("all"); // all|todo|doing|done

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

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

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

  const filteredSelectedTasks = useMemo(() => {
    return selectedTasks.filter((t) => {
      const st = statusOnDate(t, selectedISO);
      const okStatus = statusFilter === "all" ? true : st === statusFilter;
      const okPrio = priorityFilter === "all" ? true : t.priority === priorityFilter;
      return okStatus && okPrio;
    });
  }, [selectedTasks, selectedISO, statusFilter, priorityFilter]);

  // ✅ dropdown search matches (global across all tasks)
  const searchMatches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];

    const matches = tasks
      .filter((t) => {
        const hay = `${t.title || ""} ${t.description || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);

    return matches;
  }, [searchQ, tasks]);

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

  async function quickDelete(id) {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }
  async function setDoingForSelectedDate(task) {
  if (!user) return;
  try {
    if (isRecurring(task)) {
      // occurrence-only
      await api.setOccurrenceStatus(task._id, selectedISO, "doing");
    } else {
      await api.updateTask(task._id, { status: "doing" });
    }
    await loadTasks();
  } catch (e) {
    setError(e.message);
  }
}

async function setDoneForSelectedDate(task) {
  if (!user) return;
  try {
    if (isRecurring(task)) {
      // occurrence-only
      await api.setOccurrenceStatus(task._id, selectedISO, "done");
    } else {
      await api.updateTask(task._id, { status: "done" });
    }
    await loadTasks();
  } catch (e) {
    setError(e.message);
  }
}

async function clearStateForSelectedDate(task) {
  // optional helper if you ever want to reset to todo
  if (!user) return;
  try {
    if (isRecurring(task)) {
      await api.setOccurrenceStatus(task._id, selectedISO, "todo");
    } else {
      await api.updateTask(task._id, { status: "todo" });
    }
    await loadTasks();
  } catch (e) {
    setError(e.message);
  }
}
  // ✅ drag drop handler (moves base date)
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

  function selectSearchResult(task) {
    const todayISO = toISODate(new Date());
    const jumpISO = bestDateForTask(task, todayISO);

    setSelectedISO(jumpISO);
    setSearchOpen(false);
    setSearchQ("");

    // open detail (you can remove this if you prefer just jumping)
    navigate(`/tasks/${task._id}`);
  }

  return (
    <div className="page">
      {/* ✅ Global search directly under navbar */}
      <div className="globalSearchRow" ref={searchWrapRef}>
        <div className="searchWrapTop">
          <span className="searchIcon">🔎</span>
          <input
            className="searchInput"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search tasks..."
            disabled={!user}
          />
        </div>

        {searchOpen && searchQ.trim() && user && (
          <div className="searchDropdown">
            {searchMatches.length === 0 ? (
              <div className="searchEmpty">No matches</div>
            ) : (
              searchMatches.map((t) => {
                const recurring = isRecurring(t);
                return (
                  <button
                    key={t._id}
                    className="searchItem"
                    type="button"
                    onClick={() => selectSearchResult(t)}
                    title="Open task"
                  >
                    <div className="searchItemTitle">
                      <span className={`dot ${t.status}`} />
                      <span className="searchItemText">
                        {t.title}
                        {recurring ? " ⟳" : ""}
                      </span>
                    </div>
                    <div className="searchItemMeta">
                      <span className="mutedText">{t.date}</span>
                      <span className="sep">•</span>
                      <span className={`tag ${t.priority}`}>{t.priority}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {!user && (
          <div className="mutedText" style={{ marginTop: 8 }}>
            Log in to search your tasks.
          </div>
        )}
      </div>

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

      {/* ✅ Bottom stays strictly “tasks for selected date” */}
      <div className="listCard">
        <div className="listHeader">
          <h2>Tasks for {selectedISO}</h2>
          <button className="btn secondary" onClick={() => setSelectedISO(toISODate(new Date()))}>
            Today
          </button>
        </div>

        {/* Optional filters for the selected day only */}
        {user && (
          <div className="filtersRow">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">Priority: All</option>
              <option value="high">Priority: High</option>
              <option value="med">Priority: Medium</option>
              <option value="low">Priority: Low</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Status: All</option>
              <option value="todo">Status: Todo</option>
              <option value="doing">Status: Doing</option>
              <option value="done">Status: Done</option>
            </select>

            <button
              className="btn secondary small"
              type="button"
              onClick={() => {
                setPriorityFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear
            </button>
          </div>
        )}

        {!user ? (
          <div className="empty">
            <p>You’re not logged in. Log in to see and create tasks.</p>
            <button className="btn" onClick={() => navigate("/auth")}>Login / Sign up</button>
          </div>
        ) : filteredSelectedTasks.length === 0 ? (
          <div className="empty">
            <p>No tasks for this date (or they’re filtered out).</p>
            <button className="btn" onClick={() => setModalOpen(true)}>Create one</button>
          </div>
        ) : (
          <ul className="taskList">
            {filteredSelectedTasks.map((t) => {
              const st = statusOnDate(t, selectedISO);
              const recurring = isRecurring(t);

              return (
                <li key={t._id} className="taskRow">
                  <div className="taskMain" onClick={() => navigate(`/tasks/${t._id}`)}>
                    <div className="taskTitle">
                      {/* Yellow doing circle */}
                      <button
                        type="button"
                        className={`stateDot ${st === "doing" ? "doing" : ""}`}
                        title="Mark as Doing"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDoingForSelectedDate(t);
                        }}
                        aria-label="Mark as doing"
                      />

                      {/* Green done box */}
                      <button
                        type="button"
                        className={`stateCheck ${st === "done" ? "done" : ""}`}
                        title="Mark as Done"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDoneForSelectedDate(t);
                        }}
                        aria-label="Mark as done"
                      >
                        {st === "done" ? "✓" : ""}
                      </button>

                      {/* Title styling */}
                      <span
                        className={[
                          st === "done" ? "strike" : "",
                          st === "doing" ? "lightTitle" : "",
                        ].join(" ")}
                      >
                        {t.title}
                        {recurring ? " ⟳" : ""}
                      </span>
                    </div>

                    <div className="taskMeta">
                      {t.time ? <span>{t.time}</span> : <span className="mutedText">No time</span>}
                      <span className="sep">•</span>
                      <span className={`tag ${t.priority}`}>{t.priority}</span>
                      <span className="sep">•</span>
                      <span className="mutedText">{st}</span>
                    </div>
                  </div>

                  <div className="taskActions">
                    <button className="btn small" onClick={() => navigate(`/tasks/${t._id}`)}>Open</button>
                    <button className="btn small danger" onClick={() => quickDelete(t._id)}>Delete</button>
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