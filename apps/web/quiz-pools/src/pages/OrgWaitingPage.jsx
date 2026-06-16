import { ROUTES } from '../navigation/routes.js'

export default function OrgWaitingPage({ onNavigate }) {
  return (
    <section className="qp-screen">
      <div className="qp-card">
        <h1 className="qp-title">Organizer lobby</h1>
        <p className="qp-subtitle">
          Share the room code with participants. Start the quiz when everyone is ready.
        </p>

        <div className="qp-roomCode" aria-label="Room code">
          <span className="qp-roomCode__label">Room code</span>
          <span className="qp-roomCode__value">AB12CD</span>
        </div>

        <p className="qp-hint">3 participants connected (placeholder)</p>

        <div className="qp-spinner" role="status" aria-label="Waiting for participants"></div>

        <div className="qp-actions qp-actions--row">
          <button
            className="qp-secondaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.QUIZ_CREATE)}
          >
            Edit quiz
          </button>
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.ORGANIZER_QUIZ)}
          >
            Start quiz
          </button>
        </div>
      </div>
    </section>
  )
}
