const express = require("express");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// CREATE
router.post("/", async (req, res, next) => {
  try {
    const { title, description = "", date, time = "", priority = "med", status = "todo" } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: "title and date required" });

    const task = await Task.create({
      userId: req.user.id,
      title,
      description,
      date,
      time,
      priority,
      status,
      recurrence,
      recurrenceInterval
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

// READ MANY (optionally by date)
router.get("/", async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = { userId: req.user.id };
    if (date) filter.date = date;

    const tasks = await Task.find(filter).sort({ date: 1, time: 1, createdAt: -1 });
    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

// READ ONE
router.get("/:id", async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (e) {
    next(e);
  }
});

// UPDATE
router.put("/:id", async (req, res, next) => {
  try {
    const updates = req.body || {};
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (e) {
    next(e);
  }
});

// DELETE
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;