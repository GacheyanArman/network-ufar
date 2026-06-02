export default function FeedLoading() {
  return (
    <div className="loading-skeleton-page">
      {/* Post composer skeleton */}
      <div className="skeleton-card" style={{ height: 100 }}>
        <div className="skeleton-line skeleton-line-body" />
        <div className="skeleton-line skeleton-line-body short" />
      </div>
      {/* Post skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: 200, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div className="skeleton-avatar" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-line skeleton-line-title" style={{ width: "40%" }} />
              <div className="skeleton-line skeleton-line-subtitle" style={{ width: "25%" }} />
            </div>
          </div>
          <div className="skeleton-line skeleton-line-body" />
          <div className="skeleton-line skeleton-line-body" />
          <div className="skeleton-line skeleton-line-body short" />
        </div>
      ))}
    </div>
  );
}
