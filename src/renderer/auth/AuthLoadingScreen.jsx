export function AuthLoadingScreen({ error, onRetry }) {
  return (
    <main className="login-page">
      <section className="login-content">
        <h1>MJ Pluse</h1>
        <p role={error ? "alert" : "status"}>{error || "Connecting..."}</p>
        {error && (
          <button className="secondary-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </section>
    </main>
  );
}
