import { useState } from 'react'
import { ROUTES } from '../navigation/routes.js'
import { createQuiz, createSession } from '../lib/api.js'
import socketClient from '../lib/socket.js'

function isJsonFile(file) {
  return file?.name?.toLowerCase().endsWith('.json')
}

function normalizeUploadedQuiz(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Quiz file must contain a JSON object.')
  }

  const title = typeof json.title === 'string' ? json.title.trim() : ''
  if (!title) {
    throw new Error('Quiz file must contain a "title".')
  }

  const questions = Array.isArray(json.questions) ? json.questions : []
  if (questions.length === 0) {
    throw new Error('Quiz file must contain at least one question.')
  }

  return {
    title,
    description: typeof json.description === 'string' ? json.description.trim() || undefined : undefined,
    category: typeof json.category === 'string' ? json.category.trim() || undefined : undefined,
    questions: questions.map((q, index) => {
      const statement = typeof q.statement === 'string' ? q.statement.trim() : ''
      const answers = Array.isArray(q.answers) ? q.answers.map((a) => String(a)) : []
      const correct = Array.isArray(q.correct) ? q.correct.map((a) => String(a)) : []
      if (!statement || answers.length < 2 || correct.length === 0) {
        throw new Error('Question ' + (index + 1) + ' is invalid: needs statement, 2+ answers and 1+ correct.')
      }
      return {
        orderIndex: index,
        statement,
        answers,
        correct,
        type: q.imageUrl ? 'IMAGE' : 'TEXT',
        imageUrl: typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : undefined,
        choiceMode: correct.length > 1 ? 'MULTIPLE' : 'SINGLE',
        timeLimitSec: Number.isFinite(q.timeLimitSec) ? q.timeLimitSec : undefined,
      }
    }),
  }
}

function emptyQuestion() {
  return {
    statement: '',
    imageUrl: '',
    timeLimitSec: 30,
    answers: ['', ''],
    correct: new Set(),
  }
}

function QuestionEditor({ question, index, onChange, onRemove }) {
  const setField = (field, value) => onChange({ ...question, [field]: value })

  const setAnswer = (i, value) => {
    const answers = [...question.answers]
    answers[i] = value
    onChange({ ...question, answers })
  }

  const toggleCorrect = (i) => {
    const correct = new Set(question.correct)
    if (correct.has(i)) correct.delete(i)
    else correct.add(i)
    onChange({ ...question, correct })
  }

  const addAnswer = () => onChange({ ...question, answers: [...question.answers, ''] })

  const removeAnswer = (i) => {
    const answers = question.answers.filter((_, idx) => idx !== i)
    const correct = new Set(
      [...question.correct].filter((c) => c !== i).map((c) => (c > i ? c - 1 : c))
    )
    onChange({ ...question, answers, correct })
  }

  return (
    <div className="qp-questionEditor">
      <div className="qp-questionEditor__head">
        <strong>Question {index + 1}</strong>
        <button className="qp-linkBtn" type="button" onClick={onRemove}>
          Remove
        </button>
      </div>

      <label className="qp-field">
        <span className="qp-field__label">Question text</span>
        <input
          className="qp-input"
          type="text"
          placeholder="What is 2 + 2?"
          value={question.statement}
          onChange={(e) => setField('statement', e.target.value)}
        />
      </label>

      <label className="qp-field">
        <span className="qp-field__label">Image URL (optional — makes this an image question)</span>
        <input
          className="qp-input"
          type="url"
          placeholder="https://example.com/picture.png"
          value={question.imageUrl}
          onChange={(e) => setField('imageUrl', e.target.value)}
        />
      </label>

      {question.imageUrl.trim() ? (
        <img src={question.imageUrl} alt="Question preview" className="qp-questionImage qp-questionImage--preview" />
      ) : null}

      <label className="qp-field">
        <span className="qp-field__label">Time limit (seconds)</span>
        <input
          className="qp-input qp-input--small"
          type="number"
          min="5"
          max="300"
          value={question.timeLimitSec}
          onChange={(e) => setField('timeLimitSec', Number(e.target.value) || 30)}
        />
      </label>

      <span className="qp-field__label">Answers (check the correct ones)</span>
      {question.answers.map((answer, i) => (
        <div key={i} className="qp-answerRow">
          <input
            type="checkbox"
            checked={question.correct.has(i)}
            onChange={() => toggleCorrect(i)}
            aria-label={'Answer ' + (i + 1) + ' is correct'}
          />
          <input
            className="qp-input"
            type="text"
            placeholder={'Answer ' + (i + 1)}
            value={answer}
            onChange={(e) => setAnswer(i, e.target.value)}
          />
          {question.answers.length > 2 ? (
            <button className="qp-linkBtn" type="button" onClick={() => removeAnswer(i)}>
              ✕
            </button>
          ) : null}
        </div>
      ))}

      <button className="qp-secondaryBtn qp-secondaryBtn--small" type="button" onClick={addAnswer}>
        Add answer
      </button>

      <p className="qp-hint">
        {question.correct.size > 1
          ? 'Multiple choice: participants must select all correct answers.'
          : 'Single choice: participants select one answer.'}
      </p>
    </div>
  )
}

