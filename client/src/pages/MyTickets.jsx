import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { usePolling } from "../usePolling.js";
import { slug, StatusBadge } from "../components/Badges.jsx";
import Thread from "../components/Thread.jsx";
import { EmptyState, SkeletonCards } from "../components/Feedback.jsx";
import { dateTime } from "../format.js";

const TABS = ["All", "Open", "In Progress", "Resolved", "Closed"];

function TicketCard({ ticket, onChange }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const last = ticket.messages[ticket.messages.length - 1];
  const awaitingYou = last?.sender === "admin" && ticket.status !== "Closed";

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api.sendMessage(ticket.id, { body: reply }); setReply(""); onChange(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <article className={`card ticket s-${slug(ticket.status)}`}>
      <button className="ticket-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="grow">
          <strong>{ticket.subject}</strong>
          <div className="muted small">{ticket.ticketNumber} · {ticket.book?.title || "General / Account Level"} · {dateTime(ticket.createdAt)}</div>
        </div>
        <div className="right">
          {awaitingYou && <span className="tag solid">New reply</span>}
          <StatusBadge status={ticket.status} />
          <span className={`chevron ${open ? "open" : ""}`} aria-hidden="true">›</span>
        </div>
      </button>
      {open && (
        <div className="stack ticket-body">
          <Thread ticket={ticket} viewerRole="author" />
          {ticket.status === "Closed" ? (
            <p className="muted small">This ticket is closed. <Link to="/tickets/new" className="link">Raise a new query</Link> if you need more help.</p>
          ) : (
            <form onSubmit={send} className="stack">
              <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" required />
              {error && <div className="alert error">{error}</div>}
              <button className="primary" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export default function MyTickets() {
  const [tickets, setTickets] = useState(null);
  const [tab, setTab] = useState("All");
  const [error, setError] = useState("");

  // Near-real-time: poll every 5s so admin replies show up without a refresh.
  const load = () => api.tickets().then((r) => setTickets(r.tickets)).catch((e) => setError(e.message));
  usePolling(load, 5000);

  const count = (t) => (t === "All" ? tickets?.length : tickets?.filter((x) => x.status === t).length) ?? 0;
  const shown = tickets?.filter((t) => tab === "All" || t.status === tab);

  return (
    <>
      <div className="page-head row between wrap">
        <div><h2>My tickets</h2><p className="muted">Replies appear here automatically.</p></div>
        <Link to="/tickets/new" className="button primary">+ New query</Link>
      </div>
      {error && <div className="alert error">{error}</div>}
      {!tickets ? <SkeletonCards n={3} /> : tickets.length === 0 ? (
        <EmptyState title="No queries yet">Questions about royalties, ISBNs, printing or availability? <Link to="/tickets/new" className="link">Start your first one</Link>.</EmptyState>
      ) : (
        <>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t} <span className="count">{count(t)}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? <p className="muted">No {tab.toLowerCase()} tickets.</p> : (
            <div className="stack">{shown.map((t) => <TicketCard key={t.id} ticket={t} onChange={load} />)}</div>
          )}
        </>
      )}
    </>
  );
}
