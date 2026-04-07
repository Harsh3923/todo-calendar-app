const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const taskRoutes = require("./src/routes/tasks");
const { seedTestData } = require("./src/seed/seedTestData");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: false,
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Server error",
  });
});

async function start() {
  const PORT = Number(process.env.PORT || 8080);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  // seed test data on startup if empty / not existing
  await seedTestData();

  app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});