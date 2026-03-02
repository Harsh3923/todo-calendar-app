import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Calendar, { toISODate } from "../components/Calendar.jsx";
import TaskModal from "../components/TaskModal.jsx";
import { api } from "../api/client.js";

export default function CalendarPage({ user }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedISO, setSelectedISO] = useState(() => toISODate(new Date()));
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // if navbar navigated with "openCreate"
    if (location.state?.openCreate) {
      // clear state
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
      const list = await api.listTasks(); // get all tasks for calendar chips
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
    for (const t of tasks) {
      map[t.date] = map[t.date] || [];
      map[t.date].push(t);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    return (tasksByDate[selectedISO] || []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
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

  async function quickDelete(id) {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <div className="topRow">
        <div>
          <h1>Calendar</h1>
          <p className="subtle">
            Click a date to view tasks. Create tasks from the selected date.
          </p>
        </div>

        <button className="btn" onClick={handleCreateClick}>
          + Create Task
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <Calendar
        monthDate={monthDate}
        selectedISO={selectedISO}
        tasksByDate={tasksByDate}
        onSelectDate={setSelectedISO}
        onPrev={prevMonth}
        onNext={nextMonth}
      />

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
            <button className="btn" onClick={() => navigate("/auth")}>Login / Sign up</button>
          </div>
        ) : selectedTasks.length === 0 ? (
          <div className="empty">
            <p>No tasks yet for this date.</p>
            <button className="btn" onClick={() => setModalOpen(true)}>Create one</button>
          </div>
        ) : (
          <ul className="taskList">
            {selectedTasks.map((t) => (
              <li key={t._id} className="taskRow">
                <div className="taskMain" onClick={() => navigate(`/tasks/${t._id}`)}>
                  <div className="taskTitle">
                    <span className={`dot ${t.status}`} />
                    {t.title}
                  </div>
                  <div className="taskMeta">
                    {t.time ? <span>{t.time}</span> : <span className="mutedText">No time</span>}
                    <span className="sep">•</span>
                    <span className={`tag ${t.priority}`}>{t.priority}</span>
                  </div>
                </div>

                <div className="taskActions">
                  <button className="btn small" onClick={() => navigate(`/tasks/${t._id}`)}>Open</button>
                  <button className="btn small danger" onClick={() => quickDelete(t._id)}>Delete</button>
                </div>
              </li>
            ))}
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