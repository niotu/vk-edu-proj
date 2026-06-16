import { useState } from 'react'
import { ROUTES } from '../navigation/routes.js'

const QUESTIONS = [
  {
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
  },
  {
    text: 'What is the capital of France?',
    options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
  },
  {
    text: 'How many continents are there on Earth?',
    options: ['5', '6', '7', '8'],
  },
]

export default function OrganizerQuizPage({ onNavigate }) {
  const [index, setIndex] = useState(0)
  const question = QUESTIONS[index]
  const isLast = index >= QUESTIONS.length - 1

  const handleNext = () => {
    if (isLast) {
      onNavigate(ROUTES.LEADERBOARD)
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <p className="qp-progress">
          Question {index + 1} of {QUESTIONS.length}
        </p>
        <h1 className="qp-title qp-title--question">{question.text}</h1>
        <p className="qp-subtitle">Organizer view — full question statement</p>

        <ul className="qp-optionList" aria-label="Answer options preview">
          {question.options.map((option) => (
            <li key={option} className="qp-optionItem">{option}</li>
          ))}
        </ul>

        <div className="qp-actions qp-actions--row">
          <button className="qp-secondaryBtn" type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Previous
          </button>
          <button className="qp-primaryBtn" type="button" onClick={handleNext}>
            {isLast ? 'Finish quiz' : 'Show next question'}
          </button>
        </div>
      </div>
    </section>
  )
}
