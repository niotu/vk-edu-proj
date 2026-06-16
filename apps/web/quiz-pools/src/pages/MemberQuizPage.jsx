import { useState } from 'react'
import { ROUTES } from '../navigation/routes.js'

const QUESTIONS = [
  { options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { options: ['Berlin', 'Paris', 'Rome', 'Madrid'] },
  { options: ['5', '6', '7', '8'] },
]

export default function MemberQuizPage({ onNavigate }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const question = QUESTIONS[index]
  const isLast = index >= QUESTIONS.length - 1

  const handleSubmit = () => {
    if (selected === null) return
    setSelected(null)
    if (isLast) {
      onNavigate(ROUTES.LEADERBOARD)
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <section className="qp-screen">
      <div className="qp-card">
        <p className="qp-progress">
          Question {index + 1} of {QUESTIONS.length}
        </p>
        <p className="qp-subtitle">Member view — answer options only</p>

        <div className="qp-optionGrid" role="group" aria-label="Answer options">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`qp-optionBtn${selected === option ? ' isSelected' : ''}`}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          className="qp-primaryBtn"
          type="button"
          disabled={selected === null}
          onClick={handleSubmit}
        >
          {isLast ? 'Submit final answer' : 'Submit answer'}
        </button>
      </div>
    </section>
  )
}
