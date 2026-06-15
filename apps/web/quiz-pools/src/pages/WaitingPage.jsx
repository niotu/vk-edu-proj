export default function WaitingPage() {
  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Waiting…</h1>
        <p className="qp-subtitle">We’re setting things up. This screen will update automatically.</p>

        <div className="qp-spinner" role="status" aria-label="Loading"></div>
      </div>
    </section>
  )
}
