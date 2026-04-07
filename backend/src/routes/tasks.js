const express = require("express");
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// CREATE
router.post("/", async (req, res, next) => {
  try {
    
    const {
      title,
      description = "",
      date,
      time = "",
      priority = "med",
      status = "todo",
      recurrence = "none",
      recurrenceInterval = 1,
    } = req.body || {};

    if (!title || !date) return res.status(400).json({ error: "title and date required" });
    
    const task = await Task.create({
      userId: req.user.id,
      title,
      description,
      date,
      time,
      priority,
      status,
      prevStatus: status === "doing" ? "doing" : "todo", // ✅
      recurrence,
      recurrenceInterval,
      completedAt: status === "done" ? new Date() : null,
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

// READ MANY (optionally by date and/or status)
router.get("/", async (req, res, next) => {
  try {
    const { date, status } = req.query;

    const filter = { userId: req.user.id };
    if (date) filter.date = date;
    if (status) filter.status = status;

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
// Set per-occurrence status for a date (recurring) OR normal status (non-recurring)
router.post("/:id/set-occurrence-status", async (req, res, next) => {
  try {
    const { date, status } = req.body || {};
    if (!date) return res.status(400).json({ error: "date required" });
    if (!["todo", "doing", "done"].includes(status)) {
      return res.status(400).json({ error: "status must be todo|doing|done" });
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isRecurring = task.recurrence && task.recurrence !== "none";

    // NON-RECURRING: behave normally
    if (!isRecurring) {
      if (status === "done") {
        if (task.status !== "done") task.prevStatus = task.status === "doing" ? "doing" : "todo";
        task.status = "done";
        task.completedAt = task.completedAt || new Date();
      } else {
        task.status = status;
        task.prevStatus = status;   // keep aligned
        task.completedAt = null;
      }
      await task.save();
      return res.json(task);
    }

    // RECURRING: set status only for this date
    const doingSet = new Set(task.doingDates || []);
    const doneSet = new Set(task.completedDates || []);

    // Ensure exclusivity todo -> remove from both
    // doing -> add to doing, remove from done
    // done -> add to done, remove from doing
    if (status === "todo") {
      doingSet.delete(date);
      doneSet.delete(date);
    } else if (status === "doing") {
      doingSet.add(date);
      doneSet.delete(date);
    } else if (status === "done") {
      doneSet.add(date);
      doingSet.delete(date);
    }

    task.doingDates = Array.from(doingSet).sort();
    task.completedDates = Array.from(doneSet).sort();

    await task.save();
    res.json(task);
  } catch (e) {
    next(e);
  }
});
// TOGGLE completion for a specific occurrence date (for recurring tasks)
router.post("/:id/toggle-complete", async (req, res, next) => {
  try {
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: "date required" });

    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isRecurring = task.recurrence && task.recurrence !== "none";

    // Non-recurring: just use normal status logic by updating status
    if (!isRecurring) {
      // toggle done ↔ previous
      if (task.status === "done") {
        task.status = task.prevStatus === "doing" ? "doing" : "todo";
        task.completedAt = null;
      } else {
        task.prevStatus = task.status === "doing" ? "doing" : "todo";
        task.status = "done";
        task.completedAt = new Date();
      }
      await task.save();
      return res.json(task);
    }

    // Recurring: toggle completion only for THIS date
    const set = new Set(task.completedDates || []);
    if (set.has(date)) set.delete(date);
    else set.add(date);

    task.completedDates = Array.from(set).sort(); // keep it tidy
    await task.save();
    res.json(task);
  } catch (e) {
    next(e);
  }
});

// UPDATE
router.put("/:id", async (req, res, next) => {
  try {
    const updates = req.body || {};

    // Find the current task first (we need current status to remember/restore)
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: "Task not found" });

    // ✅ If status is being updated, sync prevStatus + completedAt
    if (typeof updates.status === "string") {
      const incoming = updates.status;

      if (incoming === "done") {
        // remember previous non-done status
        if (task.status !== "done") {
          task.prevStatus = task.status === "doing" ? "doing" : "todo";
        }
        task.status = "done";
        task.completedAt = task.completedAt || new Date();
      } else if (incoming === "todo" || incoming === "doing") {
        // normal status change (not done)
        task.status = incoming;
        task.prevStatus = incoming;     // keep it aligned
        task.completedAt = null;        // leaving done clears completedAt
      }
    }

    // Apply any other updates (title, date, time, priority, recurrence, etc.)
    const allowed = { ...updates };
    delete allowed.status; // already handled above

    Object.assign(task, allowed);

    const saved = await task.save();
    res.json(saved);
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