import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { api } from "../api/client.js";
import { toISODate } from "../components/Calendar.jsx";

/* ---------------- date + recurrence helpers ---------------- */

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function daysBetween(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function weekdayOf(iso) {
  return parseISO(iso).getDay(); // 0=Sun
}

function dayOfMonth(iso) {
  return parseISO(iso).getDate();
}

function fmtShort(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function fmtMonthDay(iso) {
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function startOfWeekMonday(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ---------------- month helpers ---------------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function monthKeyFromISO(iso) {
  const d = parseISO(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // "YYYY-MM"
}

function startOfMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return toISODate(new Date(y, m - 1, 1));
}

function daysInMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function labelMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/* ---------------- recurrence helpers ---------------- */

function isRecurring(task) {
  return task.recurrence && task.recurrence !== "none";
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

function statusOnDate(task, iso) {
  if (!isRecurring(task)) return task.status;
  if (Array.isArray(task.completedDates) && task.completedDates.includes(iso)) return "done";
  if (Array.isArray(task.doingDates) && task.doingDates.includes(iso)) return "doing";
  return "todo";
}

/* ---------------- colors ---------------- */

const PIE_COLORS = {
  high: "var(--prio-high)",
  med: "var(--prio-med)",
  low: "var(--prio-low)",
};

const STATUS_COLORS = {
  todo: "var(--status-todo)",
  doing: "var(--status-doing)",
  done: "var(--status-done)",
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/* ---------------- page ---------------- */

export default function DashboardPage({ user }) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const todayISO = toISODate(new Date());

  // Current week (Mon → Sun)
  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekISOs = useMemo(() => {
    const startISO = toISODate(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDaysISO(startISO, i));
  }, [weekStart]);

  // Month selector (default = current month)
  const [selectedMonth, setSelectedMonth] = useState(() =>
    monthKeyFromISO(todayISO)
  );

  // Show last 12 months in dropdown
  const monthOptions = useMemo(() => {
    const now = new Date();
    const out = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
    }
    return out;
  }, []);

  // Heatmap range = ONLY selected month
  const heatmapDays = useMemo(() => {
    const start = startOfMonthKey(selectedMonth);
    const n = daysInMonthKey(selectedMonth);
    return Array.from({ length: n }, (_, i) => addDaysISO(start, i));
  }, [selectedMonth]);

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        if (!user) {
          setTasks([]);
          return;
        }
        const list = await api.listTasks();
        setTasks(list);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const computed = useMemo(() => {
    const priority = { high: 0, med: 0, low: 0 };
    const status = { todo: 0, doing: 0, done: 0 };

    // weekly chart data
    const completedByDay = weekISOs.map((iso) => ({
      iso,
      day: fmtShort(iso),
      completed: 0,
      total: 0,
    }));

    // Heatmap counts (selected month only)
    const heatmapCount = {};
    for (const iso of heatmapDays) heatmapCount[iso] = 0;

    let totalOcc = 0;
    let doneOcc = 0;

    for (const t of tasks) {
      // WEEK analytics
      for (let i = 0; i < weekISOs.length; i++) {
        const iso = weekISOs[i];
        if (!occursOn(t, iso)) continue;

        const st = statusOnDate(t, iso);
        totalOcc += 1;
        completedByDay[i].total += 1;

        status[st] = (status[st] || 0) + 1;
        priority[t.priority] = (priority[t.priority] || 0) + 1;

        if (st === "done") {
          doneOcc += 1;
          completedByDay[i].completed += 1;
        }
      }

      // MONTH heatmap counts
      for (const iso of heatmapDays) {
        if (!occursOn(t, iso)) continue;
        if (statusOnDate(t, iso) === "done") heatmapCount[iso] += 1;
      }
    }

    const completionRate = totalOcc === 0 ? 0 : Math.round((doneOcc / totalOcc) * 100);

    const priorityData = [
      { name: "High", key: "high", value: priority.high },
      { name: "Medium", key: "med", value: priority.med },
      { name: "Low", key: "low", value: priority.low },
    ];

    const statusData = [
      { name: "Todo", key: "todo", value: status.todo },
      { name: "Doing", key: "doing", value: status.doing },
      { name: "Done", key: "done", value: status.done },
    ];

    // Most productive day THIS WEEK (by completed count)
    const bestDay = completedByDay.reduce(
      (acc, d) => (d.completed > acc.completed ? d : acc),
      completedByDay[0] || { completed: 0, iso: todayISO, day: "" }
    );

    // Streak (based on selected month): consecutive days up to today where completed > 0
    // If today is not in selected month, streak will still count backward from the end of the selected month.
    const streakEndISO = heatmapDays.includes(todayISO) ? todayISO : heatmapDays[heatmapDays.length - 1];
    const streakIndex = heatmapDays.indexOf(streakEndISO);
    let streak = 0;
    for (let i = streakIndex; i >= 0; i--) {
      const iso = heatmapDays[i];
      if (heatmapCount[iso] > 0) streak += 1;
      else break;
    }

    // Intensity bucket 0..4 based on max day in selected month
    const maxDay = Math.max(0, ...Object.values(heatmapCount));
    function bucket(v) {
      if (v <= 0) return 0;
      if (maxDay <= 1) return 4;
      const ratio = v / maxDay;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    }

    // GitHub-style columns (weeks) with Sunday start
    const start = heatmapDays[0];
    const padLeft = weekdayOf(start); // how many blanks before first day to align Sunday row start
    const padded = [];
    for (let i = 0; i < padLeft; i++) padded.push(null);
    for (const iso of heatmapDays) padded.push(iso);
    while (padded.length % 7 !== 0) padded.push(null);

    const columns = [];
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7); // Sun..Sat
      columns.push(
        week.map((iso) => {
          if (!iso) return null;
          const count = heatmapCount[iso] ?? 0;
          return { iso, count, level: bucket(count) };
        })
      );
    }

    return {
      totalOcc,
      doneOcc,
      completionRate,
      completedByDay,
      priorityData,
      statusData,
      bestDay,
      streak,
      heatmap: { columns, maxDay },
    };
  }, [tasks, weekISOs, heatmapDays, todayISO]);

  if (!user) {
    return (
      <div className="page">
        <div className="dashHeader">
          <h1>Dashboard</h1>
          <p className="subtle">Log in to see your productivity analytics.</p>
        </div>
        <div className="empty">
          <p>You’re not logged in.</p>
          <p className="mutedText">Go to Login / Sign up to start tracking tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="dashHeader">
        <div>
          <h1>Dashboard</h1>
          <p className="subtle">
            Weekly overview ({toISODate(weekStart)} → {weekISOs[6]}) • Today: {todayISO}
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="page"><p>Loading…</p></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpiGrid">
            <div className="kpiCard">
              <div className="kpiLabel">Tasks completed this week</div>
              <div className="kpiValue">{computed.doneOcc}</div>
              <div className="kpiHint">Across all occurrences</div>
            </div>

            <div className="kpiCard">
              <div className="kpiLabel">Completion rate</div>
              <div className="kpiValue">{computed.completionRate}%</div>
              <div className="kpiHint">
                {computed.doneOcc} / {computed.totalOcc} done
              </div>
            </div>

            <div className="kpiCard">
              <div className="kpiLabel">Streak</div>
              <div className="kpiValue">{computed.streak} days</div>
              <div className="kpiHint">Consecutive days with at least 1 completion</div>
            </div>

            <div className="kpiCard">
              <div className="kpiLabel">Most productive day</div>
              <div className="kpiValue">{computed.bestDay.day || "—"}</div>
              <div className="kpiHint">
                {computed.bestDay.completed || 0} completed •{" "}
                {computed.bestDay.iso ? fmtMonthDay(computed.bestDay.iso) : ""}
              </div>
            </div>
          </div>

          {/* Heatmap (MONTH) */}
          <div className="dashCard heatmapCard">
            <div className="dashCardHeader">
              <h2>Completion heatmap</h2>

              <div className="heatmapControls">
                <select
                  className="select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Select heatmap month"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {labelMonthKey(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="heatmapTop">
              <div className="heatmapMonthTitle">{labelMonthKey(selectedMonth)}</div>
            </div>

            <div className="heatmapWrap">
              <div className="heatmapY">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="heatmapGrid" aria-label="Completion heatmap">
                {computed.heatmap.columns.map((col, cIdx) => (
                  <div key={cIdx} className="heatmapCol">
                    {col.map((cell, rIdx) => {
                      if (!cell) return <div key={rIdx} className="hmCell hmEmpty" />;
                      return (
                        <div
                          key={cell.iso}
                          className={`hmCell hmL${cell.level}`}
                          title={`${cell.iso} • ${cell.count} completed`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="heatmapLegend">
              <span className="mutedText">Less</span>
              <div className="heatmapLegendSwatches">
                <div className="hmCell hmL0" />
                <div className="hmCell hmL1" />
                <div className="hmCell hmL2" />
                <div className="hmCell hmL3" />
                <div className="hmCell hmL4" />
              </div>
              <span className="mutedText">More</span>
            </div>
          </div>

          {/* Charts */}
          <div className="dashGrid">
            <div className="dashCard">
              <div className="dashCardHeader">
                <h2>Tasks completed this week</h2>
                <span className="pill subtlePill">Line</span>
              </div>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={computed.completedByDay} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="var(--accent)" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashCard">
              <div className="dashCardHeader">
                <h2>Completion rate</h2>
                <span className="pill subtlePill">Radial</span>
              </div>
              <div className="chartWrap" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="92%"
                    data={[{ name: "Rate", value: clamp(computed.completionRate, 0, 100) }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} fill="var(--accent)" />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="centerOverlay">
                  <div>
                    <div className="centerBig">{computed.completionRate}%</div>
                    <div className="centerSmall">this week</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashCard">
              <div className="dashCardHeader">
                <h2>Tasks by priority</h2>
                <span className="pill subtlePill">Pie</span>
              </div>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={computed.priorityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={96}
                      paddingAngle={3}
                    >
                      {computed.priorityData.map((entry) => (
                        <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="legendRow">
                  {computed.priorityData.map((p) => (
                    <div key={p.key} className="legendItem">
                      <span className="legendSwatch" style={{ background: PIE_COLORS[p.key] }} />
                      <span>{p.name}: <b>{p.value}</b></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashCard">
              <div className="dashCardHeader">
                <h2>Tasks by status</h2>
                <span className="pill subtlePill">Bar</span>
              </div>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={computed.statusData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {computed.statusData.map((s) => (
                        <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}