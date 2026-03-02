import React from "react";
function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function Calendar({ monthDate, selectedISO, tasksByDate, onSelectDate, onPrev, onNext }) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);

  const startWeekday = first.getDay(); // 0=Sun
  const totalDays = last.getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = monthDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="calendarCard">
      <div className="calHeader">
        <button className="iconBtn" onClick={onPrev}>◀</button>
        <h2 className="calTitle">{monthLabel}</h2>
        <button className="iconBtn" onClick={onNext}>▶</button>
      </div>

      <div className="calGrid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="calDow">{d}</div>
        ))}

        {cells.map((d, idx) => {
          if (!d) return <div key={idx} className="calCell muted" />;

          const iso = toISODate(d);
          const selected = iso === selectedISO;
          const list = tasksByDate[iso] || [];

          return (
            <button
              key={idx}
              className={`calCell ${selected ? "selected" : ""}`}
              onClick={() => onSelectDate(iso)}
              title={iso}
            >
              <div className="calDayNum">{d.getDate()}</div>
              <div className="calChips">
                {list.slice(0, 2).map((t) => (
                  <div key={t._id} className={`chip ${t.status}`}>{t.title}</div>
                ))}
                {list.length > 2 && <div className="chip more">+{list.length - 2} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}