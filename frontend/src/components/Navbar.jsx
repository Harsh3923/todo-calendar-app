import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="navLeft">
        <Link className="brand" to="/">Calendar To-Do</Link>
      </div>

      <div className="navRight">
        {user ? (
          <>
            <button className="btn" onClick={() => navigate("/", { state: { openCreate: true } })}>
              + Create Task
            </button>
            <button className="btn secondary" onClick={onLogout}>Logout</button>
            <span className="pill">{user.email}</span>
          </>
        ) : (
          <button className="btn" onClick={() => navigate("/auth")}>Login / Sign up</button>
        )}
      </div>
    </nav>
  );
}