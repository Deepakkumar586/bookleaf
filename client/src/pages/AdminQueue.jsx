import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { usePolling } from "../usePolling.js";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";
import { EmptyState, SkeletonCards } from "../components/Feedback.jsx";
import Icon from "../components/Icon.jsx";
import { CATEGORIES, PRIORITIES, STATUSES, age } from "../format.js";

const STALE_HOURS = 48;
const BLANK = { status: "", category: "", priority: "", assigned: "", from: "", to: "", q: "", sort: "urgency" };
const PRESETS = [
  ["All", {}],
  ["Open", { status: "Open" }],
  ["In progress", { status: "In Progress" }],
  ["Critical", { priority: "Critical" }],
  ["Assigned to me", { assigned: "me" }],
  ["Unassigned", { assigned: "unassigned" }],
];

const isActive = (t) => t.status === "Open" || t.status === "In Progress";
const isStale = (t) => isActive(t) && Date.now() - new Date(t.createdAt) > STALE_HOURS * 3600000;

export default function AdminQueue() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(BLANK);
  const [showFilters, setShowFilters] = useState(false);
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState("");
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  usePolling(
    () => api.tickets(filters).then((r) => { setTickets(r.tickets); setError(""); }).catch((e) => setError(e.message)),
    8000,
    [JSON.stringify(filters)]
  );

  const activePreset = PRESETS.find(([, p]) => Object.entries({ ...BLANK, ...p }).every(([k, v]) => filters[k] === v))?.[0];
  const stats = tickets && {
    active: tickets.filter(isActive).length,
    critical: tickets.filter((t) => t.priority === "Critical" && isActive(t)).length,
    unassigned: tickets.filter((t) => !t.assignedTo && isActive(t)).length,
    overdue: tickets.filter(isStale).length,
  };

  const select = (key, label, options) => (
    <select value={filters[key]} onChange={set(key)} aria-label={label}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  const open = (t) => navigate(`/admin/tickets/${t.id}`);

  return (
    <>
      <div className="page-head"><h2>Ticket queue</h2><p className="muted">Most urgent and oldest unresolved tickets first. Updates every few seconds.</p></div>

      {stats && (
        <div className="stats">
          <div className="stat"><span>Active</span><strong>{stats.active}</strong></div>
          <div className={`stat ${stats.critical ? "danger" : ""}`}><span>Critical</span><strong>{stats.critical}</strong></div>
          <div className="stat"><span>Unassigned</span><strong>{stats.unassigned}</strong></div>
          <div className={`stat ${stats.overdue ? "highlight" : ""}`}><span>Waiting over {STALE_HOURS}h</span><strong>{stats.overdue}</strong></div>
        </div>
      )}

      <div className="toolbar">
        <div className="chips scroll-x" role="group" aria-label="Quick filters">
          {PRESETS.map(([label, p]) => (
            <button key={label} className={`chip btn-chip ${activePreset === label ? "on" : ""}`} onClick={() => setFilters({ ...BLANK, sort: filters.sort, ...p })}>{label}</button>
          ))}
        </div>
        <button className="button filter-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><Icon name="filter" size={16} /> Filters</button>
      </div>

      <div className={`filters ${showFilters ? "" : "collapsed"}`}>
        <input placeholder="Search subject or BL-number" value={filters.q} onChange={set("q")} aria-label="Search" />
        {select("category", "Any category", CATEGORIES)}
        {select("priority", "Any priority", PRIORITIES)}
        {select("status", "Any status", STATUSES)}
        <label className="inline">From <input type="date" value={filters.from} onChange={set("from")} /></label>
        <label className="inline">To <input type="date" value={filters.to} onChange={set("to")} /></label>
        <select value={filters.sort} onChange={set("sort")} aria-label="Sort">
          <option value="urgency">Most urgent first</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option>
        </select>
        <button className="link" onClick={() => setFilters(BLANK)}>Clear all</button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {!tickets ? <SkeletonCards n={4} /> : tickets.length === 0 ? (
        <EmptyState title="Nothing here">No tickets match these filters. Try clearing them.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="responsive">
            <thead><tr><th>Ticket</th><th>Author / book</th><th>Category</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Age</th></tr></thead>
            <tbody>
              {tickets.map((t) => {
                const stale = isStale(t);
                return (
                  <tr key={t.id} onClick={() => open(t)} onKeyDown={(e) => e.key === "Enter" && open(t)} tabIndex={0}
                      className={t.priority === "Critical" && isActive(t) ? "row-critical" : stale ? "row-stale" : ""}>
                    <td data-label="Ticket" className="cell-main"><strong>{t.subject}</strong><div className="muted small">{t.ticketNumber} · {t.messageCount} repl{t.messageCount === 1 ? "y" : "ies"}</div></td>
                    <td data-label="Author">{t.author?.name}<div className="muted small">{t.book?.title || "General"}</div></td>
                    <td data-label="Category">{t.category}{t.classificationSource === "ai" && <span className="tag">AI</span>}{t.classificationSource === "admin" && <span className="tag">Edited</span>}</td>
                    <td data-label="Priority"><PriorityBadge priority={t.priority} /></td>
                    <td data-label="Status"><StatusBadge status={t.status} /></td>
                    <td data-label="Assignee">{t.assignedTo?.name || <span className="muted">Unassigned</span>}</td>
                    <td data-label="Age" className={stale ? "warn" : ""}>{age(t.createdAt)}{stale && " ⚠"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
