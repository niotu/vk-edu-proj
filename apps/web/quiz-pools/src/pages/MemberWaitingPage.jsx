import { ROUTES } from '../navigation/routes.js'

export default function MemberWaitingPage({ onNavigate }) {
  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Waiting for host</h1>
        <p className="qp-subtitle">
          The organizer will start the quiz soon. This screen will update automatically.
        </p>

        <div className="qp-spinner" role="status" aria-label="Waiting"></div>

        <button
          className="qp-primaryBtn"
          type="button"
          onClick={() => onNavigate(ROUTES.MEMBER_QUIZ)}
        >
          Continue (dev)
        </button>
      </div>
    </section>
  )
}
