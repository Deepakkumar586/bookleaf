import Icon from "./Icon.jsx";

export const Skeleton = ({ h = 16, w = "100%", style }) => <div className="skeleton" style={{ height: h, width: w, ...style }} />;

export const SkeletonCards = ({ n = 3 }) => (
  <div className="stack" aria-busy="true" aria-label="Loading">
    {Array.from({ length: n }).map((_, i) => (
      <div className="card stack" key={i}><Skeleton h={20} w="45%" /><Skeleton h={12} w="70%" /><Skeleton h={12} w="30%" /></div>
    ))}
  </div>
);

export const EmptyState = ({ icon = "inbox", title, children }) => (
  <div className="empty">
    <div className="empty-icon"><Icon name={icon} size={28} /></div>
    <h3>{title}</h3>
    <p className="muted">{children}</p>
  </div>
);

export const PageHeader = ({ title, sub, children }) => (
  <div className="page-head">
    <div><h2>{title}</h2>{sub && <p className="muted">{sub}</p>}</div>
    {children && <div className="row wrap">{children}</div>}
  </div>
);

export const Avatar = ({ name, tone = "author" }) => (
  <span className={`avatar ${tone}`} aria-hidden="true">{(name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
);
