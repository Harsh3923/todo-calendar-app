import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/* ── 6-box OTP input ─────────────────────────────────────── */
function OTPInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  function handleKey(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.map((d, idx) => (idx === i ? "" : d));
      onChange(next.join(""));
      if (i > 0) inputs.current[i - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) { inputs.current[i - 1]?.focus(); return; }
    if (e.key === "ArrowRight" && i < 5) { inputs.current[i + 1]?.focus(); return; }
  }

  function handleChange(i, e) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const char = raw[raw.length - 1];
    const next = digits.map((d, idx) => (idx === i ? char : d));
    onChange(next.join(""));
    if (i < 5) inputs.current[i + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  }

  return (
    <div className="otpRow">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className="otpBox"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

/* ── AuthPage ─────────────────────────────────────────────── */
// modes: login | register | verify-signup | forgot | reset
export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState("login");

  // shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");

  const [msg, setMsg] = useState({ text: "", type: "error" }); // type: error | success
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Reset form fields on mode change
  useEffect(() => {
    setMsg({ text: "", type: "error" });
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setConfirmNew("");
  }, [mode]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function err(text) { setMsg({ text, type: "error" }); }
  function ok(text) { setMsg({ text, type: "success" }); }

  /* ── Login ── */
  async function submitLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      const res = await api.login(email, password);
      onSuccess(res.token, res.user);
    } catch (e2) {
      if (e2.message?.includes("not verified")) {
        err("Email not verified. ");
      } else {
        err(e2.message);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Register: send OTP ── */
  async function submitRegister(e) {
    e.preventDefault();
    if (password !== confirmPassword) return err("Passwords do not match");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.sendSignupOtp(email, password);
      ok("Verification code sent! Check your email (or server console in dev mode).");
      setCountdown(60);
      setMode("verify-signup");
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Verify signup OTP ── */
  async function submitVerifySignup(e) {
    e.preventDefault();
    if (otp.length < 6) return err("Enter the full 6-digit code");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      const res = await api.verifySignup(email, otp);
      onSuccess(res.token, res.user);
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Resend OTP (signup) ── */
  async function resendSignupOtp() {
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.sendSignupOtp(email, password);
      ok("New code sent!");
      setOtp("");
      setCountdown(60);
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Forgot password: send OTP ── */
  async function submitForgot(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.forgotPassword(email);
      ok("If that email exists, a reset code has been sent.");
      setCountdown(60);
      setMode("reset");
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Reset password ── */
  async function submitReset(e) {
    e.preventDefault();
    if (otp.length < 6) return err("Enter the full 6-digit code");
    if (newPassword !== confirmNew) return err("Passwords do not match");
    if (newPassword.length < 6) return err("Password must be at least 6 characters");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.resetPassword(email, otp, newPassword);
      ok("Password reset! You can now log in.");
      setTimeout(() => setMode("login"), 1800);
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Resend reset OTP ── */
  async function resendResetOtp() {
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.forgotPassword(email);
      ok("New code sent!");
      setOtp("");
      setCountdown(60);
    } catch (e2) {
      err(e2.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Render ── */
  return (
    <div className="page narrow">
      <div className="authCard">

        {/* ── LOGIN ── */}
        {mode === "login" && (
          <>
            <div className="authHeader">
              <h1>Welcome back</h1>
              <p className="subtle">Log in to your TaskFlow account</p>
            </div>

            <p className="demoHint">
              Demo account: <b>demo@todo.com</b> / <b>demo123</b>
            </p>

            {msg.text && <div className={msg.type === "success" ? "successMsg" : "error"}>{msg.text}</div>}

            <form className="form" onSubmit={submitLogin}>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoFocus placeholder="you@email.com" />
              </label>
              <label>
                Password
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="••••••••" />
              </label>

              <button className="btn authBtn" type="submit" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>

            <div className="authLinks">
              <button className="linkBtn" onClick={() => { setMode("forgot"); setMsg({ text: "", type: "error" }); }}>
                Forgot password?
              </button>
              <span className="authDivider">·</span>
              <button className="linkBtn" onClick={() => setMode("register")}>
                Create account
              </button>
            </div>
          </>
        )}

        {/* ── REGISTER ── */}
        {mode === "register" && (
          <>
            <div className="authHeader">
              <h1>Create account</h1>
              <p className="subtle">We'll send a code to verify your email</p>
            </div>

            {msg.text && <div className={msg.type === "success" ? "successMsg" : "error"}>{msg.text}</div>}

            <form className="form" onSubmit={submitRegister}>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoFocus placeholder="you@email.com" />
              </label>
              <label>
                Password
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Min. 6 characters" />
              </label>
              <label>
                Confirm password
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required placeholder="Re-enter password" />
              </label>

              <button className="btn authBtn" type="submit" disabled={loading}>
                {loading ? "Sending code…" : "Continue"}
              </button>
            </form>

            <div className="authLinks">
              <span className="subtle">Already have an account?</span>
              <button className="linkBtn" onClick={() => setMode("login")}>Log in</button>
            </div>
          </>
        )}

        {/* ── VERIFY SIGNUP OTP ── */}
        {mode === "verify-signup" && (
          <>
            <div className="authHeader">
              <h1>Verify your email</h1>
              <p className="subtle">
                We sent a 6-digit code to <b>{email}</b>
              </p>
              <p className="subtle" style={{ fontSize: 12 }}>
                (In dev mode, check your server console if email isn't configured)
              </p>
            </div>

            {msg.text && <div className={msg.type === "success" ? "successMsg" : "error"}>{msg.text}</div>}

            <form className="form" onSubmit={submitVerifySignup}>
              <label style={{ alignItems: "center" }}>
                Verification code
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />
              </label>

              <button className="btn authBtn" type="submit" disabled={loading || otp.length < 6}>
                {loading ? "Verifying…" : "Verify & create account"}
              </button>
            </form>

            <div className="authLinks">
              {countdown > 0 ? (
                <span className="subtle">Resend in {countdown}s</span>
              ) : (
                <button className="linkBtn" onClick={resendSignupOtp} disabled={loading}>
                  Resend code
                </button>
              )}
              <span className="authDivider">·</span>
              <button className="linkBtn" onClick={() => setMode("register")}>Go back</button>
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <>
            <div className="authHeader">
              <h1>Forgot password?</h1>
              <p className="subtle">Enter your email and we'll send a reset code</p>
            </div>

            {msg.text && <div className={msg.type === "success" ? "successMsg" : "error"}>{msg.text}</div>}

            <form className="form" onSubmit={submitForgot}>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoFocus placeholder="you@email.com" />
              </label>

              <button className="btn authBtn" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </button>
            </form>

            <div className="authLinks">
              <button className="linkBtn" onClick={() => setMode("login")}>Back to login</button>
            </div>
          </>
        )}

        {/* ── RESET PASSWORD ── */}
        {mode === "reset" && (
          <>
            <div className="authHeader">
              <h1>Reset password</h1>
              <p className="subtle">
                Enter the code sent to <b>{email}</b> and your new password
              </p>
              <p className="subtle" style={{ fontSize: 12 }}>
                (In dev mode, check your server console if email isn't configured)
              </p>
            </div>

            {msg.text && <div className={msg.type === "success" ? "successMsg" : "error"}>{msg.text}</div>}

            <form className="form" onSubmit={submitReset}>
              <label style={{ alignItems: "center" }}>
                Reset code
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />
              </label>

              <label>
                New password
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required placeholder="Min. 6 characters" />
              </label>
              <label>
                Confirm new password
                <input value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} type="password" required placeholder="Re-enter new password" />
              </label>

              <button className="btn authBtn" type="submit" disabled={loading || otp.length < 6}>
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>

            <div className="authLinks">
              {countdown > 0 ? (
                <span className="subtle">Resend in {countdown}s</span>
              ) : (
                <button className="linkBtn" onClick={resendResetOtp} disabled={loading}>
                  Resend code
                </button>
              )}
              <span className="authDivider">·</span>
              <button className="linkBtn" onClick={() => setMode("forgot")}>Go back</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
