const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Task = require("../models/Task");

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function seedTestData() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return; // already seeded at least once

  const demoEmail = "demo@todo.com";
  const demoPass = "demo123";

  const passwordHash = await bcrypt.hash(demoPass, 10);
  const user = await User.create({ email: demoEmail, passwordHash });

  const base = todayISO();
  const sample = [
    { title: "Finish CPS630 A2 checklist", date: base, time: "18:00", priority: "high" },
    { title: "Gym", date: base, time: "20:00", priority: "med" },
    { title: "Buy groceries", date: addDays(base, 1), time: "16:30", priority: "low" },
    { title: "Group meeting", date: addDays(base, 2), time: "14:00", priority: "high" },
    { title: "Review lecture notes", date: addDays(base, 3), time: "19:00", priority: "med" },
    { title: "Pay phone bill", date: addDays(base, 5), time: "12:00", priority: "med" },
    { title: "Plan next week", date: addDays(base, 7), time: "10:00", priority: "low" },
    { title: "Refactor UI polish", date: addDays(base, 7), time: "17:00", priority: "med" }
  ].map(t => ({
    userId: user._id,
    description: "",
    status: "todo",
    ...t
  }));

  await Task.insertMany(sample);

  console.log("Seeded demo user + tasks:");
  console.log(`  email: ${demoEmail}`);
  console.log(`  pass : ${demoPass}`);
}

module.exports = { seedTestData };