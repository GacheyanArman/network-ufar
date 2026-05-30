"use client";

import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MainLayout error:", error);
  }, [error]);

  return (
    <div className="error-page">
      <div className="error-page-inner">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-desc">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="error-digest">Error ID: {error.digest}</p>
        )}
        <button className="btn-primary" onClick={reset}>
          Try Again
        </button>
      </div>
    </div>
  );
}
