import { ROUTES } from '../navigation/routes.js'

const PLACEHOLDER_QUESTIONS = [
  {
    id: '1',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
  },
  {
    id: '2',
    text: 'What is the capital of France?',
    options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
  },
  {
    id: '3',
    text: 'How many continents are there on Earth?',
    options: ['5', '6', '7', '8'],
  },
]

export default function QuizCreatePage({ onNavigate }) {
  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Create quiz</h1>
        <p className="qp-subtitle">Add questions, then start a live session for participants.</p>

        <div className="qp-form">
          <label className="qp-field">
            <span className="qp-field__label">Quiz title</span>
            <input className="qp-input" type="text" placeholder="Friday trivia" />
          </label>
          <label className="qp-field">
            <span className="qp-field__label">First question</span>
            <input className="qp-input" type="text" placeholder="Question text" />
          </label>
        </div>

        <div className="qp-inlineActions">
          <button className="qp-secondaryBtn qp-secondaryBtn--inline" type="button">
            Export quiz
          </button>
          <button className="qp-secondaryBtn qp-secondaryBtn--inline" type="button">
            Import from history
          </button>
        </div>

        <div className="qp-actions qp-actions--row">
          <button
            className="qp-secondaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.HOME)}
          >
            Back
          </button>
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={() => onNavigate(ROUTES.ORG_WAITING)}
          >
            Start lobby
          </button>
        </div>

        <p className="qp-hint">Placeholder: {PLACEHOLDER_QUESTIONS.length} sample questions loaded.</p>
      </div>
    </section>
  )
}
