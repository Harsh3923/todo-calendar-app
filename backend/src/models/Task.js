const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 2000 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    time: { type: String, default: "" }, // "14:30" optional
    priority: { type: String, enum: ["low", "med", "high"], default: "med" },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    recurrenceInterval: { type: Number, default: 1 }, // keep for future
    prevStatus: { type: String, enum: ["todo", "doing"], default: "todo" },
    completedAt: { type: Date, default: null },
    completedDates: { type: [String], default: [] }, // YYYY-MM-DD occurrences completed
    doingDates: { type: [String], default: [] }, // YYYY-MM-DD occurrences in-progress
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);