export default function QuizCreatePage({ session, onNavigate, onSessionCreated }) {
  const [mode, setMode] = useState('editor')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [quizFile, setQuizFile] = useState(null)
  const [quizFileName, setQuizFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const accessToken = session?.accessToken

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    setQuizFile(file || null)
    setQuizFileName(file?.name || '')
    setError('')
  }

  const buildEditorPayload = () => {
    if (!title.trim()) {
      throw new Error('Quiz title is required.')
    }
    if (questions.length === 0) {
      throw new Error('Add at least one question.')
    }

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      questions: questions.map((q, index) => {
        const statement = q.statement.trim()
        const answers = q.answers.map((a) => a.trim())
        if (!statement) {
          throw new Error('Question ' + (index + 1) + ': text is required.')
        }
        if (answers.some((a) => !a) || answers.length < 2) {
          throw new Error('Question ' + (index + 1) + ': fill in at least two answers.')
        }
        if (new Set(answers).size !== answers.length) {
          throw new Error('Question ' + (index + 1) + ': answers must be unique.')
        }
        if (q.correct.size === 0) {
          throw new Error('Question ' + (index + 1) + ': mark at least one correct answer.')
        }
        return {
          orderIndex: index,
          statement,
          answers,
          correct: [...q.correct].map((i) => answers[i]),
          type: q.imageUrl.trim() ? 'IMAGE' : 'TEXT',
          imageUrl: q.imageUrl.trim() || undefined,
          choiceMode: q.correct.size > 1 ? 'MULTIPLE' : 'SINGLE',
          timeLimitSec: q.timeLimitSec,
        }
      }),
    }
  }

  const handleCreate = async () => {
    if (!accessToken) {
      setError('Sign in first to create a quiz.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let quizData
      if (mode === 'file') {
        if (!quizFile || !isJsonFile(quizFile)) {
          throw new Error('Please upload a valid JSON quiz file.')
        }
        quizData = normalizeUploadedQuiz(JSON.parse(await quizFile.text()))
      } else {
        quizData = buildEditorPayload()
      }

      const { quiz } = await createQuiz(accessToken, quizData)
      const { session: liveSession } = await createSession(accessToken, quiz.id)

      if (!socketClient.isConnected) {
        socketClient.connect(accessToken)
      }
      try {
        await socketClient.joinRoom(liveSession.roomCode)
      } catch (err) {
        void err
      }

      onSessionCreated({ session: liveSession, quiz })
    } catch (err) {
      setError(err.message || 'Unable to create quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="qp-screen qp-screen--wide">
      <div className="qp-card qp-card--wide">
        <h1 className="qp-title">Create quiz</h1>
        <p className="qp-subtitle">Build questions manually or import a JSON file, then open a lobby.</p>

        <div className="qp-tabs">
          <button
            className={'qp-tab' + (mode === 'editor' ? ' isActive' : '')}
            type="button"
            onClick={() => setMode('editor')}
          >
            Question editor
          </button>
          <button
            className={'qp-tab' + (mode === 'file' ? ' isActive' : '')}
            type="button"
            onClick={() => setMode('file')}
          >
            Import JSON
          </button>
        </div>

        <div className="qp-form">
          <label className="qp-field">
            <span className="qp-field__label">Quiz title</span>
            <input
              className="qp-input"
              type="text"
              placeholder="Friday trivia"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={mode === 'file'}
            />
          </label>
          <label className="qp-field">
            <span className="qp-field__label">Description</span>
            <input
              className="qp-input"
              type="text"
              placeholder="Quiz description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={mode === 'file'}
            />
          </label>
          <label className="qp-field">
            <span className="qp-field__label">Category</span>
            <input
              className="qp-input"
              type="text"
              placeholder="General knowledge"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={mode === 'file'}
            />
          </label>

          {mode === 'file' ? (
            <>
              <label className="qp-field">
                <span className="qp-field__label">Upload JSON quiz</span>
                <input
                  className="qp-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                />
                {quizFileName ? <small>Selected file: {quizFileName}</small> : null}
              </label>
              <p className="qp-hint">
                Format: {'{ "title", "questions": [{ "statement", "answers": [], "correct": [] }] }'} — like
                simple_math_quiz.json. Title and questions are imported automatically.
              </p>
            </>
          ) : (
            <>
              {questions.map((q, i) => (
                <QuestionEditor
                  key={i}
                  question={q}
                  index={i}
                  onChange={(next) => setQuestions(questions.map((item, idx) => (idx === i ? next : item)))}
                  onRemove={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                />
              ))}
              <button
                className="qp-secondaryBtn"
                type="button"
                onClick={() => setQuestions([...questions, emptyQuestion()])}
              >
                Add question
              </button>
            </>
          )}
        </div>

        {error ? <div className="qp-error">{error}</div> : null}

        <div className="qp-actions qp-actions--row">
          <button className="qp-secondaryBtn" type="button" onClick={() => onNavigate(ROUTES.HOME)}>
            Back
          </button>
          <button
            className="qp-primaryBtn"
            type="button"
            onClick={handleCreate}
            disabled={loading || (mode === 'file' ? !quizFile : !title.trim())}
          >
            {loading ? 'Starting...' : 'Create quiz and lobby'}
          </button>
        </div>
      </div>
    </section>
  )
}
