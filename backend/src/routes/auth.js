const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { requireAuth } = require("../middleware/auth");
const { sendOTP } = require("../utils/mailer");

const router = express.Router();

/* ─── helpers ─────────────────────────────────────────────── */

function makeToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function otpExpiresAt() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

/* ─── POST /api/auth/send-signup-otp ──────────────────────── */
// Step 1 of registration: validate email/password, send OTP
router.post("/send-signup-otp", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing && existing.verified) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert unverified user (so we can re-send OTP without duplicates)
    if (existing && !existing.verified) {
      existing.passwordHash = passwordHash;
      await existing.save();
    } else {
      await User.create({ email: email.toLowerCase().trim(), passwordHash, verified: false });
    }

    // Delete any previous OTPs for this email+type
    await OTP.deleteMany({ email: email.toLowerCase().trim(), type: "signup" });

    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase().trim(), otp, type: "signup", expiresAt: otpExpiresAt() });
    await sendOTP(email.toLowerCase().trim(), otp, "signup");

    res.json({ ok: true, message: "Verification code sent to your email" });
  } catch (e) {
    next(e);
  }
});

/* ─── POST /api/auth/verify-signup ────────────────────────── */
// Step 2 of registration: verify OTP and activate account
router.post("/verify-signup", async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ error: "Email and code required" });

    const record = await OTP.findOne({
      email: email.toLowerCase().trim(),
      type: "signup",
    });

    if (!record) return res.status(400).json({ error: "No verification code found. Please request a new one." });
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({ error: "Code expired. Please request a new one." });
    }
    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { verified: true },
      { new: true }
    );

    if (!user) return res.status(400).json({ error: "Account not found. Please sign up again." });

    await record.deleteOne();

    const token = makeToken(user);
    res.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (e) {
    next(e);
  }
});

/* ─── POST /api/auth/login ─────────────────────────────────── */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.verified) {
      return res.status(403).json({ error: "Email not verified. Please complete sign up first.", unverified: true });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = makeToken(user);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (e) {
    next(e);
  }
});

/* ─── POST /api/auth/forgot-password ──────────────────────── */
// Step 1 of reset: send OTP to email
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({ email: email.toLowerCase().trim(), verified: true });
    // Always return the same message to avoid email enumeration
    if (!user) return res.json({ ok: true, message: "If that email exists, a reset code has been sent" });

    await OTP.deleteMany({ email: email.toLowerCase().trim(), type: "reset" });

    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase().trim(), otp, type: "reset", expiresAt: otpExpiresAt() });
    await sendOTP(email.toLowerCase().trim(), otp, "reset");

    res.json({ ok: true, message: "If that email exists, a reset code has been sent" });
  } catch (e) {
    next(e);
  }
});

/* ─── POST /api/auth/reset-password ───────────────────────── */
// Step 2 of reset: verify OTP + set new password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "Email, code, and new password required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const record = await OTP.findOne({ email: email.toLowerCase().trim(), type: "reset" });
    if (!record) return res.status(400).json({ error: "No reset code found. Please request a new one." });
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({ error: "Code expired. Please request a new one." });
    }
    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ error: "Incorrect code. Please try again." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim(), verified: true },
      { passwordHash },
      { new: true }
    );

    if (!user) return res.status(400).json({ error: "Account not found." });

    await record.deleteOne();

    res.json({ ok: true, message: "Password reset successfully. You can now log in." });
  } catch (e) {
    next(e);
  }
});

/* ─── GET /api/auth/me ─────────────────────────────────────── */
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

module.exports = router;
