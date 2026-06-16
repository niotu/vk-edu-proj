import { ROUTES } from '../navigation/routes.js'

const LEADERBOARD = [
  { rank: 1, name: 'Alice', score: 200 },
  { rank: 2, name: 'Bob', score: 100 },
  { rank: 3, name: 'You', score: 100 },
]

export default function LeaderboardPage({ onNavigate }) {
  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Final leaderboard</h1>
        <p className="qp-subtitle">Quiz finished — thanks for playing!</p>

        <ol className="qp-leaderboard" aria-label="Leaderboard">
          {LEADERBOARD.map((row) => (
            <li key={row.rank} className="qp-leaderboard__row">
              <span className="qp-leaderboard__rank">#{row.rank}</span>
              <span className="qp-leaderboard__name">{row.name}</span>
              <span className="qp-leaderboard__score">{row.score} pts</span>
            </li>
          ))}
        </ol>

        <button
          className="qp-primaryBtn"
          type="button"
          onClick={() => onNavigate(ROUTES.HOME)}
        >
          Back to home
        </button>
      </div>
    </section>
  )
}
