export const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");
export const StatusBadge = ({ status }) => <span className={`badge status-${slug(status)}`}>{status}</span>;
export const PriorityBadge = ({ priority }) => <span className={`badge prio-${slug(priority)}`}>{priority}</span>;
