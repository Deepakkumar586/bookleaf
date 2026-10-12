import { dateTime } from "../format.js";

const initials = (name = "?") => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Bubble({ side, name, time, children, tag }) {
  return (
    <div className={`msg-row ${side}`}>
      <span className={`avatar sm ${side}`} aria-hidden="true">{side === "admin" ? "BL" : initials(name)}</span>
      <div className={`msg ${side}`}>
        <div className="meta">{name} · {dateTime(time)}{tag}</div>
        {children}
      </div>
    </div>
  );
}

/** Conversation view shared by author and admin screens. */
export default function Thread({ ticket, viewerRole }) {
  const authorName = viewerRole === "author" ? "You" : ticket.author?.name || "Author";
  return (
    <div className="thread">
      <Bubble side="author" name={authorName} time={ticket.createdAt}>
        <p>{ticket.description}</p>
        {ticket.attachments?.length > 0 && (
          <div className="chips">{ticket.attachments.map((a) => <span key={a.name} className="chip">📎 {a.name}</span>)}</div>
        )}
      </Bubble>
      {ticket.messages.map((m) => (
        <Bubble
          key={m.id}
          side={m.sender}
          name={m.sender === "admin" ? "BookLeaf Support" : viewerRole === "author" ? "You" : m.senderName}
          time={m.createdAt}
          tag={viewerRole === "admin" && m.aiAssisted ? <span className="tag">AI-assisted</span> : null}
        >
          <p>{m.body}</p>
        </Bubble>
      ))}
    </div>
  );
}
