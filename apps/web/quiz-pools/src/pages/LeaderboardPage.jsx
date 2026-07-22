import { ROUTES } from '../navigation/routes.js'
import Leaderboard from '../components/Leaderboard.jsx'

export default function LeaderboardPage({ onNavigate, entries = [], currentUserId }) {
  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Final leaderboard</h1>
        <p className="qp-subtitle">Quiz finished — thanks for playing!</p>

        <Leaderboard entries={entries} currentUserId={currentUserId} />

        <div className="qp-actions qp-actions--row">
          <button className="qp-secondaryBtn" type="button" onClick={() => onNavigate(ROUTES.PROFILE)}>
            My history
          </button>
          <button className="qp-primaryBtn" type="button" onClick={() => onNavigate(ROUTES.HOME)}>
            Back to home
          </button>
        </div>
      </div>
    </section>
  )
}
