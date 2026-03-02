import React from "react";
import { useState } from "react";
import { api } from "../api/client.js";

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password);
      onSuccess(res.token, res.user);
    } catch (e2) {
      setMsg(e2.message);
    }
  }

  return (
    <div className="page narrow">
      <h1>{mode === "login" ? "Login" : "Create account"}</h1>
      <p className="subtle">
        Demo account (seeded): <b>demo@todo.com</b> / <b>demo123</b>
      </p>

      {msg && <div className="error">{msg}</div>}

      <form className="form card" onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>

        <button className="btn" type="submit">
          {mode === "login" ? "Login" : "Sign up"}
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
        >
          Switch to {mode === "login" ? "Sign up" : "Login"}
        </button>
      </form>
    </div>
  );
}