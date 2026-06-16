import { ROUTES } from '../navigation/routes.js'

export default function QuizJoinPage({ onNavigate }) {
  return (
    <section className="qp-screen">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Join quiz</h1>
        <p className="qp-subtitle">Enter the room code from your organizer.</p>

        <div className="qp-form">
          <label className="qp-field">
            <span className="qp-field__label">Room code</span>
            <input className="qp-input" type="text" placeholder="AB12CD" maxLength={8} />
          </label>
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.MEMBER_WAITING)}
          >
            Join
          </button>
        </div>

        <button
          className="qp-linkBtn"
          type="button"
          onClick={() => onNavigate(ROUTES.HOME)}
        >
          Back to home
        </button>
      </div>
    </section>
  )
}
