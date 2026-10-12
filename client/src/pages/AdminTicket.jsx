import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { usePolling } from "../usePolling.js";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";
import { useToast } from "../components/Toast.jsx";
import { SkeletonCards } from "../components/Feedback.jsx";
import Icon from "../components/Icon.jsx";
import Thread from "../components/Thread.jsx";
import { CATEGORIES, PRIORITIES, STATUSES, dateTime } from "../format.js";

const SOURCE_LABEL = { ai: "AI", fallback: "keyword rules (AI unavailable)", admin: "set by admin", pending: "pending" };

export default function AdminTicket() {
  const { id } = useParams();
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [fromDraft, setFromDraft] = useState(false);
  const [draftState, setDraftState] = useState({ status: "idle", message: "" }); // idle | loading | ready | failed
  const [sendStatus, setSendStatus] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const draftRequested = useRef(false);

  const refresh = useCallback(() => {
    api.ticket(id, ticket?.updatedAt)
      .then((r) => r.changed && setTicket(r.ticket))
      .catch((e) => setError(e.message));
  }, [id, ticket?.updatedAt]);
  usePolling(refresh, 6000, [id, ticket?.updatedAt]);

  const loadDraft = useCallback(async (refreshDraft = false) => {
    setDraftState({ status: "loading", message: "" });
    try {
      const { draft } = await api.draft(id, refreshDraft);
      setReply(draft.text); setFromDraft(true);
      setDraftState({ status: "ready", message: `Generated ${dateTime(draft.generatedAt)}` });
    } catch (err) {
      // Graceful degradation: admin simply writes the reply manually.
      setDraftState({ status: "failed", message: err.code === "AI_UNAVAILABLE" ? err.message : "Could not generate a draft." });
    }
  }, [id]);

  // Present an AI draft automatically the first time the admin opens the ticket.
  useEffect(() => {
    if (ticket && !draftRequested.current) {
      draftRequested.current = true;
      if (ticket.status !== "Closed") loadDraft(false);
    }
  }, [ticket, loadDraft]);

  const update = async (patch, message = "Ticket updated") => {
    setBusy(true); setError("");
    try { setTicket((await api.updateTicket(id, patch)).ticket); toast(message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const body = { body: reply, fromDraft, ...(sendStatus && { status: sendStatus }) };
      setTicket((await api.sendMessage(id, body)).ticket);
      setReply(""); setFromDraft(false); setSendStatus("");
      setDraftState({ status: "idle", message: "" });
      toast("Reply sent to author");
    } catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    try { setTicket((await api.addNote(id, note)).ticket); setNote(""); toast("Note added"); }
    catch (err) { setError(err.message); }
  };

  if (!ticket) return error ? <div className="alert error">{error}</div> : <SkeletonCards n={2} />;

  return (
    <>
      <p><Link to="/admin" className="link">← Back to queue</Link></p>
      <div className="ticket-title">
        <div className="grow">
          <h2>{ticket.subject}</h2>
          <div className="chips">
            <span className="chip">{ticket.ticketNumber}</span>
            <span className="chip">👤 {ticket.author?.name}</span>
            <span className="chip">📖 {ticket.book?.title || "General / Account Level"}</span>
            <span className="chip">{dateTime(ticket.createdAt)}</span>
          </div>
        </div>
        <div className="row"><PriorityBadge priority={ticket.priority} /><StatusBadge status={ticket.status} /></div>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}

      <div className="split">
        <section className="stack">
          <Thread ticket={ticket} viewerRole="admin" />

          {ticket.status !== "Closed" && (
            <form onSubmit={send} className="card stack composer">
              <div className="row between">
                <strong>Reply to {ticket.author?.name?.split(" ")[0] || "author"}</strong>
                <button type="button" className="button sm" onClick={() => loadDraft(true)} disabled={draftState.status === "loading"}>
                  <Icon name="sparkle" size={14} /> {draftState.status === "loading" ? "Drafting…" : "Regenerate AI draft"}
                </button>
              </div>
              {draftState.status === "loading" && <div className="alert info">Drafting from the knowledge base and this author's data…</div>}
              {draftState.status === "failed" && <div className="alert warn">{draftState.message}</div>}
              {draftState.status === "ready" && <div className="muted small">✨ AI draft · {draftState.message} · review and edit before sending</div>}
              <textarea rows={10} value={reply} onChange={(e) => { setReply(e.target.value); }} placeholder="Write your reply…" required
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") e.currentTarget.form.requestSubmit(); }} />
              <div className="row between wrap">
                <label className="inline">After sending, set status
                  <select value={sendStatus} onChange={(e) => setSendStatus(e.target.value)}>
                    <option value="">Auto (In Progress)</option>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <button className="primary" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send to author"}</button>
              </div>
              <span className="muted small">Tip: Ctrl/⌘ + Enter to send</span>
            </form>
          )}
        </section>

        <aside className="stack">
          <div className="card stack">
            <strong>Manage ticket</strong>
            <label>Status
              <select value={ticket.status} onChange={(e) => update({ status: e.target.value }, "Status updated")} disabled={busy}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Category
              <select value={ticket.category} onChange={(e) => update({ category: e.target.value }, "Category updated")} disabled={busy}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={ticket.priority} onChange={(e) => update({ priority: e.target.value }, "Priority updated")} disabled={busy}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <div className="muted small hint">
              Classified by <strong>{SOURCE_LABEL[ticket.classification?.source]}</strong>
              {ticket.classification?.reasoning && ` — ${ticket.classification.reasoning}`}
            </div>
            <div className="row between">
              <span className="small">Assigned to <strong>{ticket.assignedTo?.name || "nobody"}</strong></span>
              <button className="button sm" onClick={() => update({ assignedTo: ticket.assignedTo ? null : "me" }, ticket.assignedTo ? "Unassigned" : "Assigned to you")} disabled={busy}>
                {ticket.assignedTo ? "Unassign" : "Assign to me"}
              </button>
            </div>
          </div>

          <div className="card stack">
            <strong>Internal notes <span className="muted small">· hidden from author</span></strong>
            {ticket.internalNotes.length === 0 && <span className="muted small">No notes yet.</span>}
            {ticket.internalNotes.map((n) => (
              <div key={n._id} className="note"><div className="meta">{n.authorName} · {dateTime(n.createdAt)}</div><p>{n.body}</p></div>
            ))}
            <form onSubmit={addNote} className="stack">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team…" required />
              <button disabled={!note.trim()}>Add note</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
