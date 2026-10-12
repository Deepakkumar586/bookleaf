import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

const MAX = 5000;

export default function NewTicket() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ bookId: location.state?.bookId || "", subject: "", description: "" });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.books().then((r) => setBooks(r.books)).catch(() => {}); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    try {
      await api.createTicket({
        bookId: form.bookId || null,
        subject: form.subject,
        description: form.description,
        attachments: files.map((f) => ({ name: f.name, size: f.size })), // metadata only; upload is out of scope
      });
      toast("Query sent. We'll reply here.");
      navigate("/tickets");
    } catch (err) {
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><h2>Raise a support query</h2><p className="muted">Tell us what's happening and we'll get back to you here.</p></div>
      <div className="two-col">
        <form onSubmit={submit} className="card stack">
          <label>Which book is this about?
            <select value={form.bookId} onChange={set("bookId")}>
              <option value="">General / Account Level</option>
              {books.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
            </select>
          </label>
          <label>Subject
            <input value={form.subject} onChange={set("subject")} maxLength={150} required placeholder="e.g. Royalty not received for last quarter" />
            {errors.subject && <span className="field-error">{errors.subject}</span>}
          </label>
          <label>Describe the issue
            <textarea rows={8} value={form.description} onChange={set("description")} maxLength={MAX} required
              placeholder="What did you expect, what happened, and any dates or amounts?" />
            <span className="muted small counter">{form.description.length}/{MAX}</span>
            {errors.description && <span className="field-error">{errors.description}</span>}
          </label>
          <div>
            <label>Attachments (optional)
              <input type="file" multiple onChange={(e) => setFiles([...e.target.files].slice(0, 5))} />
            </label>
            {files.length > 0 && <div className="chips">{files.map((f) => <span key={f.name} className="chip">📎 {f.name}</span>)}</div>}
            <span className="muted small">Upload isn't enabled in this demo; file names are recorded.</span>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? "Sending…" : "Send query"}</button>
        </form>

        <aside className="card tips">
          <h3>Get a faster answer</h3>
          <ul>
            <li><strong>Royalty:</strong> mention the book and the period you're asking about.</li>
            <li><strong>Printing issue:</strong> add photos of the defective copy so we can arrange a free reprint.</li>
            <li><strong>ISBN or listing:</strong> include the platform and a link if you have one.</li>
          </ul>
          <p className="muted small">We aim to reply within 48 hours, and high-priority issues are escalated straight away.</p>
        </aside>
      </div>
    </>
  );
}
