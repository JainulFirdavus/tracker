export function PageLoading({ label }) {
  return (
    <div className="page-loading" role="status" aria-label={label}>
      <span className="loading-wave" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((bar) => (
          <i key={bar} style={{ "--bar-index": bar }} />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
