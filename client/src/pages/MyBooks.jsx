import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { date, inr } from "../format.js";
import { EmptyState, SkeletonCards } from "../components/Feedback.jsx";

const STAGES = ["Manuscript Received", "Editing", "Cover Design", "Typesetting", "Proofreading", "ISBN Assignment", "Printing", "Distribution Setup", "Published & Live"];

function StageTracker({ status }) {
  const stage = status.split("-").slice(1).join("-").trim();
  const idx = Math.max(STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase()), 0);
  return (
    <div className="stages">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={idx + 1} aria-label="Production progress">
        <span style={{ width: `${((idx + 1) / STAGES.length) * 100}%` }} />
      </div>
      <div className="stage-labels"><strong>{STAGES[idx]}</strong><span className="muted small">Step {idx + 1} of {STAGES.length}</span></div>
      <p className="muted small">We email you at every stage. The usual hold-ups are cover approval and proofreading rounds, so watch your inbox.</p>
    </div>
  );
}

function BookCard({ b }) {
  const live = b.status === "Published & Live";
  const paidPct = b.totalRoyaltyEarned ? Math.round((b.royaltyPaid / b.totalRoyaltyEarned) * 100) : 0;
  return (
    <article className="card book">
      <header>
        <div>
          <h3>{b.title}</h3>
          <div className="muted small">{b.genre} · ISBN {b.isbn}</div>
        </div>
        <span className={`badge ${live ? "status-resolved" : "status-in-progress"}`}>{live ? "Published & Live" : "In production"}</span>
      </header>

      {live ? (
        <>
          <dl className="facts">
            <div><dt>Published</dt><dd>{date(b.publicationDate)}</dd></div>
            <div><dt>MRP</dt><dd>{inr(b.mrp)}</dd></div>
            <div><dt>Copies sold</dt><dd>{b.totalCopiesSold.toLocaleString("en-IN")}</dd></div>
            <div><dt>Earned</dt><dd>{inr(b.totalRoyaltyEarned)}</dd></div>
            <div><dt>Paid</dt><dd>{inr(b.royaltyPaid)}</dd></div>
            <div><dt>Pending</dt><dd className={b.royaltyPending > 0 ? "warn" : ""}>{inr(b.royaltyPending)}</dd></div>
          </dl>

          <div className="payout">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={paidPct} aria-label="Royalty paid">
              <span style={{ width: `${paidPct}%` }} />
            </div>
            <div className="muted small">
              {paidPct}% of earned royalty paid ·{" "}
              {b.lastRoyaltyPayoutDate ? `last payout ${date(b.lastRoyaltyPayoutDate)}` : "no payout made yet — royalties are paid quarterly, within 45 days of quarter end"}
            </div>
          </div>
          <div className="chips">{b.availableOn.map((p) => <span key={p} className="chip">{p}</span>)}</div>
        </>
      ) : (
        <StageTracker status={b.status} />
      )}
      <Link to="/tickets/new" state={{ bookId: b._id }} className="link small">Ask about this book →</Link>
    </article>
  );
}

export default function MyBooks() {
  const [books, setBooks] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.books().then((r) => setBooks(r.books)).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!books) return <><h2>My books</h2><SkeletonCards n={2} /></>;
  if (books.length === 0) return <EmptyState title="No books yet">Once your first book is submitted, it will appear here.</EmptyState>;

  const live = books.filter((b) => b.status === "Published & Live");
  const sum = (k) => live.reduce((s, b) => s + b[k], 0);
  const pending = sum("royaltyPending");

  return (
    <>
      <div className="page-head"><h2>My books</h2><p className="muted">{books.length} title{books.length > 1 ? "s" : ""} · {live.length} live</p></div>
      <div className="stats">
        <div className="stat"><span>Copies sold</span><strong>{sum("totalCopiesSold").toLocaleString("en-IN")}</strong></div>
        <div className="stat"><span>Royalty earned</span><strong>{inr(sum("totalRoyaltyEarned"))}</strong></div>
        <div className="stat"><span>Royalty paid</span><strong>{inr(sum("royaltyPaid"))}</strong></div>
        <div className={`stat ${pending > 0 ? "highlight" : ""}`}><span>Pending</span><strong>{inr(pending)}</strong>
          {pending > 0 && pending < 1000 && <small>Below ₹1,000 — rolls over to next quarter</small>}
        </div>
      </div>
      <div className="stack">{books.map((b) => <BookCard key={b._id} b={b} />)}</div>
    </>
  );
}
