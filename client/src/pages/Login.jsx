import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const DEMO = [
  { label: "Author demo", email: "priya.sharma@email.com", password: "Author@123" },
  { label: "Admin demo", email: "admin@bookleaf.com", password: "Admin@123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/books"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const u = await login(form.email.trim(), form.password);
      navigate(u.role === "admin" ? "/admin" : "/books");
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-hero">
        <span className="brand-mark lg">B</span>
        <h1>Your books. Your royalties. One place.</h1>
        <ul>
          <li>Track sales, royalties and payouts for every title</li>
          <li>See exactly where your book is in production</li>
          <li>Reach the BookLeaf team and get replies in real time</li>
        </ul>
      </section>

      <section className="auth-panel">
        <form onSubmit={submit} className="stack auth-form">
          <div>
            <h2>Welcome back</h2>
            <p className="muted">Sign in to your BookLeaf account.</p>
          </div>
          <label>Email
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </label>
          <label>Password
            <div className="input-wrap">
              <input type={show ? "text" : "password"} required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="link" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
            </div>
          </label>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

          <div className="demo">
            <span className="muted small">Try a demo account</span>
            <div className="chips">
              {DEMO.map((d) => (
                <button key={d.label} type="button" className="chip btn-chip" onClick={() => setForm({ email: d.email, password: d.password })}>{d.label}</button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
