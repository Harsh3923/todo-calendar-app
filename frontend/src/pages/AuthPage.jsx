import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/* ── H9: Friendly error messages ─────────────────────────── */
function friendlyError(raw) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("user not found") || msg.includes("no account"))
    return "No account with that email exists. Please sign up first.";
  if (msg.includes("invalid password") || msg.includes("wrong password"))
    return "Incorrect password. Please try again, or use Forgot password.";
  if (msg.includes("already exists") || msg.includes("duplicate"))
    return "An account with this email already exists. Try logging in instead.";
  if (msg.includes("not verified"))
    return "Your email isn't verified yet. Check your inbox for the verification code.";
  if (msg.includes("expired") || msg.includes("invalid otp") || msg.includes("invalid code"))
    return "The code is incorrect or has expired. Request a new one.";
  if (msg.includes("network") || msg.includes("failed to fetch"))
    return "Cannot reach the server. Check your connection and try again.";
  if (msg.includes("unauthorized") || msg.includes("401"))
    return "Your session has expired. Please log in again.";
  return raw || "Something went wrong. Please try again.";
}

/* ── H5: Password strength meter ─────────────────────────── */
function getPasswordStrength(pw) {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { level: score, label: labels[score] };
}

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

  // H5: show/hide password toggles
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [msg, setMsg] = useState({ text: "", type: "error" });
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
    setShowPw(false);
    setShowConfirmPw(false);
    setShowNewPw(false);
  }, [mode]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function err(text) { setMsg({ text, type: "error" }); }
  function ok(text)  { setMsg({ text, type: "success" }); }

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
        err("Your email isn't verified yet. Check your inbox for the verification code.");
      } else {
        err(friendlyError(e2.message));
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Register: send OTP ── */
  async function submitRegister(e) {
    e.preventDefault();
    if (password !== confirmPassword) return err("Passwords do not match.");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.sendSignupOtp(email, password);
      ok("Verification code sent! Check your email (or server console in dev mode).");
      setCountdown(60);
      setMode("verify-signup");
    } catch (e2) {
      err(friendlyError(e2.message));
    } finally {
      setLoading(false);
    }
  }

  /* ── Verify signup OTP ── */
  async function submitVerifySignup(e) {
    e.preventDefault();
    if (otp.length < 6) return err("Enter the full 6-digit code.");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      const res = await api.verifySignup(email, otp);
      onSuccess(res.token, res.user);
    } catch (e2) {
      err(friendlyError(e2.message));
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
      err(friendlyError(e2.message));
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
      err(friendlyError(e2.message));
    } finally {
      setLoading(false);
    }
  }

  /* ── Reset password ── */
  async function submitReset(e) {
    e.preventDefault();
    if (otp.length < 6) return err("Enter the full 6-digit code.");
    if (newPassword !== confirmNew) return err("Passwords do not match.");
    if (newPassword.length < 6) return err("Password must be at least 6 characters.");
    setLoading(true);
    setMsg({ text: "", type: "error" });
    try {
      await api.resetPassword(email, otp, newPassword);
      ok("Password reset! You can now log in.");
      setTimeout(() => setMode("login"), 1800);
    } catch (e2) {
      err(friendlyError(e2.message));
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
      err(friendlyError(e2.message));
    } finally {
      setLoading(false);
    }
  }

  /* ── H5: Password strength bar (register mode) ── */
  function StrengthBar({ pw }) {
    const { level, label } = getPasswordStrength(pw);
    if (!pw) return null;
    const segs = ["weak", "fair", "good", "strong"];
    return (
      <>
        <div className="pwStrengthBar">
          {segs.map((cls, i) => (
            <div key={cls} className={`pwStrengthSeg ${i < level ? cls : ""}`} />
          ))}
        </div>
        <div className="pwStrengthLabel">{label}</div>
      </>
    );
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
                {/* H5: show/hide toggle */}
                <div className="pwFieldWrap">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="••••••••"
                  />
                  <button type="button" className="pwToggleBtn" onClick={() => setShowPw((p) => !p)}
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
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
            {/* H3: Back arrow */}
            <button className="linkBtn" style={{ alignSelf: "flex-start", fontSize: 15 }}
              onClick={() => setMode("login")} aria-label="Back to login">
              ← Back
            </button>

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
                <div className="pwFieldWrap">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" className="pwToggleBtn" onClick={() => setShowPw((p) => !p)}
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {/* H5: Strength meter */}
                <StrengthBar pw={password} />
              </label>
              <label>
                Confirm password
                <div className="pwFieldWrap">
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPw ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                  />
                  <button type="button" className="pwToggleBtn" onClick={() => setShowConfirmPw((p) => !p)}
                    aria-label={showConfirmPw ? "Hide password" : "Show password"}>
                    {showConfirmPw ? "🙈" : "👁"}
                  </button>
                </div>
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
            {/* H3: Back arrow */}
            <button className="linkBtn" style={{ alignSelf: "flex-start", fontSize: 15 }}
              onClick={() => setMode("register")} aria-label="Back to registration">
              ← Back
            </button>

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
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <>
            {/* H3: Back arrow */}
            <button className="linkBtn" style={{ alignSelf: "flex-start", fontSize: 15 }}
              onClick={() => setMode("login")} aria-label="Back to login">
              ← Back
            </button>

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
          </>
        )}

        {/* ── RESET PASSWORD ── */}
        {mode === "reset" && (
          <>
            {/* H3: Back arrow */}
            <button className="linkBtn" style={{ alignSelf: "flex-start", fontSize: 15 }}
              onClick={() => setMode("forgot")} aria-label="Back">
              ← Back
            </button>

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
                <div className="pwFieldWrap">
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNewPw ? "text" : "password"}
                    required
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" className="pwToggleBtn" onClick={() => setShowNewPw((p) => !p)}
                    aria-label={showNewPw ? "Hide password" : "Show password"}>
                    {showNewPw ? "🙈" : "👁"}
                  </button>
                </div>
                <StrengthBar pw={newPassword} />
              </label>
              <label>
                Confirm new password
                <div className="pwFieldWrap">
                  <input
                    value={confirmNew}
                    onChange={(e) => setConfirmNew(e.target.value)}
                    type={showConfirmPw ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                  />
                  <button type="button" className="pwToggleBtn" onClick={() => setShowConfirmPw((p) => !p)}
                    aria-label={showConfirmPw ? "Hide password" : "Show password"}>
                    {showConfirmPw ? "🙈" : "👁"}
                  </button>
                </div>
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
            </div>
          </>
        )}

      </div>
    </div>
  );
}
