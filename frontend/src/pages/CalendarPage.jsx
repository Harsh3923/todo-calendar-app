import React from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Calendar, { toISODate } from "../components/Calendar.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";
import { useToast } from "../components/Toast.jsx";

/* ── H9: Friendly error messages ─────────────────────────── */
function friendlyError(raw) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("network") || msg.includes("failed to fetch"))
    return "Cannot reach the server. Check your connection and try again.";
  if (msg.includes("unauthorized") || msg.includes("401"))
    return "Your session has expired. Please log in again.";
  return raw || "Something went wrong. Please try again.";
}

/* ── H2: Label maps ──────────────────────────────────────── */
const PRIORITY_LABEL = { low: "Low", med: "Medium", high: "High" };
const STATUS_ICON    = { todo: "○", doing: "◑", done: "✓" };

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
  return parseISO(iso).getDay();
}
function dayOfMonth(iso) {
  return parseISO(iso).getDate();
}
function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function occursOn(task, targetISO) {
  const r = task.recurrence || "none";
  if (r === "none") return task.date === targetISO;
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

function statusOnDate(task, iso) {
  if (!isRecurring(task)) return task.status;
  if (Array.isArray(task.completedDates) && task.completedDates.includes(iso)) return "done";
  if (Array.isArray(task.doingDates) && task.doingDates.includes(iso)) return "doing";
  return "todo";
}

function bestDateForTask(task, todayISO) {
  if (!isRecurring(task)) return task.date;
  let cur = todayISO;
  for (let i = 0; i < 45; i++) {
    if (occursOn(task, cur)) return cur;
    cur = addDaysISO(cur, 1);
  }
  return task.date;
}

/* ---------------- Main page ---------------- */

export default function CalendarPage({ user }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()));
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFromNav, setModalFromNav] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);

  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (location.state?.openCreate) {
      navigate("/", { replace: true, state: {} });
      setModalFromNav(true);
      setModalOpen(true);
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

  // H7: keyboard shortcut — press N to open create modal
  useEffect(() => {
    function handleGlobalKey(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (modalOpen) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (!user) { navigate("/auth"); return; }
        setModalFromNav(false);
        setModalOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [modalOpen, user, navigate]);

  async function loadTasks() {
    setError("");
    setLoading(true);
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      const list = await api.listTasks();
      setTasks(list);
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setLoading(false);
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

  const searchMatches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter((t) => `${t.title || ""} ${t.description || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQ, tasks]);

  function prevMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function handleCreateClick() {
    if (!user) { navigate("/auth"); return; }
    setModalFromNav(false);
    setModalOpen(true);
  }

  async function createTask(payload) {
    try {
      await api.createTask(payload);
      setModalOpen(false);
      setModalFromNav(false);
      addToast("Task created", "success");
      await loadTasks();
    } catch (e) {
      setError(friendlyError(e.message));
    }
  }

  // H3: Undo-toast delete — replaces window.confirm()
  async function quickDelete(task) {
    setTasks((prev) => prev.filter((t) => t._id !== task._id));
    let undone = false;

    addToast(
      `"${task.title}" deleted`,
      "info",
      async () => {
        undone = true;
        try {
          await api.createTask({
            title: task.title,
            description: task.description,
            date: task.date,
            time: task.time,
            priority: task.priority,
            status: task.status,
            recurrence: task.recurrence,
          });
          await loadTasks();
          addToast("Task restored", "success");
        } catch {
          addToast("Could not restore task.", "error");
          await loadTasks();
        }
      },
      4500
    );

    setTimeout(async () => {
      if (!undone) {
        try {
          await api.deleteTask(task._id);
        } catch {
          addToast("Delete failed — reloading.", "error");
          await loadTasks();
        }
      }
    }, 4500);
  }

  async function setDoingForSelectedDate(task) {
    if (!user) return;
    try {
      if (isRecurring(task)) {
        await api.setOccurrenceStatus(task._id, selectedISO, "doing");
      } else {
        await api.updateTask(task._id, { status: "doing" });
      }
      await loadTasks();
    } catch (e) {
      setError(friendlyError(e.message));
    }
  }

  async function setDoneForSelectedDate(task) {
    if (!user) return;
    try {
      if (isRecurring(task)) {
        await api.setOccurrenceStatus(task._id, selectedISO, "done");
      } else {
        await api.updateTask(task._id, { status: "done" });
      }
      await loadTasks();
    } catch (e) {
      setError(friendlyError(e.message));
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || !user) return;
    const task = active.data.current?.task;
    const newDate = over.id;
    if (!task || !newDate || task.date === newDate) return;
    try {
      await api.updateTask(task._id, { date: newDate });
      await loadTasks();
      setSelectedISO(newDate);
    } catch (e) {
      setError(friendlyError(e.message));
    }
  }

  function selectSearchResult(task) {
    const todayISO = toISODate(new Date());
    const jumpISO = bestDateForTask(task, todayISO);
    setSelectedISO(jumpISO);
    setSearchOpen(false);
    setSearchQ("");
    navigate(`/tasks/${task._id}`);
  }

  // H6: filter badge count
  const filtersActive =
    (priorityFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="page">
      {/* H6: Global search with ARIA */}
      <div className="globalSearchRow" ref={searchWrapRef}>
        <div className="searchWrapTop">
          <span className="searchIcon">🔎</span>
          <input
            className="searchInput"
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search by title or description…"
            disabled={!user}
            role="combobox"
            aria-expanded={searchOpen && searchQ.trim().length > 0}
            aria-haspopup="listbox"
            aria-label="Search tasks"
          />
        </div>

        {searchOpen && searchQ.trim() && user && (
          <div className="searchDropdown" role="listbox">
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
                    role="option"
                    onClick={() => selectSearchResult(t)}
                    title="Open task"
                  >
                    <div className="searchItemTitle">
                      <span className={`dot ${t.status}`} />
                      <span className="searchItemText">
                        {t.title}{recurring ? " ⟳" : ""}
                      </span>
                    </div>
                    <div className="searchItemMeta">
                      <span className="mutedText">{t.date}</span>
                      <span className="sep">•</span>
                      {/* H2: "Medium" not "med" */}
                      <span className={`tag ${t.priority}`}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
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
            {user && <span> Press <kbd>N</kbd> to create a task.</span>}
          </p>
        </div>
        <button className="btn" onClick={handleCreateClick}>
          + Create Task
        </button>
      </div>

      {/* H9: Error with retry button */}
      {error && (
        <div className="error errorRow">
          <span>{error}</span>
          <button className="btn small secondary" onClick={loadTasks}>Try again</button>
        </div>
      )}

      {/* H1: Loading spinner */}
      {loading && <div className="spinnerWrap"><div className="spinner" aria-label="Loading tasks…" /></div>}

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
          {/* H10: tooltip on Today button */}
          <button
            className="btn secondary"
            onClick={() => setSelectedISO(toISODate(new Date()))}
            title="Jump to today's date"
          >
            Today
          </button>
        </div>

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
              onClick={() => { setPriorityFilter("all"); setStatusFilter("all"); }}
            >
              Clear
            </button>

            {/* H6: Active filter count badge */}
            {filtersActive > 0 && (
              <span className="filterBadge" title={`${filtersActive} filter(s) active`}>
                {filtersActive}
              </span>
            )}
          </div>
        )}

        {!user ? (
          <div className="empty">
            <p>You're not logged in. Log in to see and create tasks.</p>
            <button className="btn" onClick={() => navigate("/auth")}>Login / Sign up</button>
          </div>
        ) : filteredSelectedTasks.length === 0 ? (
          <div className="empty">
            <p>No tasks for this date{filtersActive > 0 ? " (filters active)" : ""}.</p>
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
                      <button
                        type="button"
                        className={`stateDot ${st === "doing" ? "doing" : ""}`}
                        title="Mark as Doing"
                        onClick={(e) => { e.stopPropagation(); setDoingForSelectedDate(t); }}
                        aria-label="Mark as doing"
                      />
                      <button
                        type="button"
                        className={`stateCheck ${st === "done" ? "done" : ""}`}
                        title="Mark as Done"
                        onClick={(e) => { e.stopPropagation(); setDoneForSelectedDate(t); }}
                        aria-label="Mark as done"
                      >
                        {st === "done" ? "✓" : ""}
                      </button>
                      <span className={[st === "done" ? "strike" : "", st === "doing" ? "lightTitle" : ""].join(" ")}>
                        {t.title}{recurring ? " ⟳" : ""}
                      </span>
                    </div>

                    <div className="taskMeta">
                      {t.time ? <span>{t.time}</span> : <span className="mutedText">No time</span>}
                      <span className="sep">•</span>
                      {/* H2: "Medium" label + status icon */}
                      <span className={`tag ${t.priority}`}>{PRIORITY_LABEL[t.priority] || t.priority}</span>
                      <span className="sep">•</span>
                      <span className="mutedText">{STATUS_ICON[st]} {st}</span>
                    </div>
                  </div>

                  <div className="taskActions">
                    <button className="btn small" onClick={() => navigate(`/tasks/${t._id}`)}>Open</button>
                    {/* H3: no confirm dialog — undo toast instead */}
                    <button className="btn small danger" onClick={() => quickDelete(t)}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalFromNav(false); }}
        onSubmit={(payload) =>
          createTask(modalFromNav ? payload : { ...payload, date: selectedISO })
        }
        initial={modalFromNav ? {} : { date: selectedISO }}
        dateLocked={!modalFromNav}
      />
    </div>
  );
}
