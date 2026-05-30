import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-page-inner">
        <div className="error-icon">🔍</div>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-desc">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
