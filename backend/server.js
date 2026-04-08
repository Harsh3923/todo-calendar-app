const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const taskRoutes = require("./src/routes/tasks");
const { seedTestData } = require("./src/seed/seedTestData");

const app = express();
const httpServer = http.createServer(app);

/* ── Socket.io setup ──────────────────────────────────────── */
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Authenticate every socket connection using the JWT token
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId; // matches requireAuth middleware
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  // Each user gets their own private room so events are scoped per-user
  socket.join(`user:${socket.userId}`);
  console.log(`Socket connected: user ${socket.userId}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

// Expose io to Express routes via req.app.get('io')
app.set("io", io);

/* ── Express middleware ────────────────────────────────────── */
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: false,
  })
);

/* ── Routes ───────────────────────────────────────────────── */
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

/* ── Start ────────────────────────────────────────────────── */
async function start() {
  const PORT = Number(process.env.PORT || 8080);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  await seedTestData();

  httpServer.listen(PORT, () => {
    console.log(`API + WebSocket running at http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});
