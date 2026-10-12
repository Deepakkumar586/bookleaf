export const Skeleton = ({ h = 16, w = "100%" }) => <div className="skeleton" style={{ height: h, width: w }} />;

export const SkeletonCards = ({ n = 3 }) => (
  <div className="stack" aria-busy="true" aria-label="Loading">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="card stack"><Skeleton h={20} w="45%" /><Skeleton h={14} w="70%" /><Skeleton h={14} w="30%" /></div>
    ))}
  </div>
);

export const EmptyState = ({ title, children }) => (
  <div className="empty">
    <div className="empty-art" aria-hidden="true">📚</div>
    <h3>{title}</h3>
    <p className="muted">{children}</p>
  </div>
);
