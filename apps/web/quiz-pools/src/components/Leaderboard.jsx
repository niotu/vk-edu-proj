export default function Leaderboard({ entries = [], currentUserId }) {
  if (entries.length === 0) {
    return <p className="qp-hint">No results yet.</p>
  }

  return (
    <ol className="qp-leaderboard" aria-label="Leaderboard">
      {entries.map((row) => (
        <li
          key={row.userId || row.rank}
          className={'qp-leaderboard__row' + (row.userId === currentUserId ? ' isCurrentUser' : '')}
        >
          <span className="qp-leaderboard__rank">
            {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : '#' + row.rank}
          </span>
          <span className="qp-leaderboard__name">
            {row.name}
            {row.userId === currentUserId ? ' (you)' : ''}
          </span>
          <span className="qp-leaderboard__score">{row.score} pts</span>
        </li>
      ))}
    </ol>
  )
}
