export default function MainLoading() {
  return (
    <div className="loading-skeleton-page">
      {/* Dashboard skeleton */}
      <div className="skeleton-card" style={{ height: 200 }}>
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-subtitle" />
        <div className="skeleton-line skeleton-line-body" />
        <div className="skeleton-line skeleton-line-body short" />
      </div>
      <div className="skeleton-card" style={{ height: 160 }}>
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-body" />
        <div className="skeleton-line skeleton-line-body" />
      </div>
      <div className="skeleton-card" style={{ height: 120 }}>
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-body short" />
      </div>
    </div>
  );
}
